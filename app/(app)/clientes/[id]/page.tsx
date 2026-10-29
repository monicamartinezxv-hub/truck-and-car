import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { one, query } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { formatDate, formatMoney } from '@/lib/format';
import PageHeader, { EmptyState, Flash, StatCard } from '@/components/ui';
import ClientForm from '@/components/ClientForm';
import { deleteClient, updateClient } from '@/app/actions/clients';
import type { FlashParams } from '@/lib/flash';

type ClientDetail = {
  id: number;
  client_code: string;
  name: string;
  ci_ruc: string;
  phone: string;
  address: string;
  payment_condition: string;
};

type VehicleRow = {
  id: number;
  brand: string;
  model: string;
  engine: string;
  plate: string;
  transmission: string;
};

type JobRow = {
  id: number;
  service_date: string;
  description: string;
  total: number;
  currency: string;
  payment_condition: string;
};

type ReceivableRow = {
  id: number;
  service_date: string;
  description: string;
  original_balance: number;
  balance: number;
  paid: boolean;
  currency: string;
};

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<FlashParams>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { msg, err } = await searchParams;
  const clientId = Number(id);
  if (!Number.isFinite(clientId)) notFound();

  const client = await one<ClientDetail>('SELECT * FROM clients WHERE id = $1', [clientId]);
  if (!client) notFound();

  const vehicles = await query<VehicleRow>(
    'SELECT * FROM client_vehicles WHERE client_id = $1 ORDER BY id',
    [clientId],
  );
  const jobs = await query<JobRow>(
    `SELECT id, service_date, description, total, currency, payment_condition
     FROM jobs WHERE client_id = $1 ORDER BY service_date DESC, id DESC`,
    [clientId],
  );
  const receivables = await query<ReceivableRow>(
    `SELECT id, service_date, description, original_balance, balance, paid, currency
     FROM receivables WHERE client_id = $1 ORDER BY service_date DESC, id DESC`,
    [clientId],
  );

  const openDebt = receivables
    .filter((item) => !item.paid)
    .reduce((sum, item) => sum + Number(item.balance), 0);
  const jobsTotal = jobs.reduce((sum, job) => sum + Number(job.total), 0);

  return (
    <div>
      <PageHeader
        title={client.name}
        subtitle={`${client.client_code || 'Cliente'} · ${client.ci_ruc || 'sin CI/RUC'} · ${client.phone || 'sin teléfono'}`}
        actions={
          <Link href="/clientes" className="btn-secondary">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        }
      />
      <Flash success={msg} error={err} />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Trabajos" value={String(jobs.length)} tone="blue" />
        <StatCard label="Facturado" value={formatMoney(jobsTotal)} tone="amber" />
        <StatCard label="Saldo pendiente" value={formatMoney(openDebt)} tone="red" />
        <StatCard label="Condición" value={client.payment_condition} tone="green" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="card overflow-x-auto">
            <h2 className="card-title">Historial de trabajos</h2>
            {jobs.length === 0 ? (
              <EmptyState message="Sin trabajos registrados" />
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
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td className="text-slate-400">{formatDate(job.service_date)}</td>
                      <td>
                        <Link href={`/taller/${job.id}`} className="text-slate-100 hover:text-accent">
                          {job.description || 'Sin detalle'}
                        </Link>
                      </td>
                      <td className="text-slate-400">{job.payment_condition}</td>
                      <td className="text-right font-semibold">{formatMoney(job.total, job.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="card overflow-x-auto">
            <h2 className="card-title">Cuentas por cobrar</h2>
            {receivables.length === 0 ? (
              <EmptyState message="Sin cuentas registradas" />
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Descripción</th>
                    <th>Original</th>
                    <th>Saldo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {receivables.map((item) => (
                    <tr key={item.id}>
                      <td className="text-slate-400">{formatDate(item.service_date)}</td>
                      <td className="text-slate-200">{item.description || 'Cuenta'}</td>
                      <td className="text-slate-400">{formatMoney(item.original_balance, item.currency)}</td>
                      <td className={item.paid ? 'text-slate-500' : 'font-semibold text-red-300'}>
                        {formatMoney(item.balance, item.currency)}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            item.paid
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-red-500/15 text-red-300'
                          }`}
                        >
                          {item.paid ? 'Cobrado' : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <Link href="/cuentas-por-cobrar" className="btn-link mt-3">
              Registrar cobro
            </Link>
          </section>
        </div>

        <div className="space-y-4">
          <section className="card">
            <h2 className="card-title">Vehículos</h2>
            {vehicles.length === 0 ? (
              <EmptyState message="Sin vehículos cargados" />
            ) : (
              <ul className="space-y-2 text-sm">
                {vehicles.map((vehicle) => (
                  <li key={vehicle.id} className="rounded-lg border border-surface/60 bg-dark/40 p-2.5">
                    <p className="font-medium text-slate-100">
                      {[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'Vehículo'}
                    </p>
                    <p className="text-xs text-slate-400">
                      Chapa {vehicle.plate || '-'} · Motor {vehicle.engine || '-'} ·{' '}
                      {vehicle.transmission || 'sin transmisión'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <h2 className="card-title">Datos</h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-400">Dirección</dt>
                <dd className="text-right text-slate-200">{client.address || '-'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-400">Teléfono</dt>
                <dd className="text-slate-200">{client.phone || '-'}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      <details className="panel mt-5">
        <summary>Editar cliente</summary>
        <div className="border-t border-surface/60 p-4">
          <ClientForm
            action={updateClient}
            submitLabel="Guardar cambios"
            initial={{
              id: client.id,
              name: client.name,
              ci_ruc: client.ci_ruc,
              phone: client.phone,
              address: client.address,
              payment_condition: client.payment_condition,
              vehicles: vehicles.map((vehicle) => ({
                id: vehicle.id,
                brand: vehicle.brand,
                model: vehicle.model,
                engine: vehicle.engine,
                plate: vehicle.plate,
                transmission: vehicle.transmission,
              })),
            }}
          />
        </div>
      </details>

      {user.role === 'admin' ? (
        <form action={deleteClient} className="mt-3">
          <input type="hidden" name="id" value={client.id} />
          <button type="submit" className="btn-danger">
            <Trash2 className="h-4 w-4" />
            Eliminar cliente
          </button>
        </form>
      ) : null}
    </div>
  );
}
