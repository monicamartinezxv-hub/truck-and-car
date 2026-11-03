'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import { canEditPrices, requireUser, type SessionUser } from '@/lib/auth';
import { flashError, flashSuccess } from '@/lib/flash';
import { UNIT_GARAGE, UNIT_MAIN } from '@/lib/tenant';

/**
 * Cada inventario pertenece a una unidad fija: el stock general es de Casa
 * Central y el de artículos es de Garaje 14. Aunque el formulario mande otra
 * `section`, el servidor resuelve la unidad desde esta tabla y filtra siempre
 * por unidad + sección, así los dos inventarios nunca se mezclan.
 */
const SECTION_UNIT: Record<string, string> = {
  general: UNIT_MAIN,
  garaje14: UNIT_GARAGE,
};

function stockFields(formData: FormData) {
  const section = String(formData.get('section') ?? 'general') === 'garaje14' ? 'garaje14' : 'general';
  return {
    id: Number(formData.get('id')) || null,
    product_name: String(formData.get('product_name') ?? '').trim(),
    category: String(formData.get('category') ?? '').trim(),
    quantity: Math.max(0, Number(formData.get('quantity')) || 0),
    price: Math.max(0, Number(formData.get('price')) || 0),
    supplier: String(formData.get('supplier') ?? '').trim(),
    section,
  };
}

function sectionPath(section: string): string {
  return section === 'garaje14' ? '/stock/garaje14' : '/stock';
}

/** Sólo los usuarios de la unidad dueña del inventario (y el admin) lo editan. */
function canWriteSection(section: string, user: SessionUser): boolean {
  if (user.role === 'admin') return true;
  return user.unit === SECTION_UNIT[section];
}

export async function saveStock(formData: FormData) {
  const user = await requireUser();
  const fields = stockFields(formData);
  const unit = SECTION_UNIT[fields.section];
  const path = sectionPath(fields.section);

  if (!canWriteSection(fields.section, user)) {
    redirect(flashError(path, 'No tenés permiso para modificar este inventario'));
  }
  if (!fields.product_name) {
    redirect(flashError(path, 'El nombre del producto es obligatorio'));
  }

  // Los precios base siguen reservados a admin / admin2.
  const canSetPrice = canEditPrices(user.role);

  if (fields.id) {
    await query(
      `UPDATE stock_items
       SET product_name = $1, category = $2, quantity = $3, supplier = $4,
           price = CASE WHEN $5 THEN $6 ELSE price END
       WHERE id = $7 AND unit_id = $8 AND section = $9`,
      [
        fields.product_name,
        fields.category,
        fields.quantity,
        fields.supplier,
        canSetPrice,
        fields.price,
        fields.id,
        unit,
        fields.section,
      ],
    );
  } else {
    await query(
      `INSERT INTO stock_items (product_name, category, quantity, price, supplier, section, unit_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        fields.product_name,
        fields.category,
        fields.quantity,
        canSetPrice ? fields.price : 0,
        fields.supplier,
        fields.section,
        unit,
      ],
    );
  }

  revalidatePath('/stock');
  revalidatePath('/stock/garaje14');
  redirect(flashSuccess(path, fields.id ? 'Producto actualizado' : 'Producto guardado'));
}

export async function deleteStock(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get('id'));
  const section = String(formData.get('section') ?? 'general') === 'garaje14' ? 'garaje14' : 'general';
  const path = sectionPath(section);

  if (!canWriteSection(section, user)) {
    redirect(flashError(path, 'No tenés permiso para modificar este inventario'));
  }

  await query('DELETE FROM stock_items WHERE id = $1 AND unit_id = $2 AND section = $3', [
    id,
    SECTION_UNIT[section],
    section,
  ]);
  revalidatePath('/stock');
  revalidatePath('/stock/garaje14');
  redirect(flashSuccess(path, 'Producto eliminado'));
}
