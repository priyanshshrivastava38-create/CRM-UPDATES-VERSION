import { NextResponse } from "next/server";
import { getSessionUser, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { userCreateSchema } from "@/lib/validators";
import { errorResponse, ApiError } from "@/lib/api-error";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const input = userCreateSchema.parse(await request.json());

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ApiError("A user with this email already exists", 409);

    const password = await hashPassword(input.password);
    const created = await prisma.user.create({
      data: { name: input.name, email: input.email, password, role: input.role },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true }
    });

    return NextResponse.json({ user: created }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
