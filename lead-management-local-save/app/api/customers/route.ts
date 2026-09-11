import { NextResponse } from "next/server";
import { Prisma, CustomerStatus } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 25) || 25));

  if (status && status !== "ALL" && !(Object.values(CustomerStatus) as string[]).includes(status)) {
    return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
  }

  const where: Prisma.CustomerWhereInput = {
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { customerCode: { contains: q, mode: "insensitive" } }] } : {}),
    ...(status && status !== "ALL" ? { status: status as CustomerStatus } : {})
  };
  if (user.role === "SALES") where.accountManagerId = user.id;

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        accountManager: { select: { id: true, name: true } },
        onboarding: { select: { status: true } },
        ratePlans: { where: { status: "ACTIVE" }, select: { id: true, effectiveFrom: true } }
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.customer.count({ where })
  ]);

  return NextResponse.json({ customers, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } });
}
