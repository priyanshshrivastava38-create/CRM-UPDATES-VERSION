import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canManageBilling } from "@/lib/rbac";
import { recalculateBillingRun } from "@/lib/workflows/run-billing";
import { errorResponse } from "@/lib/api-error";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageBilling(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  try {
    const run = await recalculateBillingRun(id);
    return NextResponse.json({ run });
  } catch (error) {
    return errorResponse(error);
  }
}
