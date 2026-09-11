import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { normalizeOrganizationInput } from "@/lib/crm-entities";
import { prisma } from "@/lib/prisma";

const organizationSchema = z.object({
  name: z.string().min(1),
  industry: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")),
  tags: z.array(z.string()).optional().default([])
});

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const where: Prisma.OrganizationWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { industry: { contains: q, mode: "insensitive" } },
          { city: { contains: q, mode: "insensitive" } },
          { country: { contains: q, mode: "insensitive" } }
        ]
      }
    : {};

  const organizations = await prisma.organization.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { contacts: true, leads: true }
  });

  return NextResponse.json({ organizations });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const payload = organizationSchema.parse(await request.json());
    const normalized = normalizeOrganizationInput(payload);

    const existing = await prisma.organization.findFirst({
      where: { name: { equals: normalized.name, mode: "insensitive" } }
    });

    if (existing) {
      return NextResponse.json({ organization: existing, duplicate: true }, { status: 200 });
    }

    const organization = await prisma.organization.create({
      data: {
        name: normalized.name,
        industry: normalized.industry || null,
        website: normalized.website || null,
        city: normalized.city || null,
        country: normalized.country || null,
        phone: payload.phone || null,
        email: payload.email || null,
        tags: payload.tags
      }
    });

    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Invalid organization payload" }, { status: 400 });
  }
}
