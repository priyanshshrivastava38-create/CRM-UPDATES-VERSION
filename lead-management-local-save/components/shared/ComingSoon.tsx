import { Construction } from "lucide-react";

export function ComingSoon({ title, description, stage }: { title: string; description: string; stage: string }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <section className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line/70 bg-surface p-16 text-center shadow-card">
        <Construction className="text-slate-400 dark:text-slate-500" size={28} />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">This screen ships in {stage}.</p>
        <p className="max-w-sm text-xs text-slate-500 dark:text-slate-400">The nav link and route are live now so the full CRM structure is navigable; the workflow behind it lands in a later stage of the build.</p>
      </section>
    </div>
  );
}
