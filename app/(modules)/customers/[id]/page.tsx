"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, Badge, Title, Info, Empty, LoadingGrid, Textarea, secondaryBtnClass } from "@/components/shared/ui";
import { dateLabel, titleCase } from "@/lib/format";

type Slab = { id: string; minVolume: number; maxVolume: number | null; rate: number | null };
type LineItem = { id: string; service: string; component: string; rateType: string; flatRate: number | null; slabs: Slab[] };
type RatePlan = { id: string; effectiveFrom: string; effectiveTo: string | null; status: string; lineItems: LineItem[] };
type OnboardingTask = { id: string; team: string; title: string; description?: string | null; status: string; isRequired: boolean; assignedTo?: { id: string; name: string } | null; completedAt?: string | null };
type Customer = {
  id: string;
  customerCode: string;
  name: string;
  status: string;
  billingAddress?: string | null;
  gstNumber?: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  activatedAt?: string | null;
  createdAt: string;
  accountManager?: { id: string; name: string };
  ratePlans: RatePlan[];
  onboarding?: { id: string; status: string; tasks: OnboardingTask[] } | null;
  platformAccounts: { id: string; service: string; externalAccountId: string; providerName: string; status: string }[];
  priceApprovals: { id: string; requestNumber: string; status: string; createdAt: string }[];
  activities: { id: string; activityType: string; description: string; createdAt: string; user?: { id: string; name: string } }[];
};

type SetupCharge = { id: string; amount: number; status: string; chargeDate?: string | null; waivedReason?: string | null; waivedBy?: { name: string } | null };

