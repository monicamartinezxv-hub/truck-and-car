'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { one, query, withTransaction } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { flashError, flashSuccess } from '@/lib/flash';

export async function openCash(formData: FormData) {
  const user = await requireUser();
  const amount = Math.max(0, Number(formData.get('opening_amount')) || 0);

  const existing = await one<{ id: number }>(
    `SELECT id FROM cash_sessions WHERE owner_username = $1 AND status = 'open' LIMIT 1`,
    [user.username],
  );
  if (existing) redirect(flashError('/caja', 'La caja ya está abierta'));

  await query(
    `INSERT INTO cash_sessions (owner_username, opening_amount, status) VALUES ($1, $2, 'open')`,
    [user.username, amount],
  );

  revalidatePath('/caja');
  redirect(flashSuccess('/caja', 'Caja abierta'));
}

export async function closeCash() {
  const user = await requireUser();

  const session = await one<{ id: number; opening_amount: number; opened_at: string }>(
    `SELECT id, opening_amount, opened_at FROM cash_sessions
     WHERE owner_username = $1 AND status = 'open'
     ORDER BY opened_at DESC LIMIT 1`,
    [user.username],
  );
  if (!session) redirect(flashError('/caja', 'No hay una caja abierta'));

  const cashIn = await one<{ total: number }>(
    `SELECT
       COALESCE((SELECT sum(amount) FROM sales
                 WHERE created_by = $1 AND payment_method = 'Efectivo' AND created_at >= $2), 0)
     + COALESCE((SELECT sum(total) FROM jobs
                 WHERE created_by = $1 AND payment_condition = 'Contado'
                   AND created_at >= $2), 0)
     + COALESCE((SELECT sum(amount) FROM debt_payments
                 WHERE created_by = $1 AND payment_method = 'Efectivo' AND created_at >= $2), 0) AS total`,
    [user.username, session.opened_at],
  );

  const closing = Number(session.opening_amount) + Number(cashIn?.total ?? 0);

  await query(
    `UPDATE cash_sessions SET status = 'closed', closing_amount = $1, closed_at = now() WHERE id = $2`,
    [closing, session.id],
  );

  revalidatePath('/caja');
  redirect(flashSuccess('/caja', 'Caja cerrada'));
}

export async function registerSale(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get('name') ?? '').trim();
  const amount = Number(formData.get('amount'));
  const currency = String(formData.get('currency') ?? 'PYG') === 'USD' ? 'USD' : 'PYG';
  const paymentMethod = String(formData.get('payment_method') ?? 'Efectivo');
  const description = String(formData.get('description') ?? '').trim() || 'Venta general';
  const ciRuc = String(formData.get('ci_ruc') ?? '').trim();
  const stockItemId = Number(formData.get('stock_item_id')) || null;

  if (!name) redirect(flashError('/caja', 'El nombre es obligatorio'));
  if (!Number.isFinite(amount) || amount <= 0) {
    redirect(flashError('/caja', 'El monto debe ser mayor a 0'));
  }

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO sales (client_name, ci_ruc, description, amount, currency, payment_method, stock_item_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [name, ciRuc, description, amount, currency, paymentMethod, stockItemId, user.username],
    );

    if (stockItemId) {
      await client.query(
        `UPDATE stock_items SET quantity = GREATEST(quantity - 1, 0) WHERE id = $1`,
        [stockItemId],
      );
    }
  });

  revalidatePath('/caja');
  revalidatePath('/stock');
  redirect(flashSuccess('/caja', 'Venta registrada'));
}
