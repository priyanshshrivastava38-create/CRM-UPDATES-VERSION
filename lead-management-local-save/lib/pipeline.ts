export type PipelineEntry = {
  status: string;
  opportunityValue: number | string | { toString(): string };
};

export type OpportunityPipelineSummary = {
  totalPipeline: number;
  openPipeline: number;
  wonValue: number;
  conversionRate: number;
  byStatus: Record<string, number>;
};

const normalizeCurrency = (value: number | string | { toString(): string }) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") return Number.parseFloat(value) || 0;
  return Number.parseFloat(value.toString()) || 0;
};

export function summarizeOpportunityPipeline(entries: PipelineEntry[]): OpportunityPipelineSummary {
  const byStatus: Record<string, number> = {
    NEW: 0,
    QUALIFYING: 0,
    PROPOSAL: 0,
    WON: 0,
    LOST: 0
  };

  let totalPipeline = 0;
  let wonValue = 0;
  let openPipeline = 0;

  for (const entry of entries) {
    const amount = normalizeCurrency(entry.opportunityValue);
    const status = entry.status;

    byStatus[status] = (byStatus[status] ?? 0) + amount;

    if (status === "WON") {
      wonValue += amount;
      totalPipeline += amount;
    }

    if (status !== "WON" && status !== "LOST") {
      openPipeline += amount;
      totalPipeline += amount;
    }
  }

  const wonOpportunities = entries.filter((entry) => entry.status === "WON").length;
  const totalOpportunities = entries.length || 1;

  return {
    totalPipeline,
    openPipeline,
    wonValue,
    conversionRate: Number(((wonOpportunities / totalOpportunities) * 100).toFixed(2)),
    byStatus
  };
}
