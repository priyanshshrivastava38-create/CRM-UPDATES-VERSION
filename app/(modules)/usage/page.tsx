"use client";

import { useEffect, useRef, useState } from "react";
import { Download, RefreshCcw } from "lucide-react";
import { Card, Badge, Title, Select, Empty, LoadingGrid, secondaryBtnClass, primaryBtnClass } from "@/components/shared/ui";
import { dateLabel, titleCase } from "@/lib/format";

type Customer = { id: string; customerCode: string; name: string };
type PlatformAccount = { id: string; service: string; externalAccountId: string; providerName: string; customer: Customer };
type Batch = {
  id: string;
  fileName?: string | null;
  service: string;
  status: string;
  rowCount: number;
  successCount: number;
  errorCount: number;
  errorLog?: { row: number; message: string }[] | null;
  createdAt: string;
  uploadedBy?: { name: string };
};
type UsageRecord = {
  id: string;
  service: string;
  component: string;
  usageDate: string;
  quantity: number;
  sourceReference?: string | null;
  platformAccount: { externalAccountId: string; customer: Customer };
};

const tabs = ["Import", "Browse"] as const;

function batchStatusTone(status: string) {
  if (status === "COMPLETED") return "green";
  if (status === "FAILED") return "red";
  if (status === "PARTIAL") return "amber";
  return "slate";
}

