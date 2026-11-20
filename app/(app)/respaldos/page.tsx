import { DatabaseBackup } from 'lucide-react';
import PageHeader, { EmptyState, Flash } from '@/components/ui';
import SubmitButton from '@/components/SubmitButton';
import { requireModule } from '@/lib/nav';
import { formatBackupSize, listBackups } from '@/lib/backups';
import { formatDateTime } from '@/lib/format';
import { createBackupNow } from '@/app/actions/backups';
import type { FlashParams } from '@/lib/flash';

const KIND_LABELS = { db: 'Base de datos', app: 'Código de la app' };

export default async function BackupsPage({
  searchParams,
}: {
  searchParams: Promise<FlashParams>;
}) {
  await requireModule('/respaldos');
  const { msg, err } = await searchParams;
  const backups = await listBackups();

  return (
    <div>
      <PageHeader
        title="Historial de Respaldos"
        subtitle="Copias de la base de datos y del código · automáticas todos los días a las 23:00"
        actions={
          <form action={createBackupNow}>
            <SubmitButton pendingLabel="Creando copia…">
              <span className="inline-flex items-center gap-2">
                <DatabaseBackup className="h-4 w-4" />
                Crear copia ahora
              </span>
            </SubmitButton>
          </form>
        }
      />

      <Flash success={msg} error={err} />

      <p className="mb-3 text-xs text-slate-400">
        {backups.length === 0
          ? 'Todavía no hay respaldos.'
          : `${backups.length} copia${backups.length === 1 ? '' : 's'} · la última: ${formatDateTime(
              backups[0].createdAt,
            )}`}
      </p>

      <div className="card overflow-x-auto">
        {backups.length === 0 ? (
          <EmptyState message="Sin respaldos todavía. Apretá «Crear copia ahora»." />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Archivo</th>
                <th>Tipo</th>
                <th>Origen</th>
                <th>Fecha</th>
                <th>Tamaño</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={`${backup.kind}-${backup.name}`}>
                  <td className="font-mono text-xs text-slate-300">{backup.name}</td>
                  <td className="text-slate-300">{KIND_LABELS[backup.kind]}</td>
                  <td>
                    <span
                      className={`badge ${
                        backup.automatic
                          ? 'bg-sky-500/15 text-sky-300'
                          : 'bg-emerald-500/15 text-emerald-300'
                      }`}
                    >
                      {backup.automatic ? 'Automático' : 'Manual'}
                    </span>
                  </td>
                  <td className="text-slate-300">{formatDateTime(backup.createdAt)}</td>
                  <td className="text-slate-300">{formatBackupSize(backup.size)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Se conservan las últimas 14 copias de cada tipo. Para restaurar: <code>scripts/restore-db.sh</code>{' '}
        y <code>scripts/restore-app.sh</code>.
      </p>
    </div>
  );
}
