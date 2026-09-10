import { describe, expect, it } from "vitest";
import { calculateWorkloadScore, rankSalesAgents } from "./assignment";

describe("workload-based assignment", () => {
  it("prioritizes the least-loaded agent for a hot lead", () => {
    const ranked = rankSalesAgents(
      [
        { id: "agent-a", openLeads: 18, overdueTasks: 6, activeDeals: 10 },
        { id: "agent-b", openLeads: 8, overdueTasks: 1, activeDeals: 4 },
        { id: "agent-c", openLeads: 15, overdueTasks: 3, activeDeals: 7 }
      ],
      "HOT"
    );

    expect(ranked[0].id).toBe("agent-b");
  });

  it("rewards lower workload for non-hot leads", () => {
    const scoreA = calculateWorkloadScore({ openLeads: 12, overdueTasks: 3, activeDeals: 5 }, "WARM");
    const scoreB = calculateWorkloadScore({ openLeads: 7, overdueTasks: 2, activeDeals: 3 }, "WARM");

    expect(scoreA).toBeGreaterThan(scoreB);
  });
});
