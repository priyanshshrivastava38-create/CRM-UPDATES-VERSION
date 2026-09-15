"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useState } from "react";
import { getLeadSlaState } from "@/lib/sla";
import { evaluateWorkflowActions } from "@/lib/workflow";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  BarChart3,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Mail,
  Megaphone,
  MessageSquare,
  Moon,
  Phone,
  Plus,
  Search,
  Settings,
  Sparkles,
  Sun,
  Users
} from "lucide-react";
import { dateLabel, taskBucket, titleCase } from "@/lib/format";
import { Sidebar, type SidebarItem } from "@/components/shell/Sidebar";
import { moduleNavForRole } from "@/components/shell/module-nav";
import { SalesBillingWidgets } from "@/components/dashboards/SalesBillingWidgets";
import { FinanceOverviewWidgets } from "@/components/dashboards/FinanceOverviewWidgets";

type User = { id: string; name: string; email: string; role: string };
type Campaign = { id: string; name: string; source: string; status: string; budget: string | number; startDate: string; endDate?: string | null; leads?: Lead[] };
type Lead = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  designation?: string;
  city?: string;
  source: string;
  status: string;
  priority: string;
  score: number;
  assignedTo?: string;
  notes?: string;
  nextFollowUpAt?: string;
  lastContactedAt?: string;
  createdAt: string;
  assignedUser?: User;
  campaign?: Campaign;
  tasks?: Task[];
  calls?: Call[];
  activities?: Activity[];
  scoreMeta?: { score: number; reasons: string[]; breakdown: { factor: string; delta: number; note: string }[]; classification: string };
  ai?: AIAnalysis;
};
type Task = { id: string; title: string; description?: string; type: string; status: string; priority: string; dueDate: string; leadId?: string; lead?: Lead; assignedTo?: string; assignedUser?: User };
type Call = { id: string; type?: string; direction: string; status?: string; outcome?: string; duration?: number; content?: string; notes?: string; transcript?: string; createdAt: string; agent?: User; lead?: Lead };
type Activity = { id: string; activityType: string; description: string; createdAt: string; user?: User; metadata?: { status?: string } | null };
type AIAnalysis = {
  mock: boolean;
  summary: string;
  intent: string;
  customerIntent?: string;
  keyRequirements?: string;
  sentiment: string;
  requirement: string;
  objections: string;
  buyingTimeline: string;
  recommendedNextAction: string;
  nextBestAction?: string;
  confidence?: number;
  scoreSummary?: string;
};

const nav = [
  ["Dashboard", LayoutDashboard],
  ["Leads", Users],
  ["Tasks", ClipboardList],
  ["Means of Conversation", MessageSquare],
  ["Campaigns", Megaphone],
  ["Analytics", BarChart3]
] as const;

const statuses = ["NEW", "CONTACTED", "QUALIFIED", "INTERESTED", "FOLLOW_UP", "NURTURE", "CONVERTED", "LOST", "INVALID"];
const priorities = ["HOT", "WARM", "COLD"];
const sources = ["Website", "Facebook", "Instagram", "Google", "WhatsApp", "Referral", "Manual"];
const campaignStatuses = ["PLANNED", "ACTIVE", "PAUSED", "COMPLETED"];
const colors = ["#2563eb", "#0f766e", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#64748b", "#16a34a"];
const kpiChipTones: Record<string, string> = {
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
  sky: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  red: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  green: "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400"
};
const chartTick = { fontSize: 11, fill: "var(--chart-text)" };
const chartTooltipStyle = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12, color: "var(--ink)" };

const emptyLead = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  company: "",
  designation: "",
  city: "",
  source: "Website",
  priority: "WARM",
  assignedTo: "",
  campaignId: "",
  nextFollowUpAt: "",
  notes: ""
};

const emptyCampaign = {
  name: "",
  source: "Website",
  status: "ACTIVE",
  startDate: "",
  endDate: "",
  budget: ""
};

const defaultLeadFilters = { q: "", status: "ALL", source: "ALL", priority: "ALL", assignedTo: "ALL" };

type LeadFilterState = typeof defaultLeadFilters;
type SavedLeadView = { id: string; name: string; filters: LeadFilterState; isDefault?: boolean };

export function matchesLeadFilters(lead: Lead, filters: LeadFilterState) {
  const textQuery = filters.q.trim().toLowerCase();
  const matchesQuery =
    !textQuery ||
    `${lead.firstName} ${lead.lastName} ${lead.company} ${lead.email} ${lead.phone}`.toLowerCase().includes(textQuery) ||
    lead.source.toLowerCase().includes(textQuery);

  const matchesStatus = filters.status === "ALL" || lead.status === filters.status;
  const matchesSource = filters.source === "ALL" || lead.source === filters.source;
  const matchesPriority = filters.priority === "ALL" || lead.priority === filters.priority;
  const matchesAssigned = filters.assignedTo === "ALL" || (filters.assignedTo === "UNASSIGNED" ? !lead.assignedTo : lead.assignedTo === filters.assignedTo);

  return matchesQuery && matchesStatus && matchesSource && matchesPriority && matchesAssigned;
}

const defaultSavedViews: SavedLeadView[] = [
  { id: "all", name: "All Leads", filters: defaultLeadFilters, isDefault: true },
  { id: "hot", name: "Hot Pipeline", filters: { ...defaultLeadFilters, priority: "HOT" }, isDefault: true },
  { id: "follow-up", name: "Follow Up", filters: { ...defaultLeadFilters, status: "FOLLOW_UP" }, isDefault: true },
  { id: "unassigned", name: "Unassigned", filters: { ...defaultLeadFilters, assignedTo: "UNASSIGNED" }, isDefault: true }
];

