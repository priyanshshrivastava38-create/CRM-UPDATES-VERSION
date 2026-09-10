import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageBilling } from "@/lib/rbac";
import { reconciliationReviewSchema } from "@/lib/validators";
import { getOrCreateReconciliation } from "@/lib/workflows/reconcile-billing-run";
import { errorResponse } from "@/lib/api-error";

export async function GET(_: Request, { params }: { params: Promise<{ billingRunId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageBilling(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { billingRunId } = await params;

  try {
    await getOrCreateReconciliation(billingRunId);
    const billingRun = await prisma.billingRun.findUnique({
      where: { id: billingRunId },
      include: {
        customer: { select: { id: true, customerCode: true, name: true } },
        billableUsages: true,
        lineItems: true,
        reconciliation: { include: { reviewedBy: { select: { id: true, name: true } } } },
        adjustments: { include: { requestedBy: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } }
      }
    });
    return NextResponse.json({ billingRun });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ billingRunId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageBilling(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { billingRunId } = await params;

  try {
    await getOrCreateReconciliation(billingRunId);
    const input = reconciliationReviewSchema.parse(await request.json());
    const reconciliation = await prisma.reconciliation.update({
      where: { billingRunId },
      data: { status: input.status, notes: input.notes, reviewedById: user.id, reviewedAt: new Date() }
    });
    return NextResponse.json({ reconciliation });
  } catch (error) {
    return errorResponse(error);
  }
}