export default function UsagePage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Import");
  const [forbidden, setForbidden] = useState(false);
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [pulling, setPulling] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [filters, setFilters] = useState({ customerId: "ALL", service: "ALL" });

  async function loadAccounts() {
    const res = await fetch("/api/platform-accounts");
    if (res.ok) {
      const data = await res.json();
      setAccounts(data.accounts ?? []);
      if (data.accounts?.length && !selectedAccountId) setSelectedAccountId(data.accounts[0].id);
    }
  }

  async function loadBatches() {
    const res = await fetch("/api/usage/batches");
    if (res.status === 403) {
      setForbidden(true);
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setBatches(data.batches ?? []);
    }
  }

  async function loadRecords() {
    setRecordsLoading(true);
    const params = new URLSearchParams({ pageSize: "100" });
    if (filters.customerId !== "ALL") params.set("customerId", filters.customerId);
    if (filters.service !== "ALL") params.set("service", filters.service);
    const res = await fetch(`/api/usage/records?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setRecords(data.records ?? []);
    }
    setRecordsLoading(false);
  }

  useEffect(() => {
    loadAccounts();
    loadBatches();
  }, []);

  useEffect(() => {
    if (tab === "Browse") loadRecords();
  }, [tab, filters]);

  async function pullUsage() {
    if (!selectedAccountId) return;
    setPulling(true);
    setImportMessage("");
    const res = await fetch(`/api/platform-accounts/${selectedAccountId}/pull-usage`, { method: "POST" });
    setPulling(false);
    if (res.ok) {
      const data = await res.json();
      setImportMessage(`Pulled ${data.batch.successCount} usage rows.`);
      loadBatches();
    } else {
      const data = await res.json().catch(() => ({}));
      setImportMessage(data.error ?? "Could not pull usage.");
    }
  }

  async function uploadCsv(event: React.FormEvent) {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file || !selectedAccountId) {
      setImportMessage("Choose a platform account and a CSV file first.");
      return;
    }
    setUploading(true);
    setImportMessage("");
    const formData = new FormData();
    formData.set("platformAccountId", selectedAccountId);
    formData.set("file", file);
    const res = await fetch("/api/usage/import", { method: "POST", body: formData });
    setUploading(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setImportMessage(`Imported ${data.batch.successCount} rows${data.batch.errorCount ? `, ${data.batch.errorCount} row(s) had errors` : ""}.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadBatches();
    } else {
      setImportMessage(data.error ?? "Could not import this file.");
    }
  }

  if (forbidden) return <Empty label="You don't have access to Usage." />;

  const customerOptions = Array.from(new Map(accounts.map((a) => [a.customer.id, a.customer])).values());

  return (
    <div className="space-y-5">
      <Title title="Usage" subtitle="Import and browse raw platform usage before it is converted into billable usage." />

      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
              tab === t ? "bg-brand-600 text-white" : "border border-line text-slate-600 hover:bg-panel dark:text-slate-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Import" ? (
        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold">Pull or Import Usage</h3>
            <div className="mt-3 space-y-3">
              <Select
                label="Platform Account"
                value={selectedAccountId}
                onChange={setSelectedAccountId}
                options={accounts.map((a) => a.id)}
                render={(id) => {
                  const a = accounts.find((a) => a.id === id);
                  return a ? `${a.customer.customerCode} · ${titleCase(a.service)} · ${a.externalAccountId}` : "Select";
                }}
              />
              {accounts.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">No platform accounts are mapped yet — map one in Platform Mapping first.</p> : null}

              <div className="flex flex-wrap items-end gap-3">
                <button type="button" disabled={pulling || !selectedAccountId} onClick={pullUsage} className={`flex items-center gap-2 ${primaryBtnClass}`}>
                  <RefreshCcw size={15} /> {pulling ? "Pulling..." : "Pull Usage (Mock)"}
                </button>

                <form onSubmit={uploadCsv} className="flex items-end gap-2">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">CSV file (date, component, quantity)</span>
                    <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="mt-2 block text-sm" />
                  </label>
                  <button disabled={uploading || !selectedAccountId} className={secondaryBtnClass}>
                    <span className="flex items-center gap-2">
                      <Download size={15} /> {uploading ? "Uploading..." : "Import CSV"}
                    </span>
                  </button>
                </form>
              </div>
              {importMessage ? <p className="text-sm text-slate-600 dark:text-slate-300">{importMessage}</p> : null}
            </div>
          </Card>

          <Card className="overflow-x-auto p-0">
            <div className="border-b border-line p-4 font-semibold">Import History</div>
            {batches.length === 0 ? (
              <Empty label="No import batches yet." />
            ) : (
              <table className="w-full min-w-[800px] text-sm">
                <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="p-3">Source</th>
                    <th className="p-3">Service</th>
                    <th className="p-3">Rows</th>
                    <th className="p-3">Uploaded By</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <tr key={batch.id} className="border-b border-line/60">
                      <td className="p-3">{batch.fileName ?? "Mock pull"}</td>
                      <td className="p-3">{titleCase(batch.service)}</td>
                      <td className="p-3">
                        {batch.successCount}/{batch.rowCount} {batch.errorCount ? `(${batch.errorCount} errors)` : ""}
                      </td>
                      <td className="p-3">{batch.uploadedBy?.name ?? "—"}</td>
                      <td className="p-3">{dateLabel(batch.createdAt)}</td>
                      <td className="p-3">
                        <Badge tone={batchStatusTone(batch.status)}>{titleCase(batch.status)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label="Customer"
                value={filters.customerId}
                onChange={(v) => setFilters({ ...filters, customerId: v })}
                options={["ALL", ...customerOptions.map((c) => c.id)]}
                render={(id) => (id === "ALL" ? "All" : `${customerOptions.find((c) => c.id === id)?.customerCode} · ${customerOptions.find((c) => c.id === id)?.name}`)}
              />
              <Select label="Service" value={filters.service} onChange={(v) => setFilters({ ...filters, service: v })} options={["ALL", "SMS", "WHATSAPP"]} render={(v) => (v === "ALL" ? "All" : titleCase(v))} />
            </div>
          </Card>

          {recordsLoading ? (
            <LoadingGrid />
          ) : records.length === 0 ? (
            <Card>
              <Empty label="No raw usage records in this view." />
            </Card>
          ) : (
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Service</th>
                    <th className="p-3">Component</th>
                    <th className="p-3">Quantity</th>
                    <th className="p-3">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b border-line/60">
                      <td className="p-3">{dateLabel(record.usageDate)}</td>
                      <td className="p-3">
                        {record.platformAccount.customer.customerCode} · {record.platformAccount.customer.name}
                      </td>
                      <td className="p-3">{titleCase(record.service)}</td>
                      <td className="p-3">{record.component}</td>
                      <td className="p-3">{record.quantity.toLocaleString("en-IN")}</td>
                      <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{record.sourceReference ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
