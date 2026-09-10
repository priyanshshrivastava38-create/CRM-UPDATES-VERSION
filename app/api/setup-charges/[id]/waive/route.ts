import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageBilling } from "@/lib/rbac";
import { setupChargeWaiveSchema } from "@/lib/validators";
import { errorResponse, ApiError } from "@/lib/api-error";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageBilling(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  try {
    const current = await prisma.setupCharge.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (current.status !== "PENDING") throw new ApiError("Only a pending setup charge can be waived", 409);

    const input = setupChargeWaiveSchema.parse(await request.json());
    const charge = await prisma.setupCharge.update({
      where: { id },
      data: { status: "WAIVED", waivedById: user.id, waivedReason: input.reason, waivedAt: new Date() }
    });

    return NextResponse.json({ charge });
  } catch (error) {
    return errorResponse(error);
  }
}
