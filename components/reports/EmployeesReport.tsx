import { query } from '@/lib/db';
import { formatDateTime, formatMoney } from '@/lib/format';
import { periodLabel, type ReportParams } from '@/lib/reports';
import { EmptyState } from '@/components/ui';
import { DetailGrid, DetailItem, Drill, Metric, ReportFrame } from './ui';

type EmployeeRow = {
  id: number;
  first_name: string;
  last_name: string;
  ci_ruc: string;
  phone: string;
  debt: number;
  entries: number;
  production: number;
};

type ProductionRow = {
  id: number;
  employee_id: number;
  description: string;
  cost: number;
  created_at: string;
};

export default async function EmployeesReport({ params }: { params: ReportParams }) {
  const { from, to } = params;

  const employees = await query<EmployeeRow>(
    `SELECT e.id, e.first_name, e.last_name, e.ci_ruc, e.phone, e.debt,
            COALESCE(p.entries, 0)::int AS entries, COALESCE(p.production, 0) AS production
     FROM employees e
     LEFT JOIN (SELECT employee_id, count(*)::int AS entries, sum(cost) AS production
                FROM production_entries
                WHERE ($1 = '' OR created_at >= $1::date)
                  AND ($2 = '' OR created_at < ($2::date + interval '1 day'))
                GROUP BY employee_id) p ON p.employee_id = e.id
     ORDER BY production DESC, e.first_name`,
    [from, to],
  );

  const production = await query<ProductionRow>(
    `SELECT id, employee_id, description, cost, created_at
     FROM production_entries
     WHERE ($1 = '' OR created_at >= $1::date)
       AND ($2 = '' OR created_at < ($2::date + interval '1 day'))
     ORDER BY created_at DESC, id DESC`,
    [from, to],
  );

  const productionByEmployee = new Map<number, ProductionRow[]>();
  production.forEach((entry) => {
    productionByEmployee.set(entry.employee_id, [
      ...(productionByEmployee.get(entry.employee_id) ?? []),
      entry,
    ]);
  });

  const totalProduction = employees.reduce((sum, employee) => sum + Number(employee.production), 0);
  const totalDebt = employees.reduce((sum, employee) => sum + Number(employee.debt), 0);

  return (
    <ReportFrame
      title="Funcionarios"
      subtitle="Rendimiento, métricas y saldos del personal"
      period={periodLabel(from, to)}
    >
      <div className="mb-3 grid gap-2 sm:grid-cols-3">
        <Metric label="Funcionarios" value={String(employees.length)} />
        <Metric label="Producción" value={formatMoney(totalProduction)} tone="green" />
        <Metric label="Deuda del personal" value={formatMoney(totalDebt)} tone="red" />
      </div>

      {employees.length === 0 ? (
        <EmptyState message="Sin funcionarios registrados" />
      ) : (
        employees.map((employee) => {
          const entries = productionByEmployee.get(employee.id) ?? [];
          return (
            <Drill
              key={employee.id}
              summary={
                <>
                  <span className="text-slate-300">
                    <span className="font-medium text-slate-100">
                      {employee.first_name} {employee.last_name}
                    </span>
                    {employee.ci_ruc ? <span className="text-slate-500"> · {employee.ci_ruc}</span> : null}
                    <span className="block text-xs text-slate-500">
                      {employee.entries} registros de producción · deuda {formatMoney(employee.debt)}
                    </span>
                  </span>
                  <span className="font-semibold text-emerald-300">{formatMoney(employee.production)}</span>
                </>
              }
            >
              <DetailGrid>
                <DetailItem label="CI / RUC" value={employee.ci_ruc || '-'} />
                <DetailItem label="Teléfono" value={employee.phone || '-'} />
                <DetailItem label="Producción" value={formatMoney(employee.production)} />
                <DetailItem label="Registros" value={String(employee.entries)} />
                <DetailItem label="Deuda" value={formatMoney(employee.debt)} />
              </DetailGrid>

              <p className="mt-2 font-semibold text-slate-200">Producción del período</p>
              {entries.length === 0 ? (
                <p className="text-slate-500">Sin registros en el período.</p>
              ) : (
                entries.map((entry) => (
                  <p key={entry.id} className="flex flex-wrap justify-between gap-2 border-b border-surface/30 pb-1">
                    <span>
                      <span className="text-slate-500">{formatDateTime(entry.created_at)}</span> ·{' '}
                      {entry.description || 'Sin detalle'}
                    </span>
                    <span className="text-slate-200">{formatMoney(entry.cost)}</span>
                  </p>
                ))
              )}
            </Drill>
          );
        })
      )}
    </ReportFrame>
  );
}
