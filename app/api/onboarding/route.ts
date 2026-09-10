import { NextResponse } from "next/server";
import { Prisma, OnboardingStatus } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const allowedRoles = ["SALES", "FINANCE", "OPERATIONS", "ADMIN"];

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!allowedRoles.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  if (status && status !== "ALL" && !(Object.values(OnboardingStatus) as string[]).includes(status)) {
    return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
  }

  const where: Prisma.OnboardingChecklistWhereInput = {
    ...(status && status !== "ALL" ? { status: status as OnboardingStatus } : {}),
    ...(user.role === "SALES" ? { customer: { accountManagerId: user.id } } : {})
  };

  const checklists = await prisma.onboardingChecklist.findMany({
    where,
    include: {
      customer: { select: { id: true, customerCode: true, name: true, status: true, accountManager: { select: { id: true, name: true } } } },
      tasks: {
        orderBy: { sortOrder: "asc" },
        include: { assignedTo: { select: { id: true, name: true } }, completedBy: { select: { id: true, name: true } } }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ checklists });
}
