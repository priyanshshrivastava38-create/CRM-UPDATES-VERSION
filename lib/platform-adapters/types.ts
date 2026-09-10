import type { ServiceType } from "@prisma/client";

export type PulledUsageRow = {
  service: ServiceType;
  component: string;
  usageDate: Date;
  quantity: number;
  sourceReference?: string;
  rawPayload?: Record<string, unknown>;
};

export interface PlatformAdapter {
  key: string;
  label: string;
  pullUsage(externalAccountId: string, service: ServiceType): Promise<PulledUsageRow[]>;
}
