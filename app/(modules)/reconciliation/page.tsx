"use client";

import { useEffect, useState } from "react";
import { Card, Badge, Title, Textarea, Select, Input, Info, Empty, LoadingGrid, Drawer, primaryBtnClass, secondaryBtnClass } from "@/components/shared/ui";
import { dateLabel, titleCase } from "@/lib/format";

type Customer = { id: string; customerCode: string; name: string };
type Reconciliation = { id: string; status: string; totalRawQuantity: number; totalBillableQuantity: number; varianceQuantity: number; notes?: string | null; reviewedBy?: { name: string } | null; reviewedAt?: string | null };
type Adjustment = { id: string; type: string; scope: string; amount: number; reason: string; relatedComponent?: string | null; createdAt: string; requestedBy?: { name: string } };
type BillableUsage = { id: string; service: string; component: string; rawQuantity: number; billableQuantity: number };
type BillingRun = {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  totalUsageAmount: number;
  totalAdjustmentAmount: number;
  totalAmount: number;
  customer: Customer;
  reconciliation?: Reconciliation | null;
  adjustments?: Adjustment[];
  billableUsages?: BillableUsage[];
};

const reconStatuses = ["PENDING", "MATCHED", "DISCREPANCY", "RESOLVED"];
const adjustmentTypes = ["CREDIT", "DEBIT"];
const adjustmentScopes = ["USAGE", "AMOUNT"];

function reconTone(status?: string) {
  if (status === "MATCHED" || status === "RESOLVED") return "green";
  if (status === "DISCREPANCY") return "red";
  return "amber";
}

