import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageBilling } from "@/lib/rbac";
import { adjustmentSchema } from "@/lib/validators";
import { createAdjustment } from "@/lib/workflows/create-adjustment";
import { errorResponse } from "@/lib/api-error";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageBilling(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const billingRunId = searchParams.get("billingRunId");

  const adjustments = await prisma.adjustment.findMany({
    where: billingRunId ? { billingRunId } : undefined,
    include: { requestedBy: { select: { id: true, name: true } }, billingRun: { select: { id: true, customerId: true } } },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ adjustments });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageBilling(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const input = adjustmentSchema.parse(await request.json());
    const adjustment = await createAdjustment(input, user.id);
    return NextResponse.json({ adjustment }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
