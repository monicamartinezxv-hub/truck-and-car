import { query } from '@/lib/db';
import { daysSince, formatDate, formatMoney } from '@/lib/format';
import { periodLabel, type ReportParams } from '@/lib/reports';
import { EmptyState } from '@/components/ui';
import { DetailGrid, DetailItem, Drill, Metric, ReportFrame } from './ui';

type AccountRow = {
  id: number;
  client_id: number | null;
  client_name: string;
  job_id: number | null;
  description: string;
  service_date: string;
  currency: string;
  original_balance: number;
  applied_amount: number;
  balance: number;
  paid: boolean;
  created_by: string;
};

const BUCKETS = [
  { id: '0-30', label: '0 a 30 días', max: 30 },
  { id: '31-60', label: '31 a 60 días', max: 60 },
  { id: '61-90', label: '61 a 90 días', max: 90 },
  { id: '+90', label: 'Más de 90 días', max: Number.POSITIVE_INFINITY },
];

export default async function ReceivablesReport({ params }: { params: ReportParams }) {
  const { from, to, user } = params;

  const accounts = await query<AccountRow>(
    `SELECT id, client_id, client_name, job_id, description, service_date, currency,
            original_balance, applied_amount, balance, paid, created_by
     FROM receivables
     WHERE ($1 = '' OR service_date >= $1::date)
       AND ($2 = '' OR service_date <= $2::date)
       AND ($3 = '' OR created_by = $3)
     ORDER BY service_date`,
    [from, to, user],
  );

  const open = accounts.filter((account) => !account.paid && Number(account.balance) > 0);

  const buckets = BUCKETS.map((bucket, index) => {
    const previous = index === 0 ? -1 : BUCKETS[index - 1].max;
    const rows = open.filter((account) => {
      const days = daysSince(account.service_date);
      return days > previous && days <= bucket.max;
    });
    return {
      ...bucket,
      accounts: rows.length,
      total: rows.reduce((sum, account) => sum + Number(account.balance), 0),
      clients: new Set(rows.map((account) => account.client_id ?? account.client_name)).size,
    };
  });

  const grouped = new Map<string, { name: string; accounts: AccountRow[]; total: number }>();
  open.forEach((account) => {
    const key = String(account.client_id ?? account.client_name);
    const group = grouped.get(key) ?? { name: account.client_name || 'Sin cliente', accounts: [], total: 0 };
    group.accounts.push(account);
    group.total += Number(account.balance);
    grouped.set(key, group);
  });

  const clients = Array.from(grouped.values()).sort((a, b) => b.total - a.total);
  const totalOpen = open.reduce((sum, account) => sum + Number(account.balance), 0);

  return (
    <ReportFrame
      title="Cuentas por Cobrar"
      subtitle={`${open.length} cuentas abiertas · operario: ${user || 'todos'}`}
      period={periodLabel(from, to)}
    >
      <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Saldo total" value={formatMoney(totalOpen)} tone="red" />
        {buckets.map((bucket) => (
          <Metric
            key={bucket.id}
            label={bucket.label}
            value={`${formatMoney(bucket.total)} · ${bucket.accounts}`}
            tone={bucket.id === '+90' ? 'red' : 'slate'}
          />
        ))}
      </div>

      {clients.length === 0 ? (
        <EmptyState message="Sin saldos pendientes en el período" />
      ) : (
        clients.map((group) => (
          <Drill
            key={group.name}
            summary={
              <>
                <span className="text-slate-300">
                  <span className="font-medium text-slate-100">{group.name}</span>
                  <span className="block text-xs text-slate-500">
                    {group.accounts.length} cuentas · más antigua{' '}
                    {formatDate(group.accounts[0]?.service_date)}
                  </span>
                </span>
                <span className="font-semibold text-red-300">{formatMoney(group.total)}</span>
              </>
            }
          >
            {group.accounts.map((account) => (
              <div key={account.id} className="border-b border-surface/30 pb-1.5">
                <p className="flex flex-wrap justify-between gap-2">
                  <span>
                    <span className="text-slate-500">{formatDate(account.service_date)}</span> ·{' '}
                    {account.description || 'Cuenta'} · {daysSince(account.service_date)} días
                  </span>
                  <span className="font-semibold text-red-300">
                    {formatMoney(account.balance, account.currency)}
                  </span>
                </p>
                <DetailGrid>
                  <DetailItem label="Original" value={formatMoney(account.original_balance, account.currency)} />
                  <DetailItem label="Abonado" value={formatMoney(account.applied_amount, account.currency)} />
                  <DetailItem label="Operario" value={account.created_by || '-'} />
                </DetailGrid>
              </div>
            ))}
          </Drill>
        ))
      )}
    </ReportFrame>
  );
}
