import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManagePlatforms } from "@/lib/rbac";
import { platformAccountSchema } from "@/lib/validators";
import { errorResponse, ApiError } from "@/lib/api-error";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");

  const accounts = await prisma.platformAccount.findMany({
    where: customerId ? { customerId } : undefined,
    include: { customer: { select: { id: true, customerCode: true, name: true } } },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ accounts });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePlatforms(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const input = platformAccountSchema.parse(await request.json());

    const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) throw new ApiError("Customer not found", 404);

    const existing = await prisma.platformAccount.findUnique({
      where: { service_externalAccountId: { service: input.service, externalAccountId: input.externalAccountId } }
    });
    if (existing) throw new ApiError("This platform account ID is already mapped to a customer", 409);

    const account = await prisma.platformAccount.create({
      data: {
        customerId: input.customerId,
        service: input.service,
        externalAccountId: input.externalAccountId,
        providerName: input.providerName,
        adapterKey: input.adapterKey || "MOCK",
        status: "ACTIVE"
      },
      include: { customer: { select: { id: true, customerCode: true, name: true } } }
    });

    await prisma.activity.create({
      data: {
        customerId: input.customerId,
        userId: user.id,
        activityType: "PLATFORM_MAPPED",
        description: `Mapped ${input.service} account ${input.externalAccountId} (${input.providerName})`
      }
    });

    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
