import type { ServiceType } from "@prisma/client";
import type { PlatformAdapter, PulledUsageRow } from "./types";

function randomBetween(min: number, max: number) {
  return Math.round(min + Math.random() * (max - min));
}

export const mockAdapter: PlatformAdapter = {
  key: "MOCK",
  label: "Mock Adapter (demo data)",
  async pullUsage(externalAccountId: string, service: ServiceType): Promise<PulledUsageRow[]> {
    const usageDate = new Date();
    const pullRef = `mock-${Date.now()}`;

    if (service === "SMS") {
      const submitted = randomBetween(40000, 95000);
      const delivered = Math.round(submitted * (0.85 + Math.random() * 0.1));
      return [
        { service: "SMS", component: "SUBMITTED", usageDate, quantity: submitted, sourceReference: pullRef, rawPayload: { externalAccountId, simulated: true } },
        { service: "SMS", component: "DELIVERED", usageDate, quantity: delivered, sourceReference: pullRef, rawPayload: { externalAccountId, simulated: true } }
      ];
    }

    return [
      { service: "WHATSAPP", component: "MARKETING", usageDate, quantity: randomBetween(2000, 6000), sourceReference: pullRef, rawPayload: { externalAccountId, simulated: true } },
      { service: "WHATSAPP", component: "UTILITY", usageDate, quantity: randomBetween(1500, 4000), sourceReference: pullRef, rawPayload: { externalAccountId, simulated: true } },
      { service: "WHATSAPP", component: "AUTHENTICATION", usageDate, quantity: randomBetween(800, 2500), sourceReference: pullRef, rawPayload: { externalAccountId, simulated: true } }
    ];
  }
};
