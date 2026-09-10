"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, Title, Empty, LoadingGrid, fieldClass } from "@/components/shared/ui";
import { titleCase } from "@/lib/format";

type Status = "green" | "amber" | "red";
type Snapshot = {
  month: string;
  sales: { newLeads: number; newOpportunities: number; wonCustomers: number; pipelineValue: number; approvedPricingRequests: number; status: Status };
  priceApprovals: { pending: number; approved: number; rejected: number; approvedValue: number; status: Status };
  onboarding: { newCustomers: number; activated: number; inProgress: number; delayed: number; status: Status };
  customers: { total: number; new: number; active: number; inactive: number };
  usage: { smsSubmitted: number; smsDelivered: number; wabaByCategory: { category: string; quantity: number }[] };
  billing: { serviceWise: { SMS: number; WHATSAPP: number }; setupCharges: number; totalBilling: number; previousMonthTotal: number; growthPct: number | null };
  finance: { billingCompleted: number; pendingReconciliation: number; creditsTotal: number; debitsTotal: number; outstanding: number; overdue: number; status: Status };
  operations: { customersPendingActivation: number; technicalTasksPending: number; platformIssues: number; status: Status };
  collections: { invoicesRaised: number; outstandingCount: number; outstandingAmount: number; overdueCount: number; overdueAmount: number; collectionsReceived: number; status: Status };
  alerts: { severity: "amber" | "red"; message: string }[];
};

