import { one, query } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { CURRENCIES, PAYMENT_METHODS } from '@/lib/constants';
import { formatDateTime, formatMoney } from '@/lib/format';
import PageHeader, { EmptyState, Flash, StatCard } from '@/components/ui';
import { closeCash, openCash, registerSale } from '@/app/actions/cash';
import type { FlashParams } from '@/lib/flash';

type Session = {
  id: number;
  opening_amount: number;
  closing_amount: number | null;
  status: string;
  opened_at: string;
  closed_at: string | null;
};

type SaleRow = {
  id: number;
  client_name: string;
  ci_ruc: string;
  description: string;
  amount: number;
  currency: string;
  payment_method: string;
  stock_item_id: number | null;
  created_by: string;
  created_at: string;
};

type PaymentRow = {
  id: number;
  client_name: string;
  amount: number;
  payment_method: string;
  currency: string;
  created_by: string;
  created_at: string;
};

type TodayTotals = {
  sales: number;
  cash_sales: number;
  jobs_cash: number;
  debt_cash: number;
  debt_total: number;
  sales_count: number;
};

type StockOption = { id: number; product_name: string; quantity: number; price: number };

export default async function CashPage({
  searchParams,
}: {
  searchParams: Promise<FlashParams>;
}) {
  const user = await requireUser();
  const { msg, err } = await searchParams;
  const scope = user.role === 'admin' ? null : user.username;

  const session = await one<Session>(
    `SELECT id, opening_amount, closing_amount, status, opened_at, closed_at
     FROM cash_sessions WHERE owner_username = $1 AND status = 'open'
     ORDER BY opened_at DESC LIMIT 1`,
    [user.username],
  );

  const totals = await one<TodayTotals>(
    `SELECT
       COALESCE((SELECT sum(amount) FROM sales
                 WHERE created_at >= date_trunc('day', now())
                   AND ($1::text IS NULL OR created_by = $1)), 0) AS sales,
       COALESCE((SELECT sum(amount) FROM sales
                 WHERE created_at >= date_trunc('day', now()) AND payment_method = 'Efectivo'
                   AND ($1::text IS NULL OR created_by = $1)), 0) AS cash_sales,
       COALESCE((SELECT sum(total) FROM jobs
                 WHERE service_date = current_date AND payment_condition = 'Contado'
                   AND ($1::text IS NULL OR created_by = $1)), 0) AS jobs_cash,
       COALESCE((SELECT sum(amount) FROM debt_payments
                 WHERE created_at >= date_trunc('day', now()) AND payment_method = 'Efectivo'
                   AND ($1::text IS NULL OR created_by = $1)), 0) AS debt_cash,
       COALESCE((SELECT sum(amount) FROM debt_payments
                 WHERE created_at >= date_trunc('day', now())
                   AND ($1::text IS NULL OR created_by = $1)), 0) AS debt_total,
       (SELECT count(*)::int FROM sales
        WHERE created_at >= date_trunc('day', now())
          AND ($1::text IS NULL OR created_by = $1)) AS sales_count`,
    [scope],
  );

  const sales = await query<SaleRow>(
    `SELECT id, client_name, ci_ruc, description, amount, currency, payment_method,
            stock_item_id, created_by, created_at
     FROM sales
     WHERE created_at >= date_trunc('day', now()) AND ($1::text IS NULL OR created_by = $1)
     ORDER BY created_at DESC, id DESC`,
    [scope],
  );

  const payments = await query<PaymentRow>(
    `SELECT id, client_name, amount, payment_method, currency, created_by, created_at
     FROM debt_payments
     WHERE created_at >= date_trunc('day', now()) AND ($1::text IS NULL OR created_by = $1)
     ORDER BY created_at DESC, id DESC`,
    [scope],
  );

  const sessions = await query<Session>(
    `SELECT id, opening_amount, closing_amount, status, opened_at, closed_at
     FROM cash_sessions WHERE owner_username = $1
     ORDER BY opened_at DESC LIMIT 10`,
    [user.username],
  );

  const stock = await query<StockOption>(
    `SELECT id, product_name, quantity, price FROM stock_items
     WHERE section = 'general' AND quantity > 0 ORDER BY product_name`,
  );

  const cashIn = Number(totals?.cash_sales ?? 0) + Number(totals?.jobs_cash ?? 0) + Number(totals?.debt_cash ?? 0);
  const grandTotal = Number(totals?.sales ?? 0) + Number(totals?.jobs_cash ?? 0) + Number(totals?.debt_total ?? 0);

  return (
    <div>
      <PageHeader
        title="Caja y Ventas"
        subtitle={scope ? 'Movimientos del día de tu operador' : 'Vista consolidada de todos los operadores'}
      />
      <Flash success={msg} error={err} />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Ventas hoy" value={formatMoney(totals?.sales ?? 0)} tone="amber" hint={`${totals?.sales_count ?? 0} ventas`} />
        <StatCard label="Trabajos contado" value={formatMoney(totals?.jobs_cash ?? 0)} tone="green" />
        <StatCard label="Cobros de deuda" value={formatMoney(totals?.debt_total ?? 0)} tone="blue" />
        <StatCard label="Ingresos del día" value={formatMoney(grandTotal)} tone="red" hint="Total operativo" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card">
          <h2 className="card-title">Estado de caja · {user.username}</h2>
          {session ? (
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-emerald-300">● Caja abierta</p>
              <p className="text-slate-400">Apertura: {formatDateTime(session.opened_at)}</p>
              <div className="flex justify-between">
                <span className="text-slate-400">Monto inicial</span>
                <span className="font-semibold">{formatMoney(session.opening_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ingresos en efectivo</span>
                <span className="font-semibold text-emerald-300">{formatMoney(cashIn)}</span>
              </div>
              <div className="flex justify-between border-t border-surface/60 pt-2">
                <span className="text-slate-300">Total esperado</span>
                <span className="font-bold text-accent">
                  {formatMoney(Number(session.opening_amount) + cashIn)}
                </span>
              </div>
              <form action={closeCash} className="pt-2">
                <button type="submit" className="btn-danger w-full">
                  Cerrar caja
                </button>
              </form>
            </div>
          ) : (
            <form action={openCash} className="space-y-3">
              <p className="text-sm text-slate-400">No hay una caja abierta.</p>
              <div>
                <label className="label" htmlFor="opening_amount">
                  Monto inicial
                </label>
                <input
                  id="opening_amount"
                  name="opening_amount"
                  type="number"
                  min="0"
                  step="any"
                  defaultValue="0"
                  className="input"
                />
              </div>
              <button type="submit" className="btn-primary w-full">
                Abrir caja
              </button>
            </form>
          )}
        </section>

        <section className="card lg:col-span-2">
          <h2 className="card-title">Registrar venta</h2>
          <form action={registerSale} className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="name">
                Cliente *
              </label>
              <input id="name" name="name" className="input" required />
            </div>
            <div>
              <label className="label" htmlFor="ci_ruc">
                CI / RUC
              </label>
              <input id="ci_ruc" name="ci_ruc" className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="description">
                Descripción
              </label>
              <input id="description" name="description" className="input" placeholder="Venta general" />
            </div>
            <div>
              <label className="label" htmlFor="amount">
                Monto *
              </label>
              <input id="amount" name="amount" type="number" min="0" step="any" className="input" required />
            </div>
            <div>
              <label className="label" htmlFor="currency">
                Moneda
              </label>
              <select id="currency" name="currency" className="input">
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="payment_method">
                Forma de pago
              </label>
              <select id="payment_method" name="payment_method" className="input">
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="stock_item_id">
                Descontar artículo del stock (1 unidad)
              </label>
              <select id="stock_item_id" name="stock_item_id" className="input">
                <option value="">No descontar</option>
                {stock.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.product_name} · {item.quantity} disp.
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary sm:col-span-2 sm:w-fit">
              Registrar venta
            </button>
          </form>
        </section>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="card overflow-x-auto">
          <h2 className="card-title">Ventas de hoy</h2>
          {sales.length === 0 ? (
            <EmptyState message="Sin ventas registradas hoy" />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Cliente</th>
                  <th>Descripción</th>
                  <th>Pago</th>
                  {scope ? null : <th>Operador</th>}
                  <th className="text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="whitespace-nowrap text-slate-500">{formatDateTime(sale.created_at)}</td>
                    <td className="text-slate-200">{sale.client_name}</td>
                    <td className="max-w-[14rem] truncate text-slate-400">{sale.description}</td>
                    <td className="text-slate-400">{sale.payment_method}</td>
                    {scope ? null : <td className="text-slate-500">{sale.created_by}</td>}
                    <td className="text-right font-semibold text-amber-300">
                      {formatMoney(sale.amount, sale.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card overflow-x-auto">
          <h2 className="card-title">Cobros de deuda de hoy</h2>
          {payments.length === 0 ? (
            <EmptyState message="Sin cobros registrados hoy" />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Cliente</th>
                  <th>Método</th>
                  {scope ? null : <th>Operador</th>}
                  <th className="text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="whitespace-nowrap text-slate-500">{formatDateTime(payment.created_at)}</td>
                    <td className="text-slate-200">{payment.client_name}</td>
                    <td className="text-slate-400">{payment.payment_method}</td>
                    {scope ? null : <td className="text-slate-500">{payment.created_by}</td>}
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

      <section className="card mt-5 overflow-x-auto">
        <h2 className="card-title">Historial de cajas</h2>
        {sessions.length === 0 ? (
          <EmptyState message="Sin cajas registradas" />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Apertura</th>
                <th>Cierre</th>
                <th>Inicial</th>
                <th>Final</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((item) => (
                <tr key={item.id}>
                  <td className="whitespace-nowrap text-slate-400">{formatDateTime(item.opened_at)}</td>
                  <td className="whitespace-nowrap text-slate-400">{formatDateTime(item.closed_at)}</td>
                  <td className="text-slate-300">{formatMoney(item.opening_amount)}</td>
                  <td className="font-semibold text-slate-200">
                    {item.closing_amount === null ? '-' : formatMoney(item.closing_amount)}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        item.status === 'open'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-slate-500/15 text-slate-300'
                      }`}
                    >
                      {item.status === 'open' ? 'Abierta' : 'Cerrada'}
                    </span>
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
