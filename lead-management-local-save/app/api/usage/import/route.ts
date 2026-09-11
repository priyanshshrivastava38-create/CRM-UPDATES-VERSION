import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManagePlatforms } from "@/lib/rbac";
import { parseUsageCsv } from "@/lib/usage-import";
import { errorResponse, ApiError } from "@/lib/api-error";
import type { ImportStatus } from "@prisma/client";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePlatforms(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const formData = await request.formData();
    const platformAccountId = formData.get("platformAccountId");
    const file = formData.get("file");
    if (typeof platformAccountId !== "string" || !platformAccountId) throw new ApiError("A platform account is required", 400);
    if (!(file instanceof File)) throw new ApiError("A CSV file is required", 400);
    if (file.size > 2 * 1024 * 1024) throw new ApiError("CSV file is too large (max 2MB)", 400);

    const account = await prisma.platformAccount.findUnique({ where: { id: platformAccountId } });
    if (!account) throw new ApiError("Platform account not found", 404);

    const text = await file.text();
    const { rows, errors } = parseUsageCsv(text);

    const status: ImportStatus = rows.length === 0 ? "FAILED" : errors.length ? "PARTIAL" : "COMPLETED";

    const batch = await prisma.usageImportBatch.create({
      data: {
        uploadedById: user.id,
        fileName: file.name,
        service: account.service,
        status,
        rowCount: rows.length + errors.length,
        successCount: rows.length,
        errorCount: errors.length,
        errorLog: errors.length ? errors : undefined
      }
    });

    if (rows.length) {
      await prisma.usageRecord.createMany({
        data: rows.map((row) => ({
          importBatchId: batch.id,
          platformAccountId: account.id,
          service: account.service,
          component: row.component,
          usageDate: row.usageDate,
          quantity: row.quantity,
          sourceReference: row.sourceReference,
          rawPayload: { source: "csv", fileName: file.name }
        }))
      });
    }

    return NextResponse.json({ batch });
  } catch (error) {
    return errorResponse(error);
  }
}
