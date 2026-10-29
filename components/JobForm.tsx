'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { CHECKLIST_ITEMS, CURRENCIES, PAYMENT_CONDITIONS } from '@/lib/constants';
import { formatMoney } from '@/lib/format';

export type ClientOption = { id: number; name: string; plate: string };
export type StockOption = {
  id: number;
  product_name: string;
  category: string;
  quantity: number;
  price: number;
};

export type ItemDraft = {
  key: string;
  service: string;
  quantity: number;
  unit_price: number;
  stock_item_id: number | null;
};

export type JobInitial = {
  id: number;
  client_id: number | null;
  plate: string;
  service_date: string;
  end_date: string;
  currency: string;
  payment_condition: string;
  notes: string;
  checklist: Record<string, boolean>;
  items: ItemDraft[];
};

const newKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `k-${Date.now()}-${Math.random()}`;

export default function JobForm({
  action,
  clients,
  stock,
  services,
  initial,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  clients: ClientOption[];
  stock: StockOption[];
  services: string[];
  initial?: JobInitial;
  submitLabel: string;
}) {
  const [items, setItems] = useState<ItemDraft[]>(initial?.items ?? []);
  const [checklist, setChecklist] = useState<Record<string, boolean>>(initial?.checklist ?? {});
  const [clientId, setClientId] = useState<string>(
    initial?.client_id ? String(initial.client_id) : '',
  );
  const [plate, setPlate] = useState(initial?.plate ?? '');

  const [service, setService] = useState(services[0] ?? '');
  const [serviceQty, setServiceQty] = useState('1');
  const [servicePrice, setServicePrice] = useState('');
  const [articleId, setArticleId] = useState('');
  const [articleQty, setArticleQty] = useState('1');

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
    [items],
  );

  const addService = () => {
    if (!service) return;
    setItems((current) => [
      ...current,
      {
        key: newKey(),
        service,
        quantity: Math.max(1, Number(serviceQty) || 1),
        unit_price: Math.max(0, Number(servicePrice) || 0),
        stock_item_id: null,
      },
    ]);
    setServiceQty('1');
    setServicePrice('');
  };

  const addArticle = () => {
    const selected = stock.find((entry) => String(entry.id) === articleId);
    if (!selected) return;
    const quantity = Math.min(Math.max(1, Number(articleQty) || 1), Math.max(selected.quantity, 1));
    setItems((current) => [
      ...current,
      {
        key: newKey(),
        service: `Artículo: ${selected.product_name}`,
        quantity,
        unit_price: Number(selected.price) || 0,
        stock_item_id: selected.id,
      },
    ]);
    setArticleId('');
    setArticleQty('1');
  };

  const updateItem = (key: string, patch: Partial<ItemDraft>) => {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  };

  const removeItem = (key: string) =>
    setItems((current) => current.filter((item) => item.key !== key));

  const onClientChange = (value: string) => {
    setClientId(value);
    const option = clients.find((client) => String(client.id) === value);
    if (option?.plate) setPlate(option.plate);
  };

  return (
    <form action={action} className="space-y-4">
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(
          items.map((item) => ({
            service: item.service,
            quantity: item.quantity,
            unit_price: item.unit_price,
            stock_item_id: item.stock_item_id,
          })),
        )}
      />
      <input type="hidden" name="checklist" value={JSON.stringify(checklist)} />

      <section className="card">
        <h2 className="card-title">Datos del trabajo</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="label" htmlFor="client_id">
              Cliente
            </label>
            <select
              id="client_id"
              name="client_id"
              className="input"
              value={clientId}
              onChange={(event) => onClientChange(event.target.value)}
            >
              <option value="">Sin cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="plate">
              Chapa / Placa
            </label>
            <input
              id="plate"
              name="plate"
              className="input"
              value={plate}
              onChange={(event) => setPlate(event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="service_date">
              Fecha de inicio *
            </label>
            <input
              id="service_date"
              name="service_date"
              type="date"
              className="input"
              defaultValue={initial?.service_date ?? new Date().toISOString().slice(0, 10)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="end_date">
              Fecha de fin
            </label>
            <input
              id="end_date"
              name="end_date"
              type="date"
              className="input"
              defaultValue={initial?.end_date ?? ''}
            />
          </div>
          <div>
            <label className="label" htmlFor="currency">
              Moneda
            </label>
            <select id="currency" name="currency" className="input" defaultValue={initial?.currency ?? 'PYG'}>
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="payment_condition">
              Condición de pago
            </label>
            <select
              id="payment_condition"
              name="payment_condition"
              className="input"
              defaultValue={initial?.payment_condition ?? 'Contado'}
            >
              {PAYMENT_CONDITIONS.map((condition) => (
                <option key={condition} value={condition}>
                  {condition}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Servicios y artículos</h2>

        <div className="grid gap-2 sm:grid-cols-[2fr_auto_auto_auto] sm:items-end">
          <div>
            <label className="label" htmlFor="service">
              Servicio
            </label>
            <select
              id="service"
              className="input"
              value={service}
              onChange={(event) => setService(event.target.value)}
            >
              {services.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="service_qty">
              Cant.
            </label>
            <input
              id="service_qty"
              type="number"
              min="1"
              className="input w-20"
              value={serviceQty}
              onChange={(event) => setServiceQty(event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="service_price">
              Precio
            </label>
            <input
              id="service_price"
              type="number"
              min="0"
              step="any"
              className="input w-28"
              value={servicePrice}
              onChange={(event) => setServicePrice(event.target.value)}
            />
          </div>
          <button type="button" onClick={addService} className="btn-secondary">
            <Plus className="h-4 w-4" />
            Agregar servicio
          </button>
        </div>

        <div className="mt-3 grid gap-2 border-t border-surface/60 pt-3 sm:grid-cols-[2fr_auto_auto] sm:items-end">
          <div>
            <label className="label" htmlFor="article">
              Artículo de stock
            </label>
            <select
              id="article"
              className="input"
              value={articleId}
              onChange={(event) => setArticleId(event.target.value)}
            >
              <option value="">Seleccionar artículo…</option>
              {stock.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.product_name} · {entry.quantity} disp. · {formatMoney(entry.price)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="article_qty">
              Cant.
            </label>
            <input
              id="article_qty"
              type="number"
              min="1"
              className="input w-20"
              value={articleQty}
              onChange={(event) => setArticleQty(event.target.value)}
            />
          </div>
          <button type="button" onClick={addArticle} className="btn-secondary">
            <Plus className="h-4 w-4" />
            Agregar artículo
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          {items.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">Todavía no agregaste ítems</p>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Detalle</th>
                  <th className="w-24">Cant.</th>
                  <th className="w-32">Precio</th>
                  <th className="w-32 text-right">Subtotal</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.key}>
                    <td className="text-slate-200">
                      {item.service}
                      {item.stock_item_id ? (
                        <span className="ml-2 badge bg-blue-500/15 text-blue-300">stock</span>
                      ) : null}
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        className="input px-2 py-1"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(item.key, { quantity: Math.max(1, Number(event.target.value) || 1) })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className="input px-2 py-1"
                        value={item.unit_price}
                        onChange={(event) =>
                          updateItem(item.key, { unit_price: Math.max(0, Number(event.target.value) || 0) })
                        }
                      />
                    </td>
                    <td className="text-right font-semibold text-slate-200">
                      {formatMoney(item.quantity * item.unit_price)}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => removeItem(item.key)}
                        className="text-red-300 hover:text-red-200"
                        aria-label="Quitar ítem"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="mt-3 text-right text-sm text-slate-400">
          Total:{' '}
          <span className="text-lg font-bold text-accent">{formatMoney(total)}</span>
        </p>
      </section>

      <section className="card">
        <h2 className="card-title">Checklist de revisión</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CHECKLIST_ITEMS.map((entry) => (
            <label key={entry} className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-surface bg-dark"
                checked={Boolean(checklist[entry])}
                onChange={(event) =>
                  setChecklist((current) => ({ ...current, [entry]: event.target.checked }))
                }
              />
              {entry}
            </label>
          ))}
        </div>
        <div className="mt-4">
          <label className="label" htmlFor="notes">
            Observaciones
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="input"
            defaultValue={initial?.notes ?? ''}
          />
        </div>
      </section>

      <button type="submit" className="btn-primary">
        {submitLabel}
      </button>
    </form>
  );
}
