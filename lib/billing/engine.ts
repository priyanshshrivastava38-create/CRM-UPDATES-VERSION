import type { BillingRunCalculation, LineItemDef, LineItemResult, SlabDef } from "./types";

export function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatSlabLabel(slab: SlabDef) {
  const min = slab.minVolume.toLocaleString("en-IN");
  return slab.maxVolume != null ? `${min}–${slab.maxVolume.toLocaleString("en-IN")}` : `${min}+`;
}

/**
 * Flat-bracket slab resolution: the whole quantity is billed at the rate of the single
 * bracket it falls into — never split/summed across brackets (confirmed against the
 * requirements doc's worked examples).
 */
export function resolveSlabRate(slabs: SlabDef[], quantity: number): SlabDef {
  const sorted = [...slabs].sort((a, b) => a.minVolume - b.minVolume);
  const match = sorted.find((slab) => quantity >= slab.minVolume && (slab.maxVolume == null || quantity <= slab.maxVolume));
  return match ?? sorted[sorted.length - 1];
}

export function calculateLineItem(lineItem: LineItemDef, quantity: number): LineItemResult {
  const base = { service: lineItem.service, component: lineItem.component, quantity };

  if (lineItem.rateType === "FLAT") {
    const rate = lineItem.flatRate ?? 0;
    return { ...base, rateType: "FLAT", appliedRate: rate, amount: round2(quantity * rate) };
  }

  if (!lineItem.slabs.length) {
    return { ...base, rateType: "SLAB", appliedRate: 0, amount: 0 };
  }

  const slab = resolveSlabRate(lineItem.slabs, quantity);
  return { ...base, rateType: "SLAB", appliedRate: slab.rate, slabLabel: formatSlabLabel(slab), amount: round2(quantity * slab.rate) };
}

export function calculateBillingRun(lineItems: LineItemDef[], usageByKey: Map<string, number>): BillingRunCalculation {
  const results = lineItems.map((lineItem) => calculateLineItem(lineItem, usageByKey.get(`${lineItem.service}:${lineItem.component}`) ?? 0));
  const totalUsageAmount = round2(results.reduce((sum, result) => sum + result.amount, 0));
  return { lineItems: results, totalUsageAmount };
}
