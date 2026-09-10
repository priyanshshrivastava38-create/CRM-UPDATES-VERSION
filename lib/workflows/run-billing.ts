import type { Prisma, ServiceType, RateType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { calculateBillingRun, round2 } from "@/lib/billing/engine";
import { getEffectiveRatePlan, toLineItemDefs } from "@/lib/billing/rate-lookup";

async function aggregateUsage(tx: Prisma.TransactionClient, customerId: string, periodStart: Date, periodEnd: Date) {
  const platformAccounts = await tx.platformAccount.findMany({ where: { customerId }, select: { id: true } });
  if (!platformAccounts.length) return new Map<string, number>();

  const usageAgg = await tx.usageRecord.groupBy({
    by: ["service", "component"],
    where: { platformAccountId: { in: platformAccounts.map((p) => p.id) }, usageDate: { gte: periodStart, lte: periodEnd } },
    _sum: { quantity: true }
  });

  return new Map(usageAgg.map((row) => [`${row.service}:${row.component}`, row._sum.quantity ?? 0]));
}

async function writeCalculation(
  tx: Prisma.TransactionClient,
  billingRunId: string,
  lineItemDefs: ReturnType<typeof toLineItemDefs>,
  usageByKey: Map<string, number>
) {
  const calc = calculateBillingRun(lineItemDefs, usageByKey);

  await tx.billableUsage.createMany({
    data: lineItemDefs.map((li) => ({
      billingRunId,
      service: li.service as ServiceType,
      component: li.component,
      rawQuantity: usageByKey.get(`${li.service}:${li.component}`) ?? 0,
      billableQuantity: usageByKey.get(`${li.service}:${li.component}`) ?? 0
    }))
  });

  await tx.billingLineItem.createMany({
    data: calc.lineItems.map((li, index) => ({
      billingRunId,
      service: li.service as ServiceType,
      component: li.component,
      billableQuantity: li.quantity,
      rateType: li.rateType as RateType,
      appliedRate: li.appliedRate,
      slabLabel: li.slabLabel,
      amount: li.amount,
      sortOrder: index
    }))
  });

  return calc;
}

export async function runBillingForCustomer(customerId: string, periodStart: Date, periodEnd: Date) {
  return prisma.$transaction(
    async (tx) => {
      const existing = await tx.billingRun.findUnique({ where: { customerId_periodStart_periodEnd: { customerId, periodStart, periodEnd } } });
      if (existing) throw new ApiError("A billing run already exists for this customer and period", 409);

      const ratePlan = await getEffectiveRatePlan(tx, customerId, periodStart, periodEnd);
      if (!ratePlan) throw new ApiError("No active Rate Plan covers this billing period", 400);

      const usageByKey = await aggregateUsage(tx, customerId, periodStart, periodEnd);
      const lineItemDefs = toLineItemDefs(ratePlan.lineItems);

      const pendingSetupCharges = await tx.setupCharge.findMany({ where: { ratePlanId: ratePlan.id, status: "PENDING" } });
      const totalSetupAmount = round2(pendingSetupCharges.reduce((sum, charge) => sum + Number(charge.amount), 0));

      const run = await tx.billingRun.create({
        data: {
          customerId,
          ratePlanId: ratePlan.id,
          periodStart,
          periodEnd,
          status: "CALCULATED",
          totalUsageAmount: 0,
          totalSetupAmount,
          totalAdjustmentAmount: 0,
          totalAmount: totalSetupAmount,
          calculatedAt: new Date()
        }
      });

      const calc = await writeCalculation(tx, run.id, lineItemDefs, usageByKey);

      const updated = await tx.billingRun.update({
        where: { id: run.id },
        data: { totalUsageAmount: calc.totalUsageAmount, totalAmount: round2(calc.totalUsageAmount + totalSetupAmount) }
      });

      if (pendingSetupCharges.length) {
        await tx.setupCharge.updateMany({ where: { id: { in: pendingSetupCharges.map((c) => c.id) } }, data: { status: "INVOICED", chargeDate: new Date() } });
      }

      return updated;
    },
    { timeout: 15000 }
  );
}

export async function recalculateBillingRun(runId: string) {
  return prisma.$transaction(
    async (tx) => {
      const run = await tx.billingRun.findUnique({ where: { id: runId }, include: { ratePlan: { include: { lineItems: { include: { slabs: true }, orderBy: { sortOrder: "asc" } } } } } });
      if (!run) throw new ApiError("Billing run not found", 404);
      if (!["DRAFT", "CALCULATED"].includes(run.status)) throw new ApiError("Only a draft or calculated run can be recalculated", 409);

      const usageByKey = await aggregateUsage(tx, run.customerId, run.periodStart, run.periodEnd);
      const lineItemDefs = toLineItemDefs(run.ratePlan.lineItems);

      await tx.billableUsage.deleteMany({ where: { billingRunId: run.id } });
      await tx.billingLineItem.deleteMany({ where: { billingRunId: run.id } });

      const calc = await writeCalculation(tx, run.id, lineItemDefs, usageByKey);

      const updated = await tx.billingRun.update({
        where: { id: run.id },
        data: {
          totalUsageAmount: calc.totalUsageAmount,
          totalAmount: round2(calc.totalUsageAmount + Number(run.totalSetupAmount) + Number(run.totalAdjustmentAmount)),
          status: "CALCULATED",
          calculatedAt: new Date()
        }
      });

      return updated;
    },
    { timeout: 15000 }
  );
}
