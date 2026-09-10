import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageBilling } from "@/lib/rbac";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageBilling(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const runs = await prisma.billingRun.findMany({
    where: { status: { in: ["CALCULATED", "UNDER_REVIEW", "FINALIZED", "INVOICED"] } },
    include: {
      customer: { select: { id: true, customerCode: true, name: true } },
      reconciliation: true,
      adjustments: { select: { id: true, type: true, amount: true } }
    },
    orderBy: [{ periodStart: "desc" }]
  });

  return NextResponse.json({ runs });
}
