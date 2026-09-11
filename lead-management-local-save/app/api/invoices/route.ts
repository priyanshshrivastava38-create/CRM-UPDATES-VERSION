import { NextResponse } from "next/server";
import { Prisma, InvoiceStatus } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const allowedRoles = ["SALES", "FINANCE", "ADMIN"];

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!allowedRoles.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  if (status && status !== "ALL" && !(Object.values(InvoiceStatus) as string[]).includes(status)) {
    return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
  }

  const where: Prisma.InvoiceWhereInput = {
    ...(status && status !== "ALL" ? { status: status as InvoiceStatus } : {}),
    ...(user.role === "SALES" ? { customer: { accountManagerId: user.id } } : {})
  };

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      customer: { select: { id: true, customerCode: true, name: true } },
      payments: { select: { amount: true } }
    },
    orderBy: { issueDate: "desc" }
  });

  return NextResponse.json({ invoices });
}
