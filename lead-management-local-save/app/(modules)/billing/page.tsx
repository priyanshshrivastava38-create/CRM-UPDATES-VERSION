"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, Badge, Title, Select, Empty, LoadingGrid, Modal, primaryBtnClass, fieldClass } from "@/components/shared/ui";
import { dateLabel, titleCase } from "@/lib/format";

type Customer = { id: string; customerCode: string; name: string; status: string };
type BillingRun = {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  totalUsageAmount: string | number;
  totalSetupAmount: string | number;
  totalAmount: string | number;
  customer: Customer;
};

const statusOptions = ["ALL", "DRAFT", "CALCULATED", "UNDER_REVIEW", "FINALIZED", "INVOICED"];

function statusTone(status: string) {
  if (status === "FINALIZED" || status === "INVOICED") return "green";
  if (status === "CALCULATED") return "blue";
  return "slate";
}

function periodLabel(periodStart: string) {
  return new Date(periodStart).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

const emptyForm = { customerId: "", month: new Date().toISOString().slice(0, 7) };

export default function BillingPage() {
  const [runs, setRuns] = useState<BillingRun[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  async function loadRuns() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    const res = await fetch(`/api/billing/runs?${params.toString()}`);
    if (res.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setRuns(data.runs ?? []);
    setLoading(false);
  }

  async function loadCustomers() {
    const res = await fetch("/api/customers?pageSize=100");
    if (res.ok) {
      const data = await res.json();
      setCustomers(data.customers ?? []);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    loadRuns();
  }, [statusFilter]);

  async function createRun(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    const res = await fetch("/api/billing/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setFormError(data.error ?? "Could not run billing for this customer/period");
      return;
    }
    setShowCreate(false);
    setForm(emptyForm);
    loadRuns();
  }

  if (forbidden) return <Empty label="You don't have access to Billing." />;

  return (
    <div className="space-y-5">
      <Title
        title="Billing"
        subtitle="Run monthly billing against each customer's approved Rate Plan and drill into the calculation."
        action={
          <button
            onClick={() => {
              setShowCreate(true);
              setFormError("");
            }}
            className={`flex items-center gap-2 ${primaryBtnClass}`}
          >
            <Plus size={16} /> Run Billing
          </button>
        }
      />

      <Card>
        <Select label="Status" value={statusFilter} onChange={setStatusFilter} options={statusOptions} render={(v) => (v === "ALL" ? "All" : titleCase(v))} />
      </Card>

      {loading ? (
        <LoadingGrid />
      ) : runs.length === 0 ? (
        <Card>
          <Empty label="No billing runs yet." />
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="p-3">Customer</th>
                <th className="p-3">Period</th>
                <th className="p-3">Usage</th>
                <th className="p-3">Setup</th>
                <th className="p-3">Total</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-b border-line/60">
                  <td className="p-3">
                    <Link href={`/billing/${run.id}`} className="font-semibold text-brand-700 hover:text-brand-600 dark:text-brand-400">
                      {run.customer.customerCode} · {run.customer.name}
                    </Link>
                  </td>
                  <td className="p-3">{periodLabel(run.periodStart)}</td>
                  <td className="p-3">₹{Number(run.totalUsageAmount).toLocaleString("en-IN")}</td>
                  <td className="p-3">{Number(run.totalSetupAmount) > 0 ? `₹${Number(run.totalSetupAmount).toLocaleString("en-IN")}` : "—"}</td>
                  <td className="p-3 font-semibold text-ink">₹{Number(run.totalAmount).toLocaleString("en-IN")}</td>
                  <td className="p-3">
                    <Badge tone={statusTone(run.status)}>{titleCase(run.status)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {showCreate ? (
        <Modal title="Run Billing" onClose={() => setShowCreate(false)}>
          {formError ? <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{formError}</p> : null}
          <form onSubmit={createRun} className="space-y-3">
            <Select
              label="Customer"
              value={form.customerId}
              onChange={(v) => setForm({ ...form, customerId: v })}
              options={["", ...customers.map((c) => c.id)]}
              render={(id) => {
                const c = customers.find((c) => c.id === id);
                return c ? `${c.customerCode} — ${c.name}` : "Select a customer";
              }}
            />
            <label className="block">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Billing Month</span>
              <input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} className={`h-10 ${fieldClass}`} />
            </label>
            <button disabled={busy || !form.customerId} className={`w-full ${primaryBtnClass}`}>
              {busy ? "Calculating..." : "Run Billing"}
            </button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
