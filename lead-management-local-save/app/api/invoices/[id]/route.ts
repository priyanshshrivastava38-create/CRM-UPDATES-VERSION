import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const allowedRoles = ["SALES", "FINANCE", "ADMIN"];

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!allowedRoles.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, customerCode: true, name: true, accountManagerId: true } },
      billingRun: { select: { id: true, periodStart: true, periodEnd: true } },
      lineItems: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { paidOn: "desc" }, include: { recordedBy: { select: { id: true, name: true } } } }
    }
  });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role === "SALES" && invoice.customer.accountManagerId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ invoice });
}
