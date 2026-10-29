import Link from 'next/link';
import { Wrench } from 'lucide-react';
import { query, one } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { formatDate, formatMoney } from '@/lib/format';
import PageHeader, { EmptyState, StatCard } from '@/components/ui';

type Totals = {
  clients: number;
  jobs_today: number;
  receivable: number;
  sales: number;
};

type JobRow = {
  id: number;
  client_name: string;
  description: string;
  service_date: string;
  total: number;
  currency: string;
  payment_condition: string;
};

type DebtRow = {
  client_name: string;
  total: number;
  oldest: string;
  currency: string;
};

export default async function DashboardPage() {
  const user = await requireUser();

  const totals = await one<Totals>(`
    SELECT
      (SELECT count(*) FROM clients)::int AS clients,
      (SELECT count(*) FROM jobs WHERE service_date = current_date)::int AS jobs_today,
      COALESCE((SELECT sum(balance) FROM receivables WHERE NOT paid), 0) AS receivable,
      COALESCE((SELECT sum(amount) FROM sales), 0) AS sales
  `);

  const jobs = await query<JobRow>(
    `SELECT id, client_name, description, service_date, total, currency, payment_condition
     FROM jobs ORDER BY service_date DESC, id DESC LIMIT 5`,
  );

  const debts = await query<DebtRow>(
    `SELECT client_name, sum(balance) AS total, min(service_date) AS oldest, max(currency) AS currency
     FROM receivables
     WHERE NOT paid AND service_date < current_date - interval '30 days'
     GROUP BY client_name
     ORDER BY total DESC
     LIMIT 5`,
  );

  return (
    <div>
      <PageHeader
        title={user.role === 'user' ? `Dashboard - ${user.label}` : 'Dashboard'}
        subtitle="Resumen general del taller"
        actions={
          <Link href="/taller/nuevo" className="btn-primary">
            <Wrench className="h-4 w-4" />
            Nuevo trabajo
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Clientes" value={String(totals?.clients ?? 0)} tone="blue" hint="Registrados" />
        <StatCard label="Trabajos hoy" value={String(totals?.jobs_today ?? 0)} tone="green" hint="Del día" />
        <StatCard
          label="Por cobrar"
          value={formatMoney(totals?.receivable ?? 0)}
          tone="red"
          hint="Saldos abiertos"
        />
        <StatCard label="Ventas total" value={formatMoney(totals?.sales ?? 0)} tone="amber" hint="Acumulado" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="card-title">Últimos trabajos</h2>
          {jobs.length === 0 ? (
            <EmptyState message="Todavía no hay trabajos registrados" />
          ) : (
            <ul className="divide-y divide-surface/50">
              {jobs.map((job) => (
                <li key={job.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <Link href={`/taller/${job.id}`} className="font-medium text-slate-100 hover:text-accent">
                      {job.client_name || 'Sin cliente'}
                    </Link>
                    <p className="truncate text-xs text-slate-400">{job.description || 'Sin detalle'}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-slate-200">{formatMoney(job.total, job.currency)}</p>
                    <p className="text-xs text-slate-500">{formatDate(job.service_date)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="card-title">Clientes en mora (+30 días)</h2>
          {debts.length === 0 ? (
            <EmptyState message="Sin cuentas vencidas" />
          ) : (
            <ul className="divide-y divide-surface/50">
              {debts.map((debt) => (
                <li key={debt.client_name} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-slate-100">{debt.client_name || 'Sin cliente'}</p>
                    <p className="text-xs text-slate-500">Desde {formatDate(debt.oldest)}</p>
                  </div>
                  <p className="font-semibold text-red-300">{formatMoney(debt.total, debt.currency)}</p>
                </li>
              ))}
            </ul>
          )}
          <Link href="/cuentas-por-cobrar" className="btn-link mt-3">
            Ver cuentas por cobrar
          </Link>
        </section>
      </div>
    </div>
  );
}
