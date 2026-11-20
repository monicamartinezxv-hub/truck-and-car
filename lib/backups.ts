import { spawn } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(ROOT, 'backups');

export type BackupKind = 'db' | 'app';

export type BackupEntry = {
  name: string;
  kind: BackupKind;
  size: number;
  createdAt: Date;
  automatic: boolean;
};

async function listFolder(kind: BackupKind, folder: string): Promise<BackupEntry[]> {
  const dir = path.join(BACKUP_DIR, folder);
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }

  const entries = await Promise.all(
    names.map(async (name): Promise<BackupEntry | null> => {
      const info = await stat(path.join(dir, name)).catch(() => null);
      if (!info || !info.isFile()) return null;
      return {
        name,
        kind,
        size: info.size,
        createdAt: info.mtime,
        automatic: name.includes('-auto-'),
      };
    }),
  );

  return entries.filter((entry): entry is BackupEntry => entry !== null);
}

/** Respaldos de base y de código, del más nuevo al más viejo. */
export async function listBackups(): Promise<BackupEntry[]> {
  const [db, app] = await Promise.all([listFolder('db', 'db'), listFolder('app', 'app')]);
  return [...db, ...app].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export type BackupResult = { ok: boolean; message: string };

/**
 * Crea un respaldo completo (base + código) con el mismo script que usa el
 * servicio automático. Devuelve el resultado para mostrarlo como aviso.
 */
export function runBackup(): Promise<BackupResult> {
  return new Promise((resolve) => {
    const child = spawn('sh', [path.join(ROOT, 'scripts', 'backup-run.sh'), 'all'], {
      cwd: ROOT,
      env: {
        ...process.env,
        APP_ROOT: ROOT,
        BACKUP_DIR,
        BACKUP_ORIGIN: 'manual',
      },
    });

    let output = '';
    child.stdout.on('data', (chunk) => {
      output += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      output += String(chunk);
    });
    child.on('error', (error) => resolve({ ok: false, message: error.message }));
    child.on('close', (code) => {
      const lines = output.trim().split('\n').filter(Boolean);
      resolve({
        ok: code === 0,
        message:
          code === 0 ? lines.join(' · ') : (lines[lines.length - 1] ?? 'error desconocido'),
      });
    });
  });
}

export function formatBackupSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
