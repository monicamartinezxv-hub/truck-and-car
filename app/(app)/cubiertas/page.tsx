import { Plus, Trash2 } from 'lucide-react';
import { query } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { formatDate, formatNumber } from '@/lib/format';
import PageHeader, { EmptyState, Flash, StatCard } from '@/components/ui';
import ConfirmButton from '@/components/ConfirmButton';
import { deleteTire, saveTire } from '@/app/actions/tires';
import type { FlashParams } from '@/lib/flash';

type TireRow = {
  id: number;
  name: string;
  ci_ruc: string;
  phone: string;
  tire_size: string;
  tire_brand: string;
  quantity: number;
  notes: string;
  created_at: string;
};

export default async function TiresPage({
  searchParams,
}: {
  searchParams: Promise<FlashParams & { q?: string }>;
}) {
  await requireUser();
  const { msg, err, q = '' } = await searchParams;
  const term = q.trim();

  const tires = await query<TireRow>(
    `SELECT id, name, ci_ruc, phone, tire_size, tire_brand, quantity, notes, created_at
     FROM tire_records
     WHERE $1 = '' OR name ILIKE '%' || $1 || '%' OR ci_ruc ILIKE '%' || $1 || '%'
        OR tire_size ILIKE '%' || $1 || '%' OR tire_brand ILIKE '%' || $1 || '%'
     ORDER BY name ASC, id DESC`,
    [term],
  );

  const totalUnits = tires.reduce((sum, tire) => sum + Number(tire.quantity), 0);
  const clients = new Set(tires.map((tire) => tire.name.toLowerCase())).size;

  return (
    <div>
      <PageHeader title="Stock de Cubiertas · Clientes" subtitle="Cubiertas guardadas por cliente" />
      <Flash success={msg} error={err} />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Registros" value={String(tires.length)} tone="blue" />
        <StatCard label="Cubiertas" value={formatNumber(totalUnits)} tone="amber" />
        <StatCard label="Clientes" value={String(clients)} tone="green" />
        <StatCard label="Con observación" value={String(tires.filter((t) => t.notes).length)} tone="red" />
      </div>

      <form className="mb-4 flex flex-wrap gap-2" action="/cubiertas">
        <input
          name="q"
          defaultValue={term}
          placeholder="Buscar cliente, medida o marca…"
          className="input sm:max-w-xs"
        />
        <button type="submit" className="btn-secondary">
          Buscar
        </button>
      </form>

      <details className="panel mb-5">
        <summary>
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Registrar cubierta
          </span>
        </summary>
        <div className="border-t border-surface/60 p-4">
          <form action={saveTire} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
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
            <div>
              <label className="label" htmlFor="phone">
                Teléfono
              </label>
              <input id="phone" name="phone" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="quantity">
                Cantidad
              </label>
              <input id="quantity" name="quantity" type="number" min="0" defaultValue="0" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="tire_size">
                Medida
              </label>
              <input id="tire_size" name="tire_size" className="input" placeholder="1100R22" />
            </div>
            <div>
              <label className="label" htmlFor="tire_brand">
                Marca
              </label>
              <input id="tire_brand" name="tire_brand" className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="notes">
                Observaciones
              </label>
              <input id="notes" name="notes" className="input" />
            </div>
            <button type="submit" className="btn-primary lg:col-span-4 lg:w-fit">
              Guardar
            </button>
          </form>
        </div>
      </details>

      <div className="card overflow-x-auto">
        {tires.length === 0 ? (
          <EmptyState message="Sin cubiertas registradas" />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>CI / RUC</th>
                <th>Teléfono</th>
                <th>Medida</th>
                <th>Marca</th>
                <th>Cantidad</th>
                <th>Observaciones</th>
                <th>Registro</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tires.map((tire) => (
                <tr key={tire.id}>
                  <td className="font-medium text-slate-100">{tire.name}</td>
                  <td className="text-slate-400">{tire.ci_ruc || '-'}</td>
                  <td className="text-slate-400">{tire.phone || '-'}</td>
                  <td className="text-slate-300">{tire.tire_size || '-'}</td>
                  <td className="text-slate-300">{tire.tire_brand || '-'}</td>
                  <td className="font-semibold text-accent">{tire.quantity}</td>
                  <td className="max-w-[16rem] truncate text-slate-400">{tire.notes || '-'}</td>
                  <td className="whitespace-nowrap text-slate-500">{formatDate(tire.created_at)}</td>
                  <td>
                    <div className="flex items-center justify-end gap-3">
                      <details>
                        <summary className="cursor-pointer text-xs font-semibold text-sky-300">Editar</summary>
                        <form action={saveTire} className="mt-2 grid gap-2 sm:grid-cols-4">
                          <input type="hidden" name="id" value={tire.id} />
                          <input name="name" defaultValue={tire.name} className="input px-2 py-1" />
                          <input name="ci_ruc" defaultValue={tire.ci_ruc} className="input px-2 py-1" placeholder="CI/RUC" />
                          <input name="phone" defaultValue={tire.phone} className="input px-2 py-1" placeholder="Teléfono" />
                          <input
                            name="quantity"
                            type="number"
                            min="0"
                            defaultValue={tire.quantity}
                            className="input px-2 py-1"
                          />
                          <input
                            name="tire_size"
                            defaultValue={tire.tire_size}
                            className="input px-2 py-1"
                            placeholder="Medida"
                          />
                          <input
                            name="tire_brand"
                            defaultValue={tire.tire_brand}
                            className="input px-2 py-1"
                            placeholder="Marca"
                          />
                          <input name="notes" defaultValue={tire.notes} className="input px-2 py-1" placeholder="Notas" />
                          <button type="submit" className="btn-primary px-2 py-1 text-xs">
                            Guardar
                          </button>
                        </form>
                      </details>
                      <form action={deleteTire}>
                        <input type="hidden" name="id" value={tire.id} />
                        <ConfirmButton message="¿Eliminar este registro?" className="text-red-300 hover:text-red-200">
                          <Trash2 className="h-4 w-4" />
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
    </div>
  );
}