function statusTone(status: string) {
  if (status === "ACTIVE" || status === "COMPLETED" || status === "APPROVED") return "green";
  if (status === "SUSPENDED" || status === "INACTIVE" || status === "REJECTED" || status === "BLOCKED") return "red";
  return "amber";
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [setupCharges, setSetupCharges] = useState<SetupCharge[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [waivingId, setWaivingId] = useState<string | null>(null);
  const [waiveReason, setWaiveReason] = useState("");

  async function loadSetupCharges() {
    const res = await fetch(`/api/setup-charges?customerId=${params.id}`);
    if (res.ok) {
      const data = await res.json();
      setSetupCharges(data.charges ?? []);
    }
  }

  async function loadMe() {
    const res = await fetch("/api/bootstrap");
    if (res.ok) {
      const data = await res.json();
      setCanManage(data.user.role === "FINANCE" || data.user.role === "ADMIN");
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/customers/${params.id}`);
      if (res.status === 404) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer);
      }
      setLoading(false);
    }
    load();
    loadMe();
    loadSetupCharges();
  }, [params.id]);

  async function waiveCharge(id: string) {
    const res = await fetch(`/api/setup-charges/${id}/waive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: waiveReason })
    });
    if (res.ok) {
      setWaivingId(null);
      setWaiveReason("");
      loadSetupCharges();
    }
  }

  if (loading) return <LoadingGrid />;
  if (notFound || !customer) return <Empty label="Customer not found." />;

  const activePlan = customer.ratePlans.find((p) => p.status === "ACTIVE");
  const historicalPlans = customer.ratePlans.filter((p) => p.status !== "ACTIVE");

  return (
    <div className="space-y-5">
      <Title
        title={`${customer.customerCode} · ${customer.name}`}
        subtitle="Customer profile: commercial terms, onboarding, and platform mapping."
        action={<Badge tone={statusTone(customer.status)}>{titleCase(customer.status)}</Badge>}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold">Contact & Billing</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Info label="Contact" value={customer.contactName} />
              <Info label="Email" value={customer.contactEmail} />
              <Info label="Phone" value={customer.contactPhone} />
              <Info label="GST" value={customer.gstNumber || "Not set"} />
              <Info label="Billing Address" value={customer.billingAddress || "Not set"} />
              <Info label="Account Manager" value={customer.accountManager?.name ?? "Unassigned"} />
              <Info label="Customer Since" value={dateLabel(customer.createdAt)} />
              <Info label="Activated" value={customer.activatedAt ? dateLabel(customer.activatedAt) : "Not yet active"} />
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold">Active Rate Plan</h3>
            {activePlan ? (
              <div className="mt-3 space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Effective from {dateLabel(activePlan.effectiveFrom)}
                  {activePlan.effectiveTo ? ` to ${dateLabel(activePlan.effectiveTo)}` : " · current"}
                </p>
                {activePlan.lineItems.map((li) => (
                  <div key={li.id} className="rounded-xl border border-line p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{titleCase(li.service)} · {li.component}</span>
                      <Badge>{li.rateType === "FLAT" ? "Flat Rate" : "Slab"}</Badge>
                    </div>
                    {li.rateType === "FLAT" ? (
                      <p className="mt-1 text-sm">{li.flatRate != null ? `₹${li.flatRate} per unit` : "Rate hidden"}</p>
                    ) : (
                      <table className="mt-2 w-full text-sm">
                        <tbody>
                          {li.slabs.map((s) => (
                            <tr key={s.id} className="border-t border-line/60">
                              <td className="py-1 pr-2">
                                {s.minVolume.toLocaleString("en-IN")}
                                {s.maxVolume != null ? ` – ${s.maxVolume.toLocaleString("en-IN")}` : "+"}
                              </td>
                              <td className="py-1 text-right">{s.rate != null ? `₹${s.rate}` : "Hidden"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No active Rate Plan yet.</p>
            )}
            {historicalPlans.length ? (
              <div className="mt-4">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Rate History</div>
                <div className="mt-2 space-y-1">
                  {historicalPlans.map((p) => (
                    <div key={p.id} className="text-sm text-slate-600 dark:text-slate-300">
                      {dateLabel(p.effectiveFrom)} – {p.effectiveTo ? dateLabel(p.effectiveTo) : "current"} <Badge tone="slate">{titleCase(p.status)}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>

          <Card>
            <h3 className="font-semibold">Onboarding</h3>
            {customer.onboarding ? (
              <div className="mt-3 space-y-2">
                <Badge tone={statusTone(customer.onboarding.status)}>{titleCase(customer.onboarding.status)}</Badge>
                {["SALES", "FINANCE", "OPERATIONS"].map((team) => {
                  const tasks = customer.onboarding!.tasks.filter((t) => t.team === team);
                  if (!tasks.length) return null;
                  return (
                    <div key={team} className="mt-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{titleCase(team)}</div>
                      <div className="mt-1 space-y-1">
                        {tasks.map((t) => (
                          <div key={t.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
                            <span>{t.title}</span>
                            <Badge tone={statusTone(t.status)}>{titleCase(t.status)}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No onboarding checklist yet.</p>
            )}
          </Card>

          <Card>
            <h3 className="font-semibold">Platform Mapping</h3>
            {customer.platformAccounts.length ? (
              <div className="mt-3 space-y-2">
                {customer.platformAccounts.map((pa) => (
                  <div key={pa.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
                    <span>{titleCase(pa.service)} · {pa.providerName} · {pa.externalAccountId}</span>
                    <Badge tone={statusTone(pa.status)}>{titleCase(pa.status)}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No third-party platform accounts mapped yet.</p>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold">Setup Charges</h3>
            <div className="mt-3 space-y-2">
              {setupCharges.length ? (
                setupCharges.map((charge) => (
                  <div key={charge.id} className="rounded-lg border border-line px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>₹{Number(charge.amount).toLocaleString("en-IN")}</span>
                      <Badge tone={charge.status === "WAIVED" ? "slate" : statusTone(charge.status)}>{titleCase(charge.status)}</Badge>
                    </div>
                    {charge.status === "WAIVED" ? (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Waived by {charge.waivedBy?.name}: {charge.waivedReason}
                      </p>
                    ) : null}
                    {canManage && charge.status === "PENDING" ? (
                      waivingId === charge.id ? (
                        <div className="mt-2 space-y-2">
                          <Textarea label="Waiver reason" value={waiveReason} onChange={setWaiveReason} />
                          <div className="flex gap-2">
                            <button onClick={() => waiveCharge(charge.id)} className={secondaryBtnClass}>
                              Confirm Waive
                            </button>
                            <button onClick={() => setWaivingId(null)} className="text-xs text-slate-500 hover:text-ink">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setWaivingId(charge.id)} className="mt-2 text-xs font-semibold text-brand-700 hover:text-brand-600 dark:text-brand-400">
                          Waive
                        </button>
                      )
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">No setup charges recorded.</p>
              )}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold">Price Approval History</h3>
            <div className="mt-3 space-y-2">
              {customer.priceApprovals.length ? (
                customer.priceApprovals.map((par) => (
                  <div key={par.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
                    <span>{par.requestNumber}</span>
                    <Badge tone={statusTone(par.status)}>{titleCase(par.status)}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">No requests yet.</p>
              )}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold">Activity</h3>
            <div className="mt-3 space-y-3">
              {customer.activities.length ? (
                customer.activities.map((a) => (
                  <div key={a.id} className="border-l-2 border-brand-100 pl-3">
                    <div className="text-sm font-semibold">{titleCase(a.activityType)}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">{a.description}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      {dateLabel(a.createdAt)} · {a.user?.name ?? "System"}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">No activity recorded yet.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
