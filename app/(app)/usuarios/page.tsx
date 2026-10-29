import { Plus, Trash2 } from 'lucide-react';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import PageHeader, { EmptyState, Flash } from '@/components/ui';
import ConfirmButton from '@/components/ConfirmButton';
import { createUser, deleteUser, updateUser } from '@/app/actions/users';
import type { FlashParams } from '@/lib/flash';

type UserRow = {
  id: number;
  username: string;
  role: string;
  label: string;
  created_at: string;
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  admin2: 'Administrador Garaje 14',
  user: 'Operador',
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<FlashParams>;
}) {
  const session = await requireAdmin();
  const { msg, err } = await searchParams;

  const users = await query<UserRow>(
    'SELECT id, username, role, label, created_at FROM users ORDER BY username',
  );

  return (
    <div>
      <PageHeader title="Usuarios y Contraseñas" subtitle="Accesos al sistema y roles" />
      <Flash success={msg} error={err} />

      <details className="panel mb-5">
        <summary>
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nuevo usuario
          </span>
        </summary>
        <div className="border-t border-surface/60 p-4">
          <form action={createUser} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <div>
              <label className="label" htmlFor="username">
                Usuario *
              </label>
              <input id="username" name="username" className="input" required />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Contraseña *
              </label>
              <input id="password" name="password" type="password" className="input" required minLength={4} />
            </div>
            <div>
              <label className="label" htmlFor="label">
                Nombre visible
              </label>
              <input id="label" name="label" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="role">
                Rol
              </label>
              <select id="role" name="role" className="input">
                <option value="user">Operador</option>
                <option value="admin2">Administrador Garaje 14</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <button type="submit" className="btn-primary lg:col-span-4 lg:w-fit">
              Crear usuario
            </button>
          </form>
        </div>
      </details>

      <div className="card overflow-x-auto">
        {users.length === 0 ? (
          <EmptyState message="Sin usuarios" />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nombre visible</th>
                <th>Rol</th>
                <th>Creado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="font-medium text-slate-100">
                    {user.username}
                    {user.username === session.username ? (
                      <span className="ml-2 badge bg-sky-500/15 text-sky-300">vos</span>
                    ) : null}
                  </td>
                  <td className="text-slate-300">{user.label}</td>
                  <td>
                    <span className="badge bg-surface/70 text-slate-200">
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="text-slate-500">{formatDate(user.created_at)}</td>
                  <td>
                    <div className="flex items-center justify-end gap-3">
                      <details>
                        <summary className="cursor-pointer text-xs font-semibold text-sky-300">Editar</summary>
                        <form action={updateUser} className="mt-2 grid gap-2 sm:grid-cols-4">
                          <input type="hidden" name="id" value={user.id} />
                          <input name="label" defaultValue={user.label} className="input px-2 py-1" placeholder="Nombre" />
                          <select name="role" defaultValue={user.role} className="input px-2 py-1">
                            <option value="user">Operador</option>
                            <option value="admin2">Administrador Garaje 14</option>
                            <option value="admin">Administrador</option>
                          </select>
                          <input
                            name="password"
                            type="password"
                            className="input px-2 py-1"
                            placeholder="Nueva contraseña"
                            minLength={4}
                          />
                          <button type="submit" className="btn-primary px-2 py-1 text-xs">
                            Guardar
                          </button>
                        </form>
                      </details>

                      {user.username === session.username ? null : (
                        <form action={deleteUser}>
                          <input type="hidden" name="id" value={user.id} />
                          <ConfirmButton
                            message={`¿Eliminar al usuario ${user.username}?`}
                            className="text-red-300 hover:text-red-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </ConfirmButton>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
