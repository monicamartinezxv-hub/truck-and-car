'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { withTransaction } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { flashError, flashSuccess } from '@/lib/flash';

const METHOD_DEFAULT = 'Efectivo';

function revalidateReceivables() {
  revalidatePath('/cuentas-por-cobrar');
  revalidatePath('/');
  revalidatePath('/caja');
}

export async function registerPayment(formData: FormData) {
  const user = await requireUser();
  const receivableId = Number(formData.get('receivable_id'));
  const method = String(formData.get('payment_method') ?? METHOD_DEFAULT);
  const rawAmount = String(formData.get('amount') ?? '');

  const result = await withTransaction(async (client) => {
    const row = await client.query<{
      id: number;
      client_id: number | null;
      client_name: string;
      balance: number;
      applied_amount: number;
      original_balance: number;
      currency: string;
      paid: boolean;
    }>(
      `SELECT id, client_id, client_name, balance, applied_amount, original_balance, currency, paid
       FROM receivables WHERE id = $1 FOR UPDATE`,
      [receivableId],
    );
    const receivable = row.rows[0];
    if (!receivable) return { error: 'La cuenta no existe' };
    if (receivable.paid) return { error: 'La cuenta ya está cobrada' };

    const balance = Number(receivable.balance);
    const amount = rawAmount === '' ? balance : Number(rawAmount);
    if (!Number.isFinite(amount) || amount <= 0) return { error: 'El monto debe ser mayor a cero' };
    if (amount > balance + 0.001) return { error: 'El monto supera el saldo pendiente' };

    const newBalance = Math.max(0, balance - amount);
    const fullyPaid = newBalance <= 0.001;

    await client.query(
      `UPDATE receivables
       SET balance = $1, applied_amount = applied_amount + $2, paid = $3,
           payment_date = CASE WHEN $3 THEN now() ELSE payment_date END,
           payment_method = CASE WHEN $3 THEN $4 ELSE payment_method END
       WHERE id = $5`,
      [newBalance, amount, fullyPaid, method, receivableId],
    );

    await client.query(
      `INSERT INTO debt_payments
        (client_id, client_name, receivable_id, amount, payment_type, payment_method, currency, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        receivable.client_id,
        receivable.client_name,
        receivableId,
        amount,
        fullyPaid ? 'total' : 'parcial',
        method,
        receivable.currency,
        user.username,
      ],
    );

    return { amount, fullyPaid };
  });

  revalidateReceivables();
  if ('error' in result) redirect(flashError('/cuentas-por-cobrar', result.error ?? 'Error'));
  redirect(
    flashSuccess(
      '/cuentas-por-cobrar',
      result.fullyPaid ? 'Cobro total registrado' : 'Abono registrado',
    ),
  );
}

export async function applyClientPayment(formData: FormData) {
  const user = await requireUser();
  const clientId = Number(formData.get('client_id'));
  const method = String(formData.get('payment_method') ?? METHOD_DEFAULT);
  const amount = Number(formData.get('amount') ?? 0);

  if (!clientId) redirect(flashError('/cuentas-por-cobrar', 'Seleccioná un cliente'));
  if (!Number.isFinite(amount) || amount <= 0) {
    redirect(flashError('/cuentas-por-cobrar', 'El abono debe ser mayor a cero'));
  }

  const result = await withTransaction(async (client) => {
    const rows = await client.query<{
      id: number;
      balance: number;
      currency: string;
      client_name: string;
    }>(
      `SELECT id, balance, currency, client_name
       FROM receivables
       WHERE client_id = $1 AND NOT paid AND balance > 0
       ORDER BY service_date ASC, id ASC
       FOR UPDATE`,
      [clientId],
    );
    const debts = rows.rows;
    if (debts.length === 0) return { error: 'El cliente no tiene deudas pendientes' };

    const total = debts.reduce((sum, debt) => sum + Number(debt.balance), 0);
    if (amount > total + 0.001) {
      return { error: `El abono supera la deuda total (${total})` };
    }

    let remaining = amount;
    for (const debt of debts) {
      if (remaining <= 0) break;
      const applied = Math.min(remaining, Number(debt.balance));
      const newBalance = Math.max(0, Number(debt.balance) - applied);
      await client.query(
        `UPDATE receivables
         SET balance = $1, applied_amount = applied_amount + $2, paid = $3,
             payment_date = CASE WHEN $3 THEN now() ELSE payment_date END,
             payment_method = CASE WHEN $3 THEN $4 ELSE payment_method END
         WHERE id = $5`,
        [newBalance, applied, newBalance <= 0.001, method, debt.id],
      );
      remaining -= applied;
    }

    await client.query(
      `INSERT INTO debt_payments
        (client_id, client_name, receivable_id, amount, payment_type, payment_method, currency, notes, created_by)
       VALUES ($1, $2, NULL, $3, 'parcial', $4, $5, $6, $7)`,
      [
        clientId,
        debts[0].client_name,
        amount,
        method,
        debts[0].currency,
        `Abono aplicado a ${debts.length} cuenta(s)`,
        user.username,
      ],
    );

    return { ok: true };
  });

  revalidateReceivables();
  if ('error' in result) redirect(flashError('/cuentas-por-cobrar', result.error ?? 'Error'));
  redirect(flashSuccess('/cuentas-por-cobrar', 'Abono registrado'));
}