export function CRMApp() {
  const [active, setActive] = useState("Dashboard");
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [filters, setFilters] = useState<LeadFilterState>(defaultLeadFilters);
  const [savedViews, setSavedViews] = useState<SavedLeadView[]>(defaultSavedViews);
  const [selectedViewId, setSelectedViewId] = useState<string>("all");
  const [leadsPage, setLeadsPage] = useState(1);
  const [leadsPagination, setLeadsPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadForm, setLeadForm] = useState(emptyLead);
  const [leadFormError, setLeadFormError] = useState("");
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [campaignForm, setCampaignForm] = useState(emptyCampaign);
  const [campaignBusy, setCampaignBusy] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", type: "FOLLOW_UP", priority: "WARM", dueDate: "", assignedTo: "", leadId: "" });
  const [callForm, setCallForm] = useState({ type: "CALL", direction: "OUTBOUND", status: "CONNECTED", outcome: "Interested", duration: 6, content: "", notes: "", transcript: "" });
  const [busy, setBusy] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const agents = users.filter((item) => item.role === "SALES");

  const applyView = useCallback((view: SavedLeadView) => {
    setSelectedViewId(view.id);
    setFilters(view.filters);
  }, []);

  const saveCurrentView = useCallback(() => {
    const name = window.prompt("Name this saved view", `View ${savedViews.length + 1}`);
    if (!name) return;

    const trimmed = name.trim();
    if (!trimmed) return;

    const nextView: SavedLeadView = {
      id: `custom-${Date.now()}`,
      name: trimmed,
      filters: { ...filters }
    };

    setSavedViews((previous) => [nextView, ...previous]);
    setSelectedViewId(nextView.id);
  }, [filters, savedViews.length]);

  const loadAll = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [boot, leadRes, taskRes, callRes, dashRes, campaignRes] = await Promise.all([
        fetch("/api/bootstrap"),
        fetch(`/api/leads?${new URLSearchParams({ ...filters, page: String(leadsPage), pageSize: String(leadsPagination.pageSize) })}`),
        fetch("/api/tasks"),
        fetch("/api/calls"),
        fetch("/api/dashboard"),
        fetch("/api/campaigns")
      ]);
      if (boot.status === 401) {
        location.href = "/login";
        return;
      }
      const bootJson = await boot.json();
      setUser(bootJson.user);
      setUsers(bootJson.users);
      setNotifications(bootJson.notifications);
      setCampaigns((await campaignRes.json()).campaigns);
      const leadJson = await leadRes.json();
      setLeads(leadJson.leads);
      if (leadJson.pagination) setLeadsPagination(leadJson.pagination);
      setTasks((await taskRes.json()).tasks);
      setCalls((await callRes.json()).calls);
      setDashboard(await dashRes.json());
    } finally {
      setIsLoadingData(false);
    }
  }, [filters, leadsPage, leadsPagination.pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => setFilters((prev) => ({ ...prev, q: globalSearch })), 250);
    return () => clearTimeout(timer);
  }, [globalSearch]);

  useEffect(() => {
    void loadAll();
  }, [filters, leadsPage, leadsPagination.pageSize, loadAll]);

  useEffect(() => {
    setLeadsPage(1);
  }, [filters.status, filters.source, filters.priority, filters.assignedTo, filters.q]);

  const openLead = useCallback(async (id: string) => {
    const response = await fetch(`/api/leads/${id}`);
    const json = await response.json();
    setSelectedLead(json.lead);
    setTaskForm((prev) => ({ ...prev, leadId: id, assignedTo: json.lead?.assignedTo ?? user?.id ?? "" }));
  }, [user?.id]);

  const createLead = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setLeadFormError("");
    const response = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(leadForm) });
    const json = await response.json();
    setBusy(false);
    if (response.ok) {
      setShowLeadForm(false);
      setLeadForm(emptyLead);
      await loadAll();
      await openLead(json.lead.id);
      setActive("Leads");
    } else {
      setLeadFormError(json.error ?? "Could not create lead.");
    }
  }, [leadForm, loadAll, openLead]);

  const createCampaign = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setCampaignBusy(true);
    const response = await fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(campaignForm) });
    const json = await response.json();
    setCampaignBusy(false);
    if (response.ok) {
      setCampaigns((prev) => [json.campaign, ...prev]);
      setShowCampaignForm(false);
      setCampaignForm(emptyCampaign);
      setActive("Campaigns");
    }
  }, [campaignForm]);

  const updateLead = useCallback(async (id: string, patch: Partial<Lead>) => {
    const response = await fetch(`/api/leads/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    const json = await response.json();
    if (response.ok) {
      setSelectedLead(json.lead);
      await loadAll();
    }
  }, [loadAll]);

  const createTask = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = { ...taskForm, assignedTo: taskForm.assignedTo || user?.id, leadId: taskForm.leadId || selectedLead?.id };
    await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setTaskForm({ title: "", description: "", type: "FOLLOW_UP", priority: "WARM", dueDate: "", assignedTo: "", leadId: selectedLead?.id ?? "" });
    await loadAll();
    if (selectedLead) await openLead(selectedLead.id);
  }, [loadAll, openLead, selectedLead, taskForm, user?.id]);

  const completeTask = useCallback(async (id: string) => {
    await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "COMPLETED" }) });
    await loadAll();
    if (selectedLead) await openLead(selectedLead.id);
  }, [loadAll, openLead, selectedLead]);

  const logCall = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedLead || !user) return;
    const response = await fetch("/api/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...callForm, leadId: selectedLead.id, agentId: user.id })
    });
    if (!response.ok) return;
    setCallForm({ type: "CALL", direction: "OUTBOUND", status: "CONNECTED", outcome: "Interested", duration: 6, content: "", notes: "", transcript: "" });
    await loadAll();
    await openLead(selectedLead.id);
  }, [callForm, loadAll, openLead, selectedLead, user]);

  const analyze = useCallback(async () => {
    if (!selectedLead) return;
    const response = await fetch("/api/ai/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: selectedLead.id }) });
    const json = await response.json();
    setSelectedLead((lead) => (lead ? { ...lead, ai: json.analysis } : lead));
    await openLead(selectedLead.id);
  }, [openLead, selectedLead]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/login";
  }, []);

  const content = useMemo(() => {
    if (active === "Dashboard") return <Dashboard dashboard={dashboard} leads={leads} openLead={openLead} setActive={setActive} user={user} loading={isLoadingData} />;
    if (active === "Leads")
      return (
        <LeadsView
          leads={leads}
          filters={filters}
          setFilters={setFilters}
          users={users}
          openLead={openLead}
          setShowLeadForm={setShowLeadForm}
          updateLead={updateLead}
          pagination={leadsPagination}
          page={leadsPage}
          setPage={setLeadsPage}
          savedViews={savedViews}
          selectedViewId={selectedViewId}
          onApplyView={applyView}
          onSaveView={saveCurrentView}
        />
      );
    if (active === "Tasks") return <TasksView tasks={tasks} completeTask={completeTask} setTaskForm={setTaskForm} taskForm={taskForm} users={users} leads={leads} createTask={createTask} />;
    if (active === "Means of Conversation") return <CallsView calls={calls} openLead={openLead} />;
    if (active === "Campaigns") return <CampaignsView campaigns={campaigns} setShowCampaignForm={setShowCampaignForm} />;
    if (active === "Analytics") return <AnalyticsView dashboard={dashboard} tasks={tasks} />;
    return <SettingsView user={user} users={users} />;
  }, [active, applyView, calls, campaigns, completeTask, createTask, dashboard, filters, leads, leadsPage, leadsPagination, openLead, saveCurrentView, savedViews, selectedViewId, taskForm, tasks, updateLead, user, users]);

  const sidebarItems: SidebarItem[] = useMemo(() => {
    const tabs: SidebarItem[] = nav.map(([item, Icon]) => ({ kind: "tab", label: item, icon: Icon, active: active === item, onClick: () => setActive(item) }));
    const links: SidebarItem[] = user ? moduleNavForRole(user.role).map((item) => ({ kind: "link", label: item.label, icon: item.icon, href: item.href, active: false })) : [];
    return [...tabs, ...links];
  }, [active, user]);

  return (
    <div className="flex min-h-screen bg-app-glow">
      <Sidebar items={sidebarItems} />
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 border-b border-line bg-surface/80 px-4 py-3 backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="relative max-w-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={17} />
                <input value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} placeholder="Search leads, contacts, companies..." className="h-10 w-full rounded-xl border border-line bg-[#f5f8ff] pl-10 pr-3 text-sm text-slate-700 outline-none transition-shadow duration-150 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/12 dark:bg-[#101b2d] dark:text-slate-200" />
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-2 py-1.5">
              <button onClick={() => setActive("Dashboard")} className="rounded-lg bg-brand-50 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300">Overview</button>
              <button onClick={() => setActive("Leads")} className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 transition-colors hover:bg-panel dark:text-slate-300">Leads</button>
            </div>
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-slate-500 transition-colors hover:bg-panel dark:text-slate-400">
              <Bell size={17} />
              {notifications?.length ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-surface" /> : null}
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-2 py-1.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-semibold text-white shadow-glow">{(user?.name ?? "?").charAt(0)}</div>
              <div className="hidden text-right sm:block">
                <div className="text-sm font-semibold leading-tight text-ink">{user?.name ?? "Loading"}</div>
                <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{user?.role ? titleCase(user.role) : ""}</div>
              </div>
            </div>
            <button onClick={() => setActive("Settings")} className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${active === "Settings" ? "border-brand-300 bg-brand-50 text-brand-600 dark:border-brand-700 dark:bg-brand-500/10 dark:text-brand-400" : "border-line bg-surface text-slate-600 hover:bg-panel dark:text-slate-300"}`}><Settings size={17} /></button>
            <button onClick={logout} className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-slate-600 transition-colors hover:bg-panel dark:text-slate-300"><LogOut size={17} /></button>
          </div>
        </header>
        <div className="p-4 lg:p-6">{content}</div>
      </main>
      {showLeadForm ? (
        <CreateLeadModal
          form={leadForm}
          setForm={setLeadForm}
          users={agents}
          campaigns={campaigns}
          onClose={() => {
            setShowLeadForm(false);
            setLeadFormError("");
          }}
          onSubmit={createLead}
          busy={busy}
          error={leadFormError}
        />
      ) : null}
      {showCampaignForm ? <CreateCampaignModal form={campaignForm} setForm={setCampaignForm} onClose={() => setShowCampaignForm(false)} onSubmit={createCampaign} busy={campaignBusy} /> : null}
      {selectedLead ? <LeadDrawer lead={selectedLead} users={agents} updateLead={updateLead} onClose={() => setSelectedLead(null)} taskForm={taskForm} setTaskForm={setTaskForm} createTask={createTask} completeTask={completeTask} callForm={callForm} setCallForm={setCallForm} logCall={logCall} analyze={analyze} /> : null}
    </div>
  );
}

