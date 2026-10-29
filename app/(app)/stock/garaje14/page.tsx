import { Plus, Trash2 } from 'lucide-react';
import { query } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { STOCK_CATEGORIES } from '@/lib/constants';
import { formatMoney } from '@/lib/format';
import PageHeader, { EmptyState, Flash } from '@/components/ui';
import ConfirmButton from '@/components/ConfirmButton';
import { deleteStock, saveStock } from '@/app/actions/stock';
import type { FlashParams } from '@/lib/flash';

type StockRow = {
  id: number;
  product_name: string;
  category: string;
  quantity: number;
  price: number;
  supplier: string;
};

export default async function Garage14StockPage({
  searchParams,
}: {
  searchParams: Promise<FlashParams>;
}) {
  const user = await requireUser();
  const { msg, err } = await searchParams;
  const canEdit = ['admin', 'admin2'].includes(user.role);

  const items = await query<StockRow>(
    `SELECT id, product_name, category, quantity, price, supplier
     FROM stock_items WHERE section = 'garaje14' ORDER BY product_name`,
  );

  const totalValue = items.reduce((sum, item) => sum + item.quantity * Number(item.price), 0);

  return (
    <div>
      <PageHeader
        title="Stock de Artículos · Garaje 14"
        subtitle={`${items.length} artículos · valor ${formatMoney(totalValue)}${canEdit ? '' : ' · sólo consulta'}`}
      />
      <Flash success={msg} error={err} />

      {canEdit ? (
        <details className="panel mb-5">
          <summary>
            <span className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Agregar artículo
            </span>
          </summary>
          <div className="border-t border-surface/60 p-4">
            <form action={saveStock} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
              <input type="hidden" name="section" value="garaje14" />
              <div className="lg:col-span-2">
                <label className="label" htmlFor="product_name">
                  Artículo *
                </label>
                <input id="product_name" name="product_name" className="input" required />
              </div>
              <div>
                <label className="label" htmlFor="category">
                  Categoría
                </label>
                <select id="category" name="category" className="input">
                  {STOCK_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="quantity">
                  Cantidad
                </label>
                <input id="quantity" name="quantity" type="number" min="0" defaultValue="0" className="input" />
              </div>
              <div>
                <label className="label" htmlFor="price">
                  Precio
                </label>
                <input id="price" name="price" type="number" min="0" step="any" defaultValue="0" className="input" />
              </div>
              <button type="submit" className="btn-primary lg:col-span-1">
                Guardar
              </button>
            </form>
          </div>
        </details>
      ) : null}

      <div className="card">
        {items.length === 0 ? (
          <EmptyState message="Sin artículos cargados" />
        ) : (
          <ul className="divide-y divide-surface/50">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="font-medium text-slate-100">{item.product_name}</p>
                  <p className="text-xs text-slate-500">{item.category || 'Artículo'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-accent">
                    {item.quantity} unidades · {formatMoney(item.price)}
                  </span>
                  {canEdit ? (
                    <>
                      <details>
                        <summary className="cursor-pointer text-xs font-semibold text-sky-300">Editar</summary>
                        <form action={saveStock} className="mt-2 grid gap-2 sm:grid-cols-4">
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="section" value="garaje14" />
                          <input name="product_name" defaultValue={item.product_name} className="input px-2 py-1" />
                          <input name="category" defaultValue={item.category} className="input px-2 py-1" />
                          <input
                            name="quantity"
                            type="number"
                            min="0"
                            defaultValue={item.quantity}
                            className="input px-2 py-1"
                          />
                          <input
                            name="price"
                            type="number"
                            min="0"
                            step="any"
                            defaultValue={item.price}
                            className="input px-2 py-1"
                          />
                          <button type="submit" className="btn-primary px-2 py-1 text-xs">
                            Guardar
                          </button>
                        </form>
                      </details>
                      <form action={deleteStock}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="section" value="garaje14" />
                        <ConfirmButton
                          message={`¿Eliminar ${item.product_name}?`}
                          className="text-red-300 hover:text-red-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </ConfirmButton>
                      </form>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