function statusDot(s: Status) {
  const colors: Record<Status, string> = { green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500" };
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${colors[s]}`} />;
}

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function SectionHeader({ title, s }: { title: string; s?: Status }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="font-semibold text-ink">{title}</h3>
      {s ? statusDot(s) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-semibold text-ink">{value}</div>
    </div>
  );
}

export default function CeoSnapshotPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/dashboards/ceo-snapshot?month=${month}`);
      if (res.status === 403) {
        setForbidden(true);
        setLoading(false);
        return;
      }
      if (res.ok) setData(await res.json());
      setLoading(false);
    }
    load();
  }, [month]);

  if (forbidden) return <Empty label="You don't have access to the CEO Snapshot." />;

  return (
    <div className="space-y-5">
      <Title
        title="CEO Snapshot"
        subtitle="One monthly, summary-first view across Sales, Onboarding, Usage, Billing, Finance, and Operations."
        action={<input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={`h-10 w-44 ${fieldClass}`} />}
      />

      {loading || !data ? (
        <LoadingGrid />
      ) : (
        <div className="space-y-5">
          {data.alerts.length ? (
            <Card className="border-amber-300 dark:border-amber-800">
              <div className="flex items-center gap-2 font-semibold text-ink">
                <AlertTriangle size={16} className="text-amber-500" /> Management Exceptions / Alerts
              </div>
              <div className="mt-3 space-y-2">
                {data.alerts.map((alert, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {statusDot(alert.severity)}
                    <span className="text-slate-700 dark:text-slate-200">{alert.message}</span>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="border-emerald-300 dark:border-emerald-800">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">{statusDot("green")} No exceptions this month — all clear.</div>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Card>
              <SectionHeader title="Sales" s={data.sales.status} />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Metric label="New Leads" value={data.sales.newLeads} />
                <Metric label="New Opportunities" value={data.sales.newOpportunities} />
                <Metric label="Won Customers" value={data.sales.wonCustomers} />
                <Metric label="Pipeline Value" value={inr(data.sales.pipelineValue)} />
                <Metric label="Approved Pricing" value={data.sales.approvedPricingRequests} />
              </div>
            </Card>

            <Card>
              <SectionHeader title="Price Approvals" s={data.priceApprovals.status} />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Metric label="Pending" value={data.priceApprovals.pending} />
                <Metric label="Approved" value={data.priceApprovals.approved} />
                <Metric label="Rejected" value={data.priceApprovals.rejected} />
                <Metric label="Approved Value" value={inr(data.priceApprovals.approvedValue)} />
              </div>
            </Card>

            <Card>
              <SectionHeader title="Customer Onboarding" s={data.onboarding.status} />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Metric label="New Customers" value={data.onboarding.newCustomers} />
                <Metric label="Activated" value={data.onboarding.activated} />
                <Metric label="In Progress" value={data.onboarding.inProgress} />
                <Metric label="Delayed / Blocked" value={data.onboarding.delayed} />
              </div>
            </Card>

            <Card>
              <SectionHeader title="Customers" />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Metric label="Total" value={data.customers.total} />
                <Metric label="New" value={data.customers.new} />
                <Metric label="Active" value={data.customers.active} />
                <Metric label="Inactive" value={data.customers.inactive} />
              </div>
            </Card>

            <Card>
              <SectionHeader title="Usage" />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Metric label="SMS Submitted" value={data.usage.smsSubmitted.toLocaleString("en-IN")} />
                <Metric label="SMS Delivered" value={data.usage.smsDelivered.toLocaleString("en-IN")} />
                {data.usage.wabaByCategory.map((c) => (
                  <Metric key={c.category} label={`WABA ${titleCase(c.category)}`} value={c.quantity.toLocaleString("en-IN")} />
                ))}
              </div>
            </Card>

            <Card>
              <SectionHeader title="Revenue / Billing" />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Metric label="SMS Billing" value={inr(data.billing.serviceWise.SMS)} />
                <Metric label="WABA Billing" value={inr(data.billing.serviceWise.WHATSAPP)} />
                <Metric label="Setup Charges" value={inr(data.billing.setupCharges)} />
                <Metric label="Total Billing" value={inr(data.billing.totalBilling)} />
                <Metric label="Previous Month" value={inr(data.billing.previousMonthTotal)} />
                <Metric label="Growth" value={data.billing.growthPct != null ? `${data.billing.growthPct > 0 ? "+" : ""}${data.billing.growthPct}%` : "—"} />
              </div>
            </Card>

            <Card>
              <SectionHeader title="Finance" s={data.finance.status} />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Metric label="Billing Reviewed" value={data.finance.billingCompleted} />
                <Metric label="Pending Reconciliation" value={data.finance.pendingReconciliation} />
                <Metric label="Credits" value={inr(data.finance.creditsTotal)} />
                <Metric label="Debits" value={inr(data.finance.debitsTotal)} />
                <Metric label="Outstanding" value={inr(data.finance.outstanding)} />
                <Metric label="Overdue" value={inr(data.finance.overdue)} />
              </div>
            </Card>

            <Card>
              <SectionHeader title="Operations" s={data.operations.status} />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Metric label="Pending Activation" value={data.operations.customersPendingActivation} />
                <Metric label="Technical Tasks Pending" value={data.operations.technicalTasksPending} />
                <Metric label="Platform Issues" value={data.operations.platformIssues} />
              </div>
            </Card>

            <Card>
              <SectionHeader title="Collections" s={data.collections.status} />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Metric label="Invoices Raised" value={data.collections.invoicesRaised} />
                <Metric label="Outstanding" value={inr(data.collections.outstandingAmount)} />
                <Metric label="Overdue" value={inr(data.collections.overdueAmount)} />
                <Metric label="Collected" value={inr(data.collections.collectionsReceived)} />
              </div>
            </Card>
          </div>

          <Card>
            <h3 className="font-semibold text-ink">Drill-down</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Total Billing → <Link href="/billing" className="text-brand-700 hover:underline dark:text-brand-400">Service</Link> → Component/Category → Usage → Rate → Calculation, via the{" "}
              <Link href="/billing" className="text-brand-700 hover:underline dark:text-brand-400">Billing</Link> module. New Customers →{" "}
              <Link href="/customers" className="text-brand-700 hover:underline dark:text-brand-400">Customer</Link> → <Link href="/onboarding" className="text-brand-700 hover:underline dark:text-brand-400">Onboarding</Link> → Pending Task → Team.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
