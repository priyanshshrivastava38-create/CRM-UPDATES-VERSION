import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageBilling } from "@/lib/rbac";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageBilling(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const run = await prisma.billingRun.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, customerCode: true, name: true } },
      ratePlan: { select: { id: true, effectiveFrom: true, effectiveTo: true } },
      billableUsages: { orderBy: [{ service: "asc" }, { component: "asc" }] },
      lineItems: { orderBy: { sortOrder: "asc" } },
      adjustments: true,
      reconciliation: true,
      invoice: { select: { id: true, invoiceNumber: true, status: true } }
    }
  });
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ run });
}
