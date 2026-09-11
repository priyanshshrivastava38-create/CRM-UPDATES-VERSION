"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { Card, Badge, Title, Select, Empty, LoadingGrid, secondaryBtnClass } from "@/components/shared/ui";
import { dateLabel, titleCase } from "@/lib/format";

type Invoice = {
  id: string;
  invoiceNumber: string;
  periodStart: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  status: string;
  customer: { customerCode: string; name: string };
  payments: { amount: number }[];
};

const statusOptions = ["ALL", "DRAFT", "ISSUED", "EXPORTED", "PAID", "OVERDUE", "CANCELLED"];

function statusTone(status: string, overdue: boolean) {
  if (status === "PAID") return "green";
  if (status === "CANCELLED") return "red";
  if (overdue) return "red";
  return "blue";
}

function periodLabel(periodStart: string) {
  return new Date(periodStart).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [canExport, setCanExport] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    const res = await fetch(`/api/invoices?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setInvoices(data.invoices ?? []);
    }
    setLoading(false);
  }

  async function loadMe() {
    const res = await fetch("/api/bootstrap");
    if (res.ok) {
      const data = await res.json();
      setCanExport(data.user.role === "FINANCE" || data.user.role === "ADMIN");
    }
  }

  useEffect(() => {
    loadMe();
  }, []);

  useEffect(() => {
    load();
  }, [statusFilter]);

  return (
    <div className="space-y-5">
      <Title
        title="Invoices"
        subtitle="Finalized billing runs, payment tracking, and Finance/ERP CSV export."
        action={
          canExport ? (
            <Link href="/api/invoices/export" className={`flex items-center gap-2 ${secondaryBtnClass}`}>
              <Download size={16} /> Export All (CSV)
            </Link>
          ) : undefined
        }
      />

      <Card>
        <Select label="Status" value={statusFilter} onChange={setStatusFilter} options={statusOptions} render={(v) => (v === "ALL" ? "All" : titleCase(v))} />
      </Card>

      {loading ? (
        <LoadingGrid />
      ) : invoices.length === 0 ? (
        <Card>
          <Empty label="No invoices yet. Finalize a billing run to generate one." />
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="p-3">Invoice</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Period</th>
                <th className="p-3">Due</th>
                <th className="p-3">Total</th>
                <th className="p-3">Paid</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const paid = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
                const overdue = inv.status !== "PAID" && inv.status !== "CANCELLED" && new Date(inv.dueDate) < new Date();
                return (
                  <tr key={inv.id} className="border-b border-line/60">
                    <td className="p-3">
                      <Link href={`/invoices/${inv.id}`} className="font-semibold text-brand-700 hover:text-brand-600 dark:text-brand-400">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="p-3">
                      {inv.customer.customerCode} · {inv.customer.name}
                    </td>
                    <td className="p-3">{periodLabel(inv.periodStart)}</td>
                    <td className="p-3">{dateLabel(inv.dueDate)}</td>
                    <td className="p-3 font-semibold text-ink">₹{Number(inv.totalAmount).toLocaleString("en-IN")}</td>
                    <td className="p-3">₹{paid.toLocaleString("en-IN")}</td>
                    <td className="p-3">
                      <Badge tone={statusTone(inv.status, overdue)}>{overdue ? "Overdue" : titleCase(inv.status)}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
