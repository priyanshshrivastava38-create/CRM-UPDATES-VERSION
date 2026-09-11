import { NextResponse } from "next/server";
import { Prisma, ServiceType } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const allowedRoles = ["OPERATIONS", "FINANCE", "ADMIN"];

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!allowedRoles.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");
  const platformAccountId = searchParams.get("platformAccountId");
  const service = searchParams.get("service");
  const component = searchParams.get("component");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(searchParams.get("pageSize") ?? 50) || 50));

  if (service && !(Object.values(ServiceType) as string[]).includes(service)) {
    return NextResponse.json({ error: "Invalid service filter" }, { status: 400 });
  }

  const where: Prisma.UsageRecordWhereInput = {
    ...(platformAccountId ? { platformAccountId } : {}),
    ...(service ? { service: service as ServiceType } : {}),
    ...(component ? { component } : {}),
    ...(customerId ? { platformAccount: { customerId } } : {})
  };

  const [records, total] = await Promise.all([
    prisma.usageRecord.findMany({
      where,
      include: { platformAccount: { include: { customer: { select: { id: true, customerCode: true, name: true } } } } },
      orderBy: { usageDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.usageRecord.count({ where })
  ]);

  return NextResponse.json({ records, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } });
}
