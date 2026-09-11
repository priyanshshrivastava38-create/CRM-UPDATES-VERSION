import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { userUpdateSchema } from "@/lib/validators";
import { errorResponse, ApiError } from "@/lib/api-error";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  try {
    const current = await prisma.user.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const input = userUpdateSchema.parse(await request.json());
    if (id === user.id && (input.active === false || (input.role && input.role !== "ADMIN"))) {
      throw new ApiError("You cannot deactivate or change your own role", 400);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: input,
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true }
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
