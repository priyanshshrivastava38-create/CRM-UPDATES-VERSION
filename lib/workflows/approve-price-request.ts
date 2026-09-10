import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { nextCustomerCode } from "@/lib/numbering";
import { onboardingTaskTemplates } from "@/lib/onboarding/templates";

export async function approvePriceRequest(requestId: string, reviewerId: string, comments?: string | null) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.priceApprovalRequest.findUnique({
      where: { id: requestId },
      include: { lineItems: { include: { slabs: true } }, opportunity: true, customer: true }
    });
    if (!request) throw new ApiError("Price approval request not found", 404);
    if (request.status !== "SUBMITTED") throw new ApiError("Only a submitted request can be approved", 409);

    const effectiveFrom = request.proposedEffectiveDate;
    let customerId = request.customerId;
    let isNewCustomer = false;

    if (!customerId) {
      if (!request.opportunity) throw new ApiError("Request has neither an opportunity nor a customer", 400);
      const opportunity = request.opportunity;
      const customerCode = await nextCustomerCode(tx);
      const customer = await tx.customer.create({
        data: {
          customerCode,
          opportunityId: opportunity.id,
          name: opportunity.companyName,
          billingAddress: opportunity.billingAddress,
          gstNumber: opportunity.gstNumber,
          contactName: opportunity.contactName,
          contactEmail: opportunity.contactEmail,
          contactPhone: opportunity.contactPhone,
          accountManagerId: opportunity.salesOwnerId,
          status: "ONBOARDING"
        }
      });
      customerId = customer.id;
      isNewCustomer = true;

      await tx.opportunity.update({ where: { id: opportunity.id }, data: { status: "WON" } });

      const templates = onboardingTaskTemplates;
      await tx.onboardingChecklist.create({
        data: {
          customerId,
          status: "PENDING",
          tasks: {
            create: templates.map((task, index) => ({
              team: task.team,
              title: task.title,
              description: task.description,
              isRequired: task.isRequired ?? true,
              sortOrder: index
            }))
          }
        }
      });
    }

    const previousActivePlan = await tx.ratePlan.findFirst({ where: { customerId, status: "ACTIVE" } });
    if (previousActivePlan) {
      await tx.ratePlan.update({
        where: { id: previousActivePlan.id },
        data: { status: "SUPERSEDED", effectiveTo: new Date(effectiveFrom.getTime() - 1) }
      });
    }

    const ratePlan = await tx.ratePlan.create({
      data: {
        customerId,
        sourceRequestId: request.id,
        effectiveFrom,
        status: "ACTIVE",
        lineItems: {
          create: request.lineItems.map((li, index) => ({
            service: li.service,
            component: li.component,
            rateType: li.rateType,
            flatRate: li.flatRate,
            billingMetric: li.billingMetric,
            sortOrder: index,
            slabs: {
              create: li.slabs.map((slab, slabIndex) => ({
                minVolume: slab.minVolume,
                maxVolume: slab.maxVolume,
                rate: slab.rate,
                sortOrder: slabIndex
              }))
            }
          }))
        }
      }
    });

    if (request.setupCost != null && Number(request.setupCost) > 0) {
      await tx.setupCharge.create({
        data: { customerId, ratePlanId: ratePlan.id, amount: request.setupCost, status: "PENDING" }
      });
    }

    const updatedRequest = await tx.priceApprovalRequest.update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
        customerId,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        reviewComments: comments ?? null
      }
    });

    await tx.activity.create({
      data: {
        customerId,
        userId: reviewerId,
        activityType: "PRICE_APPROVED",
        description: `Price approval ${request.requestNumber} approved`,
        metadata: { requestNumber: request.requestNumber }
      }
    });

    await notifyStakeholders(tx, { requestNumber: request.requestNumber, requestedById: request.requestedById, isNewCustomer });

    return { customerId, ratePlanId: ratePlan.id, request: updatedRequest };
  }, { timeout: 15000 });
}

async function notifyStakeholders(
  tx: Prisma.TransactionClient,
  { requestNumber, requestedById, isNewCustomer }: { requestNumber: string; requestedById: string; isNewCustomer: boolean }
) {
  const roles = isNewCustomer ? (["FINANCE", "OPERATIONS"] as const) : (["FINANCE"] as const);
  const recipients = await tx.user.findMany({ where: { role: { in: [...roles] }, active: true }, select: { id: true } });
  const recipientIds = new Set([...recipients.map((r) => r.id), requestedById]);

  await tx.notification.createMany({
    data: [...recipientIds].map((userId) => ({
      userId,
      title: "Pricing approved",
      message: `${requestNumber} was approved. The Rate Plan is now active${isNewCustomer ? " and onboarding has started" : ""}.`,
      type: "PRICE_APPROVAL",
      entityType: "PRICE_APPROVAL",
      entityId: requestNumber
    }))
  });
}
