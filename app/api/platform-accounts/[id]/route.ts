import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManagePlatforms } from "@/lib/rbac";
import { errorResponse, ApiError } from "@/lib/api-error";
import { z } from "zod";
import { PlatformAccountStatus } from "@prisma/client";

const patchSchema = z.object({
  providerName: z.string().min(1).optional(),
  status: z.nativeEnum(PlatformAccountStatus).optional()
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const account = await prisma.platformAccount.findUnique({
    where: { id },
    include: { customer: { select: { id: true, customerCode: true, name: true } } }
  });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ account });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePlatforms(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  try {
    const current = await prisma.platformAccount.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const input = patchSchema.parse(await request.json());
    const account = await prisma.platformAccount.update({
      where: { id },
      data: input,
      include: { customer: { select: { id: true, customerCode: true, name: true } } }
    });
    return NextResponse.json({ account });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePlatforms(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const current = await prisma.platformAccount.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const usageCount = await prisma.usageRecord.count({ where: { platformAccountId: id } });
  if (usageCount > 0) {
    return errorResponse(new ApiError("Cannot delete a platform account with usage history — deactivate it instead", 409));
  }

  await prisma.platformAccount.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
