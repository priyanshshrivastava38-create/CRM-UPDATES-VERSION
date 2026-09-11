"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Card, Badge, Title, Input, Select, Empty, LoadingGrid, Modal, primaryBtnClass, fieldClass } from "@/components/shared/ui";
import { dateLabel, titleCase } from "@/lib/format";

type UserRow = { id: string; name: string; email: string; role: string; active: boolean; createdAt: string };

const roles = ["ADMIN", "SALES", "CEO", "FINANCE", "OPERATIONS"];

const emptyForm = { name: "", email: "", password: "", role: "SALES" };

export default function UsersPage() {
  const [me, setMe] = useState<UserRow | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/users");
    if (res.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users ?? []);
    }
    setLoading(false);
  }

  async function loadMe() {
    const res = await fetch("/api/bootstrap");
    if (res.ok) {
      const data = await res.json();
      setMe(data.user);
    }
  }

  useEffect(() => {
    load();
    loadMe();
  }, []);

  async function createUser(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not create this user");
      return;
    }
    setShowCreate(false);
    setForm(emptyForm);
    load();
  }

  async function updateRole(id: string, role: string) {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role })
    });
    if (res.ok) load();
  }

  async function toggleActive(row: UserRow) {
    const res = await fetch(`/api/users/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !row.active })
    });
    if (res.ok) load();
  }

  if (forbidden) return <Empty label="You don't have access to User Management." />;

  return (
    <div className="space-y-5">
      <Title
        title="User Management"
        subtitle="Create internal accounts and manage roles and access."
        action={
          <button
            onClick={() => {
              setShowCreate(true);
              setError("");
            }}
            className={`flex items-center gap-2 ${primaryBtnClass}`}
          >
            <Plus size={16} /> New User
          </button>
        }
      />

      {loading ? (
        <LoadingGrid />
      ) : users.length === 0 ? (
        <Card>
          <Empty label="No users yet." />
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Since</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((row) => {
                const isSelf = row.id === me?.id;
                return (
                  <tr key={row.id} className="border-b border-line/60">
                    <td className="p-3 font-semibold text-ink">
                      {row.name} {isSelf ? <span className="text-xs font-normal text-slate-400">(you)</span> : null}
                    </td>
                    <td className="p-3">{row.email}</td>
                    <td className="p-3">
                      <select value={row.role} disabled={isSelf} onChange={(e) => updateRole(row.id, e.target.value)} className={`h-9 w-36 ${fieldClass} disabled:opacity-50`}>
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {titleCase(r)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">{dateLabel(row.createdAt)}</td>
                    <td className="p-3">
                      <Badge tone={row.active ? "green" : "red"}>{row.active ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="p-3">
                      {!isSelf ? (
                        <button onClick={() => toggleActive(row)} className="text-xs font-semibold text-brand-700 hover:text-brand-600 dark:text-brand-400">
                          {row.active ? "Deactivate" : "Activate"}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {showCreate ? (
        <Modal title="New User" onClose={() => setShowCreate(false)}>
          {error ? <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p> : null}
          <form onSubmit={createUser} className="space-y-3">
            <Input label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
            <Input label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required />
            <Select label="Role" value={form.role} onChange={(v) => setForm({ ...form, role: v })} options={roles} render={titleCase} />
            <button disabled={busy} className={`w-full ${primaryBtnClass}`}>
              {busy ? "Creating..." : "Create User"}
            </button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
