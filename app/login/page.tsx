"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail } from "lucide-react";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo-accounts";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    setLoading(false);
    if (!response.ok) {
      const result = await response.json().catch(() => null) as { error?: string } | null;
      setError(result?.error ?? `Sign-in failed (${response.status}). Check the database configuration.`);
      return;
    }
    router.push("/");
    router.refresh();
  }

  function quickLogin(account: (typeof DEMO_ACCOUNTS)[number]) {
    setEmail(account.email);
    setPassword(account.password);
  }

  return (
    <main className="min-h-screen bg-app-glow px-6 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_420px]">
        <section>
          <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700 dark:border-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
            Internal CRM workspace
          </div>
          <img src="/logo-light.png" alt="ViH Metaverse" className="mb-7 h-14 w-auto dark:hidden" />
          <img src="/logo-dark.png" alt="ViH Metaverse" className="mb-7 hidden h-14 w-auto dark:block" />
          <h1 className="max-w-2xl text-4xl font-semibold tracking-[-0.05em] text-ink md:text-5xl">ViH Metaverse Lead Management CRM</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
            Internal demo environment for lead intake, commercial workflows, onboarding, billing, and team approvals.
          </p>

          <div className="mt-8 rounded-2xl border border-line bg-surface p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-ink">Demo Accounts</h2>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700">Demo only</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-line">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#f5f8ff] dark:bg-slate-900/60">
                  <tr>
                    <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Role</th>
                    <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Email</th>
                    <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Password</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_ACCOUNTS.map((account) => (
                    <tr key={account.email} className="border-t border-line bg-white/50 dark:bg-transparent">
                      <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200">{account.roleLabel}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{account.email}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{account.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <form onSubmit={submit} className="rounded-2xl border border-line bg-surface p-6 shadow-soft">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-ink">Demo sign in</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Use a seeded internal account.</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-glow">
              <LockKeyhole size={18} />
            </div>
          </div>

          <div className="mt-5 grid gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => quickLogin(account)}
                className="flex items-center justify-between rounded-xl border border-line bg-[#f7f9ff] px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50 dark:bg-slate-900/40 dark:text-slate-200"
              >
                <span>Login as {account.roleLabel}</span>
                <span className="text-xs text-slate-500">{account.email}</span>
              </button>
            ))}
          </div>

          <label className="mt-6 block text-sm font-medium text-slate-700 dark:text-slate-200">Email</label>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-line bg-[#f8fafd] px-3 transition-shadow duration-150 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/12 dark:bg-[#101b2d]">
            <Mail size={16} className="text-slate-400 dark:text-slate-500" />
            <select value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 flex-1 bg-transparent text-sm outline-none">
              {DEMO_ACCOUNTS.map((account) => (
                <option key={account.email} value={account.email}>{account.email}</option>
              ))}
            </select>
          </div>

          <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200">Password</label>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-line bg-[#f8fafd] px-3 transition-shadow duration-150 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/12 dark:bg-[#101b2d]">
            <LockKeyhole size={16} className="text-slate-400 dark:text-slate-500" />
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="h-11 flex-1 bg-transparent text-sm outline-none" />
          </div>

          {error ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p> : null}
          <button disabled={loading} className="mt-6 h-11 w-full rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-sm font-semibold text-white shadow-glow transition-all duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:hover:brightness-100">
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Demo-only credentials for local testing; never use these in production.
          </p>
        </form>
      </div>
    </main>
  );
}
