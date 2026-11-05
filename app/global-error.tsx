'use client';

import './globals.css';

export default function GlobalError() {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full bg-dark text-slate-100">
        <main className="flex min-h-screen items-center justify-center p-4">
          <div className="card w-full max-w-sm space-y-3 text-center">
            <h1 className="text-lg font-bold text-white">La página necesita recargarse</h1>
            <p className="text-xs text-slate-400">
              Se actualizó la aplicación mientras la ventana estaba abierta. Recargá para continuar.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-primary w-full"
            >
              Recargar
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
