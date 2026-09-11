"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { RefreshCcw } from "lucide-react";
import { Card, Badge, Title, Info, Empty, LoadingGrid, primaryBtnClass, secondaryBtnClass } from "@/components/shared/ui";
import { dateLabel, titleCase } from "@/lib/format";

type BillableUsage = { id: string; service: string; component: string; rawQuantity: number; billableQuantity: number };
type LineItem = { id: string; service: string; component: string; billableQuantity: number; rateType: string; appliedRate: number; slabLabel?: string | null; amount: number };
type BillingRun = {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  totalUsageAmount: number;
  totalSetupAmount: number;
  totalAdjustmentAmount: number;
  totalAmount: number;
  calculatedAt?: string | null;
  customer: { id: string; customerCode: string; name: string };
  ratePlan: { id: string; effectiveFrom: string; effectiveTo?: string | null };
  billableUsages: BillableUsage[];
  lineItems: LineItem[];
  invoice?: { id: string; invoiceNumber: string; status: string } | null;
};

function statusTone(status: string) {
  if (status === "FINALIZED" || status === "INVOICED") return "green";
  if (status === "CALCULATED") return "blue";
  return "slate";
}

function periodLabel(periodStart: string) {
  return new Date(periodStart).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

export default function BillingRunDetailPage() {
  const params = useParams<{ runId: string }>();
  const router = useRouter();
  const [run, setRun] = useState<BillingRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/billing/runs/${params.runId}`);
    if (res.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setRun(data.run);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [params.runId]);

  async function recalculate() {
    setRecalculating(true);
    const res = await fetch(`/api/billing/runs/${params.runId}/recalculate`, { method: "POST" });
    setRecalculating(false);
    if (res.ok) load();
  }

  async function finalize() {
    setFinalizing(true);
    setError("");
    const res = await fetch(`/api/billing/runs/${params.runId}/finalize`, { method: "POST" });
    setFinalizing(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not finalize this run");
      return;
    }
    const data = await res.json();
    router.push(`/invoices/${data.invoice.id}`);
  }

  if (loading) return <LoadingGrid />;
  if (notFound || !run) return <Empty label="Billing run not found." />;

  const editable = run.status === "DRAFT" || run.status === "CALCULATED" || run.status === "UNDER_REVIEW";

  return (
    <div className="space-y-5">
      <Title
        title={`${run.customer.customerCode} · ${periodLabel(run.periodStart)}`}
        subtitle={`Billing run for ${run.customer.name}`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={statusTone(run.status)}>{titleCase(run.status)}</Badge>
            {editable ? (
              <button onClick={recalculate} disabled={recalculating} className={`flex items-center gap-2 ${secondaryBtnClass}`}>
                <RefreshCcw size={15} /> {recalculating ? "Recalculating..." : "Recalculate"}
              </button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold">Rate Line Items</h3>
            <div className="mt-3 space-y-3">
              {run.lineItems.map((li) => (
                <div key={li.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {titleCase(li.service)} · {li.component}
                    </span>
                    <span className="font-semibold text-ink">₹{Number(li.amount).toLocaleString("en-IN")}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {li.billableQuantity.toLocaleString("en-IN")} units × ₹{li.appliedRate} {li.slabLabel ? `(slab ${li.slabLabel})` : ""}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold">Raw vs Billable Usage</h3>
            <table className="mt-3 w-full text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-2">Service</th>
                  <th className="py-2">Component</th>
                  <th className="py-2">Raw</th>
                  <th className="py-2">Billable</th>
                </tr>
              </thead>
              <tbody>
                {run.billableUsages.map((u) => (
                  <tr key={u.id} className="border-b border-line/60">
                    <td className="py-2">{titleCase(u.service)}</td>
                    <td className="py-2">{u.component}</td>
                    <td className="py-2">{u.rawQuantity.toLocaleString("en-IN")}</td>
                    <td className="py-2">{u.billableQuantity.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold">Totals</h3>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Usage</span>
                <span>₹{Number(run.totalUsageAmount).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Setup (one-time)</span>
                <span>₹{Number(run.totalSetupAmount).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Adjustments</span>
                <span>₹{Number(run.totalAdjustmentAmount).toLocaleString("en-IN")}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-line pt-2 text-base font-semibold text-ink">
                <span>Total</span>
                <span>₹{Number(run.totalAmount).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold">Rate Plan</h3>
            <div className="mt-3 space-y-2">
              <Info label="Effective From" value={dateLabel(run.ratePlan.effectiveFrom)} />
              <Info label="Effective To" value={run.ratePlan.effectiveTo ? dateLabel(run.ratePlan.effectiveTo) : "Current"} />
              <Info label="Calculated" value={run.calculatedAt ? dateLabel(run.calculatedAt) : "Not yet calculated"} />
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold">Invoice</h3>
            {error ? <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p> : null}
            {run.invoice ? (
              <Link href={`/invoices/${run.invoice.id}`} className="mt-3 flex items-center justify-between text-brand-700 hover:text-brand-600 dark:text-brand-400">
                <span className="text-sm font-semibold">{run.invoice.invoiceNumber}</span>
                <Badge tone={statusTone(run.invoice.status)}>{titleCase(run.invoice.status)}</Badge>
              </Link>
            ) : editable ? (
              <button onClick={finalize} disabled={finalizing} className={`mt-3 w-full ${primaryBtnClass}`}>
                {finalizing ? "Finalizing..." : "Finalize & Generate Invoice"}
              </button>
            ) : (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Not finalized into an invoice yet.</p>
            )}
          </Card>

          <Link href={`/reconciliation`} className="block text-sm font-semibold text-brand-700 hover:text-brand-600 dark:text-brand-400">
            Review in Reconciliation →
          </Link>
          <Link href={`/customers/${run.customer.id}`} className="block text-sm font-semibold text-brand-700 hover:text-brand-600 dark:text-brand-400">
            View customer profile →
          </Link>
        </div>
      </div>
    </div>
  );
}