function periodLabel(periodStart: string) {
  return new Date(periodStart).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

const emptyAdjustmentForm = { type: "CREDIT", scope: "AMOUNT", relatedComponent: "", amount: "", reason: "" };

export default function ReconciliationPage() {
  const [runs, setRuns] = useState<BillingRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [selected, setSelected] = useState<BillingRun | null>(null);
  const [notes, setNotes] = useState("");
  const [adjustmentForm, setAdjustmentForm] = useState(emptyAdjustmentForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function loadRuns() {
    setLoading(true);
    const res = await fetch("/api/reconciliation");
    if (res.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setRuns(data.runs ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadRuns();
  }, []);

  async function openRun(runId: string) {
    const res = await fetch(`/api/reconciliation/${runId}`);
    if (!res.ok) return;
    const data = await res.json();
    setSelected(data.billingRun);
    setNotes(data.billingRun.reconciliation?.notes ?? "");
    setAdjustmentForm(emptyAdjustmentForm);
    setError("");
  }

  async function updateStatus(status: string) {
    if (!selected) return;
    setBusy(true);
    const res = await fetch(`/api/reconciliation/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes })
    });
    setBusy(false);
    if (res.ok) {
      openRun(selected.id);
      loadRuns();
    }
  }

  async function addAdjustment(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/adjustments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...adjustmentForm, billingRunId: selected.id })
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not record this adjustment");
      return;
    }
    setAdjustmentForm(emptyAdjustmentForm);
    openRun(selected.id);
    loadRuns();
  }

  if (forbidden) return <Empty label="You don't have access to Reconciliation." />;

  return (
    <div className="space-y-5">
      <Title title="Reconciliation" subtitle="Compare platform-reported usage with CRM billable usage and manage adjustments." />

      {loading ? (
        <LoadingGrid />
      ) : runs.length === 0 ? (
        <Card>
          <Empty label="No calculated billing runs to reconcile yet." />
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="p-3">Customer</th>
                <th className="p-3">Period</th>
                <th className="p-3">Total Billing</th>
                <th className="p-3">Adjustments</th>
                <th className="p-3">Reconciliation</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} onClick={() => openRun(run.id)} className="cursor-pointer border-b border-line/60 transition-colors hover:bg-panel/60">
                  <td className="p-3 font-semibold text-ink">
                    {run.customer.customerCode} · {run.customer.name}
                  </td>
                  <td className="p-3">{periodLabel(run.periodStart)}</td>
                  <td className="p-3">₹{Number(run.totalAmount).toLocaleString("en-IN")}</td>
                  <td className="p-3">{run.adjustments?.length ?? 0}</td>
                  <td className="p-3">
                    <Badge tone={reconTone(run.reconciliation?.status)}>{run.reconciliation ? titleCase(run.reconciliation.status) : "Not reviewed"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {selected ? (
        <Drawer title={`${selected.customer.customerCode} · ${periodLabel(selected.periodStart)}`} onClose={() => setSelected(null)}>
          <div className="space-y-4">
            <Card>
              <h3 className="font-semibold">Raw vs Billable</h3>
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
                  {selected.billableUsages?.map((u) => (
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

            <Card>
              <h3 className="font-semibold">Reconciliation Status</h3>
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <Info label="Total Raw" value={selected.reconciliation?.totalRawQuantity.toLocaleString("en-IN") ?? "—"} />
                  <Info label="Total Billable" value={selected.reconciliation?.totalBillableQuantity.toLocaleString("en-IN") ?? "—"} />
                  <Info label="Variance" value={selected.reconciliation?.varianceQuantity.toLocaleString("en-IN") ?? "—"} />
                </div>
                <Badge tone={reconTone(selected.reconciliation?.status)}>{selected.reconciliation ? titleCase(selected.reconciliation.status) : "Not reviewed"}</Badge>
                <Textarea label="Notes" value={notes} onChange={setNotes} />
                <div className="flex flex-wrap gap-2">
                  {reconStatuses.map((status) => (
                    <button key={status} disabled={busy} onClick={() => updateStatus(status)} className={secondaryBtnClass}>
                      Mark {titleCase(status)}
                    </button>
                  ))}
                </div>
                {selected.reconciliation?.reviewedAt ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Last reviewed by {selected.reconciliation.reviewedBy?.name} · {dateLabel(selected.reconciliation.reviewedAt)}
                  </p>
                ) : null}
              </div>
            </Card>

            <Card>
              <h3 className="font-semibold">Credit / Debit Adjustments</h3>
              <div className="mt-3 space-y-2">
                {selected.adjustments?.length ? (
                  selected.adjustments.map((adj) => (
                    <div key={adj.id} className="rounded-xl border border-line p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <Badge tone={adj.type === "CREDIT" ? "green" : "amber"}>
                          {titleCase(adj.type)} · {titleCase(adj.scope)}
                        </Badge>
                        <span className="font-semibold">₹{Number(adj.amount).toLocaleString("en-IN")}</span>
                      </div>
                      <p className="mt-1 text-slate-600 dark:text-slate-300">{adj.reason}</p>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        {adj.requestedBy?.name} · {dateLabel(adj.createdAt)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No adjustments recorded.</p>
                )}
              </div>

              {selected.status === "CALCULATED" || selected.status === "UNDER_REVIEW" ? (
                <form onSubmit={addAdjustment} className="mt-4 space-y-3 border-t border-line pt-4">
                  {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p> : null}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select label="Type" value={adjustmentForm.type} onChange={(v) => setAdjustmentForm({ ...adjustmentForm, type: v })} options={adjustmentTypes} render={titleCase} />
                    <Select label="Scope" value={adjustmentForm.scope} onChange={(v) => setAdjustmentForm({ ...adjustmentForm, scope: v })} options={adjustmentScopes} render={titleCase} />
                    <Input label="Related Component (optional)" value={adjustmentForm.relatedComponent} onChange={(v) => setAdjustmentForm({ ...adjustmentForm, relatedComponent: v })} />
                    <Input label="Amount (₹)" type="number" value={adjustmentForm.amount} onChange={(v) => setAdjustmentForm({ ...adjustmentForm, amount: v })} required />
                  </div>
                  <Textarea label="Reason" value={adjustmentForm.reason} onChange={(v) => setAdjustmentForm({ ...adjustmentForm, reason: v })} />
                  <button disabled={busy} className={`w-full ${primaryBtnClass}`}>
                    {busy ? "Saving..." : "Add Adjustment"}
                  </button>
                </form>
              ) : (
                <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Adjustments are locked once a run is invoiced.</p>
              )}
            </Card>
          </div>
        </Drawer>
      ) : null}
    </div>
  );
}
