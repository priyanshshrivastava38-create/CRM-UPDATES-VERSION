import type { InvoiceLineType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { nextInvoiceNumber } from "@/lib/numbering";

function resolveNetDays(paymentTerms: string | null | undefined) {
  const match = paymentTerms?.match(/(\d+)/);
  return match ? Number(match[1]) : 30;
}

export async function finalizeBillingRun(billingRunId: string, userId: string) {
  return prisma.$transaction(
    async (tx) => {
      const run = await tx.billingRun.findUnique({
        where: { id: billingRunId },
        include: { lineItems: true, adjustments: true, invoice: true, ratePlan: { include: { sourceRequest: true } } }
      });
      if (!run) throw new ApiError("Billing run not found", 404);
      if (!["CALCULATED", "UNDER_REVIEW"].includes(run.status)) throw new ApiError("Only a calculated run can be finalized", 409);
      if (run.invoice) throw new ApiError("This run has already been invoiced", 409);

      const now = new Date();
      const invoiceNumber = await nextInvoiceNumber(tx, now.getUTCFullYear());
      const netDays = resolveNetDays(run.ratePlan.sourceRequest.paymentTerms);
      const dueDate = new Date(now.getTime() + netDays * 24 * 60 * 60 * 1000);

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          billingRunId: run.id,
          customerId: run.customerId,
          periodStart: run.periodStart,
          periodEnd: run.periodEnd,
          issueDate: now,
          dueDate,
          subtotal: run.totalUsageAmount,
          setupCharges: run.totalSetupAmount,
          adjustmentsTotal: run.totalAdjustmentAmount,
          totalAmount: run.totalAmount,
          status: "ISSUED"
        }
      });

      const lineItems: {
        invoiceId: string;
        lineType: InvoiceLineType;
        service?: "SMS" | "WHATSAPP";
        component?: string;
        description: string;
        quantity?: number;
        rate?: number;
        amount: number;
        sortOrder: number;
      }[] = run.lineItems.map((li, index) => ({
        invoiceId: invoice.id,
        lineType: "USAGE",
        service: li.service,
        component: li.component,
        description: `${li.service} — ${li.component}`,
        quantity: li.billableQuantity,
        rate: Number(li.appliedRate),
        amount: Number(li.amount),
        sortOrder: index
      }));

      if (Number(run.totalSetupAmount) > 0) {
        lineItems.push({
          invoiceId: invoice.id,
          lineType: "SETUP",
          description: "One-time setup charge",
          amount: Number(run.totalSetupAmount),
          sortOrder: lineItems.length
        });
      }

      run.adjustments.forEach((adjustment) => {
        lineItems.push({
          invoiceId: invoice.id,
          lineType: "ADJUSTMENT",
          component: adjustment.relatedComponent ?? undefined,
          description: adjustment.reason,
          amount: adjustment.type === "CREDIT" ? -Number(adjustment.amount) : Number(adjustment.amount),
          sortOrder: lineItems.length
        });
      });

      await tx.invoiceLineItem.createMany({ data: lineItems });

      await tx.billingRun.update({ where: { id: run.id }, data: { status: "INVOICED", finalizedAt: now, finalizedById: userId } });

      await tx.activity.create({
        data: {
          customerId: run.customerId,
          userId,
          activityType: "INVOICE_ISSUED",
          description: `Invoice ${invoiceNumber} issued`,
          metadata: { invoiceNumber, totalAmount: Number(run.totalAmount) }
        }
      });

      return invoice;
    },
    { timeout: 15000 }
  );
}
