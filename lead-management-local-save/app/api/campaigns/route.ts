import { NextResponse } from "next/server";
import { CampaignStatus } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { campaignSchema } from "@/lib/validators";
import { errorResponse } from "@/lib/api-error";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const campaigns = await prisma.campaign.findMany({
    include: { leads: { where: { deletedAt: null, ...(user.role === "SALES" ? { assignedTo: user.id } : {}) } } },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({ campaigns });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "SALES") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const data = campaignSchema.parse(await request.json());
    const campaign = await prisma.campaign.create({
      data: {
        name: data.name,
        source: data.source,
        status: (data.status ?? "ACTIVE") as CampaignStatus,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        budget: data.budget
      }
    });
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
