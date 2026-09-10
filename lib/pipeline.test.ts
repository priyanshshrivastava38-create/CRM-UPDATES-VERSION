import { describe, expect, it } from "vitest";
import { summarizeOpportunityPipeline } from "./pipeline";

describe("opportunity pipeline summary", () => {
  it("aggregates open pipeline and won values correctly", () => {
    const summary = summarizeOpportunityPipeline([
      { status: "NEW", opportunityValue: 250000 },
      { status: "PROPOSAL", opportunityValue: 300000 },
      { status: "WON", opportunityValue: 600000 },
      { status: "LOST", opportunityValue: 120000 },
      { status: "QUALIFYING", opportunityValue: 400000 }
    ]);

    expect(summary.totalPipeline).toBe(1550000);
    expect(summary.wonValue).toBe(600000);
    expect(summary.openPipeline).toBe(950000);
    expect(summary.byStatus.NEW).toBe(250000);
    expect(summary.byStatus.PROPOSAL).toBe(300000);
  });

  it("calculates conversion rate based on won versus total opportunities", () => {
    const summary = summarizeOpportunityPipeline([
      { status: "WON", opportunityValue: 200000 },
      { status: "WON", opportunityValue: 300000 },
      { status: "LOST", opportunityValue: 100000 },
      { status: "NEW", opportunityValue: 500000 }
    ]);

    expect(summary.conversionRate).toBe(50);
  });
});
