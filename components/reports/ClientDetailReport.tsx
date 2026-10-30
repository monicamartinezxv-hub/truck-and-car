import Link from 'next/link';
import { one, query } from '@/lib/db';
import { daysSince, formatDate, formatMoney } from '@/lib/format';
import { periodLabel, type ReportParams } from '@/lib/reports';
import { EmptyState } from '@/components/ui';
import { DetailGrid, DetailItem, Drill, Metric, ReportFrame } from './ui';

type ClientMatch = { id: number; name: string; ci_ruc: string };

type ClientRow = {
  id: number;
  client_code: string;
  name: string;
  ci_ruc: string;
  phone: string;
  address: string;
  payment_condition: string;
  created_at: string;
};

type VehicleRow = { brand: string; model: string; engine: string; plate: string; transmission: string };

type JobRow = {
  id: number;
  service_date: string;
  description: string;
  total: number;
  currency: string;
  payment_condition: string;
  created_by: string;
  plate: string;
  items: string;
};

type AccountRow = {
  id: number;
  job_id: number | null;
  description: string;
  service_date: string;
  currency: string;
  original_balance: number;
  applied_amount: number;
  balance: number;
  paid: boolean;
  payment_date: string | null;
  created_by: string;
};

type PaymentRow = {
  id: number;
  amount: number;
  currency: string;
  payment_type: string;
  payment_method: string;
  created_by: string;
  created_at: string;
};

