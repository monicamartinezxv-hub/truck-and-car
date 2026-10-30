import type { ReactNode } from 'react';

const TONES: Record<string, string> = {
  slate: 'text-slate-200',
  red: 'text-red-300',
  green: 'text-emerald-300',
  amber: 'text-amber-300',
};

export function ReportFrame({
  title,
  subtitle,
  period,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  period: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="card">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2 border-b border-surface/60 pb-3">
        <div>
          <h2 className="text-base font-bold text-white">{title}</h2>
          <p className="text-xs text-slate-400">
            {subtitle ? `${subtitle} · ` : ''}Período: {period}
          </p>
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}

export function Metric({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: string;
  tone?: 'slate' | 'red' | 'green' | 'amber';
}) {
  return (
    <div className="rounded-lg border border-surface/60 bg-dark/40 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 text-sm font-bold ${TONES[tone]}`}>{value}</p>
    </div>
  );
}

export function Drill({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  return (
    <details className="border-b border-surface/50 py-2 last:border-b-0">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 text-sm [&::-webkit-details-marker]:hidden">
        {summary}
      </summary>
      <div className="mt-2 rounded-lg border border-surface/60 bg-dark/60 p-3 text-xs text-slate-300">
        {children}
      </div>
    </details>
  );
}

export function DetailGrid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>;
}

export function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-2 border-b border-surface/30 pb-1">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right text-slate-200">{value}</dd>
    </div>
  );
}
