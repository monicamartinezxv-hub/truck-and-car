import BrandLogo from '@/components/BrandLogo';

export const metadata = { title: 'Sin conexión — TRUCK AND CAR' };

/** Página que muestra el service worker cuando no hay red (queda precacheada). */
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-dark p-6 text-center">
      <BrandLogo />
      <h1 className="text-xl font-black tracking-wide text-white">Sin conexión</h1>
      <p className="max-w-xs text-sm text-slate-400">
        No pudimos conectar con el servidor. Revisá la conexión del celular y volvé a intentar.
      </p>
      <a href="/" className="btn-primary">
        Reintentar
      </a>
    </main>
  );
}
