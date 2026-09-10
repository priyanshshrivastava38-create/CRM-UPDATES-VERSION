import type { Prisma } from "@prisma/client";
import type { LineItemDef } from "./types";

type RatePlanLineItemWithSlabs = Prisma.RatePlanLineItemGetPayload<{ include: { slabs: true } }>;

export async function getEffectiveRatePlan(tx: Prisma.TransactionClient, customerId: string, periodStart: Date, periodEnd: Date) {
  return tx.ratePlan.findFirst({
    where: {
      customerId,
      effectiveFrom: { lte: periodStart },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: periodEnd } }]
    },
    orderBy: { effectiveFrom: "desc" },
    include: { lineItems: { include: { slabs: true }, orderBy: { sortOrder: "asc" } } }
  });
}

export function toLineItemDefs(lineItems: RatePlanLineItemWithSlabs[]): LineItemDef[] {
  return lineItems.map((li) => ({
    service: li.service,
    component: li.component,
    rateType: li.rateType,
    flatRate: li.flatRate != null ? Number(li.flatRate) : null,
    slabs: li.slabs.map((slab) => ({ minVolume: slab.minVolume, maxVolume: slab.maxVolume, rate: Number(slab.rate) }))
  }));
}
