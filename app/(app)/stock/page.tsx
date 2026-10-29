import { Plus, Trash2 } from 'lucide-react';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { STOCK_CATEGORIES } from '@/lib/constants';
import { formatMoney } from '@/lib/format';
import PageHeader, { EmptyState, Flash } from '@/components/ui';
import ConfirmButton from '@/components/ConfirmButton';
import { deleteStock, saveStock } from '@/app/actions/stock';
import type { FlashParams } from '@/lib/flash';

export type StockRow = {
  id: number;
  product_name: string;
  category: string;
  quantity: number;
  price: number;
  supplier: string;
};

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<FlashParams>;
}) {
  await requireAdmin();
  const { msg, err } = await searchParams;

  const items = await query<StockRow>(
    `SELECT id, product_name, category, quantity, price, supplier
     FROM stock_items WHERE section = 'general' ORDER BY product_name`,
  );

  const lowStock = items.filter((item) => item.quantity < 5).length;
  const totalValue = items.reduce((sum, item) => sum + item.quantity * Number(item.price), 0);

  return (
    <div>
      <PageHeader
        title="Stock e Inventario"
        subtitle={`${items.length} productos · ${lowStock} con stock bajo · valor ${formatMoney(totalValue)}`}
      />
      <Flash success={msg} error={err} />

      <details className="panel mb-5">
        <summary>
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Agregar producto
          </span>
        </summary>
        <div className="border-t border-surface/60 p-4">
          <form action={saveStock} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
            <input type="hidden" name="section" value="general" />
            <div className="lg:col-span-2">
              <label className="label" htmlFor="product_name">
                Producto *
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
            <div className="lg:col-span-2">
              <label className="label" htmlFor="supplier">
                Proveedor
              </label>
              <input id="supplier" name="supplier" className="input" />
            </div>
            <button type="submit" className="btn-primary lg:col-span-1">
              Guardar
            </button>
          </form>
        </div>
      </details>

      <div className="card overflow-x-auto">
        {items.length === 0 ? (
          <EmptyState message="Sin productos cargados" />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Cantidad</th>
                <th>Precio</th>
                <th>Proveedor</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="font-medium text-slate-100">{item.product_name}</td>
                  <td className="text-slate-400">{item.category || '-'}</td>
                  <td className={item.quantity < 5 ? 'font-bold text-red-300' : 'text-emerald-300'}>
                    {item.quantity}
                  </td>
                  <td className="text-slate-200">{formatMoney(item.price)}</td>
                  <td className="text-slate-400">{item.supplier || '-'}</td>
                  <td>
                    <div className="flex items-center justify-end gap-3">
                      <details>
                        <summary className="cursor-pointer text-xs font-semibold text-sky-300">Editar</summary>
                        <form action={saveStock} className="mt-2 grid gap-2 sm:grid-cols-3">
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="section" value="general" />
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
                          <input name="supplier" defaultValue={item.supplier} className="input px-2 py-1" />
                          <button type="submit" className="btn-primary px-2 py-1 text-xs">
                            Guardar
                          </button>
                        </form>
                      </details>
                      <form action={deleteStock}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="section" value="general" />
                        <ConfirmButton
                          message={`¿Eliminar ${item.product_name}?`}
                          className="text-red-300 hover:text-red-200"
                        >
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
