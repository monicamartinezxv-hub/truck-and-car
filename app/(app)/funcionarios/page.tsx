import { Plus, Trash2 } from 'lucide-react';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { formatDate, formatMoney } from '@/lib/format';
import PageHeader, { EmptyState, Flash, StatCard } from '@/components/ui';
import ConfirmButton from '@/components/ConfirmButton';
import {
  addProduction,
  deleteEmployee,
  deleteProduction,
  saveEmployee,
} from '@/app/actions/employees';
import type { FlashParams } from '@/lib/flash';

type EmployeeRow = {
  id: number;
  first_name: string;
  last_name: string;
  ci_ruc: string;
  phone: string;
  address: string;
  age: number | null;
  debt: number;
  production_total: number;
};

type ProductionRow = {
  id: number;
  employee_id: number;
  employee_name: string;
  description: string;
  cost: number;
  created_at: string;
};

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<FlashParams>;
}) {
  await requireAdmin();
  const { msg, err } = await searchParams;

  const employees = await query<EmployeeRow>(
    `SELECT e.id, e.first_name, e.last_name, e.ci_ruc, e.phone, e.address, e.age, e.debt,
            COALESCE((SELECT sum(p.cost) FROM production_entries p WHERE p.employee_id = e.id), 0) AS production_total
     FROM employees e
     ORDER BY e.first_name, e.last_name`,
  );

  const production = await query<ProductionRow>(
    `SELECT p.id, p.employee_id, (e.first_name || ' ' || e.last_name) AS employee_name,
            p.description, p.cost, p.created_at
     FROM production_entries p JOIN employees e ON e.id = p.employee_id
     ORDER BY p.created_at DESC, p.id DESC LIMIT 15`,
  );

  const totalDebt = employees.reduce((sum, employee) => sum + Number(employee.debt), 0);
  const totalProduction = employees.reduce((sum, employee) => sum + Number(employee.production_total), 0);

  return (
    <div>
      <PageHeader title="Funcionarios" subtitle="Personal, deudas y producción registrada" />
      <Flash success={msg} error={err} />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Funcionarios" value={String(employees.length)} tone="blue" />
        <StatCard label="Deuda total" value={formatMoney(totalDebt)} tone="red" />
        <StatCard label="Producción total" value={formatMoney(totalProduction)} tone="green" />
        <StatCard label="Registros de producción" value={String(production.length)} tone="amber" />
      </div>

      <details className="panel mb-5">
        <summary>
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nuevo funcionario
          </span>
        </summary>
        <div className="border-t border-surface/60 p-4">
          <form action={saveEmployee} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label" htmlFor="first_name">
                Nombre *
              </label>
              <input id="first_name" name="first_name" className="input" required />
            </div>
            <div>
              <label className="label" htmlFor="last_name">
                Apellido
              </label>
              <input id="last_name" name="last_name" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="ci_ruc">
                CI / RUC
              </label>
              <input id="ci_ruc" name="ci_ruc" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="phone">
                Teléfono
              </label>
              <input id="phone" name="phone" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="age">
                Edad
              </label>
              <input id="age" name="age" type="number" min="0" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="debt">
                Deuda inicial
              </label>
              <input id="debt" name="debt" type="number" min="0" step="any" defaultValue="0" className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="address">
                Dirección
              </label>
              <input id="address" name="address" className="input" />
            </div>
            <button type="submit" className="btn-primary lg:col-span-3 lg:w-fit">
              Guardar funcionario
            </button>
          </form>
        </div>
      </details>

      <div className="card overflow-x-auto">
        {employees.length === 0 ? (
          <EmptyState message="Sin funcionarios registrados" />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Funcionario</th>
                <th>CI / RUC</th>
                <th>Teléfono</th>
                <th>Edad</th>
                <th>Deuda</th>
                <th>Producción</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="align-top">
                  <td>
                    <p className="font-medium text-slate-100">
                      {employee.first_name} {employee.last_name}
                    </p>
                    <p className="text-xs text-slate-500">{employee.address || 'Sin dirección'}</p>
                  </td>
                  <td className="text-slate-400">{employee.ci_ruc || '-'}</td>
                  <td className="text-slate-400">{employee.phone || '-'}</td>
                  <td className="text-slate-400">{employee.age ?? '-'}</td>
                  <td className={employee.debt > 0 ? 'font-semibold text-red-300' : 'text-slate-400'}>
                    {formatMoney(employee.debt)}
                  </td>
                  <td className="font-semibold text-emerald-300">{formatMoney(employee.production_total)}</td>
                  <td>
                    <div className="flex flex-col items-end gap-2">
                      <details>
                        <summary className="cursor-pointer text-xs font-semibold text-sky-300">
                          Registrar producción
                        </summary>
                        <form action={addProduction} className="mt-2 flex flex-wrap items-end gap-2">
                          <input type="hidden" name="employee_id" value={employee.id} />
                          <input name="description" placeholder="Trabajo realizado" className="input px-2 py-1" required />
                          <input
                            name="cost"
                            type="number"
                            min="0"
                            step="any"
                            placeholder="Costo"
                            className="input w-24 px-2 py-1"
                          />
                          <button type="submit" className="btn-primary px-2 py-1 text-xs">
                            Agregar
                          </button>
                        </form>
                      </details>

                      <details>
                        <summary className="cursor-pointer text-xs font-semibold text-sky-300">Editar</summary>
                        <form action={saveEmployee} className="mt-2 grid gap-2 sm:grid-cols-3">
                          <input type="hidden" name="id" value={employee.id} />
                          <input name="first_name" defaultValue={employee.first_name} className="input px-2 py-1" required />
                          <input name="last_name" defaultValue={employee.last_name} className="input px-2 py-1" />
                          <input name="ci_ruc" defaultValue={employee.ci_ruc} className="input px-2 py-1" placeholder="CI/RUC" />
                          <input name="phone" defaultValue={employee.phone} className="input px-2 py-1" placeholder="Teléfono" />
                          <input name="age" type="number" min="0" defaultValue={employee.age ?? ''} className="input px-2 py-1" />
                          <input
                            name="debt"
                            type="number"
                            min="0"
                            step="any"
                            defaultValue={employee.debt}
                            className="input px-2 py-1"
                          />
                          <input name="address" defaultValue={employee.address} className="input px-2 py-1 sm:col-span-2" placeholder="Dirección" />
                          <button type="submit" className="btn-primary px-2 py-1 text-xs">
                            Guardar
                          </button>
                        </form>
                      </details>

                      <form action={deleteEmployee}>
                        <input type="hidden" name="id" value={employee.id} />
                        <ConfirmButton
                          message={`¿Eliminar a ${employee.first_name}?`}
                          className="inline-flex items-center gap-1 text-xs text-red-300 hover:text-red-200"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <section className="card mt-5 overflow-x-auto">
        <h2 className="card-title">Últimas producciones</h2>
        {production.length === 0 ? (
          <EmptyState message="Sin producciones registradas" />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Funcionario</th>
                <th>Detalle</th>
                <th className="text-right">Costo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {production.map((entry) => (
                <tr key={entry.id}>
                  <td className="whitespace-nowrap text-slate-400">{formatDate(entry.created_at)}</td>
                  <td className="text-slate-200">{entry.employee_name}</td>
                  <td className="text-slate-400">{entry.description}</td>
                  <td className="text-right font-semibold text-slate-200">{formatMoney(entry.cost)}</td>
                  <td className="text-right">
                    <form action={deleteProduction}>
                      <input type="hidden" name="id" value={entry.id} />
                      <ConfirmButton message="¿Eliminar este registro?" className="text-red-300 hover:text-red-200">
                        <Trash2 className="h-4 w-4" />
                      </ConfirmButton>
                    </form>
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
