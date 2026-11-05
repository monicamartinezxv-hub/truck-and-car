import { existsSync } from 'node:fs';
import path from 'node:path';
import { Truck } from 'lucide-react';

/**
 * Isotipo de la marca (el rombo "TC") mostrado en el login.
 * Usa `public/logo-truckcar.png`, que ya viene recortado y con fondo transparente para
 * verse sobre el fondo oscuro. Si el archivo no está, cae al icono del camión.
 */
export default function BrandLogo() {
  const hasLogo = existsSync(path.join(process.cwd(), 'public', 'logo-truckcar.png'));

  if (!hasLogo) {
    return (
      <div className="rounded-2xl bg-accent/15 p-3 text-accent">
        <Truck className="h-8 w-8" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-truckcar.png"
      alt="TRUCK AND CAR"
      className="h-24 w-24 object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)]"
    />
  );
}