function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: string }) {
  const tones: Record<string, string> = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800",
    amber: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-800",
    red: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-800",
    blue: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-800",
    slate: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600"
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${tones[tone]}`}>{children}</span>;
}

function statusTone(status: string) {
  if (status === "CONVERTED" || status === "QUALIFIED") return "green";
  if (status === "LOST" || status === "INVALID") return "red";
  if (status === "FOLLOW_UP" || status === "INTERESTED") return "amber";
  return "blue";
}

function priorityTone(priority: string) {
  if (priority === "HOT") return "red";
  if (priority === "WARM") return "amber";
  return "slate";
}

function isMissedStatus(status?: string | null) {
  return status === "MISSED" || status === "NO_ANSWER";
}

function conversationTone(call: Call): "green" | "red" {
  if (call.type === "MESSAGE" || call.type === "EMAIL") return "green";
  return isMissedStatus(call.status) ? "red" : "green";
}

function conversationCardClass(tone: "green" | "red") {
  return tone === "green"
    ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-500/10"
    : "border-red-200 bg-red-50/60 dark:border-red-800 dark:bg-red-500/10";
}

function activityConversationTone(activity: Activity): "green" | "red" | null {
  if (activity.activityType === "MESSAGE_LOGGED" || activity.activityType === "EMAIL_LOGGED") return "green";
  if (activity.activityType === "CALL_LOGGED") return isMissedStatus(activity.metadata?.status) ? "red" : "green";
  return null;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-surface p-4 shadow-card transition-shadow duration-200 hover:shadow-card-hover ${className}`}>{children}</section>;
}

