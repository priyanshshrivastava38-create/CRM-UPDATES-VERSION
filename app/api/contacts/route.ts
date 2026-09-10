import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { normalizeContactInput } from "@/lib/crm-entities";
import { prisma } from "@/lib/prisma";

const contactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  jobTitle: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  organizationName: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const where: Prisma.ContactWhereInput = q
    ? {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { organization: { is: { name: { contains: q, mode: "insensitive" } } } }
        ]
      }
    : {};

  const contacts = await prisma.contact.findMany({
    where,
    include: { organization: true },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  return NextResponse.json({ contacts });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const payload = contactSchema.parse(await request.json());
    const normalized = normalizeContactInput(payload);

    let organizationId: string | null = null;
    if (payload.organizationName?.trim()) {
      const organization = await prisma.organization.findFirst({
        where: { name: { equals: payload.organizationName.trim(), mode: "insensitive" } }
      });

      if (organization) {
        organizationId = organization.id;
      } else {
        const createdOrganization = await prisma.organization.create({
          data: {
            name: payload.organizationName.trim(),
            city: payload.city ?? null,
            country: payload.country ?? null
          }
        });
        organizationId = createdOrganization.id;
      }
    }

    const contact = await prisma.contact.create({
      data: {
        firstName: normalized.firstName,
        lastName: normalized.lastName,
        email: normalized.email || null,
        phone: normalized.phone || null,
        jobTitle: payload.jobTitle ?? null,
        department: payload.department ?? null,
        organizationId,
        city: payload.city ?? null,
        country: payload.country ?? null,
        notes: payload.notes ?? null
      },
      include: { organization: true }
    });

    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Invalid contact payload" }, { status: 400 });
  }
}
