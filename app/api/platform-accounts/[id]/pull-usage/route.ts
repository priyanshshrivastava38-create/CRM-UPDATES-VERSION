import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManagePlatforms } from "@/lib/rbac";
import { getAdapter } from "@/lib/platform-adapters/registry";
import { errorResponse, ApiError } from "@/lib/api-error";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePlatforms(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  try {
    const account = await prisma.platformAccount.findUnique({ where: { id } });
    if (!account) throw new ApiError("Platform account not found", 404);

    const adapter = getAdapter(account.adapterKey);
    const rows = await adapter.pullUsage(account.externalAccountId, account.service);

    const batch = await prisma.usageImportBatch.create({
      data: {
        uploadedById: user.id,
        service: account.service,
        status: "COMPLETED",
        rowCount: rows.length,
        successCount: rows.length,
        errorCount: 0
      }
    });

    await prisma.usageRecord.createMany({
      data: rows.map((row) => ({
        importBatchId: batch.id,
        platformAccountId: account.id,
        service: row.service,
        component: row.component,
        usageDate: row.usageDate,
        quantity: row.quantity,
        sourceReference: row.sourceReference,
        rawPayload: row.rawPayload as Prisma.InputJsonValue
      }))
    });

    return NextResponse.json({ batch });
  } catch (error) {
    return errorResponse(error);
  }
}
