import { NextResponse } from "next/server";
import { Priority, TaskStatus, TaskType } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { taskSchema } from "@/lib/validators";
import { errorResponse } from "@/lib/api-error";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tasks = await prisma.task.findMany({
    where: { deletedAt: null, ...(user.role === "SALES" ? { assignedTo: user.id } : {}) },
    include: { lead: true, assignedUser: { select: { id: true, name: true } } },
    orderBy: { dueDate: "asc" }
  });
  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = taskSchema.parse(await request.json());
    if (data.leadId && user.role === "SALES") {
      const ownedLead = await prisma.lead.findUnique({ where: { id: data.leadId }, select: { assignedTo: true } });
      if (!ownedLead || ownedLead.assignedTo !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    const task = await prisma.task.create({
      data: {
        ...data,
        type: data.type as TaskType,
        status: (data.status ?? "OPEN") as TaskStatus,
        priority: data.priority as Priority,
        dueDate: new Date(data.dueDate),
        assignedTo: data.assignedTo || user.id,
        leadId: data.leadId || null
      },
      include: { lead: true, assignedUser: { select: { id: true, name: true } } }
    });

    if (task.leadId) {
      await prisma.activity.create({
        data: {
          leadId: task.leadId,
          userId: user.id,
          activityType: "TASK_CREATED",
          description: `Task created: ${task.title}`,
          metadata: { dueDate: task.dueDate }
        }
      });
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
