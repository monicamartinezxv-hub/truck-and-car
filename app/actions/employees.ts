'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { flashError, flashSuccess } from '@/lib/flash';

export async function saveEmployee(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id')) || null;
  const fields = {
    first_name: String(formData.get('first_name') ?? '').trim(),
    last_name: String(formData.get('last_name') ?? '').trim(),
    ci_ruc: String(formData.get('ci_ruc') ?? '').trim(),
    phone: String(formData.get('phone') ?? '').trim(),
    address: String(formData.get('address') ?? '').trim(),
    age: Number(formData.get('age')) || null,
    debt: Math.max(0, Number(formData.get('debt')) || 0),
  };

  if (!fields.first_name) redirect(flashError('/funcionarios', 'El nombre es obligatorio'));

  if (id) {
    await query(
      `UPDATE employees SET first_name = $1, last_name = $2, ci_ruc = $3, phone = $4,
         address = $5, age = $6, debt = $7 WHERE id = $8`,
      [fields.first_name, fields.last_name, fields.ci_ruc, fields.phone, fields.address, fields.age, fields.debt, id],
    );
  } else {
    await query(
      `INSERT INTO employees (first_name, last_name, ci_ruc, phone, address, age, debt)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [fields.first_name, fields.last_name, fields.ci_ruc, fields.phone, fields.address, fields.age, fields.debt],
    );
  }

  revalidatePath('/funcionarios');
  redirect(flashSuccess('/funcionarios', id ? 'Funcionario actualizado' : 'Funcionario guardado'));
}

export async function deleteEmployee(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  await query('DELETE FROM employees WHERE id = $1', [id]);
  revalidatePath('/funcionarios');
  redirect(flashSuccess('/funcionarios', 'Funcionario eliminado'));
}

export async function addProduction(formData: FormData) {
  await requireAdmin();
  const employeeId = Number(formData.get('employee_id'));
  const description = String(formData.get('description') ?? '').trim();
  const cost = Number(formData.get('cost')) || 0;

  if (!employeeId || !description) {
    redirect(flashError('/funcionarios', 'Completá la descripción de la producción'));
  }

  await query(
    `INSERT INTO production_entries (employee_id, description, cost) VALUES ($1, $2, $3)`,
    [employeeId, description, Math.max(0, cost)],
  );

  revalidatePath('/funcionarios');
  redirect(flashSuccess('/funcionarios', 'Producción registrada'));
}

export async function deleteProduction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  await query('DELETE FROM production_entries WHERE id = $1', [id]);
  revalidatePath('/funcionarios');
  redirect(flashSuccess('/funcionarios', 'Registro de producción eliminado'));
}
