'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { PoolClient } from 'pg';
import { withTransaction } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { flashError, flashSuccess } from '@/lib/flash';
import { isDateISO, todayISO } from '@/lib/format';
import { CHECKLIST_ITEMS, SERVICE_TO_STOCK_CATEGORY } from '@/lib/constants';

export type JobItemInput = {
  service: string;
  quantity: number;
  unit_price: number;
  stock_item_id?: number | null;
};

function parseItems(raw: FormDataEntryValue | null): JobItemInput[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as JobItemInput[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        service: String(item.service ?? '').trim(),
        quantity: Math.max(1, Number(item.quantity) || 1),
        unit_price: Math.max(0, Number(item.unit_price) || 0),
        stock_item_id: item.stock_item_id ? Number(item.stock_item_id) : null,
      }))
      .filter((item) => item.service !== '');
  } catch {
    return [];
  }
}

function parseChecklist(raw: FormDataEntryValue | null): Record<string, boolean> {
  const checklist: Record<string, boolean> = {};
  let parsed: Record<string, unknown> = {};
  if (typeof raw === 'string' && raw.trim()) {
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      parsed = {};
    }
  }
  for (const item of CHECKLIST_ITEMS) {
    checklist[item] = Boolean(parsed[item]);
  }
  return checklist;
}

function jobFields(formData: FormData) {
  const serviceDate = String(formData.get('service_date') ?? '');
  const endDate = String(formData.get('end_date') ?? '');
  const currency = String(formData.get('currency') ?? 'PYG') === 'USD' ? 'USD' : 'PYG';
  const paymentCondition = String(formData.get('payment_condition') ?? 'Contado') === 'Deuda' ? 'Deuda' : 'Contado';

  return {
    client_id: Number(formData.get('client_id')) || null,
    plate: String(formData.get('plate') ?? '').trim(),
    service_date: isDateISO(serviceDate) ? serviceDate : todayISO(),
    end_date: isDateISO(endDate) ? endDate : null,
    currency,
    payment_condition: paymentCondition,
    notes: String(formData.get('notes') ?? '').trim(),
  };
}

async function deductStock(client: PoolClient, items: JobItemInput[]) {
  for (const item of items) {
    if (item.stock_item_id) {
      await client.query(
        `UPDATE stock_items SET quantity = GREATEST(quantity - $1, 0) WHERE id = $2`,
        [item.quantity, item.stock_item_id],
      );
      continue;
    }
    const category = SERVICE_TO_STOCK_CATEGORY[item.service];
    if (!category) continue;
    const stockRow = await client.query<{ id: number; quantity: number }>(
      `SELECT id, quantity FROM stock_items
       WHERE category = $1 AND section = 'general' AND quantity > 0
       ORDER BY id LIMIT 1`,
      [category],
    );
    const stockItem = stockRow.rows[0];
    if (stockItem) {
      await client.query(
        `UPDATE stock_items SET quantity = GREATEST(quantity - $1, 0) WHERE id = $2`,
        [Math.min(item.quantity, stockItem.quantity), stockItem.id],
      );
    }
  }
}

