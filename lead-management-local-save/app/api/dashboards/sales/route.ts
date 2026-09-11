import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function monthRange(offsetMonths = 0) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths + 1, 1) - 1);
  return { start, end };
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customerScope = user.role === "SALES" ? { accountManagerId: user.id } : {};
  const opportunityScope = user.role === "SALES" ? { salesOwnerId: user.id } : {};

  const { start: currentStart, end: currentEnd } = monthRange(0);
  const { start: prevStart, end: prevEnd } = monthRange(-1);

  const [statusCounts, currentBilling, previousBilling, pipeline, usageAgg] = await Promise.all([
    prisma.customer.groupBy({ by: ["status"], where: customerScope, _count: { _all: true } }),
    prisma.billingRun.aggregate({ where: { periodStart: currentStart, customer: customerScope }, _sum: { totalAmount: true } }),
    prisma.billingRun.aggregate({ where: { periodStart: prevStart, customer: customerScope }, _sum: { totalAmount: true } }),
    prisma.opportunity.aggregate({ where: { ...opportunityScope, deletedAt: null, status: { notIn: ["WON", "LOST"] } }, _sum: { opportunityValue: true } }),
    prisma.usageRecord.groupBy({
      by: ["service"],
      where: { usageDate: { gte: currentStart, lte: currentEnd }, platformAccount: { customer: customerScope } },
      _sum: { quantity: true }
    })
  ]);

  const statusMap = new Map(statusCounts.map((row) => [row.status, row._count._all]));
  const currentMonthBilling = Number(currentBilling._sum.totalAmount ?? 0);
  const previousMonthBilling = Number(previousBilling._sum.totalAmount ?? 0);

  return NextResponse.json({
    customerStatusCounts: {
      ONBOARDING: statusMap.get("ONBOARDING") ?? 0,
      ACTIVE: statusMap.get("ACTIVE") ?? 0,
      INACTIVE: statusMap.get("INACTIVE") ?? 0,
      SUSPENDED: statusMap.get("SUSPENDED") ?? 0
    },
    serviceUsage: usageAgg.map((row) => ({ service: row.service, quantity: row._sum.quantity ?? 0 })),
    currentMonthBilling,
    previousMonthBilling,
    growthPct: previousMonthBilling > 0 ? Math.round(((currentMonthBilling - previousMonthBilling) / previousMonthBilling) * 1000) / 10 : null,
    opportunityPipelineValue: Number(pipeline._sum.opportunityValue ?? 0)
  });
}
