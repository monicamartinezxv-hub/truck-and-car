import { existsSync } from 'node:fs';
import path from 'node:path';
import { Truck } from 'lucide-react';

/**
 * Logo de la marca mostrado en el login.
 * Usa `public/logo-truckcar.png`; si el archivo todavía no está, muestra el icono del camión
 * para no dejar una imagen rota.
 */
export default function BrandLogo() {
  const hasLogo = existsSync(path.join(process.cwd(), 'public', 'logo-truckcar.png'));

  if (!hasLogo) return <Truck className="h-8 w-8" />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-truckcar.png"
      alt="TRUCK AND CAR"
      className="h-14 w-auto max-w-[190px] object-contain"
    />
  );
}
