'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { flashError, flashSuccess } from '@/lib/flash';

function stockFields(formData: FormData) {
  return {
    id: Number(formData.get('id')) || null,
    product_name: String(formData.get('product_name') ?? '').trim(),
    category: String(formData.get('category') ?? '').trim(),
    quantity: Math.max(0, Number(formData.get('quantity')) || 0),
    price: Math.max(0, Number(formData.get('price')) || 0),
    supplier: String(formData.get('supplier') ?? '').trim(),
    section: String(formData.get('section') ?? 'general') === 'garaje14' ? 'garaje14' : 'general',
  };
}

function sectionPath(section: string): string {
  return section === 'garaje14' ? '/stock/garaje14' : '/stock';
}

export async function saveStock(formData: FormData) {
  const user = await requireUser();
  const fields = stockFields(formData);
  const path = sectionPath(fields.section);

  if (fields.section === 'general' && user.role !== 'admin') {
    redirect(flashError(path, 'Sólo el administrador puede modificar este stock'));
  }
  if (fields.section === 'garaje14' && !['admin', 'admin2'].includes(user.role)) {
    redirect(flashError(path, 'No tenés permiso para modificar este stock'));
  }
  if (!fields.product_name) {
    redirect(flashError(path, 'El nombre del producto es obligatorio'));
  }

  if (fields.id) {
    await query(
      `UPDATE stock_items
       SET product_name = $1, category = $2, quantity = $3, price = $4, supplier = $5, section = $6
       WHERE id = $7`,
      [fields.product_name, fields.category, fields.quantity, fields.price, fields.supplier, fields.section, fields.id],
    );
  } else {
    await query(
      `INSERT INTO stock_items (product_name, category, quantity, price, supplier, section)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [fields.product_name, fields.category, fields.quantity, fields.price, fields.supplier, fields.section],
    );
  }

  revalidatePath('/stock');
  revalidatePath('/stock/garaje14');
  redirect(flashSuccess(path, fields.id ? 'Producto actualizado' : 'Producto guardado'));
}

export async function deleteStock(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get('id'));
  const section = String(formData.get('section') ?? 'general');
  const path = sectionPath(section);

  if (section === 'general' && user.role !== 'admin') {
    redirect(flashError(path, 'Sólo el administrador puede modificar este stock'));
  }
  if (section === 'garaje14' && !['admin', 'admin2'].includes(user.role)) {
    redirect(flashError(path, 'No tenés permiso para modificar este stock'));
  }

  await query('DELETE FROM stock_items WHERE id = $1', [id]);
  revalidatePath('/stock');
  revalidatePath('/stock/garaje14');
  redirect(flashSuccess(path, 'Producto eliminado'));
}
