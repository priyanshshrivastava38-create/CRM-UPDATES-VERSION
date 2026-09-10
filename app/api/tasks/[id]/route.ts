import { NextResponse } from "next/server";
import { Priority, TaskStatus, TaskType } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { taskSchema } from "@/lib/validators";
import { errorResponse } from "@/lib/api-error";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const current = await prisma.task.findUnique({ where: { id } });
  if (!current || current.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role === "SALES" && current.assignedTo !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const patch = taskSchema.partial().parse(await request.json());
    const task = await prisma.task.update({
      where: { id },
      data: {
        ...patch,
        type: patch.type as TaskType | undefined,
        status: patch.status as TaskStatus | undefined,
        priority: patch.priority as Priority | undefined,
        dueDate: patch.dueDate ? new Date(patch.dueDate) : undefined,
        assignedTo: patch.assignedTo === "" ? null : patch.assignedTo,
        leadId: patch.leadId === "" ? null : patch.leadId
      },
      include: { lead: true, assignedUser: { select: { id: true, name: true } } }
    });

    if (task.leadId && patch.status === "COMPLETED") {
      await prisma.activity.create({
        data: {
          leadId: task.leadId,
          userId: user.id,
          activityType: "TASK_COMPLETED",
          description: `Completed follow-up: ${task.title}`,
          metadata: { taskId: task.id }
        }
      });
    }

    return NextResponse.json({ task });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const current = await prisma.task.findUnique({ where: { id } });
  if (!current || current.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role === "SALES" && current.assignedTo !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.task.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
