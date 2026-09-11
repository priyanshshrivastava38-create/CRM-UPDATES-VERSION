"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Badge, Title, Input, Select, Empty, LoadingGrid } from "@/components/shared/ui";
import { dateLabel, titleCase } from "@/lib/format";

type Customer = {
  id: string;
  customerCode: string;
  name: string;
  status: string;
  createdAt: string;
  accountManager?: { id: string; name: string };
  onboarding?: { status: string } | null;
  ratePlans?: { id: string; effectiveFrom: string }[];
};

const statuses = ["ONBOARDING", "ACTIVE", "INACTIVE", "SUSPENDED"];

function statusTone(status: string) {
  if (status === "ACTIVE") return "green";
  if (status === "SUSPENDED" || status === "INACTIVE") return "red";
  return "amber";
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: "", status: "ALL" });

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ pageSize: "100" });
    if (filters.q) params.set("q", filters.q);
    if (filters.status !== "ALL") params.set("status", filters.status);
    const res = await fetch(`/api/customers?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setCustomers(data.customers ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [filters.status]);

  return (
    <div className="space-y-5">
      <Title title="Customers" subtitle="Directory of onboarded and active customers, with Rate Plan and billing history." />

      <Card>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Search" value={filters.q} onChange={(v) => setFilters({ ...filters, q: v })} placeholder="Name or customer code" />
          <Select label="Status" value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} options={["ALL", ...statuses]} render={(v) => (v === "ALL" ? "All" : titleCase(v))} />
          <div className="flex items-end">
            <button onClick={load} className="rounded-xl border border-line px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-panel">
              Apply
            </button>
          </div>
        </div>
      </Card>

      {loading ? (
        <LoadingGrid />
      ) : customers.length === 0 ? (
        <Card>
          <Empty label="No customers yet. Customers are created automatically when a Price Approval Request is approved." />
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="p-3">Customer</th>
                <th className="p-3">Account Manager</th>
                <th className="p-3">Onboarding</th>
                <th className="p-3">Since</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-line/60 transition-colors hover:bg-panel/60">
                  <td className="p-3">
                    <Link href={`/customers/${c.id}`} className="font-semibold text-brand-700 hover:text-brand-600 dark:text-brand-400">
                      {c.customerCode} · {c.name}
                    </Link>
                  </td>
                  <td className="p-3">{c.accountManager?.name ?? "—"}</td>
                  <td className="p-3">{c.onboarding ? titleCase(c.onboarding.status) : "—"}</td>
                  <td className="p-3">{dateLabel(c.createdAt)}</td>
                  <td className="p-3">
                    <Badge tone={statusTone(c.status)}>{titleCase(c.status)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
