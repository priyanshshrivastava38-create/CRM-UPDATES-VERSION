import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { round2 } from "@/lib/billing/engine";
import type { adjustmentSchema } from "@/lib/validators";
import type { z } from "zod";

type AdjustmentInput = z.infer<typeof adjustmentSchema>;

export async function createAdjustment(input: AdjustmentInput, userId: string) {
  return prisma.$transaction(async (tx) => {
    const run = await tx.billingRun.findUnique({ where: { id: input.billingRunId } });
    if (!run) throw new ApiError("Billing run not found", 404);
    if (!["CALCULATED", "UNDER_REVIEW"].includes(run.status)) throw new ApiError("Adjustments can only be made before a run is finalized", 409);

    const adjustment = await tx.adjustment.create({
      data: {
        billingRunId: input.billingRunId,
        type: input.type,
        scope: input.scope,
        relatedComponent: input.relatedComponent,
        oldValue: input.oldValue,
        newValue: input.newValue,
        amount: input.amount,
        reason: input.reason,
        requestedById: userId
      }
    });

    const signedAmount = input.type === "CREDIT" ? -input.amount : input.amount;
    const totalAdjustmentAmount = round2(Number(run.totalAdjustmentAmount) + signedAmount);
    const totalAmount = round2(Number(run.totalUsageAmount) + Number(run.totalSetupAmount) + totalAdjustmentAmount);

    await tx.billingRun.update({ where: { id: run.id }, data: { totalAdjustmentAmount, totalAmount } });

    return adjustment;
  });
}
