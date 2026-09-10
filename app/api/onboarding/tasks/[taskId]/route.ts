import { NextResponse } from "next/server";
import { z } from "zod";
import { OnboardingTaskStatus } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageOnboardingTeam } from "@/lib/rbac";
import { updateOnboardingTask } from "@/lib/workflows/complete-onboarding-task";
import { errorResponse } from "@/lib/api-error";

const patchSchema = z.object({ status: z.nativeEnum(OnboardingTaskStatus) });

export async function PATCH(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;

  try {
    const task = await prisma.onboardingTask.findUnique({ where: { id: taskId } });
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canManageOnboardingTeam(user, task.team)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const input = patchSchema.parse(await request.json());
    const result = await updateOnboardingTask(taskId, user.id, input.status);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