export default async function ClientDetailReport({ params }: { params: ReportParams }) {
  const { from, to, user, q } = params;

  const matches = await query<ClientMatch>(
    `SELECT id, name, ci_ruc FROM clients
     WHERE ($1 = '' OR name ILIKE '%' || $1 || '%' OR ci_ruc ILIKE '%' || $1 || '%')
     ORDER BY name LIMIT 100`,
    [q],
  );

  const selectedId = Number(params.client) || matches[0]?.id || 0;

  const client = selectedId
    ? await one<ClientRow>(
        `SELECT id, client_code, name, ci_ruc, phone, address, payment_condition, created_at
         FROM clients WHERE id = $1`,
        [selectedId],
      )
    : null;

  const vehicles = client
    ? await query<VehicleRow>(
        `SELECT brand, model, engine, plate, transmission FROM client_vehicles
         WHERE client_id = $1 ORDER BY id`,
        [client.id],
      )
    : [];

  const jobs = client
    ? await query<JobRow>(
        `SELECT j.id, j.service_date, j.description, j.total, j.currency, j.payment_condition,
                j.created_by, j.plate,
                COALESCE((SELECT string_agg(i.service || ' ×' || i.quantity, ', ')
                          FROM job_items i WHERE i.job_id = j.id), '') AS items
         FROM jobs j
         WHERE j.client_id = $1
           AND ($2 = '' OR j.service_date >= $2::date) AND ($3 = '' OR j.service_date <= $3::date)
           AND ($4 = '' OR j.created_by = $4)
         ORDER BY j.service_date DESC, j.id DESC`,
        [client.id, from, to, user],
      )
    : [];

  const accounts = client
    ? await query<AccountRow>(
        `SELECT id, job_id, description, service_date, currency, original_balance, applied_amount,
                balance, paid, payment_date, created_by
         FROM receivables
         WHERE client_id = $1
           AND ($2 = '' OR service_date >= $2::date) AND ($3 = '' OR service_date <= $3::date)
           AND ($4 = '' OR created_by = $4)
         ORDER BY service_date DESC, id DESC`,
        [client.id, from, to, user],
      )
    : [];

  const payments = client
    ? await query<PaymentRow>(
        `SELECT id, amount, currency, payment_type, payment_method, created_by, created_at
         FROM debt_payments
         WHERE client_id = $1
           AND ($2 = '' OR created_at >= $2::date)
           AND ($3 = '' OR created_at < ($3::date + interval '1 day'))
           AND ($4 = '' OR created_by = $4)
         ORDER BY created_at DESC`,
        [client.id, from, to, user],
      )
    : [];

  const debt = client
    ? await one<{ balance: number; currency: string }>(
        `SELECT COALESCE(sum(balance), 0) AS balance, max(currency) AS currency
         FROM receivables WHERE client_id = $1 AND NOT paid AND ($2 = '' OR created_by = $2)`,
        [client.id, user],
      )
    : null;

  const billed = jobs.reduce((sum, job) => sum + Number(job.total), 0);
  const collected = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

  return (
    <ReportFrame
      title="Reporte Detallado por Cliente"
      subtitle="Datos, deudas e historial del cliente seleccionado"
      period={periodLabel(from, to)}
    >
      {matches.length === 0 ? (
        <EmptyState message="Ningún cliente coincide con la búsqueda" />
      ) : null}

      {matches.length > 1 ? (
        <div className="no-print mb-3 flex flex-wrap gap-2">
          {matches.slice(0, 12).map((option) => (
            <Link
              key={option.id}
              href={`/informes?report=cliente&client=${option.id}&from=${from}&to=${to}&user=${user}&q=${encodeURIComponent(q)}`}
              className={option.id === client?.id ? 'btn-primary text-xs' : 'btn-secondary text-xs'}
            >
              {option.name}
              {option.ci_ruc ? ` · ${option.ci_ruc}` : ''}
            </Link>
          ))}
        </div>
      ) : null}

      {!client ? (
        <EmptyState message="Seleccioná un cliente para generar el reporte" />
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-surface/60 bg-dark/40 p-3">
            <DetailGrid>
              <DetailItem label="Cliente" value={client.name} />
              <DetailItem label="CI / RUC" value={client.ci_ruc || '-'} />
              <DetailItem label="Código" value={client.client_code || '-'} />
              <DetailItem label="Teléfono" value={client.phone || '-'} />
              <DetailItem label="Dirección" value={client.address || '-'} />
              <DetailItem label="Condición" value={client.payment_condition} />
              <DetailItem label="Alta" value={formatDate(client.created_at)} />
              <DetailItem label="Vehículos" value={String(vehicles.length)} />
              <DetailItem label="Usuario" value={user || 'Todos'} />
            </DetailGrid>
            {vehicles.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-300">
                {vehicles.map((vehicle, index) => (
                  <li key={`${vehicle.plate}-${index}`} className="badge bg-surface/60">
                    {[vehicle.brand, vehicle.model, vehicle.plate].filter(Boolean).join(' ') || 'Vehículo'}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Trabajos" value={String(jobs.length)} />
            <Metric label="Facturado" value={formatMoney(billed)} tone="amber" />
            <Metric label="Cobrado" value={formatMoney(collected)} tone="green" />
            <Metric
              label="Saldo pendiente"
              value={formatMoney(debt?.balance ?? 0, debt?.currency ?? 'PYG')}
              tone="red"
            />
          </div>

          <div>
            <h3 className="mb-1 text-sm font-semibold text-slate-200">Historial de trabajos</h3>
            {jobs.length === 0 ? (
              <EmptyState message="Sin trabajos en el período" />
            ) : (
              jobs.map((job) => (
                <Drill
                  key={job.id}
                  summary={
                    <>
                      <span className="text-slate-300">
                        <span className="text-slate-500">{formatDate(job.service_date)}</span> ·{' '}
                        {job.description || 'Sin detalle'}
                      </span>
                      <span className="font-semibold text-slate-100">
                        {formatMoney(job.total, job.currency)}
                      </span>
                    </>
                  }
                >
                  <DetailGrid>
                    <DetailItem label="Condición" value={job.payment_condition} />
                    <DetailItem label="Patente" value={job.plate || '-'} />
                    <DetailItem label="Operario" value={job.created_by || '-'} />
                    <DetailItem label="Ítems" value={job.items || '-'} />
                  </DetailGrid>
                  <Link href={`/taller/${job.id}`} className="btn-link mt-2">
                    Ver trabajo completo
                  </Link>
                </Drill>
              ))
            )}
          </div>

          <div>
            <h3 className="mb-1 text-sm font-semibold text-slate-200">Cuentas por cobrar</h3>
            {accounts.length === 0 ? (
              <EmptyState message="Sin cuentas en el período" />
            ) : (
              accounts.map((account) => (
                <Drill
                  key={account.id}
                  summary={
                    <>
                      <span className="text-slate-300">
                        <span className="text-slate-500">{formatDate(account.service_date)}</span> ·{' '}
                        {account.description || 'Cuenta'}
                      </span>
                      <span className={account.paid ? 'text-slate-500' : 'font-semibold text-red-300'}>
                        {formatMoney(account.balance, account.currency)}
                      </span>
                    </>
                  }
                >
                  <DetailGrid>
                    <DetailItem label="Original" value={formatMoney(account.original_balance, account.currency)} />
                    <DetailItem label="Abonado" value={formatMoney(account.applied_amount, account.currency)} />
                    <DetailItem label="Estado" value={account.paid ? 'Pagada' : 'Pendiente'} />
                    <DetailItem
                      label="Antigüedad"
                      value={`${daysSince(account.service_date)} días`}
                    />
                    <DetailItem label="Pago" value={account.payment_date ? formatDate(account.payment_date) : '-'} />
                    <DetailItem label="Operario" value={account.created_by || '-'} />
                  </DetailGrid>
                </Drill>
              ))
            )}
          </div>

          <div>
            <h3 className="mb-1 text-sm font-semibold text-slate-200">Pagos registrados</h3>
            {payments.length === 0 ? (
              <EmptyState message="Sin pagos en el período" />
            ) : (
              payments.map((payment) => (
                <Drill
                  key={payment.id}
                  summary={
                    <>
                      <span className="text-slate-300">
                        <span className="text-slate-500">{formatDate(payment.created_at)}</span> ·{' '}
                        {payment.payment_method}
                      </span>
                      <span className="font-semibold text-emerald-300">
                        {formatMoney(payment.amount, payment.currency)}
                      </span>
                    </>
                  }
                >
                  <DetailGrid>
                    <DetailItem label="Tipo" value={payment.payment_type} />
                    <DetailItem label="Método" value={payment.payment_method} />
                    <DetailItem label="Operario" value={payment.created_by || '-'} />
                  </DetailGrid>
                </Drill>
              ))
            )}
          </div>
        </div>
      )}
    </ReportFrame>
  );
}
