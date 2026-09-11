import { z } from "zod";
import { LeadStatus, Priority, CampaignStatus, ServiceType, RateType, OpportunityStatus, AdjustmentType, AdjustmentScope, ReconciliationStatus, Role } from "@prisma/client";

export const leadSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(7),
  company: z.string().min(1),
  designation: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  source: z.string().min(1),
  status: z.nativeEnum(LeadStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  assignedTo: z.string().optional().nullable(),
  campaignId: z.string().optional().nullable(),
  nextFollowUpAt: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

export const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  type: z.string().min(1),
  status: z.string().optional(),
  priority: z.string().min(1),
  dueDate: z.string().min(1),
  assignedTo: z.string().optional().nullable(),
  leadId: z.string().optional().nullable()
});

export const callSchema = z
  .object({
    leadId: z.string().min(1),
    agentId: z.string().min(1),
    type: z.enum(["CALL", "MESSAGE", "EMAIL"]).default("CALL"),
    direction: z.string().min(1),
    status: z.string().optional().nullable(),
    outcome: z.string().optional().nullable(),
    duration: z.coerce.number().min(0).optional().nullable(),
    content: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    transcript: z.string().optional().nullable()
  })
  .refine((data) => data.type !== "CALL" || (!!data.status && !!data.outcome && data.duration != null), {
    message: "Status, outcome, and duration are required for a call",
    path: ["outcome"]
  })
  .refine((data) => !["MESSAGE", "EMAIL"].includes(data.type) || !!data.content?.trim(), {
    message: "Content is required",
    path: ["content"]
  });

export const campaignSchema = z.object({
  name: z.string().min(1),
  source: z.string().min(1),
  status: z.nativeEnum(CampaignStatus).optional(),
  startDate: z.string().min(1).refine((v) => !Number.isNaN(Date.parse(v)), { message: "Invalid start date" }),
  endDate: z
    .string()
    .optional()
    .nullable()
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), { message: "Invalid end date" }),
  budget: z.coerce.number().min(0)
});

// ---------------------------------------------------------------------------
// Opportunities
// ---------------------------------------------------------------------------

export const opportunityRequirementSchema = z.object({
  service: z.nativeEnum(ServiceType),
  expectedMonthlyVolume: z.coerce.number().int().min(0),
  notes: z.string().optional().nullable()
});

export const opportunitySchema = z.object({
  name: z.string().min(1),
  companyName: z.string().min(1),
  contactName: z.string().min(1),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(7),
  billingAddress: z.string().optional().nullable(),
  gstNumber: z.string().optional().nullable(),
  expectedStartDate: z.string().optional().nullable(),
  opportunityValue: z.coerce.number().min(0),
  salesOwnerId: z.string().min(1),
  leadId: z.string().optional().nullable(),
  requirements: z.array(opportunityRequirementSchema).optional().default([])
});

export const opportunityStatusSchema = z
  .object({
    status: z.nativeEnum(OpportunityStatus),
    lostReason: z.string().optional().nullable()
  })
  .refine((data) => data.status !== "LOST" || !!data.lostReason?.trim(), { message: "A reason is required to mark an opportunity Lost", path: ["lostReason"] });

export const opportunityDocumentSchema = z.object({
  title: z.string().min(1),
  url: z.string().url()
});

// ---------------------------------------------------------------------------
// Price Approval Requests
// ---------------------------------------------------------------------------

export const priceApprovalSlabSchema = z.object({
  minVolume: z.coerce.number().int().min(0),
  maxVolume: z.coerce.number().int().min(0).optional().nullable(),
  rate: z.coerce.number().min(0)
});

export const priceApprovalLineItemSchema = z
  .object({
    service: z.nativeEnum(ServiceType),
    component: z.string().min(1),
    rateType: z.nativeEnum(RateType),
    flatRate: z.coerce.number().min(0).optional().nullable(),
    expectedVolume: z.coerce.number().int().min(0).optional().nullable(),
    billingMetric: z.string().optional().default("PER_UNIT"),
    slabs: z.array(priceApprovalSlabSchema).optional().default([])
  })
  .refine((li) => (li.rateType === "FLAT" ? li.flatRate != null : li.slabs.length > 0), {
    message: "FLAT line items need a flat rate; SLAB line items need at least one slab",
    path: ["flatRate"]
  });

export const priceApprovalRequestSchema = z
  .object({
    opportunityId: z.string().optional().nullable(),
    customerId: z.string().optional().nullable(),
    proposedEffectiveDate: z.string().min(1).refine((v) => !Number.isNaN(Date.parse(v)), { message: "Invalid effective date" }),
    setupCost: z.coerce.number().min(0).optional().nullable(),
    paymentTerms: z.string().optional().nullable(),
    commercialTerms: z.string().optional().nullable(),
    expectedMonthlyRevenue: z.coerce.number().min(0).optional().nullable(),
    expectedMarginPct: z.coerce.number().min(0).max(100).optional().nullable(),
    reason: z.string().optional().nullable(),
    lineItems: z.array(priceApprovalLineItemSchema).min(1, "Add at least one service line item")
  })
  .refine((d) => !!d.opportunityId || !!d.customerId, { message: "Either an opportunity or an existing customer is required", path: ["opportunityId"] });

export const priceApprovalReviewSchema = z.object({
  comments: z.string().optional().nullable()
});

// ---------------------------------------------------------------------------
// Platform mapping
// ---------------------------------------------------------------------------

export const platformAccountSchema = z.object({
  customerId: z.string().min(1),
  service: z.nativeEnum(ServiceType),
  externalAccountId: z.string().min(1),
  providerName: z.string().min(1),
  adapterKey: z.string().min(1).optional()
});

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

export const billingRunCreateSchema = z.object({
  customerId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format")
});

export function monthToPeriod(month: string) {
  const [year, monthNum] = month.split("-").map(Number);
  const periodStart = new Date(Date.UTC(year, monthNum - 1, 1));
  const periodEnd = new Date(Date.UTC(year, monthNum, 1) - 1);
  return { periodStart, periodEnd };
}

// ---------------------------------------------------------------------------
// Reconciliation & Adjustments
// ---------------------------------------------------------------------------

export const reconciliationReviewSchema = z.object({
  status: z.nativeEnum(ReconciliationStatus),
  notes: z.string().optional().nullable()
});

export const adjustmentSchema = z.object({
  billingRunId: z.string().min(1),
  type: z.nativeEnum(AdjustmentType),
  scope: z.nativeEnum(AdjustmentScope),
  relatedComponent: z.string().optional().nullable(),
  oldValue: z.coerce.number().optional().nullable(),
  newValue: z.coerce.number().optional().nullable(),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  reason: z.string().min(1, "A reason is required")
});

export const setupChargeWaiveSchema = z.object({
  reason: z.string().min(1, "A reason is required")
});

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export const paymentSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  paidOn: z.string().min(1).refine((v) => !Number.isNaN(Date.parse(v)), { message: "Invalid payment date" }),
  method: z.string().optional().nullable(),
  reference: z.string().optional().nullable()
});

// ---------------------------------------------------------------------------
// User management
// ---------------------------------------------------------------------------

export const userCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.nativeEnum(Role)
});

export const userUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.nativeEnum(Role).optional(),
  active: z.boolean().optional()
});
