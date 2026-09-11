import { NextResponse } from "next/server";
import { Prisma, BillingRunStatus } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageBilling } from "@/lib/rbac";
import { billingRunCreateSchema, monthToPeriod } from "@/lib/validators";
import { runBillingForCustomer } from "@/lib/workflows/run-billing";
import { errorResponse } from "@/lib/api-error";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageBilling(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");
  const status = searchParams.get("status");
  if (status && status !== "ALL" && !(Object.values(BillingRunStatus) as string[]).includes(status)) {
    return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
  }

  const where: Prisma.BillingRunWhereInput = {
    ...(customerId ? { customerId } : {}),
    ...(status && status !== "ALL" ? { status: status as BillingRunStatus } : {})
  };

  const runs = await prisma.billingRun.findMany({
    where,
    include: { customer: { select: { id: true, customerCode: true, name: true } } },
    orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }]
  });

  return NextResponse.json({ runs });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageBilling(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const input = billingRunCreateSchema.parse(await request.json());
    const { periodStart, periodEnd } = monthToPeriod(input.month);
    const run = await runBillingForCustomer(input.customerId, periodStart, periodEnd);
    return NextResponse.json({ run }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
