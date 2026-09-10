import type { LeadStatus, Priority } from "@prisma/client";

export type ScoreInput = {
  status?: LeadStatus;
  priority?: Priority;
  notes?: string | null;
  source?: string | null;
  email?: string | null;
  phone?: string | null;
  calls?: { outcome?: string | null; notes?: string | null; content?: string | null }[];
  taskCompletedCount?: number;
};

export function calculateLeadScore(input: ScoreInput) {
  let score = 35;
  const reasons: string[] = [];
  const text = `${input.notes ?? ""} ${(input.calls ?? [])
    .map((call) => `${call.outcome ?? ""} ${call.notes ?? ""} ${call.content ?? ""}`)
    .join(" ")}`.toLowerCase();

  if (input.email && input.phone) {
    score += 5;
    reasons.push("Good contact details +5");
  }
  if (input.source && ["WEBSITE", "GOOGLE", "REFERRAL", "WHATSAPP"].includes(input.source.toUpperCase())) {
    score += 8;
    reasons.push("High-intent source +8");
  }
  if (input.priority === "HOT") {
    score += 18;
    reasons.push("Marked hot priority +18");
  }
  if (text.includes("callback") || text.includes("call back")) {
    score += 20;
    reasons.push("Requested callback +20");
  }
  if (text.includes("requirement") || text.includes("need") || text.includes("demo")) {
    score += 15;
    reasons.push("Confirmed requirement +15");
  }
  if (text.includes("budget") || text.includes("pricing")) {
    score += 15;
    reasons.push("Budget/pricing discussed +15");
  }
  if ((text.includes("interested") && !text.includes("not interested")) || input.status === "INTERESTED" || input.status === "QUALIFIED") {
    score += 16;
    reasons.push("High intent signal +16");
  }
  if ((input.taskCompletedCount ?? 0) > 0) {
    score += 8;
    reasons.push("Responded to follow-up +8");
  }
  if (text.includes("not interested") || text.includes("negative")) {
    score -= 10;
    reasons.push("Negative sentiment -10");
  }
  if (input.status === "INVALID" || text.includes("wrong number")) {
    score -= 25;
    reasons.push("Invalid contact signal -25");
  }
  if (input.status === "LOST") {
    score -= 18;
    reasons.push("Marked lost -18");
  }
  if (input.status === "CONVERTED") {
    score = Math.max(score, 92);
    reasons.push("Converted customer floor 92");
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    reasons: reasons.length ? reasons : ["Base fit score +35"]
  };
}

export function priorityFromScore(score: number): Priority {
  if (score >= 75) return "HOT";
  if (score >= 45) return "WARM";
  return "COLD";
}
