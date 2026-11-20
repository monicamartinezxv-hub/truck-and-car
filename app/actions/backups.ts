'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { runBackup } from '@/lib/backups';
import { flashError, flashSuccess } from '@/lib/flash';

/** Botón "Crear copia ahora" del Historial de Respaldos. */
export async function createBackupNow() {
  await requireAdmin();

  const result = await runBackup();
  revalidatePath('/respaldos');

  if (!result.ok) {
    redirect(flashError('/respaldos', `No se pudo crear el respaldo: ${result.message}`));
  }
  redirect(flashSuccess('/respaldos', 'Respaldo creado'));
}
