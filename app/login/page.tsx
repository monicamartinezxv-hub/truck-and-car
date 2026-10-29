import { redirect } from 'next/navigation';
import { Truck } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { loginAction } from '@/app/actions/auth';

const DEMO_USERS = [
  ['admin', '1234', 'Administrador'],
  ['usertaller', '4321', 'Taller'],
  ['usergomeria', '4321', 'Gomería'],
  ['garaje14', '4213', 'Garaje 14'],
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  if (await getSession()) redirect('/');
  const { err } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-dark p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="rounded-2xl bg-accent/15 p-3 text-accent">
            <Truck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black tracking-wide text-white">TRUCK AND CAR</h1>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Gomería · Taller · Administración
          </p>
        </div>

        <form action={loginAction} className="card space-y-4">
          <div>
            <label className="label" htmlFor="username">
              Usuario
            </label>
            <input
              id="username"
              name="username"
              className="input"
              autoComplete="username"
              placeholder="admin"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              autoComplete="current-password"
              placeholder="••••"
              required
            />
          </div>

          {err ? (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {err}
            </p>
          ) : null}

          <button type="submit" className="btn-primary w-full">
            Ingresar
          </button>
        </form>

        <div className="mt-5 rounded-xl border border-surface/50 bg-card/50 p-3 text-xs text-slate-400">
          <p className="mb-1 font-semibold text-slate-300">Usuarios de prueba</p>
          <ul className="grid gap-1">
            {DEMO_USERS.map(([user, pass, label]) => (
              <li key={user} className="flex justify-between gap-2">
                <span className="text-slate-300">
                  {user} · {pass}
                </span>
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
