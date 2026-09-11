"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Empty, Input, LoadingGrid, Title, Badge } from "@/components/shared/ui";
import { dateLabel } from "@/lib/format";

type ContactRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  organization?: { name?: string | null } | null;
  createdAt: string;
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const res = await fetch(`/api/contacts?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setContacts(data.contacts ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, [q]);

  const total = useMemo(() => contacts.length, [contacts]);

  if (loading) return <LoadingGrid />;

  return (
    <div className="space-y-5">
      <Title title="Contacts" subtitle="Customer and prospect contacts synced to the CRM identity layer." />

      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <Input label="Search" value={q} onChange={setQ} placeholder="Name, email, phone, company" />
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">{total} contact{total === 1 ? "" : "s"}</div>
        </div>
      </Card>

      {contacts.length === 0 ? (
        <Card><Empty label="No contacts yet. Create a contact from the lead or customer workflow." /></Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-line bg-panel text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Organization</th>
                <th className="p-3">Email</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Role</th>
                <th className="p-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id} className="border-b border-line/60 hover:bg-panel/60">
                  <td className="p-3 font-semibold text-ink">{contact.firstName} {contact.lastName}</td>
                  <td className="p-3">{contact.organization?.name ?? "—"}</td>
                  <td className="p-3">{contact.email ?? "—"}</td>
                  <td className="p-3">{contact.phone ?? "—"}</td>
                  <td className="p-3">{contact.jobTitle ? <Badge tone="blue">{contact.jobTitle}</Badge> : "—"}</td>
                  <td className="p-3">{dateLabel(contact.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
