import type { OnboardingTeam } from "@prisma/client";

export type OnboardingTaskTemplate = { team: OnboardingTeam; title: string; description?: string; isRequired?: boolean };

export const onboardingTaskTemplates: OnboardingTaskTemplate[] = [
  { team: "SALES", title: "Confirm customer information", description: "Verify company name, contacts, and billing details are correct." },
  { team: "SALES", title: "Commercial confirmation", description: "Confirm the customer has accepted the approved commercial terms." },
  { team: "SALES", title: "Contract on file", description: "Upload the signed contract/agreement." },
  { team: "FINANCE", title: "GST details on file", description: "Capture and verify the customer's GST number." },
  { team: "FINANCE", title: "Billing address confirmed", description: "Confirm the invoicing address and payment terms." },
  { team: "FINANCE", title: "Approved pricing on file", description: "Confirm the approved Rate Plan matches the Price Approval Request." },
  { team: "FINANCE", title: "Setup charge recorded", description: "Confirm the one-time setup charge (if any) is recorded correctly.", isRequired: false },
  { team: "OPERATIONS", title: "API setup", description: "Provision API credentials for the customer." },
  { team: "OPERATIONS", title: "Sender / WABA configuration", description: "Configure SMS sender ID and/or WhatsApp Business Account." },
  { team: "OPERATIONS", title: "Send test message", description: "Send a test SMS/WhatsApp message end-to-end and confirm delivery." },
  { team: "OPERATIONS", title: "Technical sign-off", description: "Confirm the customer is ready to go live." }
];
