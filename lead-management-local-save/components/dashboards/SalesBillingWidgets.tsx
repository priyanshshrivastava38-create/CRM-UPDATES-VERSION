"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/shared/ui";
import { titleCase } from "@/lib/format";

type Data = {
  customerStatusCounts: { ONBOARDING: number; ACTIVE: number; INACTIVE: number; SUSPENDED: number };
  serviceUsage: { service: string; quantity: number }[];
  currentMonthBilling: number;
  previousMonthBilling: number;
  growthPct: number | null;
  opportunityPipelineValue: number;
};

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function SalesBillingWidgets() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    fetch("/api/dashboards/sales")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData);
  }, []);

  if (!data) return null;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <h3 className="font-semibold text-ink">My Customers</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          {Object.entries(data.customerStatusCounts).map(([status, count]) => (
            <div key={status}>
              <div className="text-xs text-slate-500 dark:text-slate-400">{titleCase(status)}</div>
              <div className="mt-1 text-lg font-semibold text-ink">{count}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h3 className="font-semibold text-ink">Billing (This Month)</h3>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Current</span>
            <span className="font-semibold text-ink">{inr(data.currentMonthBilling)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Previous Month</span>
            <span>{inr(data.previousMonthBilling)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Growth</span>
            <span>{data.growthPct != null ? `${data.growthPct > 0 ? "+" : ""}${data.growthPct}%` : "—"}</span>
          </div>
        </div>
      </Card>
      <Card>
        <h3 className="font-semibold text-ink">Pipeline & Usage</h3>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Open Pipeline Value</span>
            <span className="font-semibold text-ink">{inr(data.opportunityPipelineValue)}</span>
          </div>
          {data.serviceUsage.map((u) => (
            <div key={u.service} className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">{titleCase(u.service)} Usage</span>
              <span>{u.quantity.toLocaleString("en-IN")}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
