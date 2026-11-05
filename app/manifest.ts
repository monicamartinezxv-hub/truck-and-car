import type { MetadataRoute } from 'next';

/**
 * Manifiesto de la PWA (Next lo publica en `/manifest.webmanifest` y agrega el <link>).
 * Permite instalar la app en Android y en iOS (Agregar a pantalla de inicio).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Truck and Car',
    short_name: 'Truck & Car',
    description: 'Gestión de gomería, taller y cuentas por cobrar',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#111827',
    theme_color: '#111827',
    lang: 'es',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
