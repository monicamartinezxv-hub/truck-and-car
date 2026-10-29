import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { query } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { formatMoney } from '@/lib/format';
import PageHeader, { EmptyState, Flash } from '@/components/ui';
import ClientForm from '@/components/ClientForm';
import { createClient } from '@/app/actions/clients';
import type { FlashParams } from '@/lib/flash';

type ClientRow = {
  id: number;
  client_code: string;
  name: string;
  ci_ruc: string;
  phone: string;
  payment_condition: string;
  vehicles_count: number;
  jobs_count: number;
  debt: number;
};

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<FlashParams & { q?: string }>;
}) {
  await requireUser();
  const { q = '', msg, err } = await searchParams;
  const term = q.trim();

  const clients = await query<ClientRow>(
    `SELECT c.id, c.client_code, c.name, c.ci_ruc, c.phone, c.payment_condition,
            (SELECT count(*) FROM client_vehicles v WHERE v.client_id = c.id)::int AS vehicles_count,
            (SELECT count(*) FROM jobs j WHERE j.client_id = c.id)::int AS jobs_count,
            COALESCE((SELECT sum(r.balance) FROM receivables r WHERE r.client_id = c.id AND NOT r.paid), 0) AS debt
     FROM clients c
     WHERE $1 = '' OR c.name ILIKE '%' || $1 || '%' OR c.ci_ruc ILIKE '%' || $1 || '%'
        OR c.phone ILIKE '%' || $1 || '%' OR c.client_code ILIKE '%' || $1 || '%'
     ORDER BY c.name ASC`,
    [term],
  );

  return (
    <div>
      <PageHeader
        title="Gestión de Clientes"
        subtitle={`${clients.length} cliente${clients.length === 1 ? '' : 's'} ${term ? `para “${term}”` : 'registrados'}`}
      />
      <Flash success={msg} error={err} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form className="flex flex-1 items-center gap-2" action="/clientes">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              name="q"
              defaultValue={term}
              placeholder="Buscar por nombre, CI/RUC, teléfono…"
              className="input pl-9"
            />
          </div>
          <button type="submit" className="btn-secondary">
            Buscar
          </button>
        </form>
      </div>

      <details className="panel mb-5">
        <summary>
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nuevo cliente
          </span>
        </summary>
        <div className="border-t border-surface/60 p-4">
          <ClientForm action={createClient} submitLabel="Guardar cliente" />
        </div>
      </details>

      <div className="card overflow-x-auto">
        {clients.length === 0 ? (
          <EmptyState message="No se encontraron clientes" />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Código</th>
                <th>Cliente</th>
                <th>CI / RUC</th>
                <th>Teléfono</th>
                <th>Vehículos</th>
                <th>Trabajos</th>
                <th>Condición</th>
                <th className="text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-surface/20">
                  <td className="text-xs text-slate-500">{client.client_code || '-'}</td>
                  <td>
                    <Link href={`/clientes/${client.id}`} className="font-medium text-slate-100 hover:text-accent">
                      {client.name}
                    </Link>
                  </td>
                  <td className="text-slate-400">{client.ci_ruc || '-'}</td>
                  <td className="text-slate-400">{client.phone || '-'}</td>
                  <td className="text-slate-400">{client.vehicles_count}</td>
                  <td className="text-slate-400">{client.jobs_count}</td>
                  <td>
                    <span
                      className={`badge ${
                        client.payment_condition === 'Deuda'
                          ? 'bg-amber-500/15 text-amber-300'
                          : 'bg-emerald-500/15 text-emerald-300'
                      }`}
                    >
                      {client.payment_condition}
                    </span>
                  </td>
                  <td className={`text-right font-semibold ${client.debt > 0 ? 'text-red-300' : 'text-slate-400'}`}>
                    {formatMoney(client.debt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
