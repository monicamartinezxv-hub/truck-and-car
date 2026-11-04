import { redirect } from 'next/navigation';
import BrandLogo from '@/components/BrandLogo';
import { getSession } from '@/lib/auth';

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
          <BrandLogo />
          <h1 className="text-2xl font-black tracking-wide text-white">TRUCK AND CAR</h1>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Gomería · Taller · Administración
          </p>
        </div>

        <form method="post" action="/api/login" className="card space-y-4">
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
      </div>
    </main>
  );
}
