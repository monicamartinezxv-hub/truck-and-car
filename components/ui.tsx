export default function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-accent lg:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-xs text-slate-400">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Flash({ success, error }: { success?: string; error?: string }) {
  if (!success && !error) return null;
  return (
    <div className="mb-4 space-y-2">
      {success ? (
        <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'amber',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'amber' | 'blue' | 'green' | 'red';
}) {
  const tones: Record<string, string> = {
    amber: 'text-amber-300 bg-amber-500/15',
    blue: 'text-blue-300 bg-blue-500/15',
    green: 'text-emerald-300 bg-emerald-500/15',
    red: 'text-red-300 bg-red-500/15',
  };

  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
      {hint ? (
        <p className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="px-1 py-6 text-center text-sm text-slate-500">{message}</p>;
}
