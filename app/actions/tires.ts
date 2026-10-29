'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { flashError, flashSuccess } from '@/lib/flash';

function tireFields(formData: FormData) {
  return {
    id: Number(formData.get('id')) || null,
    name: String(formData.get('name') ?? '').trim(),
    ci_ruc: String(formData.get('ci_ruc') ?? '').trim(),
    phone: String(formData.get('phone') ?? '').trim(),
    tire_size: String(formData.get('tire_size') ?? '').trim(),
    tire_brand: String(formData.get('tire_brand') ?? '').trim(),
    quantity: Math.max(0, Number(formData.get('quantity')) || 0),
    notes: String(formData.get('notes') ?? '').trim(),
  };
}

export async function saveTire(formData: FormData) {
  const user = await requireUser();
  const fields = tireFields(formData);
  if (!fields.name) redirect(flashError('/cubiertas', 'El nombre del cliente es obligatorio'));

  if (fields.id) {
    await query(
      `UPDATE tire_records
       SET name = $1, ci_ruc = $2, phone = $3, tire_size = $4, tire_brand = $5, quantity = $6, notes = $7
       WHERE id = $8`,
      [
        fields.name,
        fields.ci_ruc,
        fields.phone,
        fields.tire_size,
        fields.tire_brand,
        fields.quantity,
        fields.notes,
        fields.id,
      ],
    );
  } else {
    await query(
      `INSERT INTO tire_records (name, ci_ruc, phone, tire_size, tire_brand, quantity, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        fields.name,
        fields.ci_ruc,
        fields.phone,
        fields.tire_size,
        fields.tire_brand,
        fields.quantity,
        fields.notes,
        user.username,
      ],
    );
  }

  revalidatePath('/cubiertas');
  redirect(flashSuccess('/cubiertas', fields.id ? 'Registro actualizado' : 'Cubierta registrada'));
}

export async function deleteTire(formData: FormData) {
  await requireUser();
  const id = Number(formData.get('id'));
  await query('DELETE FROM tire_records WHERE id = $1', [id]);
  revalidatePath('/cubiertas');
  redirect(flashSuccess('/cubiertas', 'Registro eliminado'));
}
