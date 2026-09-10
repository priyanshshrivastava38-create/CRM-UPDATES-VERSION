import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canApprovePricing } from "@/lib/rbac";
import { errorResponse, ApiError } from "@/lib/api-error";
import { z } from "zod";

const returnSchema = z.object({ comments: z.string().min(1, "A reason is required") });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canApprovePricing(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  try {
    const current = await prisma.priceApprovalRequest.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (current.status !== "SUBMITTED") throw new ApiError("Only a submitted request can be sent back for revision", 409);

    const input = returnSchema.parse(await request.json());

    const updated = await prisma.$transaction(async (tx) => {
      const request_ = await tx.priceApprovalRequest.update({
        where: { id },
        data: { status: "RETURNED_FOR_REVISION", reviewedById: user.id, reviewedAt: new Date(), reviewComments: input.comments }
      });
      await tx.notification.create({
        data: {
          userId: current.requestedById,
          title: "Pricing request sent back for revision",
          message: `${request_.requestNumber} needs changes: ${input.comments}`,
          type: "PRICE_APPROVAL",
          entityType: "PRICE_APPROVAL",
          entityId: request_.requestNumber
        }
      });
      return request_;
    });

    return NextResponse.json({ request: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
