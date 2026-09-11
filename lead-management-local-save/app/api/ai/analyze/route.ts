import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { analyzeLead } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-error";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { leadId } = await request.json();
    if (!leadId || typeof leadId !== "string") {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { calls: true } });
    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const analysis = analyzeLead(lead);
    await prisma.activity.create({
      data: {
        leadId,
        userId: user.id,
        activityType: "AI_ANALYSIS",
        description: "Mock AI analysis generated",
        metadata: analysis
      }
    });
    return NextResponse.json({ analysis });
  } catch (error) {
    return errorResponse(error);
  }
}
