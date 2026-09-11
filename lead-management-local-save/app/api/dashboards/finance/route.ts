import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageBilling } from "@/lib/rbac";

function monthRange(offsetMonths = 0) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths + 1, 1) - 1);
  return { start, end };
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageBilling(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { start: currentStart, end: currentEnd } = monthRange(0);
  const now = new Date();

  const [pendingReviewCount, reconciliationCounts, adjustments, outstandingInvoices, overdueInvoices, recentInvoices] = await Promise.all([
    prisma.billingRun.count({ where: { status: { in: ["CALCULATED", "UNDER_REVIEW"] } } }),
    prisma.reconciliation.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.adjustment.groupBy({ by: ["type"], where: { createdAt: { gte: currentStart, lte: currentEnd } }, _sum: { amount: true } }),
    prisma.invoice.aggregate({ where: { status: { in: ["ISSUED", "EXPORTED"] } }, _sum: { totalAmount: true }, _count: { _all: true } }),
    prisma.invoice.aggregate({ where: { status: { in: ["ISSUED", "EXPORTED"] }, dueDate: { lt: now } }, _sum: { totalAmount: true }, _count: { _all: true } }),
    prisma.invoice.findMany({
      orderBy: { issueDate: "desc" },
      take: 5,
      include: { customer: { select: { customerCode: true, name: true } } }
    })
  ]);

  const reconMap = new Map(reconciliationCounts.map((row) => [row.status, row._count._all]));
  const adjustmentMap = new Map(adjustments.map((row) => [row.type, Number(row._sum.amount ?? 0)]));

  return NextResponse.json({
    pendingReviewCount,
    reconciliationCounts: {
      PENDING: reconMap.get("PENDING") ?? 0,
      MATCHED: reconMap.get("MATCHED") ?? 0,
      DISCREPANCY: reconMap.get("DISCREPANCY") ?? 0,
      RESOLVED: reconMap.get("RESOLVED") ?? 0
    },
    adjustmentsThisMonth: { creditTotal: adjustmentMap.get("CREDIT") ?? 0, debitTotal: adjustmentMap.get("DEBIT") ?? 0 },
    outstanding: { count: outstandingInvoices._count._all, amount: Number(outstandingInvoices._sum.totalAmount ?? 0) },
    overdue: { count: overdueInvoices._count._all, amount: Number(overdueInvoices._sum.totalAmount ?? 0) },
    recentInvoices: recentInvoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      customerCode: inv.customer.customerCode,
      customerName: inv.customer.name,
      totalAmount: Number(inv.totalAmount),
      status: inv.status,
      issueDate: inv.issueDate
    }))
  });
}
