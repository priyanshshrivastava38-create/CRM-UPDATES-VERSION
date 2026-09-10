import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canManageBilling } from "@/lib/rbac";
import { finalizeBillingRun } from "@/lib/workflows/finalize-billing-run";
import { errorResponse } from "@/lib/api-error";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageBilling(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  try {
    const invoice = await finalizeBillingRun(id, user.id);
    return NextResponse.json({ invoice });
  } catch (error) {
    return errorResponse(error);
  }
}