function Dashboard({ dashboard, leads, openLead, setActive, user, loading }: any) {
  const slaSummary = useMemo(() => {
    const summary = { ok: 0, warning: 0, escalated: 0 };
    for (const lead of leads) {
      const state = getLeadSlaState({
        priority: lead.priority as "HOT" | "WARM" | "COLD",
        status: lead.status,
        nextFollowUpAt: lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt) : null
      });
      if (state.status === "OK") summary.ok += 1;
      else if (state.status === "WARNING") summary.warning += 1;
      else summary.escalated += 1;
    }
    return summary;
  }, [leads]);

  const workflowActions = useMemo(() => leads.flatMap((lead) => evaluateWorkflowActions(lead)).slice(0, 4), [leads]);

  if (!dashboard || (loading && !dashboard)) return <LoadingGrid />;

  const kpis = [
    ["Total Leads", dashboard.kpis.total, Users, "brand"],
    ["New Leads", dashboard.kpis.newLeads, Plus, "violet"],
    ["Contacted", dashboard.kpis.contacted, Phone, "sky"],
    ["Qualified", dashboard.kpis.qualified, CheckCircle2, "emerald"],
    ["Hot Leads", dashboard.kpis.hot, Sparkles, "red"],
    ["Follow-ups Due", dashboard.kpis.followUpsDue, CalendarClock, "amber"],
    ["Converted", dashboard.kpis.converted, CircleDollarSign, "green"],
    ["Conversion Rate", `${dashboard.kpis.conversionRate}%`, BarChart3, "brand"]
  ];

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-5 text-white shadow-soft">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-100/90">Sales cockpit</div>
            <div className="mt-2 text-3xl font-semibold tracking-[-0.05em]">Executive CRM overview</div>
            <p className="mt-2 max-w-2xl text-sm text-brand-50/90">Monitor pipeline health, team productivity, and deal acceleration across the full revenue cycle.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setActive("Leads")} className="rounded-xl bg-white/12 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-white/18">Open pipeline</button>
            <button onClick={() => setActive("Tasks")} className="rounded-xl border border-white/25 bg-white/8 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-white/14">View tasks</button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(([label, value, Icon, tone]: any) => (
          <Card key={label} className="group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{value}</p>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${kpiChipTones[tone]}`}><Icon size={19} /></div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <ChartCard title="Leads by Status"><BarGraph data={dashboard.byStatus} /></ChartCard>
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-ink">AI Action Center</h3>
            <Badge tone="blue">Priority</Badge>
          </div>
          <div className="mt-3 space-y-2.5">
            {dashboard.actions.map((action: any) => (
              <button key={action.type + action.message} onClick={() => action.leadId && openLead(action.leadId)} className="flex w-full items-center justify-between rounded-xl border border-line p-3 text-left transition-all duration-150 hover:border-brand-300 hover:bg-panel">
                <div>
                  <div className="text-sm font-semibold">{action.type}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{action.message}</div>
                </div>
                <ChevronRight size={16} className="text-slate-400 transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
          <button onClick={() => setActive("Tasks")} className="mt-4 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-600 dark:text-brand-400">View all tasks →</button>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-ink">SLA overview</h3>
            <Badge tone="slate">Health</Badge>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl border border-line bg-panel p-3"><div className="text-xs uppercase tracking-wide text-slate-500">OK</div><div className="mt-2 text-2xl font-semibold text-ink">{slaSummary.ok}</div></div>
            <div className="rounded-xl border border-line bg-panel p-3"><div className="text-xs uppercase tracking-wide text-slate-500">Warning</div><div className="mt-2 text-2xl font-semibold text-amber-600">{slaSummary.warning}</div></div>
            <div className="rounded-xl border border-line bg-panel p-3"><div className="text-xs uppercase tracking-wide text-slate-500">Escalated</div><div className="mt-2 text-2xl font-semibold text-red-600">{slaSummary.escalated}</div></div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-ink">Automation queue</h3>
            <Badge tone="green">Live</Badge>
          </div>
          <div className="mt-3 space-y-2">
            {workflowActions.map((action) => (
              <div key={`${action.leadId ?? "lead"}-${action.id}`} className="rounded-xl border border-line bg-panel p-3">
                <div className="text-sm font-semibold">{action.name}</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{action.description}</div>
                <div className="mt-2 text-xs font-medium text-brand-700 dark:text-brand-300">{action.message}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-ink">Today&apos;s follow-ups</h3>
          <div className="mt-3 space-y-2">
            {dashboard.todayTasks.map((task: Task) => <TaskRow key={task.id} task={task} />)}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard title="Leads by Source"><PieGraph data={dashboard.bySource} /></ChartCard>
        <ChartCard title="Conversion Funnel"><FunnelGraph data={dashboard.funnel} /></ChartCard>
        <ChartCard title="Agent Performance"><AgentGraph data={dashboard.agentPerformance} /></ChartCard>
      </div>

      {user?.role === "SALES" || user?.role === "ADMIN" ? (
        <div>
          <h2 className="mb-3 font-semibold text-ink">My Customers & Billing</h2>
          <SalesBillingWidgets />
        </div>
      ) : null}
      {user?.role === "FINANCE" || user?.role === "ADMIN" ? (
        <div>
          <h2 className="mb-3 font-semibold text-ink">Finance Overview</h2>
          <FinanceOverviewWidgets />
        </div>
      ) : null}
    </div>
  );
}

function LeadsView({ leads, filters, setFilters, users, openLead, setShowLeadForm, updateLead, pagination, page, setPage, savedViews, selectedViewId, onApplyView, onSaveView }: any) {
  const visibleLeads = useMemo(() => leads.filter((lead: Lead) => matchesLeadFilters(lead, filters)), [filters, leads]);

  return (
    <div className="space-y-4">
      <Title
        title="Leads"
        subtitle="Search, filter, assign, update status, and open Lead 360."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={onSaveView} className="rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-panel">Save view</button>
            <button onClick={() => setShowLeadForm(true)} className="rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-glow transition-all duration-150 hover:brightness-110 active:scale-[0.98]">Create Lead</button>
          </div>
        }
      />

      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {savedViews.map((view: SavedLeadView) => (
              <button
                key={view.id}
                type="button"
                onClick={() => onApplyView(view)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all ${selectedViewId === view.id ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-500/10 dark:text-brand-300" : "border-line bg-surface text-slate-600 hover:bg-panel dark:text-slate-300"}`}
              >
                {view.name}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            <Filter label="Status" value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} options={["ALL", ...statuses]} />
            <Filter label="Source" value={filters.source} onChange={(v) => setFilters({ ...filters, source: v })} options={["ALL", ...sources]} />
            <Filter label="Priority" value={filters.priority} onChange={(v) => setFilters({ ...filters, priority: v })} options={["ALL", ...priorities]} />
            <Filter label="Agent" value={filters.assignedTo} onChange={(v) => setFilters({ ...filters, assignedTo: v })} options={["ALL", "UNASSIGNED", ...users.map((u: User) => u.id)]} render={(v) => (v === "UNASSIGNED" ? "Unassigned" : users.find((u: User) => u.id === v)?.name ?? v)} />
            <div><label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Saved view</label><div className="mt-2 rounded-lg border border-line px-3 py-2 text-sm text-slate-500 dark:text-slate-400">{savedViews.find((view: SavedLeadView) => view.id === selectedViewId)?.name ?? "Custom"}</div></div>
          </div>
        </div>
      </Card>
      <div className="overflow-hidden rounded-2xl border border-line/70 bg-surface shadow-card">
        <div className="overflow-x-auto thin-scrollbar">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-panel text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>{["Lead Name", "Company", "Phone", "Email", "Source", "Status", "Priority", "Score", "Assigned Agent", "Next Follow-up", "Created", "Actions"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visibleLeads.map((lead: Lead) => (
                <tr key={lead.id} className="transition-colors hover:bg-panel/70">
                  <td className="px-4 py-3 font-semibold text-ink">{lead.firstName} {lead.lastName}</td>
                  <td className="px-4 py-3">{lead.company}</td>
                  <td className="px-4 py-3">{lead.phone}</td>
                  <td className="px-4 py-3">{lead.email}</td>
                  <td className="px-4 py-3">{lead.source}</td>
                  <td className="px-4 py-3"><Badge tone={statusTone(lead.status)}>{titleCase(lead.status)}</Badge></td>
                  <td className="px-4 py-3"><Badge tone={priorityTone(lead.priority)}>{lead.priority}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink">{lead.score}</span>
                      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-panel"><span className="block h-full rounded-full bg-brand-500" style={{ width: `${lead.score}%` }} /></span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select value={lead.assignedTo ?? ""} onChange={(e) => updateLead(lead.id, { assignedTo: e.target.value })} className="rounded-lg border border-line bg-surface px-2 py-1 transition-colors hover:border-brand-400">
                      <option value="">Unassigned</option>{users.map((u: User) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">{dateLabel(lead.nextFollowUpAt)}</td>
                  <td className="px-4 py-3">{dateLabel(lead.createdAt)}</td>
                  <td className="px-4 py-3"><button onClick={() => openLead(lead.id)} className="rounded-lg border border-line px-3 py-1.5 font-semibold text-brand-700 transition-colors hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visibleLeads.length ? <Empty label="No leads match these filters." /> : null}
        {visibleLeads.length ? (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
            <span>
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} lead{pagination.total === 1 ? "" : "s"}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p: number) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-line px-3 py-1.5 font-semibold transition-colors hover:bg-panel disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p: number) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="rounded-lg border border-line px-3 py-1.5 font-semibold transition-colors hover:bg-panel disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LeadDrawer({ lead, users, updateLead, onClose, taskForm, setTaskForm, createTask, completeTask, callForm, setCallForm, logCall, analyze }: any) {
  const ai = lead.ai;
  return (
    <div className="fixed inset-0 z-30 animate-fade-in bg-slate-900/40 backdrop-blur-sm">
      <aside className="absolute right-0 top-0 h-full w-full max-w-5xl animate-slide-in-right overflow-y-auto bg-surface shadow-soft thin-scrollbar sm:border-l sm:border-line">
        <div className="sticky top-0 z-10 border-b border-line bg-surface/90 px-5 py-4 backdrop-blur-md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-semibold tracking-tight text-ink">{lead.firstName} {lead.lastName}</h2><Badge tone={statusTone(lead.status)}>{titleCase(lead.status)}</Badge><Badge tone={priorityTone(lead.priority)}>{lead.priority}</Badge></div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{lead.company} · {lead.assignedUser?.name ?? "Unassigned"} · Score {lead.score}/100</p>
            </div>
            <button onClick={onClose} className="rounded-lg border border-line px-3 py-2 text-sm font-semibold transition-colors hover:bg-panel">Close</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <select value={lead.status} onChange={(e) => updateLead(lead.id, { status: e.target.value })} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm transition-colors hover:border-brand-400">{statuses.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</select>
            <select value={lead.assignedTo ?? ""} onChange={(e) => updateLead(lead.id, { assignedTo: e.target.value })} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm transition-colors hover:border-brand-400"><option value="">Assign lead</option>{users.map((u: User) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
            <button onClick={analyze} className="flex items-center gap-2 rounded-lg bg-gradient-to-b from-slate-800 to-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:brightness-110 active:scale-[0.98] dark:from-slate-700 dark:to-slate-800"><Sparkles size={16} /> Analyze Call</button>
          </div>
        </div>
        <div className="grid gap-4 p-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <Card><h3 className="font-semibold">Contact Information</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">{[["Email", lead.email], ["Phone", lead.phone], ["Company", lead.company], ["Designation", lead.designation], ["Location", lead.city], ["Source", lead.source]].map(([k, v]) => <Info key={k} label={k} value={v || "Not set"} />)}</div></Card>
            <Card>
              <h3 className="font-semibold">AI Summary <span className="text-xs font-normal text-slate-500 dark:text-slate-400">(live insight)</span></h3>
              <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">{ai?.summary}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Info label="Customer intent" value={ai?.customerIntent ?? ai?.intent ?? "Run analysis"} />
                <Info label="Sentiment" value={ai?.sentiment ?? "Available after analysis"} />
                <Info label="Key requirement" value={ai?.keyRequirements ?? ai?.requirement ?? "Not captured"} />
                <Info label="Objection" value={ai?.objections ?? "None captured"} />
                <Info label="Buying timeline" value={ai?.buyingTimeline ?? "Needs review"} />
                <Info label="Next best action" value={ai?.nextBestAction ?? ai?.recommendedNextAction ?? "Review lead"} />
              </div>
            </Card>
            <Card><h3 className="font-semibold">Timeline</h3><div className="mt-3 space-y-3">{lead.activities?.map((activity: Activity) => { const tone = activityConversationTone(activity); const borderClass = tone === "green" ? "border-emerald-400 dark:border-emerald-600" : tone === "red" ? "border-red-400 dark:border-red-600" : "border-brand-100"; return <div key={activity.id} className={`border-l-2 ${borderClass} pl-3`}><div className="text-sm font-semibold">{titleCase(activity.activityType)}</div><div className="text-sm text-slate-600 dark:text-slate-300">{activity.description}</div><div className="text-xs text-slate-400 dark:text-slate-500">{dateLabel(activity.createdAt)} · {activity.user?.name ?? "System"}</div></div>; })}</div></Card>
            <Card><h3 className="font-semibold">Means of Conversation</h3><div className="mt-3 space-y-2">{lead.calls?.map((call: Call) => { const tone = conversationTone(call); const toneClass = conversationCardClass(tone); if (call.type === "MESSAGE") return <div key={call.id} className={`rounded-xl border p-3 transition-colors ${toneClass}`}><div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 font-semibold"><MessageSquare size={14} /> Message · {call.direction === "INBOUND" ? "Received" : "Sent"}</span><Badge tone={tone}>Logged</Badge></div><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{call.content || "No content"}</p><p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{dateLabel(call.createdAt)} · {call.agent?.name}</p></div>; if (call.type === "EMAIL") return <div key={call.id} className={`rounded-xl border p-3 transition-colors ${toneClass}`}><div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 font-semibold"><Mail size={14} /> Email · {call.direction === "INBOUND" ? "Received" : "Sent"}{call.outcome ? ` · ${call.outcome}` : ""}</span><Badge tone={tone}>Logged</Badge></div><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{call.content || "No content"}</p><p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{dateLabel(call.createdAt)} · {call.agent?.name}</p></div>; return <div key={call.id} className={`rounded-xl border p-3 transition-colors ${toneClass}`}><div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 font-semibold"><Phone size={14} /> {call.outcome}</span><div className="flex items-center gap-2"><Badge tone={tone}>{call.status ? titleCase(call.status) : "Logged"}</Badge><span className="text-sm text-slate-500 dark:text-slate-400">{call.duration} min</span></div></div><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{call.notes || "No notes"}</p><p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{dateLabel(call.createdAt)} · {call.agent?.name}</p></div>; })}</div></Card>
          </div>
          <div className="space-y-4">
            <Card>
              <h3 className="font-semibold">Lead Score</h3>
              <div className="mt-3 text-4xl font-semibold text-ink">{lead.score}/100</div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{lead.scoreMeta?.classification ?? (lead.score >= 75 ? "Hot Lead" : lead.score >= 45 ? "Warm Lead" : "Cold Lead")}</p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"><span>Positive factors</span><span>{lead.scoreMeta?.breakdown.filter((item) => item.delta > 0).reduce((sum, item) => sum + item.delta, 0) ?? lead.score}</span></div>
                {lead.scoreMeta?.breakdown.filter((item) => item.delta > 0).slice(0, 4).map((item) => (
                  <div key={`${item.factor}-${item.delta}`} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <div className="flex items-center justify-between gap-2"><span className="font-semibold">{item.factor}</span><span>+{item.delta}</span></div>
                    <p className="mt-1 text-[11px] opacity-90">{item.note}</p>
                  </div>
                )) ?? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-500/10 dark:text-emerald-300">Requested callback +20</div>
                )}
              </div>
              {lead.scoreMeta?.breakdown.some((item) => item.delta < 0) ? (
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Negative factors</div>
                  {lead.scoreMeta.breakdown.filter((item) => item.delta < 0).map((item) => (
                    <div key={`${item.factor}-${item.delta}`} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-500/10 dark:text-red-300">
                      <div className="flex items-center justify-between gap-2"><span className="font-semibold">{item.factor}</span><span>{item.delta}</span></div>
                      <p className="mt-1 text-[11px] opacity-90">{item.note}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </Card>
            <Card>
              <h3 className="font-semibold">Log Conversation</h3>
              <form onSubmit={logCall} className="mt-3 space-y-3">
                <Filter label="Type" value={callForm.type} onChange={(v) => setCallForm({ ...callForm, type: v })} options={["CALL", "MESSAGE", "EMAIL"]} render={(v) => (v === "MESSAGE" ? "Messages" : v === "EMAIL" ? "Email" : "Call")} />
                <Filter label="Direction" value={callForm.direction} onChange={(v) => setCallForm({ ...callForm, direction: v })} options={["OUTBOUND", "INBOUND"]} render={(v) => (callForm.type !== "CALL" ? (v === "OUTBOUND" ? "Sent" : "Received") : titleCase(v))} />
                {callForm.type === "MESSAGE" ? (
                  <Textarea label="Message" value={callForm.content} onChange={(v) => setCallForm({ ...callForm, content: v })} />
                ) : callForm.type === "EMAIL" ? (
                  <>
                    <Input label="Subject" value={callForm.outcome} onChange={(v) => setCallForm({ ...callForm, outcome: v })} />
                    <Textarea label="Body" value={callForm.content} onChange={(v) => setCallForm({ ...callForm, content: v })} />
                  </>
                ) : (
                  <>
                    <Filter label="Status" value={callForm.status} onChange={(v) => setCallForm({ ...callForm, status: v })} options={["CONNECTED", "MISSED", "NO_ANSWER"]} />
                    <Input label="Outcome" value={callForm.outcome} onChange={(v) => setCallForm({ ...callForm, outcome: v })} />
                    <Input label="Duration" type="number" value={callForm.duration} onChange={(v) => setCallForm({ ...callForm, duration: Number(v) })} />
                    <Textarea label="Transcript" value={callForm.transcript} onChange={(v) => setCallForm({ ...callForm, transcript: v })} />
                  </>
                )}
                <Textarea label="Notes" value={callForm.notes} onChange={(v) => setCallForm({ ...callForm, notes: v })} />
                <button className={`w-full ${primaryBtnClass}`}>{callForm.type === "MESSAGE" ? "Log Message" : callForm.type === "EMAIL" ? "Log Email" : "Log Call"}</button>
              </form>
            </Card>
            <Card><h3 className="font-semibold">Tasks / Follow-ups</h3><div className="mt-3 space-y-2">{lead.tasks?.map((task: Task) => <div key={task.id} className="rounded-xl border border-line p-3 transition-colors hover:bg-panel/50"><div className="font-semibold">{task.title}</div><div className="text-sm text-slate-500 dark:text-slate-400">{dateLabel(task.dueDate)} · {titleCase(task.status)}</div>{task.status !== "COMPLETED" ? <button onClick={() => completeTask(task.id)} className="mt-2 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-600 dark:text-brand-400">Complete</button> : null}</div>)}</div><form onSubmit={createTask} className="mt-4 space-y-3"><Input label="New task" value={taskForm.title} onChange={(v) => setTaskForm({ ...taskForm, title: v })} /><Input label="Due date" type="datetime-local" value={taskForm.dueDate} onChange={(v) => setTaskForm({ ...taskForm, dueDate: v })} /><button className={`w-full ${secondaryBtnClass}`}>Create Follow-up</button></form></Card>
          </div>
        </div>
      </aside>
    </div>
  );
}

function TasksView({ tasks, completeTask, setTaskForm, taskForm, users, leads, createTask }: any) {
  const buckets = ["Overdue", "Today", "Upcoming", "Completed"];
  return <div className="space-y-4"><Title title="Tasks" subtitle="Today, upcoming, overdue, and completed follow-ups." /><Card><form onSubmit={createTask} className="grid gap-3 md:grid-cols-5"><Input label="Title" value={taskForm.title} onChange={(v) => setTaskForm({ ...taskForm, title: v })} /><Input label="Due" type="datetime-local" value={taskForm.dueDate} onChange={(v) => setTaskForm({ ...taskForm, dueDate: v })} /><Filter label="Agent" value={taskForm.assignedTo} onChange={(v) => setTaskForm({ ...taskForm, assignedTo: v })} options={["", ...users.map((u: User) => u.id)]} render={(v) => users.find((u: User) => u.id === v)?.name ?? "Assign"} /><Filter label="Lead" value={taskForm.leadId} onChange={(v) => setTaskForm({ ...taskForm, leadId: v })} options={["", ...leads.map((l: Lead) => l.id)]} render={(v) => leads.find((l: Lead) => l.id === v)?.firstName ?? "Optional"} /><button className={`self-end ${primaryBtnClass}`}>Create Task</button></form></Card><div className="grid gap-4 xl:grid-cols-4">{buckets.map((bucket) => <Card key={bucket}><h3 className="font-semibold">{bucket}</h3><div className="mt-3 space-y-2">{tasks.filter((task: Task) => taskBucket(new Date(task.dueDate), task.status === "COMPLETED") === bucket).map((task: Task) => <TaskRow key={task.id} task={task} action={task.status !== "COMPLETED" ? () => completeTask(task.id) : undefined} />)}</div></Card>)}</div></div>;
}

function CallsView({ calls, openLead }: any) {
  return (
    <div className="space-y-4">
      <Title title="Means of Conversation" subtitle="Manual call, message, and email log for the POC, linked to leads and timelines." />
      <Card>
        <div className="space-y-2">
          {calls.map((call: Call) => {
            const tone = conversationTone(call);
            const toneClass = conversationCardClass(tone);
            return call.type === "MESSAGE" ? (
              <button key={call.id} onClick={() => call.lead?.id && openLead(call.lead.id)} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors hover:bg-panel ${toneClass}`}>
                <div>
                  <div className="font-semibold">{call.lead?.firstName} {call.lead?.lastName} · {call.direction === "INBOUND" ? "Received" : "Sent"} message</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{call.agent?.name} · {dateLabel(call.createdAt)}</div>
                </div>
                <div className="flex items-center gap-2"><Badge tone={tone}>Logged</Badge><MessageSquare size={16} /></div>
              </button>
            ) : call.type === "EMAIL" ? (
              <button key={call.id} onClick={() => call.lead?.id && openLead(call.lead.id)} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors hover:bg-panel ${toneClass}`}>
                <div>
                  <div className="font-semibold">{call.lead?.firstName} {call.lead?.lastName} · {call.direction === "INBOUND" ? "Received" : "Sent"} email{call.outcome ? ` · ${call.outcome}` : ""}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{call.agent?.name} · {dateLabel(call.createdAt)}</div>
                </div>
                <div className="flex items-center gap-2"><Badge tone={tone}>Logged</Badge><Mail size={16} /></div>
              </button>
            ) : (
              <button key={call.id} onClick={() => call.lead?.id && openLead(call.lead.id)} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors hover:bg-panel ${toneClass}`}>
                <div>
                  <div className="font-semibold">{call.lead?.firstName} {call.lead?.lastName} · {call.outcome}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{call.agent?.name} · {call.duration} min · {dateLabel(call.createdAt)}</div>
                </div>
                <div className="flex items-center gap-2"><Badge tone={tone}>{call.status ? titleCase(call.status) : "Logged"}</Badge><Phone size={16} /></div>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function CampaignsView({ campaigns, setShowCampaignForm }: any) {
  return (
    <div className="space-y-4">
      <Title title="Campaigns" subtitle="Simple campaign performance tied to lead source and conversion." action={<button onClick={() => setShowCampaignForm(true)} className={primaryBtnClass}>Create Campaign</button>} />
      {!campaigns.length ? (
        <Card><Empty label="No campaigns yet. Create one to start tracking source performance." /></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {campaigns.map((campaign: Campaign) => {
            const leads = campaign.leads ?? [];
            const converted = leads.filter((lead) => lead.status === "CONVERTED").length;
            const qualified = leads.filter((lead) => ["QUALIFIED", "INTERESTED", "CONVERTED"].includes(lead.status)).length;
            return (
              <Card key={campaign.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{campaign.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{campaign.source}</p>
                  </div>
                  <Badge tone={campaignStatusTone(campaign.status)}>{titleCase(campaign.status)}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>{dateLabel(campaign.startDate)}{campaign.endDate ? ` → ${dateLabel(campaign.endDate)}` : ""}</span>
                  <span>Budget ₹{Number(campaign.budget).toLocaleString("en-IN")}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <Info label="Total leads" value={String(leads.length)} />
                  <Info label="Qualified" value={String(qualified)} />
                  <Info label="Converted" value={String(converted)} />
                  <Info label="Conv. rate" value={`${leads.length ? Math.round((converted / leads.length) * 100) : 0}%`} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function campaignStatusTone(status: string) {
  if (status === "ACTIVE") return "green";
  if (status === "PLANNED") return "slate";
  if (status === "PAUSED") return "amber";
  if (status === "COMPLETED") return "blue";
  return "slate";
}

function AnalyticsView({ dashboard, tasks }: any) {
  if (!dashboard) return <LoadingGrid />;
  const completed = tasks.filter((task: Task) => task.status === "COMPLETED").length;
  const trend = ["Week 1", "Week 2", "Week 3", "Week 4"].map((name, index) => ({ name, converted: Math.max(1, Math.round((dashboard.kpis.converted * (index + 1)) / 4)), leads: Math.round((dashboard.kpis.total * (index + 1)) / 4) }));
  return <div className="space-y-4"><Title title="Analytics" subtitle="Straightforward CRM analytics for the POC demo." /><div className="grid gap-4 xl:grid-cols-2"><ChartCard title="Conversion Trends"><AreaGraph data={trend} /></ChartCard><ChartCard title="Hot/Warm/Cold Distribution"><PieGraph data={dashboard.byPriority} /></ChartCard><ChartCard title="Agent Performance"><AgentGraph data={dashboard.agentPerformance} /></ChartCard><Card><h3 className="font-semibold">Follow-up Completion Rate</h3><div className="mt-5 text-5xl font-semibold">{tasks.length ? Math.round(completed / tasks.length * 100) : 0}%</div><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{completed} of {tasks.length} tasks completed</p></Card></div></div>;
}

function SettingsView({ user, users }: any) {
  return (
    <div className="space-y-4">
      <Title title="Settings" subtitle="Demo users and role-based access overview. Manage accounts in User Management (Admin)." />
      <Card>
        <h3 className="font-semibold">Appearance</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Switch the whole application between light and dark mode.</p>
        <ThemeToggle />
      </Card>
      <Card><h3 className="font-semibold">Current user</h3><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{user?.name} · {user?.email} · {user?.role}</p></Card>
      <Card><h3 className="font-semibold">Demo users</h3><div className="mt-3 divide-y divide-line">{users.map((u: User) => <div key={u.id} className="flex items-center justify-between py-3 text-sm"><span className="flex items-center gap-2.5"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-semibold text-white">{u.name.charAt(0)}</span>{u.name}</span><span className="text-slate-500 dark:text-slate-400">{u.email} · {titleCase(u.role)}</span></div>)}</div></Card>
    </div>
  );
}

const THEME_STORAGE_KEY = "vih_theme";

function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function applyTheme(next: "light" | "dark") {
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // localStorage may be unavailable (private browsing, disabled storage); theme just won't persist.
    }
  }

  return (
    <div className="mt-4 inline-flex rounded-xl border border-line bg-panel p-1">
      {(
        [
          ["light", Sun, "Light"],
          ["dark", Moon, "Dark"]
        ] as const
      ).map(([value, Icon, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => applyTheme(value)}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-150 ${
            theme === value ? "bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-glow" : "text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/5"
          }`}
        >
          <Icon size={16} /> {label}
        </button>
      ))}
    </div>
  );
}

function CreateLeadModal({ form, setForm, users, campaigns, onClose, onSubmit, busy, error }: any) {
  return <div className="fixed inset-0 z-40 grid animate-fade-in place-items-center bg-slate-900/40 p-4 backdrop-blur-sm"><form onSubmit={onSubmit} className="max-h-[90vh] w-full max-w-3xl animate-slide-up overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-soft thin-scrollbar"><div className="flex justify-between"><div><h2 className="text-xl font-semibold tracking-tight">Create Lead</h2><p className="text-sm text-slate-500 dark:text-slate-400">Saved to PostgreSQL, scored, and opened in Lead 360.</p></div><button type="button" onClick={onClose} className={secondaryBtnClass}>Close</button></div>{error ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p> : null}<div className="mt-5 grid gap-3 md:grid-cols-2"><Input label="First Name" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} required /><Input label="Last Name" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} required /><Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required /><Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required /><Input label="Company" value={form.company} onChange={(v) => setForm({ ...form, company: v })} required /><Input label="Designation" value={form.designation} onChange={(v) => setForm({ ...form, designation: v })} /><Input label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} /><Filter label="Source" value={form.source} onChange={(v) => setForm({ ...form, source: v })} options={sources} /><Filter label="Priority" value={form.priority} onChange={(v) => setForm({ ...form, priority: v })} options={priorities} /><Filter label="Assigned Agent" value={form.assignedTo} onChange={(v) => setForm({ ...form, assignedTo: v })} options={["", ...users.map((u: User) => u.id)]} render={(v) => users.find((u: User) => u.id === v)?.name ?? "Unassigned"} /><Filter label="Campaign" value={form.campaignId} onChange={(v) => setForm({ ...form, campaignId: v })} options={["", ...campaigns.map((c: Campaign) => c.id)]} render={(v) => campaigns.find((c: Campaign) => c.id === v)?.name ?? "None"} /><Input label="Next Follow-up" type="datetime-local" value={form.nextFollowUpAt} onChange={(v) => setForm({ ...form, nextFollowUpAt: v })} /><div className="md:col-span-2"><Textarea label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} /></div></div><button disabled={busy} className={`mt-5 ${primaryBtnClass}`}>{busy ? "Creating..." : "Create Lead"}</button></form></div>;
}

function CreateCampaignModal({ form, setForm, onClose, onSubmit, busy }: any) {
  return (
    <div className="fixed inset-0 z-40 grid animate-fade-in place-items-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <form onSubmit={onSubmit} className="max-h-[90vh] w-full max-w-xl animate-slide-up overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-soft thin-scrollbar">
        <div className="flex justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Create Campaign</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Tracks source performance, budget, and lead conversion.</p>
          </div>
          <button type="button" onClick={onClose} className={secondaryBtnClass}>Close</button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2"><Input label="Campaign Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required /></div>
          <Filter label="Source" value={form.source} onChange={(v) => setForm({ ...form, source: v })} options={sources} />
          <Filter label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={campaignStatuses} />
          <Input label="Start Date" type="date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} required />
          <Input label="End Date" type="date" value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} />
          <Input label="Budget (₹)" type="number" value={form.budget} onChange={(v) => setForm({ ...form, budget: v })} required />
        </div>
        <button disabled={busy} className={`mt-5 w-full ${primaryBtnClass}`}>{busy ? "Creating..." : "Create Campaign"}</button>
      </form>
    </div>
  );
}

function Title({ title, subtitle, action }: any) {
  return <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-[28px] font-semibold tracking-[-0.04em] text-ink">{title}</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p></div>{action}</div>;
}

const fieldClass =
  "mt-2 w-full rounded-xl border border-line bg-[#f8fafd] px-3 text-sm text-ink outline-none transition-shadow duration-150 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/12 dark:bg-[#101b2d]";

const primaryBtnClass =
  "rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-3.5 py-2 text-sm font-semibold text-white shadow-glow transition-all duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:hover:brightness-100";
const secondaryBtnClass = "rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-panel";

function Input({ label, value, onChange, type = "text", required = false }: any) {
  return <label className="block"><span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span><input required={required} type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={`h-10 ${fieldClass}`} /></label>;
}

function Textarea({ label, value, onChange }: any) {
  return <label className="block"><span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span><textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={3} className={`py-2 ${fieldClass}`} /></label>;
}

function Filter({ label, value, onChange, options, render }: any) {
  return <label className="block"><span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span><select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={`h-10 ${fieldClass}`}>{options.map((option: string) => <option key={option} value={option}>{render ? render(option) : titleCase(option)}</option>)}</select></label>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</div><div className="mt-1 text-sm text-ink">{value}</div></div>;
}

function TaskRow({ task, action }: { task: Task; action?: () => void }) {
  return <div className="rounded-xl border border-line p-3 transition-colors hover:bg-panel/50"><div className="text-sm font-semibold">{task.title}</div><div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{task.lead ? `${task.lead.firstName} ${task.lead.lastName}` : "No lead"} · {dateLabel(task.dueDate)}</div>{action ? <button onClick={action} className="mt-2 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-600 dark:text-brand-400">Complete</button> : null}</div>;
}

function Empty({ label }: { label: string }) {
  return <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">{label}</div>;
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <div key={n} className="h-28 animate-pulse overflow-hidden rounded-2xl border border-line/70 bg-surface bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)] bg-[length:400px_100%]" />
      ))}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card><h3 className="font-semibold text-ink">{title}</h3><div className="mt-4 h-72">{children}</div></Card>;
}

function BarGraph({ data }: any) {
  return <ResponsiveContainer><BarChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" /><XAxis dataKey="name" tick={chartTick} /><YAxis allowDecimals={false} tick={chartTick} /><Tooltip contentStyle={chartTooltipStyle} /><Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>;
}

function AgentGraph({ data }: any) {
  return <ResponsiveContainer><BarChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" /><XAxis dataKey="name" tick={chartTick} /><YAxis allowDecimals={false} tick={chartTick} /><Tooltip contentStyle={chartTooltipStyle} /><Bar dataKey="assigned" fill="#2563eb" radius={[4, 4, 0, 0]} /><Bar dataKey="converted" fill="#16a34a" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>;
}

function PieGraph({ data }: any) {
  return <ResponsiveContainer><PieChart><Pie data={data} dataKey="value" nameKey="name" outerRadius={95} label>{data.map((_: any, i: number) => <Cell key={i} fill={colors[i % colors.length]} />)}</Pie><Tooltip contentStyle={chartTooltipStyle} /></PieChart></ResponsiveContainer>;
}

function FunnelGraph({ data }: any) {
  return <ResponsiveContainer><FunnelChart><Tooltip contentStyle={chartTooltipStyle} /><Funnel dataKey="value" data={data.slice(0, 6)} isAnimationActive>{data.slice(0, 6).map((_: any, i: number) => <Cell key={i} fill={colors[i % colors.length]} />)}</Funnel></FunnelChart></ResponsiveContainer>;
}

function AreaGraph({ data }: any) {
  return <ResponsiveContainer><AreaChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" /><XAxis dataKey="name" tick={chartTick} /><YAxis allowDecimals={false} tick={chartTick} /><Tooltip contentStyle={chartTooltipStyle} /><Area type="monotone" dataKey="leads" stroke="#2563eb" fill="#dbeafe" /><Area type="monotone" dataKey="converted" stroke="#16a34a" fill="#dcfce7" /></AreaChart></ResponsiveContainer>;
}
