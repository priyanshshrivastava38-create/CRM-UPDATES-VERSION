"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail } from "lucide-react";

const demoUsers = [
  "admin@vihmetaverse.com",
  "sales1@vihmetaverse.com",
  "sales2@vihmetaverse.com",
  "sales3@vihmetaverse.com",
  "ceo@vihmetaverse.com",
  "finance@vihmetaverse.com",
  "ops@vihmetaverse.com"
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(demoUsers[0]);
  const [password, setPassword] = useState("Vih@12345");
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
      setError("Could not sign in with those demo credentials.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-app-glow px-6 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_420px]">
        <section>
          <img src="/logo-light.png" alt="ViH Metaverse" className="mb-7 h-14 w-auto dark:hidden" />
          <img src="/logo-dark.png" alt="ViH Metaverse" className="mb-7 hidden h-14 w-auto dark:block" />
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-ink md:text-5xl">ViH Metaverse Lead Management CRM</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
            A internal POC for capturing, assigning, tracking, scoring, and converting sales leads with real PostgreSQL-backed workflows.
          </p>
          <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
            {["Lead 360", "Action Center", "Analytics"].map((item) => (
              <div key={item} className="rounded-2xl border border-line/70 bg-surface p-4 text-sm font-medium text-slate-700 shadow-card transition-shadow duration-200 hover:shadow-card-hover dark:text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </section>
        <form onSubmit={submit} className="rounded-2xl border border-line/70 bg-surface p-6 shadow-soft">
          <h2 className="text-xl font-semibold tracking-tight text-ink">Demo sign in</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Use any seeded internal account.</p>
          <label className="mt-6 block text-sm font-medium text-slate-700 dark:text-slate-200">Email</label>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-line bg-surface px-3 transition-shadow duration-150 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15">
            <Mail size={16} className="text-slate-400 dark:text-slate-500" />
            <select value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 flex-1 bg-transparent text-sm outline-none">
              {demoUsers.map((user) => (
                <option key={user}>{user}</option>
              ))}
            </select>
          </div>
          <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200">Password</label>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-line bg-surface px-3 transition-shadow duration-150 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15">
            <LockKeyhole size={16} className="text-slate-400 dark:text-slate-500" />
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="h-11 flex-1 bg-transparent text-sm outline-none" />
          </div>
          {error ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p> : null}
          <button disabled={loading} className="mt-6 h-11 w-full rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 text-sm font-semibold text-white shadow-glow transition-all duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:hover:brightness-100">
            {loading ? "Signing in..." : "Sign in"}
          </button>
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Password for all demo users: Vih@12345</p>
        </form>
      </div>
    </main>
  );
}
