import { query } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { periodLabel, type ReportParams } from '@/lib/reports';
import { EmptyState } from '@/components/ui';
import { DetailGrid, DetailItem, Drill, Metric, ReportFrame } from './ui';

type TireRow = {
  id: number;
  name: string;
  ci_ruc: string;
  phone: string;
  tire_size: string;
  tire_brand: string;
  quantity: number;
  notes: string;
  created_by: string;
  created_at: string;
};

type ClientGroup = {
  key: string;
  name: string;
  ci_ruc: string;
  phone: string;
  quantity: number;
  records: TireRow[];
};

export default async function TiresReport({ params }: { params: ReportParams }) {
  const { from, to, user, q } = params;

  const records = await query<TireRow>(
    `SELECT id, name, ci_ruc, phone, tire_size, tire_brand, quantity, notes, created_by, created_at
     FROM tire_records
     WHERE ($1 = '' OR created_at >= $1::date)
       AND ($2 = '' OR created_at < ($2::date + interval '1 day'))
       AND ($3 = '' OR created_by = $3)
       AND ($4 = '' OR name ILIKE '%' || $4 || '%' OR ci_ruc ILIKE '%' || $4 || '%')
     ORDER BY created_at DESC, id DESC`,
    [from, to, user, q],
  );

  const groups = new Map<string, ClientGroup>();
  records.forEach((record) => {
    const key = `${record.name}|${record.ci_ruc}`;
    const group = groups.get(key) ?? {
      key,
      name: record.name,
      ci_ruc: record.ci_ruc,
      phone: record.phone,
      quantity: 0,
      records: [],
    };
    group.quantity += Number(record.quantity);
    group.records.push(record);
    groups.set(key, group);
  });

  const clientGroups = Array.from(groups.values()).sort((a, b) => b.quantity - a.quantity);
  const totalQuantity = clientGroups.reduce((sum, group) => sum + group.quantity, 0);

  return (
    <ReportFrame
      title="Reporte de Cubiertas - Clientes"
      subtitle={`${clientGroups.length} clientes · operario: ${user || 'todos'}`}
      period={periodLabel(from, to)}
    >
      <div className="mb-3 grid gap-2 sm:grid-cols-3">
        <Metric label="Clientes" value={String(clientGroups.length)} tone="amber" />
        <Metric label="Cubiertas" value={String(totalQuantity)} tone="green" />
        <Metric label="Registros" value={String(records.length)} />
      </div>

      {clientGroups.length === 0 ? (
        <EmptyState message="Sin cubiertas registradas en el período" />
      ) : (
        clientGroups.map((group) => (
          <Drill
            key={group.key}
            summary={
              <>
                <span className="text-slate-300">
                  <span className="font-medium text-slate-100">{group.name || 'Sin nombre'}</span>
                  {group.ci_ruc ? <span className="text-slate-500"> · {group.ci_ruc}</span> : null}
                  <span className="block text-xs text-slate-500">
                    {group.records.length} registros · última {formatDate(group.records[0]?.created_at)}
                  </span>
                </span>
                <span className="font-semibold text-accent">{group.quantity} cubiertas</span>
              </>
            }
          >
            <DetailGrid>
              <DetailItem label="Teléfono" value={group.phone || '-'} />
              <DetailItem label="CI / RUC" value={group.ci_ruc || '-'} />
              <DetailItem label="Total" value={`${group.quantity} cubiertas`} />
            </DetailGrid>
            <div className="mt-2 space-y-1">
              {group.records.map((record) => (
                <p key={record.id} className="flex flex-wrap justify-between gap-2 border-b border-surface/30 pb-1">
                  <span>
                    <span className="text-slate-500">{formatDate(record.created_at)}</span> ·{' '}
                    {record.tire_size || 'Sin medida'} · {record.tire_brand || 'Sin marca'}
                    {record.notes ? ` · ${record.notes}` : ''}
                  </span>
                  <span className="text-slate-300">
                    {record.quantity} u. · {record.created_by || 'Sin operario'}
                  </span>
                </p>
              ))}
            </div>
          </Drill>
        ))
      )}
    </ReportFrame>
  );
}
