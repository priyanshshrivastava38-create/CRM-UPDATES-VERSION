"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { Sidebar, type SidebarItem } from "@/components/shell/Sidebar";
import { moduleNavForRole } from "@/components/shell/module-nav";

export function ModulesShell({ role, children }: { role: string; children: React.ReactNode }) {
  const pathname = usePathname();

  const items: SidebarItem[] = [
    { kind: "link", label: "CRM Home", icon: LayoutDashboard, href: "/", active: pathname === "/" },
    ...moduleNavForRole(role).map((item) => ({
      kind: "link" as const,
      label: item.label,
      icon: item.icon,
      href: item.href,
      active: pathname === item.href || pathname.startsWith(`${item.href}/`)
    }))
  ];

  return (
    <div className="flex min-h-screen bg-app-glow">
      <Sidebar items={items} subtitle="Operations Console" />
      <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
    </div>
  );
}
