'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { one, query } from '@/lib/db';
import { hashPassword, requireAdmin } from '@/lib/auth';
import { flashError, flashSuccess } from '@/lib/flash';

function normalizeRole(value: FormDataEntryValue | null): string {
  return value === 'admin' || value === 'admin2' ? value : 'user';
}

export async function createUser(formData: FormData) {
  await requireAdmin();
  const username = String(formData.get('username') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const role = normalizeRole(formData.get('role'));
  const label = String(formData.get('label') ?? '').trim() || username;

  if (!username || password.length < 4) {
    redirect(flashError('/usuarios', 'Usuario obligatorio y contraseña de al menos 4 caracteres'));
  }

  const existing = await one<{ id: number }>('SELECT id FROM users WHERE lower(username) = $1', [username]);
  if (existing) redirect(flashError('/usuarios', 'Ese usuario ya existe'));

  await query(
    'INSERT INTO users (username, password_hash, role, label) VALUES ($1, $2, $3, $4)',
    [username, hashPassword(password), role, label],
  );

  revalidatePath('/usuarios');
  redirect(flashSuccess('/usuarios', `Usuario ${username} creado`));
}

export async function updateUser(formData: FormData) {
  const session = await requireAdmin();
  const id = Number(formData.get('id'));
  const role = normalizeRole(formData.get('role'));
  const label = String(formData.get('label') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  const target = await one<{ username: string }>('SELECT username FROM users WHERE id = $1', [id]);
  if (!target) redirect(flashError('/usuarios', 'Usuario inexistente'));

  await query('UPDATE users SET role = $1, label = $2 WHERE id = $3', [role, label || target.username, id]);

  if (password) {
    if (password.length < 4) {
      redirect(flashError('/usuarios', 'La contraseña debe tener al menos 4 caracteres'));
    }
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashPassword(password), id]);
  }

  revalidatePath('/usuarios');
  redirect(flashSuccess('/usuarios', `Usuario ${target.username} actualizado por ${session.username}`));
}

export async function deleteUser(formData: FormData) {
  const session = await requireAdmin();
  const id = Number(formData.get('id'));

  const target = await one<{ username: string }>('SELECT username FROM users WHERE id = $1', [id]);
  if (!target) redirect(flashError('/usuarios', 'Usuario inexistente'));
  if (target.username === session.username) {
    redirect(flashError('/usuarios', 'No podés eliminar tu propio usuario'));
  }

  await query('DELETE FROM users WHERE id = $1', [id]);
  revalidatePath('/usuarios');
  redirect(flashSuccess('/usuarios', `Usuario ${target.username} eliminado`));
}
