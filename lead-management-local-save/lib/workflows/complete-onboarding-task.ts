import type { OnboardingStatus, OnboardingTaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";

export async function updateOnboardingTask(taskId: string, userId: string, status: OnboardingTaskStatus) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.onboardingTask.findUnique({
      where: { id: taskId },
      include: { checklist: { include: { tasks: true, customer: true } } }
    });
    if (!task) throw new ApiError("Onboarding task not found", 404);

    const nowCompleted = status === "COMPLETED";

    await tx.onboardingTask.update({
      where: { id: taskId },
      data: { status, completedAt: nowCompleted ? new Date() : null, completedById: nowCompleted ? userId : null }
    });

    const checklist = task.checklist;
    const siblingTasks = checklist.tasks.map((t) => (t.id === taskId ? { ...t, status } : t));
    const allRequiredDone = siblingTasks.filter((t) => t.isRequired).every((t) => t.status === "COMPLETED");
    const anyBlocked = siblingTasks.some((t) => t.status === "BLOCKED");
    const anyStarted = siblingTasks.some((t) => t.status !== "PENDING");

    let checklistStatus: OnboardingStatus = "PENDING";
    if (allRequiredDone) checklistStatus = "COMPLETED";
    else if (anyBlocked) checklistStatus = "BLOCKED";
    else if (anyStarted) checklistStatus = "IN_PROGRESS";

    const checklistBecameComplete = checklistStatus === "COMPLETED" && checklist.status !== "COMPLETED";

    await tx.onboardingChecklist.update({
      where: { id: checklist.id },
      data: {
        status: checklistStatus,
        startedAt: checklist.startedAt ?? (checklistStatus !== "PENDING" ? new Date() : null),
        completedAt: checklistStatus === "COMPLETED" ? new Date() : checklist.status === "COMPLETED" ? null : checklist.completedAt
      }
    });

    if (checklistBecameComplete && checklist.customer.status !== "ACTIVE") {
      await tx.customer.update({ where: { id: checklist.customer.id }, data: { status: "ACTIVE", activatedAt: new Date() } });
      await tx.activity.create({
        data: {
          customerId: checklist.customer.id,
          userId,
          activityType: "CUSTOMER_ACTIVATED",
          description: "Onboarding completed — customer is now Active"
        }
      });

      const recipients = await tx.user.findMany({
        where: { OR: [{ role: "FINANCE" }, { id: checklist.customer.accountManagerId }], active: true },
        select: { id: true }
      });
      await tx.notification.createMany({
        data: recipients.map((r) => ({
          userId: r.id,
          title: "Customer activated",
          message: `${checklist.customer.name} onboarding is complete — the customer is now Active.`,
          type: "ONBOARDING",
          entityType: "CUSTOMER",
          entityId: checklist.customer.id
        }))
      });
    }

    return { taskId, checklistStatus, customerActivated: checklistBecameComplete };
  });
}
