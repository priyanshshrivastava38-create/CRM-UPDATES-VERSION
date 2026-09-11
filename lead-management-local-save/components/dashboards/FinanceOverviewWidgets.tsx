"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Badge } from "@/components/shared/ui";
import { titleCase } from "@/lib/format";

type Data = {
  pendingReviewCount: number;
  reconciliationCounts: { PENDING: number; MATCHED: number; DISCREPANCY: number; RESOLVED: number };
  adjustmentsThisMonth: { creditTotal: number; debitTotal: number };
  outstanding: { count: number; amount: number };
  overdue: { count: number; amount: number };
  recentInvoices: { invoiceNumber: string; customerCode: string; customerName: string; totalAmount: number; status: string; issueDate: string }[];
};

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function statusTone(status: string) {
  if (status === "PAID") return "green";
  if (status === "CANCELLED") return "red";
  return "blue";
}

export function FinanceOverviewWidgets() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    fetch("/api/dashboards/finance")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData);
  }, []);

  if (!data) return null;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <h3 className="font-semibold text-ink">Billing & Reconciliation</h3>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Pending Review</span>
            <span className="font-semibold text-ink">{data.pendingReviewCount}</span>
          </div>
          {Object.entries(data.reconciliationCounts).map(([status, count]) => (
            <div key={status} className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">{titleCase(status)}</span>
              <span>{count}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h3 className="font-semibold text-ink">Outstanding & Overdue</h3>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Outstanding</span>
            <span className="font-semibold text-ink">
              {inr(data.outstanding.amount)} ({data.outstanding.count})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Overdue</span>
            <span className={data.overdue.count > 0 ? "font-semibold text-red-600 dark:text-red-400" : ""}>
              {inr(data.overdue.amount)} ({data.overdue.count})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Credits (this month)</span>
            <span>{inr(data.adjustmentsThisMonth.creditTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Debits (this month)</span>
            <span>{inr(data.adjustmentsThisMonth.debitTotal)}</span>
          </div>
        </div>
      </Card>
      <Card>
        <h3 className="font-semibold text-ink">Recent Invoices</h3>
        <div className="mt-3 space-y-2">
          {data.recentInvoices.length ? (
            data.recentInvoices.map((inv) => (
              <Link key={inv.invoiceNumber} href="/invoices" className="flex items-center justify-between text-sm hover:text-brand-600 dark:hover:text-brand-400">
                <span>
                  {inv.invoiceNumber} · {inv.customerCode}
                </span>
                <span className="flex items-center gap-2">
                  {inr(inv.totalAmount)} <Badge tone={statusTone(inv.status)}>{titleCase(inv.status)}</Badge>
                </span>
              </Link>
            ))
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">No invoices yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
