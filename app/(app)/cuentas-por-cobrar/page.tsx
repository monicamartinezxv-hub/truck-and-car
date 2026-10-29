import Link from 'next/link';
import { query } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { PAYMENT_METHODS } from '@/lib/constants';
import { daysSince, formatDate, formatDateTime, formatMoney } from '@/lib/format';
import PageHeader, { EmptyState, Flash, StatCard } from '@/components/ui';
import { applyClientPayment, registerPayment } from '@/app/actions/receivables';
import type { FlashParams } from '@/lib/flash';

type ReceivableRow = {
  id: number;
  client_id: number | null;
  client_name: string;
  plate: string;
  description: string;
  service_date: string;
  currency: string;
  original_balance: number;
  applied_amount: number;
  balance: number;
  paid: boolean;
  payment_method: string;
};

type ClientDebt = {
  client_id: number;
  client_name: string;
  total: number;
  accounts: number;
  currency: string;
};

type PaymentRow = {
  id: number;
  client_name: string;
  amount: number;
  payment_type: string;
  payment_method: string;
  currency: string;
  created_at: string;
  created_by: string;
};

export default async function ReceivablesPage({
  searchParams,
}: {
  searchParams: Promise<FlashParams & { tab?: string }>;
}) {
  await requireUser();
  const { msg, err, tab = 'pendientes' } = await searchParams;
  const showPaid = tab === 'cobradas';

  const rows = await query<ReceivableRow>(
    `SELECT id, client_id, client_name, plate, description, service_date, currency,
            original_balance, applied_amount, balance, paid, payment_method
     FROM receivables
     WHERE paid = $1
     ORDER BY service_date DESC, id DESC`,
    [showPaid],
  );

  const totals = await query<{ pending: number; paid: number; clients: number }>(
    `SELECT
       COALESCE(sum(balance) FILTER (WHERE NOT paid), 0) AS pending,
       COALESCE(sum(applied_amount), 0) AS paid,
       (SELECT count(DISTINCT client_id)::int FROM receivables WHERE NOT paid) AS clients
     FROM receivables`,
  );
  const summary = totals[0];

  const clientDebts = await query<ClientDebt>(
    `SELECT client_id, client_name, sum(balance) AS total, count(*)::int AS accounts, max(currency) AS currency
     FROM receivables
     WHERE NOT paid AND client_id IS NOT NULL AND balance > 0
     GROUP BY client_id, client_name
     ORDER BY total DESC`,
  );

  const payments = await query<PaymentRow>(
    `SELECT id, client_name, amount, payment_type, payment_method, currency, created_at, created_by
     FROM debt_payments ORDER BY created_at DESC, id DESC LIMIT 15`,
  );

  return (
    <div>
      <PageHeader title="Cuentas por Cobrar" subtitle="Saldos, cobros y abonos por cliente" />
      <Flash success={msg} error={err} />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total pendiente" value={formatMoney(summary?.pending ?? 0)} tone="red" />
        <StatCard label="Total cobrado" value={formatMoney(summary?.paid ?? 0)} tone="green" />
        <StatCard label="Clientes con deuda" value={String(summary?.clients ?? 0)} tone="blue" />
        <StatCard label="Cuentas visibles" value={String(rows.length)} tone="amber" />
      </div>

      <details className="panel mb-5">
        <summary>Registrar abono por cliente (varias cuentas)</summary>
        <div className="border-t border-surface/60 p-4">
          {clientDebts.length === 0 ? (
            <EmptyState message="No hay clientes con deuda pendiente" />
          ) : (
            <form action={applyClientPayment} className="grid gap-3 sm:grid-cols-4 sm:items-end">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="client_id">
                  Cliente
                </label>
                <select id="client_id" name="client_id" className="input" required>
                  <option value="">Seleccionar…</option>
                  {clientDebts.map((debt) => (
                    <option key={debt.client_id} value={debt.client_id}>
                      {debt.client_name} · {formatMoney(debt.total, debt.currency)} ({debt.accounts})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="amount">
                  Monto del abono
                </label>
                <input id="amount" name="amount" type="number" min="0" step="any" className="input" required />
              </div>
              <div>
                <label className="label" htmlFor="payment_method">
                  Método
                </label>
                <select id="payment_method" name="payment_method" className="input">
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary sm:col-span-4 sm:w-fit">
                Registrar abono
              </button>
              <p className="text-xs text-slate-500 sm:col-span-4">
                El abono se aplica primero a las cuentas más antiguas.
              </p>
            </form>
          )}
        </div>
      </details>

      <div className="mb-3 flex gap-2">
        <Link
          href="/cuentas-por-cobrar"
          className={showPaid ? 'btn-secondary' : 'btn-primary'}
        >
          Pendientes
        </Link>
        <Link
          href="/cuentas-por-cobrar?tab=cobradas"
          className={showPaid ? 'btn-primary' : 'btn-secondary'}
        >
          Cobradas
        </Link>
      </div>

      <div className="card mb-5 overflow-x-auto">
        {rows.length === 0 ? (
          <EmptyState message={showPaid ? 'Todavía no hay cuentas cobradas' : 'No hay cuentas pendientes'} />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Chapa</th>
                <th>Detalle</th>
                <th>Original</th>
                <th>Abonado</th>
                <th>Saldo</th>
                <th>Atraso</th>
                {showPaid ? <th>Método</th> : <th>Cobro</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const overdue = daysSince(row.service_date);
                return (
                  <tr key={row.id} className="align-top">
                    <td className="whitespace-nowrap text-slate-400">{formatDate(row.service_date)}</td>
                    <td>
                      {row.client_id ? (
                        <Link href={`/clientes/${row.client_id}`} className="text-slate-100 hover:text-accent">
                          {row.client_name || 'Cliente'}
                        </Link>
                      ) : (
                        <span className="text-slate-200">{row.client_name || 'Cliente'}</span>
                      )}
                    </td>
                    <td className="text-slate-400">{row.plate || '-'}</td>
                    <td className="max-w-[18rem] truncate text-slate-300">{row.description || '-'}</td>
                    <td className="text-slate-400">{formatMoney(row.original_balance, row.currency)}</td>
                    <td className="text-slate-400">{formatMoney(row.applied_amount, row.currency)}</td>
                    <td className={row.paid ? 'text-slate-500' : 'font-semibold text-red-300'}>
                      {formatMoney(row.balance, row.currency)}
                    </td>
                    <td>
                      {row.paid ? (
                        <span className="badge bg-emerald-500/15 text-emerald-300">Cobrada</span>
                      ) : (
                        <span
                          className={`badge ${
                            overdue > 30 ? 'bg-red-500/15 text-red-300' : 'bg-slate-500/15 text-slate-300'
                          }`}
                        >
                          {overdue} días
                        </span>
                      )}
                    </td>
                    {showPaid ? (
                      <td className="text-slate-400">{row.payment_method || '-'}</td>
                    ) : (
                      <td>
                        <details>
                          <summary className="cursor-pointer text-xs font-semibold text-sky-300">
                            Registrar cobro
                          </summary>
                          <form action={registerPayment} className="mt-2 flex flex-wrap items-end gap-2">
                            <input type="hidden" name="receivable_id" value={row.id} />
                            <div>
                              <label className="label" htmlFor={`amount-${row.id}`}>
                                Monto
                              </label>
                              <input
                                id={`amount-${row.id}`}
                                name="amount"
                                type="number"
                                min="0"
                                step="any"
                                defaultValue={row.balance}
                                className="input w-28 px-2 py-1"
                              />
                            </div>
                            <div>
                              <label className="label" htmlFor={`method-${row.id}`}>
                                Método
                              </label>
                              <select
                                id={`method-${row.id}`}
                                name="payment_method"
                                className="input w-32 px-2 py-1"
                              >
                                {PAYMENT_METHODS.map((method) => (
                                  <option key={method} value={method}>
                                    {method}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <button type="submit" className="btn-primary px-2 py-1 text-xs">
                              Cobrar
                            </button>
                          </form>
                        </details>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <section className="card overflow-x-auto">
        <h2 className="card-title">Últimos pagos registrados</h2>
        {payments.length === 0 ? (
          <EmptyState message="Sin pagos registrados" />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Método</th>
                <th>Registrado por</th>
                <th className="text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="whitespace-nowrap text-slate-400">{formatDateTime(payment.created_at)}</td>
                  <td className="text-slate-200">{payment.client_name || '-'}</td>
                  <td className="text-slate-400 capitalize">{payment.payment_type}</td>
                  <td className="text-slate-400">{payment.payment_method}</td>
                  <td className="text-slate-500">{payment.created_by}</td>
                  <td className="text-right font-semibold text-emerald-300">
                    {formatMoney(payment.amount, payment.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
