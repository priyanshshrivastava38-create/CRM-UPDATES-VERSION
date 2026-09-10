export type SlabDef = { minVolume: number; maxVolume: number | null; rate: number };

export type LineItemDef = {
  service: "SMS" | "WHATSAPP";
  component: string;
  rateType: "FLAT" | "SLAB";
  flatRate: number | null;
  slabs: SlabDef[];
};

export type LineItemResult = {
  service: string;
  component: string;
  quantity: number;
  rateType: "FLAT" | "SLAB";
  appliedRate: number;
  slabLabel?: string;
  amount: number;
};

export type BillingRunCalculation = {
  lineItems: LineItemResult[];
  totalUsageAmount: number;
};
