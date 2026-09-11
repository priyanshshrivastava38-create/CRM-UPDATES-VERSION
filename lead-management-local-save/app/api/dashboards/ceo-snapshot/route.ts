import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { monthToPeriod } from "@/lib/validators";

function shiftMonth(month: string, delta: number) {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, m - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function status(count: number, amberAt = 1, redAt = 3): "green" | "amber" | "red" {
  if (count >= redAt) return "red";
  if (count >= amberAt) return "amber";
  return "green";
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "CEO" && user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: "Invalid month" }, { status: 400 });

  const { periodStart, periodEnd } = monthToPeriod(month);
  const previousMonth = shiftMonth(month, -1);
  const { periodStart: prevStart, periodEnd: prevEnd } = monthToPeriod(previousMonth);
  const now = new Date();

  const [
    newLeads,
    newOpportunities,
    wonCustomers,
    pipeline,
    priceApprovalCounts,
    approvedThisMonth,
    onboardingCounts,
    customerCounts,
    newCustomers,
    activatedCustomers,
    smsUsage,
    wabaUsage,
    billingThisMonth,
    billingPrevMonth,
    billingByService,
    reconciliationCounts,
    adjustmentsThisMonth,
    outstandingInvoices,
    overdueInvoices,
    invoicesRaised,
    collectionsReceived,
    operationsTasksPending,
    platformIssues
  ] = await Promise.all([
    prisma.lead.count({ where: { createdAt: { gte: periodStart, lte: periodEnd }, deletedAt: null } }),
    prisma.opportunity.count({ where: { createdAt: { gte: periodStart, lte: periodEnd }, deletedAt: null } }),
    prisma.customer.count({ where: { createdAt: { gte: periodStart, lte: periodEnd } } }),
    prisma.opportunity.aggregate({ where: { status: { notIn: ["WON", "LOST"] }, deletedAt: null }, _sum: { opportunityValue: true } }),
    prisma.priceApprovalRequest.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.priceApprovalRequest.aggregate({
      where: { status: "APPROVED", reviewedAt: { gte: periodStart, lte: periodEnd } },
      _sum: { expectedMonthlyRevenue: true },
      _count: { _all: true }
    }),
    prisma.onboardingChecklist.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.customer.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.customer.count({ where: { createdAt: { gte: periodStart, lte: periodEnd } } }),
    prisma.customer.count({ where: { activatedAt: { gte: periodStart, lte: periodEnd } } }),
    prisma.usageRecord.groupBy({ by: ["component"], where: { service: "SMS", usageDate: { gte: periodStart, lte: periodEnd } }, _sum: { quantity: true } }),
    prisma.usageRecord.groupBy({ by: ["component"], where: { service: "WHATSAPP", usageDate: { gte: periodStart, lte: periodEnd } }, _sum: { quantity: true } }),
    prisma.billingRun.aggregate({ where: { periodStart }, _sum: { totalAmount: true, totalSetupAmount: true } }),
    prisma.billingRun.aggregate({ where: { periodStart: prevStart }, _sum: { totalAmount: true } }),
    prisma.billingLineItem.groupBy({ by: ["service"], where: { billingRun: { periodStart } }, _sum: { amount: true } }),
    prisma.reconciliation.groupBy({ by: ["status"], where: { billingRun: { periodStart } }, _count: { _all: true } }),
    prisma.adjustment.groupBy({ by: ["type"], where: { createdAt: { gte: periodStart, lte: periodEnd } }, _sum: { amount: true } }),
    prisma.invoice.aggregate({ where: { status: { in: ["ISSUED", "EXPORTED"] } }, _sum: { totalAmount: true }, _count: { _all: true } }),
    prisma.invoice.aggregate({ where: { status: { in: ["ISSUED", "EXPORTED"] }, dueDate: { lt: now } }, _sum: { totalAmount: true }, _count: { _all: true } }),
    prisma.invoice.count({ where: { issueDate: { gte: periodStart, lte: periodEnd } } }),
    prisma.payment.aggregate({ where: { paidOn: { gte: periodStart, lte: periodEnd } }, _sum: { amount: true } }),
    prisma.onboardingTask.count({ where: { team: "OPERATIONS", status: { in: ["PENDING", "IN_PROGRESS"] } } }),
    prisma.platformAccount.count({ where: { status: { not: "ACTIVE" } } })
  ]);

  const parStatusMap = new Map(priceApprovalCounts.map((row) => [row.status, row._count._all]));
  const onboardingMap = new Map(onboardingCounts.map((row) => [row.status, row._count._all]));
  const customerStatusMap = new Map(customerCounts.map((row) => [row.status, row._count._all]));
  const billingByServiceMap = new Map(billingByService.map((row) => [row.service, Number(row._sum.amount ?? 0)]));
  const reconMap = new Map(reconciliationCounts.map((row) => [row.status, row._count._all]));
  const adjustmentMap = new Map(adjustmentsThisMonth.map((row) => [row.type, Number(row._sum.amount ?? 0)]));

  const smsSubmitted = smsUsage.find((r) => r.component === "SUBMITTED")?._sum.quantity ?? 0;
  const smsDelivered = smsUsage.find((r) => r.component === "DELIVERED")?._sum.quantity ?? 0;
  const wabaByCategory = wabaUsage.map((row) => ({ category: row.component, quantity: row._sum.quantity ?? 0 }));

  const currentTotalBilling = Number(billingThisMonth._sum.totalAmount ?? 0);
  const previousTotalBilling = Number(billingPrevMonth._sum.totalAmount ?? 0);
  const growthPct = previousTotalBilling > 0 ? Math.round(((currentTotalBilling - previousTotalBilling) / previousTotalBilling) * 1000) / 10 : null;

  const blockedOnboarding = onboardingMap.get("BLOCKED") ?? 0;
  const discrepancies = reconMap.get("DISCREPANCY") ?? 0;
  const pendingApprovals = parStatusMap.get("SUBMITTED") ?? 0;
  const rejectedApprovals = parStatusMap.get("REJECTED") ?? 0;

  const alerts: { severity: "amber" | "red"; message: string }[] = [];
  if (overdueInvoices._count._all > 0) {
    alerts.push({ severity: "red", message: `${overdueInvoices._count._all} overdue invoice(s) totaling ₹${Number(overdueInvoices._sum.totalAmount ?? 0).toLocaleString("en-IN")}` });
  }
  if (blockedOnboarding > 0) alerts.push({ severity: "red", message: `${blockedOnboarding} customer onboarding checklist(s) blocked` });
  if (discrepancies > 0) alerts.push({ severity: "amber", message: `${discrepancies} billing run(s) have a reconciliation discrepancy` });
  if (pendingApprovals > 0) alerts.push({ severity: "amber", message: `${pendingApprovals} price approval request(s) awaiting review` });
  if (rejectedApprovals > 0) alerts.push({ severity: "amber", message: `${rejectedApprovals} price approval request(s) were rejected` });
  if (platformIssues > 0) alerts.push({ severity: "amber", message: `${platformIssues} platform account(s) are not active` });

  return NextResponse.json({
    month,
    sales: {
      newLeads,
      newOpportunities,
      wonCustomers,
      pipelineValue: Number(pipeline._sum.opportunityValue ?? 0),
      approvedPricingRequests: approvedThisMonth._count._all,
      status: newLeads > 0 || newOpportunities > 0 ? "green" : "amber"
    },
    priceApprovals: {
      pending: pendingApprovals,
      approved: approvedThisMonth._count._all,
      rejected: rejectedApprovals,
      approvedValue: Number(approvedThisMonth._sum.expectedMonthlyRevenue ?? 0),
      status: status(rejectedApprovals, 1, 3)
    },
    onboarding: {
      newCustomers,
      activated: activatedCustomers,
      inProgress: onboardingMap.get("IN_PROGRESS") ?? 0,
      delayed: blockedOnboarding,
      status: status(blockedOnboarding, 1, 3)
    },
    customers: {
      total: customerCounts.reduce((sum, r) => sum + r._count._all, 0),
      new: newCustomers,
      active: customerStatusMap.get("ACTIVE") ?? 0,
      inactive: (customerStatusMap.get("INACTIVE") ?? 0) + (customerStatusMap.get("SUSPENDED") ?? 0)
    },
    usage: { smsSubmitted, smsDelivered, wabaByCategory },
    billing: {
      serviceWise: { SMS: billingByServiceMap.get("SMS") ?? 0, WHATSAPP: billingByServiceMap.get("WHATSAPP") ?? 0 },
      setupCharges: Number(billingThisMonth._sum.totalSetupAmount ?? 0),
      totalBilling: currentTotalBilling,
      previousMonthTotal: previousTotalBilling,
      growthPct
    },
    finance: {
      billingCompleted: reconciliationCounts.reduce((sum, r) => sum + r._count._all, 0),
      pendingReconciliation: (reconMap.get("PENDING") ?? 0) + discrepancies,
      creditsTotal: adjustmentMap.get("CREDIT") ?? 0,
      debitsTotal: adjustmentMap.get("DEBIT") ?? 0,
      outstanding: Number(outstandingInvoices._sum.totalAmount ?? 0),
      overdue: Number(overdueInvoices._sum.totalAmount ?? 0),
      status: status((reconMap.get("PENDING") ?? 0) + discrepancies, 1, 3)
    },
    operations: {
      customersPendingActivation: customerStatusMap.get("ONBOARDING") ?? 0,
      technicalTasksPending: operationsTasksPending,
      platformIssues,
      status: status(platformIssues, 1, 3)
    },
    collections: {
      invoicesRaised,
      outstandingCount: outstandingInvoices._count._all,
      outstandingAmount: Number(outstandingInvoices._sum.totalAmount ?? 0),
      overdueCount: overdueInvoices._count._all,
      overdueAmount: Number(overdueInvoices._sum.totalAmount ?? 0),
      collectionsReceived: Number(collectionsReceived._sum.amount ?? 0),
      status: status(overdueInvoices._count._all, 1, 3)
    },
    alerts
  });
}
