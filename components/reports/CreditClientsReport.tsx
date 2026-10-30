import { query } from '@/lib/db';
import { daysSince, formatDate, formatMoney } from '@/lib/format';
import { periodLabel, type ReportParams } from '@/lib/reports';
import { EmptyState } from '@/components/ui';
import { DetailGrid, DetailItem, Drill, Metric, ReportFrame } from './ui';

type ClientCredit = {
  client_id: number | null;
  client_name: string;
  accounts: number;
  original: number;
  applied: number;
  balance: number;
  oldest: string;
  newest: string;
  all_paid: boolean;
  currency: string;
};

type AccountRow = {
  id: number;
  client_id: number | null;
  description: string;
  service_date: string;
  original_balance: number;
  applied_amount: number;
  balance: number;
  paid: boolean;
  payment_date: string | null;
  created_by: string;
};

export default async function CreditClientsReport({ params }: { params: ReportParams }) {
  const { from, to, user } = params;

  const rows = await query<ClientCredit>(
    `SELECT client_id, client_name, count(*)::int AS accounts,
            sum(original_balance) AS original, sum(applied_amount) AS applied, sum(balance) AS balance,
            min(service_date) AS oldest, max(service_date) AS newest,
            bool_and(paid) AS all_paid, max(currency) AS currency
     FROM receivables
     WHERE ($1 = '' OR service_date >= $1::date)
       AND ($2 = '' OR service_date <= $2::date)
       AND ($3 = '' OR created_by = $3)
     GROUP BY client_id, client_name
     ORDER BY balance DESC, client_name`,
    [from, to, user],
  );

  const accounts = await query<AccountRow>(
    `SELECT id, client_id, description, service_date, original_balance, applied_amount, balance,
            paid, payment_date, created_by
     FROM receivables
     WHERE ($1 = '' OR service_date >= $1::date)
       AND ($2 = '' OR service_date <= $2::date)
       AND ($3 = '' OR created_by = $3)
     ORDER BY service_date DESC, id DESC`,
    [from, to, user],
  );

  const accountsByClient = new Map<string, AccountRow[]>();
  accounts.forEach((account) => {
    const key = String(account.client_id ?? account.description);
    accountsByClient.set(key, [...(accountsByClient.get(key) ?? []), account]);
  });

  const debtors = rows.filter((row) => Number(row.balance) > 0);
  const totalDebt = debtors.reduce((sum, row) => sum + Number(row.balance), 0);
  const totalOriginal = rows.reduce((sum, row) => sum + Number(row.original), 0);
  const totalApplied = rows.reduce((sum, row) => sum + Number(row.applied), 0);

  return (
    <ReportFrame
      title="Clientes a Crédito"
      subtitle={`${debtors.length} clientes con saldo · operario: ${user || 'todos'}`}
      period={periodLabel(from, to)}
    >
      <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Créditos" value={formatMoney(totalOriginal)} tone="amber" />
        <Metric label="Abonado" value={formatMoney(totalApplied)} tone="green" />
        <Metric label="Saldo deudor" value={formatMoney(totalDebt)} tone="red" />
        <Metric label="Clientes con saldo" value={String(debtors.length)} />
      </div>

      {rows.length === 0 ? (
        <EmptyState message="Sin créditos en el período" />
      ) : (
        rows.map((row) => {
          const key = String(row.client_id ?? '');
          const clientAccounts = accountsByClient.get(key) ?? [];
          const status = row.all_paid ? 'Pagado' : Number(row.balance) > 0 ? 'Con saldo' : 'Cancelado';
          return (
            <Drill
              key={`${row.client_id}-${row.client_name}`}
              summary={
                <>
                  <span className="text-slate-300">
                    <span className="font-medium text-slate-100">{row.client_name || 'Sin cliente'}</span>
                    <span className="block text-xs text-slate-500">
                      {row.accounts} créditos · desde {formatDate(row.oldest)} · {status}
                    </span>
                  </span>
                  <span className="text-right">
                    <span
                      className={`block font-semibold ${
                        Number(row.balance) > 0 ? 'text-red-300' : 'text-slate-500'
                      }`}
                    >
                      {formatMoney(row.balance, row.currency)}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      original {formatMoney(row.original, row.currency)}
                    </span>
                  </span>
                </>
              }
            >
              <DetailGrid>
                <DetailItem label="Original" value={formatMoney(row.original, row.currency)} />
                <DetailItem label="Abonado" value={formatMoney(row.applied, row.currency)} />
                <DetailItem label="Saldo" value={formatMoney(row.balance, row.currency)} />
                <DetailItem label="Más antiguo" value={formatDate(row.oldest)} />
                <DetailItem label="Más reciente" value={formatDate(row.newest)} />
                <DetailItem label="Estado" value={status} />
              </DetailGrid>

              <p className="mt-2 font-semibold text-slate-200">Créditos</p>
              {clientAccounts.map((account) => (
                <p key={account.id} className="flex flex-wrap justify-between gap-2 border-b border-surface/30 pb-1">
                  <span>
                    <span className="text-slate-500">{formatDate(account.service_date)}</span> ·{' '}
                    {account.description || 'Crédito'} · {account.paid ? 'Pagado' : `${daysSince(account.service_date)} días`} ·{' '}
                    {account.created_by || 'Sin operario'}
                  </span>
                  <span className={account.paid ? 'text-slate-500' : 'text-red-300'}>
                    {formatMoney(account.balance, row.currency)}
                  </span>
                </p>
              ))}
            </Drill>
          );
        })
      )}
    </ReportFrame>
  );
}
