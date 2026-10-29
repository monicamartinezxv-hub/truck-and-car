import Link from 'next/link';
import { one, query } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { daysSince, formatDate, formatMoney } from '@/lib/format';
import PageHeader, { EmptyState, Flash } from '@/components/ui';
import PrintButton from '@/components/PrintButton';

type ReportTab = 'cuentas' | 'cliente' | 'cubiertas';

const TABS: { id: ReportTab; label: string }[] = [
  { id: 'cuentas', label: 'Consolidado de cuentas' },
  { id: 'cliente', label: 'Reporte de cliente' },
  { id: 'cubiertas', label: 'Reporte de cubiertas' },
];

type ClientSummary = {
  client_name: string;
  accounts: number;
  original: number;
  applied: number;
  balance: number;
  oldest: string;
  currency: string;
};

type ClientOption = { id: number; name: string; ci_ruc: string; phone: string; address: string };

type JobRow = {
  id: number;
  service_date: string;
  description: string;
  total: number;
  currency: string;
  payment_condition: string;
};

type PaymentRow = {
  id: number;
  amount: number;
  currency: string;
  payment_method: string;
  payment_type: string;
  created_at: string;
};

type TireSummary = {
  tire_size: string;
  tire_brand: string;
  quantity: number;
  records: number;
  clients: number;
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    report?: string;
    from?: string;
    to?: string;
    client_id?: string;
    msg?: string;
    err?: string;
  }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const report: ReportTab = TABS.some((tab) => tab.id === params.report)
    ? (params.report as ReportTab)
    : 'cuentas';
  const from = /^\d{4}-\d{2}-\d{2}$/.test(params.from ?? '') ? params.from! : '';
  const to = /^\d{4}-\d{2}-\d{2}$/.test(params.to ?? '') ? params.to! : '';

  const clients = await query<ClientOption>('SELECT id, name, ci_ruc, phone, address FROM clients ORDER BY name');
  const selectedClientId =
    report === 'cliente'
      ? Number(params.client_id) || clients[0]?.id || null
      : null;

  const clientSummaries = await query<ClientSummary>(
    `SELECT client_name, count(*)::int AS accounts,
            sum(original_balance) AS original, sum(applied_amount) AS applied, sum(balance) AS balance,
            min(service_date) AS oldest, max(currency) AS currency
     FROM receivables
     WHERE ($1 = '' OR service_date >= $1::date) AND ($2 = '' OR service_date <= $2::date)
     GROUP BY client_name
     ORDER BY balance DESC, client_name`,
    [from, to],
  );

  const client = selectedClientId
    ? await one<ClientOption>('SELECT id, name, ci_ruc, phone, address FROM clients WHERE id = $1', [
        selectedClientId,
      ])
    : null;

  const clientJobs = client
    ? await query<JobRow>(
        `SELECT id, service_date, description, total, currency, payment_condition
         FROM jobs WHERE client_id = $1
           AND ($2 = '' OR service_date >= $2::date) AND ($3 = '' OR service_date <= $3::date)
         ORDER BY service_date`,
        [client.id, from, to],
      )
    : [];

  const clientPayments = client
    ? await query<PaymentRow>(
        `SELECT id, amount, currency, payment_method, payment_type, created_at
         FROM debt_payments WHERE client_id = $1
           AND ($2 = '' OR created_at >= $2::date) AND ($3 = '' OR created_at < ($3::date + interval '1 day'))
         ORDER BY created_at`,
        [client.id, from, to],
      )
    : [];

  const clientDebt = client
    ? await one<{ balance: number; currency: string }>(
        `SELECT COALESCE(sum(balance), 0) AS balance, max(currency) AS currency
         FROM receivables WHERE client_id = $1 AND NOT paid`,
        [client.id],
      )
    : null;

  const tireSummaries = await query<TireSummary>(
    `SELECT tire_size, tire_brand, sum(quantity)::int AS quantity, count(*)::int AS records,
            count(DISTINCT name)::int AS clients
     FROM tire_records
     WHERE ($1 = '' OR created_at >= $1::date) AND ($2 = '' OR created_at < ($2::date + interval '1 day'))
     GROUP BY tire_size, tire_brand
     ORDER BY quantity DESC`,
    [from, to],
  );

  const rangeLabel =
    from || to ? `${from ? formatDate(from) : 'inicio'} — ${to ? formatDate(to) : 'hoy'}` : 'Todo el período';

  return (
    <div>
      <PageHeader
        title="Informes y Reportes"
        subtitle="Consolidados, reportes por cliente y stock de cubiertas"
        actions={<PrintButton />}
      />
      <Flash success={params.msg} error={params.err} />

      <div className="no-print mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={`/informes?report=${tab.id}${from ? `&from=${from}` : ''}${to ? `&to=${to}` : ''}${
              report === 'cliente' && selectedClientId ? `&client_id=${selectedClientId}` : ''
            }`}
            className={report === tab.id ? 'btn-primary' : 'btn-secondary'}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <form className="no-print mb-5 flex flex-wrap items-end gap-3" action="/informes">
        <input type="hidden" name="report" value={report} />
        <div>
          <label className="label" htmlFor="from">
            Desde
          </label>
          <input id="from" name="from" type="date" defaultValue={from} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="to">
            Hasta
          </label>
          <input id="to" name="to" type="date" defaultValue={to} className="input" />
        </div>
        {report === 'cliente' ? (
          <div className="min-w-[16rem]">
            <label className="label" htmlFor="client_id">
              Cliente
            </label>
            <select id="client_id" name="client_id" defaultValue={selectedClientId ?? ''} className="input">
              {clients.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <button type="submit" className="btn-secondary">
          Generar
        </button>
      </form>

      <div className="mb-4 border-b border-surface pb-3">
        <p className="text-lg font-black tracking-wide text-white">TRUCK AND CAR</p>
        <p className="text-xs text-slate-400">
          {TABS.find((tab) => tab.id === report)?.label} · {rangeLabel}
        </p>
      </div>

      {report === 'cuentas' ? (
        <div className="card overflow-x-auto">
          {clientSummaries.length === 0 ? (
            <EmptyState message="Sin cuentas por cobrar en el período" />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Cuentas</th>
                  <th>Original</th>
                  <th>Abonado</th>
                  <th>Saldo</th>
                  <th>Más antigua</th>
                  <th>Atraso</th>
                </tr>
              </thead>
              <tbody>
                {clientSummaries.map((row) => {
                  const overdue = daysSince(row.oldest);
                  return (
                    <tr key={row.client_name}>
                      <td className="font-medium text-slate-100">{row.client_name || 'Sin nombre'}</td>
                      <td className="text-slate-400">{row.accounts}</td>
                      <td className="text-slate-400">{formatMoney(row.original, row.currency)}</td>
                      <td className="text-slate-400">{formatMoney(row.applied, row.currency)}</td>
                      <td className={Number(row.balance) > 0 ? 'font-semibold text-red-300' : 'text-slate-500'}>
                        {formatMoney(row.balance, row.currency)}
                      </td>
                      <td className="whitespace-nowrap text-slate-400">{formatDate(row.oldest)}</td>
                      <td className="text-slate-400">{overdue} días</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="font-semibold text-slate-100">
                  <td className="pt-3">Totales</td>
                  <td />
                  <td className="pt-3">
                    {formatMoney(clientSummaries.reduce((sum, row) => sum + Number(row.original), 0))}
                  </td>
                  <td className="pt-3">
                    {formatMoney(clientSummaries.reduce((sum, row) => sum + Number(row.applied), 0))}
                  </td>
                  <td className="pt-3 text-red-300">
                    {formatMoney(clientSummaries.reduce((sum, row) => sum + Number(row.balance), 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      ) : null}

      {report === 'cliente' ? (
        <div className="space-y-4">
          {!client ? (
            <div className="card">
              <EmptyState message="Seleccioná un cliente para generar el reporte" />
            </div>
          ) : (
            <>
              <div className="card">
                <h2 className="card-title">Datos del cliente</h2>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">Nombre</dt>
                    <dd className="font-medium text-slate-100">{client.name}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">CI / RUC</dt>
                    <dd className="text-slate-200">{client.ci_ruc || '-'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">Teléfono</dt>
                    <dd className="text-slate-200">{client.phone || '-'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">Dirección</dt>
                    <dd className="text-slate-200">{client.address || '-'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">Saldo pendiente</dt>
                    <dd className="font-semibold text-red-300">
                      {formatMoney(clientDebt?.balance ?? 0, clientDebt?.currency ?? 'PYG')}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">Trabajos en el período</dt>
                    <dd className="text-slate-200">{clientJobs.length}</dd>
                  </div>
                </dl>
              </div>

              <div className="card overflow-x-auto">
                <h2 className="card-title">Trabajos del período</h2>
                {clientJobs.length === 0 ? (
                  <EmptyState message="Sin trabajos en el período" />
                ) : (
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Detalle</th>
                        <th>Condición</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientJobs.map((job) => (
                        <tr key={job.id}>
                          <td className="whitespace-nowrap text-slate-400">{formatDate(job.service_date)}</td>
                          <td className="text-slate-200">{job.description || '-'}</td>
                          <td className="text-slate-400">{job.payment_condition}</td>
                          <td className="text-right font-semibold">{formatMoney(job.total, job.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold text-slate-100">
                        <td className="pt-3" colSpan={3}>
                          Total facturado
                        </td>
                        <td className="pt-3 text-right">
                          {formatMoney(clientJobs.reduce((sum, job) => sum + Number(job.total), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>

              <div className="card overflow-x-auto">
                <h2 className="card-title">Pagos del período</h2>
                {clientPayments.length === 0 ? (
                  <EmptyState message="Sin pagos en el período" />
                ) : (
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Método</th>
                        <th className="text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientPayments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="whitespace-nowrap text-slate-400">{formatDate(payment.created_at)}</td>
                          <td className="capitalize text-slate-400">{payment.payment_type}</td>
                          <td className="text-slate-400">{payment.payment_method}</td>
                          <td className="text-right font-semibold text-emerald-300">
                            {formatMoney(payment.amount, payment.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold text-slate-100">
                        <td className="pt-3" colSpan={3}>
                          Total cobrado
                        </td>
                        <td className="pt-3 text-right">
                          {formatMoney(clientPayments.reduce((sum, payment) => sum + Number(payment.amount), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      ) : null}

      {report === 'cubiertas' ? (
        <div className="card overflow-x-auto">
          {tireSummaries.length === 0 ? (
            <EmptyState message="Sin cubiertas registradas en el período" />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Medida</th>
                  <th>Marca</th>
                  <th>Cantidad</th>
                  <th>Registros</th>
                  <th>Clientes</th>
                </tr>
              </thead>
              <tbody>
                {tireSummaries.map((row) => (
                  <tr key={`${row.tire_size}-${row.tire_brand}`}>
                    <td className="font-medium text-slate-100">{row.tire_size || 'Sin medida'}</td>
                    <td className="text-slate-300">{row.tire_brand || 'Sin marca'}</td>
                    <td className="font-semibold text-accent">{row.quantity}</td>
                    <td className="text-slate-400">{row.records}</td>
                    <td className="text-slate-400">{row.clients}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold text-slate-100">
                  <td className="pt-3" colSpan={2}>
                    Total cubiertas
                  </td>
                  <td className="pt-3">{tireSummaries.reduce((sum, row) => sum + Number(row.quantity), 0)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      ) : null}
    </div>
  );
}
