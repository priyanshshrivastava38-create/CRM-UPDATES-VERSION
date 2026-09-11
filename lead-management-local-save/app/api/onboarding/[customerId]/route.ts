import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const allowedRoles = ["SALES", "FINANCE", "OPERATIONS", "ADMIN"];

export async function GET(_: Request, { params }: { params: Promise<{ customerId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!allowedRoles.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { customerId } = await params;
  const checklist = await prisma.onboardingChecklist.findUnique({
    where: { customerId },
    include: {
      customer: { select: { id: true, customerCode: true, name: true, status: true, accountManagerId: true, accountManager: { select: { id: true, name: true } } } },
      tasks: {
        orderBy: { sortOrder: "asc" },
        include: { assignedTo: { select: { id: true, name: true } }, completedBy: { select: { id: true, name: true } } }
      }
    }
  });
  if (!checklist) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role === "SALES" && checklist.customer.accountManagerId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ checklist });
}
