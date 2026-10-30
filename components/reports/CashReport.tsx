import { query } from '@/lib/db';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { periodLabel, type ReportParams } from '@/lib/reports';
import { EmptyState } from '@/components/ui';
import { DetailGrid, DetailItem, Drill, Metric, ReportFrame } from './ui';

type SessionRow = {
  id: number;
  owner_username: string;
  opening_amount: number;
  closing_amount: number | null;
  status: string;
  opened_at: string;
  closed_at: string | null;
};

type OperatorTotals = {
  operator: string;
  sessions: number;
  openSessions: number;
  opening: number;
  closing: number;
  salesTotal: number;
  salesCash: number;
  paymentsTotal: number;
  paymentsCash: number;
  jobsCash: number;
  jobsCount: number;
  history: SessionRow[];
};

type MovementAgg = {
  created_by: string;
  count: number;
  total: number;
  cash: number;
};

const emptyTotals = (operator: string): OperatorTotals => ({
  operator,
  sessions: 0,
  openSessions: 0,
  opening: 0,
  closing: 0,
  salesTotal: 0,
  salesCash: 0,
  paymentsTotal: 0,
  paymentsCash: 0,
  jobsCash: 0,
  jobsCount: 0,
  history: [],
});

export default async function CashReport({ params }: { params: ReportParams }) {
  const { from, to, user } = params;

  const sessions = await query<SessionRow>(
    `SELECT id, owner_username, opening_amount, closing_amount, status, opened_at, closed_at
     FROM cash_sessions
     WHERE ($1 = '' OR opened_at >= $1::date)
       AND ($2 = '' OR opened_at < ($2::date + interval '1 day'))
       AND ($3 = '' OR owner_username = $3)
     ORDER BY opened_at DESC`,
    [from, to, user],
  );

  const sales = await query<MovementAgg>(
    `SELECT created_by, count(*)::int AS count, sum(amount) AS total,
            sum(CASE WHEN payment_method = 'Efectivo' THEN amount ELSE 0 END) AS cash
     FROM sales
     WHERE ($1 = '' OR created_at >= $1::date)
       AND ($2 = '' OR created_at < ($2::date + interval '1 day'))
       AND ($3 = '' OR created_by = $3)
     GROUP BY created_by`,
    [from, to, user],
  );

  const payments = await query<MovementAgg>(
    `SELECT created_by, count(*)::int AS count, sum(amount) AS total,
            sum(CASE WHEN payment_method = 'Efectivo' THEN amount ELSE 0 END) AS cash
     FROM debt_payments
     WHERE ($1 = '' OR created_at >= $1::date)
       AND ($2 = '' OR created_at < ($2::date + interval '1 day'))
       AND ($3 = '' OR created_by = $3)
     GROUP BY created_by`,
    [from, to, user],
  );

  const jobs = await query<MovementAgg>(
    `SELECT created_by, count(*)::int AS count, sum(total) AS total, sum(total) AS cash
     FROM jobs
     WHERE payment_condition = 'Contado'
       AND ($1 = '' OR service_date >= $1::date)
       AND ($2 = '' OR service_date <= $2::date)
       AND ($3 = '' OR created_by = $3)
     GROUP BY created_by`,
    [from, to, user],
  );

  const totals = new Map<string, OperatorTotals>();
  const ensure = (operator: string) => {
    const key = operator || 'Sin operario';
    const current = totals.get(key) ?? emptyTotals(key);
    totals.set(key, current);
    return current;
  };

  sessions.forEach((session) => {
    const row = ensure(session.owner_username);
    row.sessions += 1;
    row.opening += Number(session.opening_amount);
    row.closing += Number(session.closing_amount ?? 0);
    if (session.status === 'open') row.openSessions += 1;
    row.history.push(session);
  });

  sales.forEach((sale) => {
    const row = ensure(sale.created_by);
    row.salesTotal += Number(sale.total);
    row.salesCash += Number(sale.cash);
  });

  payments.forEach((payment) => {
    const row = ensure(payment.created_by);
    row.paymentsTotal += Number(payment.total);
    row.paymentsCash += Number(payment.cash);
  });

  jobs.forEach((job) => {
    const row = ensure(job.created_by);
    row.jobsCash += Number(job.total);
    row.jobsCount += Number(job.count);
  });

  const operators = Array.from(totals.values()).sort(
    (a, b) =>
      b.salesCash + b.paymentsCash + b.jobsCash - (a.salesCash + a.paymentsCash + a.jobsCash),
  );

  const grandTotal = operators.reduce(
    (acc, row) => ({
      opening: acc.opening + row.opening,
      income: acc.income + row.salesCash + row.paymentsCash + row.jobsCash,
    }),
    { opening: 0, income: 0 },
  );

  return (
    <ReportFrame
      title="Cierre de Caja"
      subtitle={`${operators.length} operarios · usuario: ${user || 'todos'}`}
      period={periodLabel(from, to)}
    >
      <div className="mb-3 grid gap-2 sm:grid-cols-3">
        <Metric label="Aperturas" value={formatMoney(grandTotal.opening)} />
        <Metric label="Ingresos en efectivo" value={formatMoney(grandTotal.income)} tone="green" />
        <Metric label="Sesiones" value={String(sessions.length)} tone="amber" />
      </div>

      {operators.length === 0 ? (
        <EmptyState message="Sin movimientos de caja en el período" />
      ) : (
        operators.map((row) => {
          const income = row.salesCash + row.paymentsCash + row.jobsCash;
          const expected = row.opening + income;
          const difference = row.closing - expected;
          return (
            <Drill
              key={row.operator}
              summary={
                <>
                  <span className="text-slate-300">
                    <span className="font-medium text-slate-100">{row.operator}</span>
                    <span className="block text-xs text-slate-500">
                      {row.sessions} sesiones · {row.openSessions} abiertas · {row.jobsCount} trabajos contado
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-semibold text-emerald-300">
                      ingresos {formatMoney(income)}
                    </span>
                    <span
                      className={`block text-[11px] ${
                        row.sessions > 0 && Math.abs(difference) > 0.5 ? 'text-amber-300' : 'text-slate-500'
                      }`}
                    >
                      diferencia {formatMoney(difference)}
                    </span>
                  </span>
                </>
              }
            >
              <DetailGrid>
                <DetailItem label="Apertura" value={formatMoney(row.opening)} />
                <DetailItem label="Cierre" value={formatMoney(row.closing)} />
                <DetailItem label="Ventas" value={formatMoney(row.salesTotal)} />
                <DetailItem label="Ventas efectivo" value={formatMoney(row.salesCash)} />
                <DetailItem label="Cobros" value={formatMoney(row.paymentsTotal)} />
                <DetailItem label="Cobros efectivo" value={formatMoney(row.paymentsCash)} />
                <DetailItem label="Trabajos contado" value={formatMoney(row.jobsCash)} />
                <DetailItem label="Ingresos totales" value={formatMoney(income)} />
                <DetailItem label="Saldo teórico" value={formatMoney(expected)} />
              </DetailGrid>

              <p className="mt-2 font-semibold text-slate-200">Sesiones de caja</p>
              {row.history.length === 0 ? (
                <p className="text-slate-500">Sin sesiones registradas.</p>
              ) : (
                row.history.map((session) => (
                  <p key={session.id} className="flex flex-wrap justify-between gap-2 border-b border-surface/30 pb-1">
                    <span>
                      <span className="text-slate-500">{formatDateTime(session.opened_at)}</span> ·{' '}
                      {session.status === 'open' ? 'Abierta' : `Cerrada ${session.closed_at ? formatDate(session.closed_at) : ''}`}
                    </span>
                    <span className="text-slate-300">
                      apertura {formatMoney(session.opening_amount)} · cierre{' '}
                      {formatMoney(session.closing_amount ?? 0)}
                    </span>
                  </p>
                ))
              )}
            </Drill>
          );
        })
      )}
    </ReportFrame>
  );
}
