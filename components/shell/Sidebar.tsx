"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export type SidebarItem =
  | { kind: "tab"; label: string; icon: LucideIcon; active: boolean; onClick: () => void }
  | { kind: "link"; label: string; icon: LucideIcon; href: string; active: boolean };

export function Sidebar({ items, subtitle = "Lead Management System" }: { items: SidebarItem[]; subtitle?: string }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 self-start overflow-y-auto border-r border-line bg-[#f4f7fb] p-4 lg:block dark:bg-[#0b1220]">
      <div className="mb-5 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-3 text-white shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/10 shadow-inner ring-1 ring-white/10" />
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-100">CRM</div>
            <div className="text-xs font-semibold tracking-[0.12em] text-white">ENTERPRISE</div>
          </div>
        </div>
        <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-100/90">{subtitle}</div>
      </div>

      <div className="mb-3 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Workspace</div>
      <nav className="space-y-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const itemKey = item.kind === "link" ? `link:${item.href}:${item.label}` : `tab:${item.label}`;
          const className = `flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all duration-150 ${
            item.active
              ? "bg-brand-600 text-white shadow-glow"
              : "text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-slate-100"
          }`;
          if (item.kind === "link") {
            return (
              <Link key={itemKey} href={item.href} className={className}>
                <Icon size={16} /> {item.label}
              </Link>
            );
          }
          return (
            <button key={itemKey} onClick={item.onClick} className={className}>
              <Icon size={16} /> {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