export async function createJob(formData: FormData) {
  const user = await requireUser();
  const items = parseItems(formData.get('items'));
  const fields = jobFields(formData);

  if (items.length === 0) {
    redirect(flashError('/taller/nuevo', 'Agregá al menos un servicio o artículo'));
  }

  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const checklist = parseChecklist(formData.get('checklist'));

  const jobId = await withTransaction(async (client) => {
    const clientRow = fields.client_id
      ? (
          await client.query<{ name: string; phone: string }>(
            'SELECT name, phone FROM clients WHERE id = $1',
            [fields.client_id],
          )
        ).rows[0]
      : null;

    const description = items.map((item) => item.service).join(', ');

    const inserted = await client.query<{ id: number }>(
      `INSERT INTO jobs
        (client_id, client_name, plate, service_date, end_date, currency, payment_condition,
         total, description, notes, checklist, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)
       RETURNING id`,
      [
        fields.client_id,
        clientRow?.name ?? '',
        fields.plate,
        fields.service_date,
        fields.end_date,
        fields.currency,
        fields.payment_condition,
        total,
        description,
        fields.notes,
        JSON.stringify(checklist),
        user.username,
      ],
    );
    const id = inserted.rows[0].id;

    for (const item of items) {
      await client.query(
        `INSERT INTO job_items (job_id, service, quantity, unit_price, stock_item_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, item.service, item.quantity, item.unit_price, item.stock_item_id ?? null],
      );
    }

    await deductStock(client, items);

    if (fields.payment_condition === 'Deuda' && total > 0) {
      await client.query(
        `INSERT INTO receivables
          (client_id, job_id, client_name, plate, description, service_date, currency,
           original_balance, balance, applied_amount, paid, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, 0, false, $9)`,
        [
          fields.client_id,
          id,
          clientRow?.name ?? '',
          fields.plate,
          description,
          fields.service_date,
          fields.currency,
          total,
          user.username,
        ],
      );
    }

    return id;
  });

  revalidatePath('/taller');
  revalidatePath('/cuentas-por-cobrar');
  revalidatePath('/');
  redirect(flashSuccess(`/taller/${jobId}`, 'Trabajo registrado'));
}

export async function updateJob(formData: FormData) {
  await requireUser();
  const jobId = Number(formData.get('id'));
  if (!jobId) redirect(flashError('/taller', 'Trabajo inválido'));

  const items = parseItems(formData.get('items'));
  if (items.length === 0) {
    redirect(flashError(`/taller/${jobId}`, 'El trabajo necesita al menos un ítem'));
  }
  const fields = jobFields(formData);
  const checklist = parseChecklist(formData.get('checklist'));
  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  await withTransaction(async (client) => {
    const current = await client.query<{ payment_condition: string; client_id: number | null }>(
      'SELECT payment_condition, client_id FROM jobs WHERE id = $1',
      [jobId],
    );
    if (!current.rows[0]) return;

    const description = items.map((item) => item.service).join(', ');
    await client.query(
      `UPDATE jobs SET client_id = $1, plate = $2, service_date = $3, end_date = $4,
         currency = $5, payment_condition = $6, total = $7, description = $8, notes = $9,
         checklist = $10::jsonb
       WHERE id = $11`,
      [
        fields.client_id,
        fields.plate,
        fields.service_date,
        fields.end_date,
        fields.currency,
        fields.payment_condition,
        total,
        description,
        fields.notes,
        JSON.stringify(checklist),
        jobId,
      ],
    );

    await client.query('DELETE FROM job_items WHERE job_id = $1', [jobId]);
    for (const item of items) {
      await client.query(
        `INSERT INTO job_items (job_id, service, quantity, unit_price, stock_item_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [jobId, item.service, item.quantity, item.unit_price, item.stock_item_id ?? null],
      );
    }

    const receivable = await client.query<{ id: number; paid: boolean }>(
      'SELECT id, paid FROM receivables WHERE job_id = $1 ORDER BY id LIMIT 1',
      [jobId],
    );
    const existing = receivable.rows[0];

    if (fields.payment_condition === 'Deuda' && !existing && total > 0) {
      const clientRow = fields.client_id
        ? (
            await client.query<{ name: string }>('SELECT name FROM clients WHERE id = $1', [
              fields.client_id,
            ])
          ).rows[0]
        : null;
      await client.query(
        `INSERT INTO receivables
          (client_id, job_id, client_name, plate, description, service_date, currency,
           original_balance, balance, applied_amount, paid, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, 0, false, 'sistema')`,
        [
          fields.client_id,
          jobId,
          clientRow?.name ?? '',
          fields.plate,
          description,
          fields.service_date,
          fields.currency,
          total,
        ],
      );
    }

    if (existing && !existing.paid && total > 0) {
      await client.query(
        `UPDATE receivables
         SET original_balance = $1, balance = GREATEST($1 - applied_amount, 0), description = $2
         WHERE id = $3`,
        [total, description, existing.id],
      );
    }
  });

  revalidatePath('/taller');
  revalidatePath(`/taller/${jobId}`);
  revalidatePath('/cuentas-por-cobrar');
  redirect(flashSuccess(`/taller/${jobId}`, 'Trabajo actualizado'));
}

export async function deleteJob(formData: FormData) {
  await requireUser();
  const jobId = Number(formData.get('id'));
  if (!jobId) redirect(flashError('/taller', 'Trabajo inválido'));

  await withTransaction(async (client) => {
    await client.query('DELETE FROM receivables WHERE job_id = $1 AND NOT paid', [jobId]);
    await client.query('DELETE FROM jobs WHERE id = $1', [jobId]);
  });

  revalidatePath('/taller');
  revalidatePath('/cuentas-por-cobrar');
  redirect(flashSuccess('/taller', 'Trabajo eliminado'));
}

