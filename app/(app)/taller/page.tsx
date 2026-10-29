import Link from 'next/link';
import { Plus, Search, Trash2 } from 'lucide-react';
import { query } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { formatDate, formatMoney } from '@/lib/format';
import PageHeader, { EmptyState, Flash } from '@/components/ui';
import ConfirmButton from '@/components/ConfirmButton';
import { deleteJob } from '@/app/actions/jobs';
import type { FlashParams } from '@/lib/flash';

type JobRow = {
  id: number;
  client_name: string;
  plate: string;
  description: string;
  service_date: string;
  total: number;
  currency: string;
  payment_condition: string;
  items_count: number;
};

export default async function WorkshopPage({
  searchParams,
}: {
  searchParams: Promise<FlashParams & { q?: string; cond?: string }>;
}) {
  await requireUser();
  const { q = '', cond = '', msg, err } = await searchParams;
  const term = q.trim();
  const condition = cond === 'Deuda' || cond === 'Contado' ? cond : '';

  const jobs = await query<JobRow>(
    `SELECT j.id, j.client_name, j.plate, j.description, j.service_date, j.total, j.currency,
            j.payment_condition,
            (SELECT count(*) FROM job_items i WHERE i.job_id = j.id)::int AS items_count
     FROM jobs j
     WHERE ($1 = '' OR j.client_name ILIKE '%' || $1 || '%' OR j.plate ILIKE '%' || $1 || '%'
            OR j.description ILIKE '%' || $1 || '%')
       AND ($2 = '' OR j.payment_condition = $2)
     ORDER BY j.service_date DESC, j.id DESC`,
    [term, condition],
  );

  const total = jobs.reduce((sum, job) => sum + Number(job.total), 0);

  return (
    <div>
      <PageHeader
        title="Gomería / Taller"
        subtitle={`${jobs.length} trabajo${jobs.length === 1 ? '' : 's'} · ${formatMoney(total)}`}
        actions={
          <Link href="/taller/nuevo" className="btn-primary">
            <Plus className="h-4 w-4" />
            Nuevo trabajo
          </Link>
        }
      />
      <Flash success={msg} error={err} />

      <form className="mb-4 flex flex-wrap items-end gap-2" action="/taller">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            name="q"
            defaultValue={term}
            placeholder="Cliente, chapa o detalle…"
            className="input pl-9"
          />
        </div>
        <select name="cond" defaultValue={condition} className="input w-auto">
          <option value="">Todas las condiciones</option>
          <option value="Contado">Contado</option>
          <option value="Deuda">Deuda</option>
        </select>
        <button type="submit" className="btn-secondary">
          Filtrar
        </button>
      </form>

      <div className="card overflow-x-auto">
        {jobs.length === 0 ? (
          <EmptyState message="No hay trabajos para mostrar" />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Chapa</th>
                <th>Detalle</th>
                <th>Ítems</th>
                <th>Condición</th>
                <th className="text-right">Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-surface/20">
                  <td className="whitespace-nowrap text-slate-400">{formatDate(job.service_date)}</td>
                  <td>
                    <Link href={`/taller/${job.id}`} className="font-medium text-slate-100 hover:text-accent">
                      {job.client_name || 'Sin cliente'}
                    </Link>
                  </td>
                  <td className="text-slate-400">{job.plate || '-'}</td>
                  <td className="max-w-[22rem] truncate text-slate-300">{job.description || '-'}</td>
                  <td className="text-slate-400">{job.items_count}</td>
                  <td>
                    <span
                      className={`badge ${
                        job.payment_condition === 'Deuda'
                          ? 'bg-amber-500/15 text-amber-300'
                          : 'bg-emerald-500/15 text-emerald-300'
                      }`}
                    >
                      {job.payment_condition}
                    </span>
                  </td>
                  <td className="text-right font-semibold">{formatMoney(job.total, job.currency)}</td>
                  <td className="text-right">
                    <form action={deleteJob}>
                      <input type="hidden" name="id" value={job.id} />
                      <ConfirmButton
                        message="¿Eliminar este trabajo?"
                        className="text-red-300 hover:text-red-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </ConfirmButton>
                    </form>
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
