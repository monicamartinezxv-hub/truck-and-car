import Link from 'next/link';
import { query } from '@/lib/db';
import { formatDate, formatMoney } from '@/lib/format';
import { periodLabel, type ReportParams } from '@/lib/reports';
import { EmptyState } from '@/components/ui';
import { DetailGrid, DetailItem, Drill, Metric, ReportFrame } from './ui';

type JobRow = {
  id: number;
  client_name: string;
  plate: string;
  service_date: string;
  end_date: string | null;
  description: string;
  total: number;
  currency: string;
  payment_condition: string;
  created_by: string;
  items: string;
};

export default async function JobsReport({ params }: { params: ReportParams }) {
  const { from, to, user } = params;

  const jobs = await query<JobRow>(
    `SELECT j.id, j.client_name, j.plate, j.service_date, j.end_date, j.description,
            j.total, j.currency, j.payment_condition, j.created_by,
            COALESCE((SELECT string_agg(i.service || ' ×' || i.quantity, ', ')
                      FROM job_items i WHERE i.job_id = j.id), '') AS items
     FROM jobs j
     WHERE ($1 = '' OR j.service_date >= $1::date)
       AND ($2 = '' OR j.service_date <= $2::date)
       AND ($3 = '' OR j.created_by = $3)
     ORDER BY j.service_date DESC, j.id DESC`,
    [from, to, user],
  );

  const byOperator = new Map<string, { count: number; total: number }>();
  jobs.forEach((job) => {
    const key = job.created_by || 'Sin operario';
    const current = byOperator.get(key) ?? { count: 0, total: 0 };
    byOperator.set(key, { count: current.count + 1, total: current.total + Number(job.total) });
  });

  const total = jobs.reduce((sum, job) => sum + Number(job.total), 0);

  return (
    <ReportFrame
      title="Trabajos Realizados"
      subtitle={`${jobs.length} trabajos · operario: ${user || 'todos'}`}
      period={periodLabel(from, to)}
    >
      <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Trabajos" value={String(jobs.length)} tone="amber" />
        <Metric label="Total facturado" value={formatMoney(total)} tone="green" />
        {Array.from(byOperator.entries()).map(([operator, data]) => (
          <Metric
            key={operator}
            label={operator}
            value={`${data.count} · ${formatMoney(data.total)}`}
          />
        ))}
      </div>

      {jobs.length === 0 ? (
        <EmptyState message="Sin trabajos en el período" />
      ) : (
        jobs.map((job) => (
          <Drill
            key={job.id}
            summary={
              <>
                <span className="min-w-0 text-slate-300">
                  <span className="text-slate-500">{formatDate(job.service_date)}</span> ·{' '}
                  <span className="font-medium text-slate-100">{job.client_name || 'Sin cliente'}</span>
                  {job.plate ? <span className="text-slate-500"> · {job.plate}</span> : null}
                  <span className="block truncate text-xs text-slate-500">
                    {job.description || 'Sin detalle'}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-semibold text-slate-100">
                    {formatMoney(job.total, job.currency)}
                  </span>
                  <span className="block text-[11px] text-slate-500">{job.created_by || 'Sin operario'}</span>
                </span>
              </>
            }
          >
            <DetailGrid>
              <DetailItem label="Condición" value={job.payment_condition} />
              <DetailItem label="Patente" value={job.plate || '-'} />
              <DetailItem label="Operario" value={job.created_by || '-'} />
              <DetailItem label="Fin" value={job.end_date ? formatDate(job.end_date) : '-'} />
              <DetailItem label="Ítems" value={job.items || '-'} />
            </DetailGrid>
            <Link href={`/taller/${job.id}`} className="btn-link mt-2">
              Ver trabajo completo
            </Link>
          </Drill>
        ))
      )}
    </ReportFrame>
  );
}
