import Link from 'next/link';
import { query } from '@/lib/db';
import { formatDate, formatMoney } from '@/lib/format';
import { periodLabel, type ReportParams } from '@/lib/reports';
import { EmptyState } from '@/components/ui';
import { DetailGrid, DetailItem, Drill, Metric, ReportFrame } from './ui';

type ClientBalance = {
  id: number;
  name: string;
  ci_ruc: string;
  jobs_count: number;
  jobs_total: number;
  payments_total: number;
  balance: number;
};

type JobRow = {
  id: number;
  client_id: number;
  service_date: string;
  description: string;
  total: number;
  currency: string;
  created_by: string;
};

type PaymentRow = {
  id: number;
  client_id: number;
  amount: number;
  currency: string;
  payment_method: string;
  created_by: string;
  created_at: string;
};

export default async function ClientMovementsReport({ params }: { params: ReportParams }) {
  const { from, to, user } = params;

  const rows = await query<ClientBalance>(
    `SELECT c.id, c.name, c.ci_ruc,
            COALESCE(j.jobs_count, 0) AS jobs_count,
            COALESCE(j.jobs_total, 0) AS jobs_total,
            COALESCE(p.payments_total, 0) AS payments_total,
            COALESCE(r.balance, 0) AS balance
     FROM clients c
     LEFT JOIN (SELECT client_id, count(*)::int AS jobs_count, sum(total) AS jobs_total
                FROM jobs
                WHERE ($1 = '' OR service_date >= $1::date)
                  AND ($2 = '' OR service_date <= $2::date)
                  AND ($3 = '' OR created_by = $3)
                GROUP BY client_id) j ON j.client_id = c.id
     LEFT JOIN (SELECT client_id, sum(amount) AS payments_total
                FROM debt_payments
                WHERE ($1 = '' OR created_at >= $1::date)
                  AND ($2 = '' OR created_at < ($2::date + interval '1 day'))
                  AND ($3 = '' OR created_by = $3)
                GROUP BY client_id) p ON p.client_id = c.id
     LEFT JOIN (SELECT client_id, sum(balance) AS balance
                FROM receivables WHERE NOT paid AND ($3 = '' OR created_by = $3)
                GROUP BY client_id) r ON r.client_id = c.id
     WHERE COALESCE(j.jobs_count, 0) > 0
        OR COALESCE(p.payments_total, 0) > 0
        OR COALESCE(r.balance, 0) > 0
     ORDER BY COALESCE(j.jobs_total, 0) DESC, c.name`,
    [from, to, user],
  );

  const jobs = await query<JobRow>(
    `SELECT id, client_id, service_date, description, total, currency, created_by
     FROM jobs
     WHERE client_id IS NOT NULL
       AND ($1 = '' OR service_date >= $1::date)
       AND ($2 = '' OR service_date <= $2::date)
       AND ($3 = '' OR created_by = $3)
     ORDER BY service_date DESC, id DESC`,
    [from, to, user],
  );

  const payments = await query<PaymentRow>(
    `SELECT id, client_id, amount, currency, payment_method, created_by, created_at
     FROM debt_payments
     WHERE client_id IS NOT NULL
       AND ($1 = '' OR created_at >= $1::date)
       AND ($2 = '' OR created_at < ($2::date + interval '1 day'))
       AND ($3 = '' OR created_by = $3)
     ORDER BY created_at DESC`,
    [from, to, user],
  );

  const jobsByClient = new Map<number, JobRow[]>();
  jobs.forEach((job) => {
    jobsByClient.set(job.client_id, [...(jobsByClient.get(job.client_id) ?? []), job]);
  });

  const paymentsByClient = new Map<number, PaymentRow[]>();
  payments.forEach((payment) => {
    paymentsByClient.set(payment.client_id, [...(paymentsByClient.get(payment.client_id) ?? []), payment]);
  });

  const totals = rows.reduce(
    (acc, row) => ({
      billed: acc.billed + Number(row.jobs_total),
      collected: acc.collected + Number(row.payments_total),
      balance: acc.balance + Number(row.balance),
    }),
    { billed: 0, collected: 0, balance: 0 },
  );

  return (
    <ReportFrame
      title="Gestión de Clientes"
      subtitle={`${rows.length} clientes con movimientos · operario: ${user || 'todos'}`}
      period={periodLabel(from, to)}
    >
      <div className="mb-3 grid gap-2 sm:grid-cols-3">
        <Metric label="Facturado" value={formatMoney(totals.billed)} tone="amber" />
        <Metric label="Cobrado" value={formatMoney(totals.collected)} tone="green" />
        <Metric label="Saldo" value={formatMoney(totals.balance)} tone="red" />
      </div>

      {rows.length === 0 ? (
        <EmptyState message="Sin movimientos de clientes en el período" />
      ) : (
        rows.map((row) => {
          const clientJobs = jobsByClient.get(row.id) ?? [];
          const clientPayments = paymentsByClient.get(row.id) ?? [];
          return (
            <Drill
              key={row.id}
              summary={
                <>
                  <span className="text-slate-300">
                    <span className="font-medium text-slate-100">{row.name}</span>
                    {row.ci_ruc ? <span className="text-slate-500"> · {row.ci_ruc}</span> : null}
                    <span className="block text-xs text-slate-500">
                      {row.jobs_count} trabajos · cobrado {formatMoney(row.payments_total)}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-semibold text-slate-100">
                      {formatMoney(row.jobs_total)}
                    </span>
                    <span
                      className={`block text-[11px] ${
                        Number(row.balance) > 0 ? 'text-red-300' : 'text-slate-500'
                      }`}
                    >
                      saldo {formatMoney(row.balance)}
                    </span>
                  </span>
                </>
              }
            >
              <DetailGrid>
                <DetailItem label="CI / RUC" value={row.ci_ruc || '-'} />
                <DetailItem label="Trabajos" value={String(row.jobs_count)} />
                <DetailItem label="Facturado" value={formatMoney(row.jobs_total)} />
                <DetailItem label="Cobrado" value={formatMoney(row.payments_total)} />
                <DetailItem label="Saldo" value={formatMoney(row.balance)} />
              </DetailGrid>

              <p className="mt-2 font-semibold text-slate-200">Trabajos</p>
              {clientJobs.length === 0 ? (
                <p className="text-slate-500">Sin trabajos en el período.</p>
              ) : (
                clientJobs.map((job) => (
                  <p key={job.id} className="flex flex-wrap justify-between gap-2 border-b border-surface/30 pb-1">
                    <span>
                      <span className="text-slate-500">{formatDate(job.service_date)}</span> ·{' '}
                      {job.description || 'Sin detalle'} · {job.created_by || 'Sin operario'}
                    </span>
                    <span className="text-slate-200">{formatMoney(job.total, job.currency)}</span>
                  </p>
                ))
              )}

              <p className="mt-2 font-semibold text-slate-200">Pagos</p>
              {clientPayments.length === 0 ? (
                <p className="text-slate-500">Sin pagos en el período.</p>
              ) : (
                clientPayments.map((payment) => (
                  <p key={payment.id} className="flex flex-wrap justify-between gap-2 border-b border-surface/30 pb-1">
                    <span>
                      <span className="text-slate-500">{formatDate(payment.created_at)}</span> ·{' '}
                      {payment.payment_method} · {payment.created_by || 'Sin operario'}
                    </span>
                    <span className="text-emerald-300">{formatMoney(payment.amount, payment.currency)}</span>
                  </p>
                ))
              )}

              <Link href={`/clientes/${row.id}`} className="btn-link mt-2">
                Ver ficha del cliente
              </Link>
            </Drill>
          );
        })
      )}
    </ReportFrame>
  );
}
