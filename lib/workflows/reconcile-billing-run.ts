import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";

export async function getOrCreateReconciliation(billingRunId: string) {
  const run = await prisma.billingRun.findUnique({ where: { id: billingRunId }, include: { billableUsages: true, reconciliation: true } });
  if (!run) throw new ApiError("Billing run not found", 404);
  if (run.reconciliation) return run.reconciliation;

  const totalRawQuantity = run.billableUsages.reduce((sum, u) => sum + u.rawQuantity, 0);
  const totalBillableQuantity = run.billableUsages.reduce((sum, u) => sum + u.billableQuantity, 0);
  const varianceQuantity = totalRawQuantity - totalBillableQuantity;

  return prisma.reconciliation.create({
    data: {
      billingRunId: run.id,
      status: varianceQuantity === 0 ? "MATCHED" : "DISCREPANCY",
      totalRawQuantity,
      totalBillableQuantity,
      varianceQuantity,
      varianceAmount: 0
    }
  });
}
