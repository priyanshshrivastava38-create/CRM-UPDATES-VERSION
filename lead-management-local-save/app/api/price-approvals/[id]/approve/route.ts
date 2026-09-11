import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canApprovePricing } from "@/lib/rbac";
import { priceApprovalReviewSchema } from "@/lib/validators";
import { approvePriceRequest } from "@/lib/workflows/approve-price-request";
import { errorResponse } from "@/lib/api-error";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canApprovePricing(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  try {
    const body = request.headers.get("content-length") === "0" ? {} : await request.json().catch(() => ({}));
    const input = priceApprovalReviewSchema.parse(body);
    const result = await approvePriceRequest(id, user.id, input.comments);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
