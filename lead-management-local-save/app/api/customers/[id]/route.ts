import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewCommercials } from "@/lib/rbac";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      accountManager: { select: { id: true, name: true } },
      opportunity: { select: { id: true, name: true } },
      ratePlans: {
        orderBy: { effectiveFrom: "desc" },
        include: { lineItems: { include: { slabs: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } } }
      },
      onboarding: { include: { tasks: { orderBy: { sortOrder: "asc" }, include: { assignedTo: { select: { id: true, name: true } } } } } },
      platformAccounts: true,
      priceApprovals: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" }, take: 30, include: { user: { select: { id: true, name: true } } } }
    }
  });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role === "SALES" && customer.accountManagerId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!canViewCommercials(user)) {
    customer.ratePlans = customer.ratePlans.map((plan) => ({
      ...plan,
      lineItems: plan.lineItems.map((li) => ({
        ...li,
        flatRate: null,
        slabs: li.slabs.map((slab) => ({ ...slab, rate: null as unknown as Prisma.Decimal }))
      }))
    }));
    customer.priceApprovals = [];
  }

  return NextResponse.json({ customer });
}
