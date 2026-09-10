"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export type SidebarItem =
  | { kind: "tab"; label: string; icon: LucideIcon; active: boolean; onClick: () => void }
  | { kind: "link"; label: string; icon: LucideIcon; href: string; active: boolean };

export function Sidebar({ items, subtitle = "Lead Management System" }: { items: SidebarItem[]; subtitle?: string }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 self-start overflow-y-auto border-r border-line bg-surface p-4 lg:block">
      <div className="mb-7">
        <img src="/logo-light.png" alt="ViH Metaverse" className="h-10 w-auto dark:hidden" />
        <img src="/logo-dark.png" alt="ViH Metaverse" className="hidden h-10 w-auto dark:block" />
        <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</div>
      </div>
      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const className = `flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm transition-all duration-150 ${
            item.active
              ? "bg-gradient-to-r from-brand-600 to-brand-500 font-semibold text-white shadow-glow"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
          }`;
          if (item.kind === "link") {
            return (
              <Link key={item.label} href={item.href} className={className}>
                <Icon size={17} /> {item.label}
              </Link>
            );
          }
          return (
            <button key={item.label} onClick={item.onClick} className={className}>
              <Icon size={17} /> {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
