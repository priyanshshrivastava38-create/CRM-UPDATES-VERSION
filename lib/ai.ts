import type { Lead, Call } from "@prisma/client";

export function analyzeLead(lead: Lead & { calls?: Call[] }) {
  const callText = (lead.calls ?? []).map((call) => `${call.outcome ?? ""} ${call.notes ?? ""} ${call.transcript ?? ""} ${call.content ?? ""}`).join(" ");
  const text = `${lead.notes ?? ""} ${callText}`.toLowerCase();
  const hot = lead.score >= 75 || lead.priority === "HOT";
  const pricing = text.includes("pricing") || text.includes("budget");
  const callback = text.includes("callback") || text.includes("call back");
  const objection =
    text.includes("expensive") && !text.includes("not expensive") && !text.includes("inexpensive")
      ? "Pricing sensitivity"
      : text.includes("timeline")
        ? "Timeline clarity"
        : "None captured";

  return {
    mock: true,
    summary: hot
      ? `${lead.firstName} has strong interest and should be handled as a high-priority opportunity.`
      : `${lead.firstName} is active in the pipeline and needs a clear next touchpoint.`,
    intent: hot ? "High" : lead.score >= 45 ? "Medium" : "Low",
    sentiment: text.includes("not interested") ? "Negative" : hot ? "Positive" : "Neutral",
    requirement: pricing ? "Asked about pricing and package fit" : "Exploring Vih Metaverse solution fit",
    objections: objection,
    buyingTimeline: callback ? "Immediate callback requested" : hot ? "This week" : "Needs follow-up",
    recommendedNextAction: callback
      ? "Call the lead today between 4-6 PM because they requested a callback."
      : hot
        ? "Schedule a product demo and confirm budget, timeline, and decision maker."
        : "Send a concise follow-up and ask one qualifying question."
  };
}
