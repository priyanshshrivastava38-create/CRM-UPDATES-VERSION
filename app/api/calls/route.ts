import { NextResponse } from "next/server";
import { CallDirection, CallStatus, ConversationType } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { analyzeLead } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { calculateLeadScore, priorityFromScore } from "@/lib/scoring";
import { callSchema } from "@/lib/validators";
import { errorResponse } from "@/lib/api-error";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const calls = await prisma.call.findMany({
    where: user.role === "SALES" ? { agentId: user.id } : {},
    include: { lead: true, agent: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  return NextResponse.json({ calls });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = callSchema.parse(await request.json());
    if (data.agentId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (user.role === "SALES") {
      const ownedLead = await prisma.lead.findUnique({ where: { id: data.leadId }, select: { assignedTo: true } });
      if (!ownedLead || ownedLead.assignedTo !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    const isCall = data.type === "CALL";
    const isMessage = data.type === "MESSAGE";
    const isEmail = data.type === "EMAIL";

    const call = await prisma.call.create({
      data: {
        leadId: data.leadId,
        agentId: data.agentId,
        type: data.type as ConversationType,
        direction: data.direction as CallDirection,
        status: isCall ? (data.status as CallStatus | null) : null,
        outcome: isCall || isEmail ? data.outcome : null,
        duration: isCall ? data.duration : null,
        content: isCall ? null : data.content,
        notes: data.notes,
        transcript: data.transcript
      },
      include: { lead: { include: { calls: true, tasks: true } }, agent: { select: { id: true, name: true } } }
    });

    const scoreResult = calculateLeadScore({
      ...call.lead,
      calls: [...call.lead.calls, call],
      taskCompletedCount: call.lead.tasks.filter((task) => task.status === "COMPLETED").length
    });

    await prisma.lead.update({
      where: { id: data.leadId },
      data: {
        status: isCall && call.outcome?.toLowerCase().includes("interested") ? "INTERESTED" : "CONTACTED",
        lastContactedAt: new Date(),
        score: scoreResult.score,
        priority: priorityFromScore(scoreResult.score),
        activities: {
          create: {
            userId: user.id,
            activityType: isEmail ? "EMAIL_LOGGED" : isMessage ? "MESSAGE_LOGGED" : "CALL_LOGGED",
            description: isEmail
              ? `Email logged: ${call.outcome || call.content}`
              : isMessage
                ? `Message logged: ${call.content}`
                : `Call logged: ${call.outcome}`,
            metadata: isCall ? { duration: call.duration, score: scoreResult.score, status: call.status } : { score: scoreResult.score }
          }
        }
      }
    });

    const lead = await prisma.lead.findUnique({ where: { id: data.leadId }, include: { calls: true } });
    return NextResponse.json({ call, analysis: lead ? analyzeLead(lead) : null }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
