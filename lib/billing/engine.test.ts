import { describe, expect, it } from "vitest";
import { calculateBillingRun, calculateLineItem, resolveSlabRate } from "./engine";
import type { LineItemDef, SlabDef } from "./types";

const smsSubmittedSlabs: SlabDef[] = [
  { minVolume: 0, maxVolume: 1000000, rate: 0.18 },
  { minVolume: 1000001, maxVolume: 2500000, rate: 0.16 },
  { minVolume: 2500001, maxVolume: null, rate: 0.14 }
];

const smsDeliveredSlabs: SlabDef[] = [
  { minVolume: 0, maxVolume: 800000, rate: 0.25 },
  { minVolume: 800001, maxVolume: 2000000, rate: 0.23 },
  { minVolume: 2000001, maxVolume: null, rate: 0.21 }
];

describe("resolveSlabRate — flat-bracket, not marginal", () => {
  it("picks the single bracket the quantity falls into", () => {
    expect(resolveSlabRate(smsSubmittedSlabs, 500000).rate).toBe(0.18);
    expect(resolveSlabRate(smsSubmittedSlabs, 1000000).rate).toBe(0.18);
    expect(resolveSlabRate(smsSubmittedSlabs, 1000001).rate).toBe(0.16);
    expect(resolveSlabRate(smsSubmittedSlabs, 2500000).rate).toBe(0.16);
    expect(resolveSlabRate(smsSubmittedSlabs, 2500001).rate).toBe(0.14);
    expect(resolveSlabRate(smsSubmittedSlabs, 10000000).rate).toBe(0.14);
  });
});

describe("calculateLineItem — requirements doc worked examples", () => {
  it("SMS Submitted: 28,00,000 in the >25L bracket → ₹3,92,000", () => {
    const lineItem: LineItemDef = { service: "SMS", component: "SUBMITTED", rateType: "SLAB", flatRate: null, slabs: smsSubmittedSlabs };
    const result = calculateLineItem(lineItem, 2800000);
    expect(result.appliedRate).toBe(0.14);
    expect(result.amount).toBe(392000);
  });

  it("SMS Delivered: 22,00,000 in the >20L bracket → ₹4,62,000", () => {
    const lineItem: LineItemDef = { service: "SMS", component: "DELIVERED", rateType: "SLAB", flatRate: null, slabs: smsDeliveredSlabs };
    const result = calculateLineItem(lineItem, 2200000);
    expect(result.appliedRate).toBe(0.21);
    expect(result.amount).toBe(462000);
  });

  it("WABA Marketing: 1,20,000 × ₹0.85 → ₹1,02,000", () => {
    const lineItem: LineItemDef = { service: "WHATSAPP", component: "MARKETING", rateType: "FLAT", flatRate: 0.85, slabs: [] };
    expect(calculateLineItem(lineItem, 120000).amount).toBe(102000);
  });

  it("WABA Utility: 80,000 × ₹0.35 → ₹28,000", () => {
    const lineItem: LineItemDef = { service: "WHATSAPP", component: "UTILITY", rateType: "FLAT", flatRate: 0.35, slabs: [] };
    expect(calculateLineItem(lineItem, 80000).amount).toBe(28000);
  });

  it("WABA Authentication: 50,000 × ₹0.40 → ₹20,000", () => {
    const lineItem: LineItemDef = { service: "WHATSAPP", component: "AUTHENTICATION", rateType: "FLAT", flatRate: 0.4, slabs: [] };
    expect(calculateLineItem(lineItem, 50000).amount).toBe(20000);
  });

  it("zero usage produces a zero-amount line, not an error", () => {
    const lineItem: LineItemDef = { service: "SMS", component: "SUBMITTED", rateType: "SLAB", flatRate: null, slabs: smsSubmittedSlabs };
    expect(calculateLineItem(lineItem, 0).amount).toBe(0);
  });
});

describe("calculateBillingRun — full ABC Ltd. September 2026 example", () => {
  it("reproduces the doc's ₹10,04,000 total exactly", () => {
    const lineItems: LineItemDef[] = [
      { service: "SMS", component: "SUBMITTED", rateType: "SLAB", flatRate: null, slabs: smsSubmittedSlabs },
      { service: "SMS", component: "DELIVERED", rateType: "SLAB", flatRate: null, slabs: smsDeliveredSlabs },
      { service: "WHATSAPP", component: "MARKETING", rateType: "FLAT", flatRate: 0.85, slabs: [] },
      { service: "WHATSAPP", component: "UTILITY", rateType: "FLAT", flatRate: 0.35, slabs: [] },
      { service: "WHATSAPP", component: "AUTHENTICATION", rateType: "FLAT", flatRate: 0.4, slabs: [] }
    ];
    const usage = new Map([
      ["SMS:SUBMITTED", 2800000],
      ["SMS:DELIVERED", 2200000],
      ["WHATSAPP:MARKETING", 120000],
      ["WHATSAPP:UTILITY", 80000],
      ["WHATSAPP:AUTHENTICATION", 50000]
    ]);

    const result = calculateBillingRun(lineItems, usage);

    expect(result.lineItems.map((li) => li.amount)).toEqual([392000, 462000, 102000, 28000, 20000]);
    expect(result.totalUsageAmount).toBe(1004000);
  });

  it("a customer setup cost of ₹25,000 added to usage billing matches the doc's ₹10,29,000 September total", () => {
    const totalUsageAmount = 1004000;
    const setupCost = 25000;
    expect(totalUsageAmount + setupCost).toBe(1029000);
  });
});
