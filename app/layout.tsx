import type { Metadata, Viewport } from 'next';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import './globals.css';

export const metadata: Metadata = {
  title: 'TRUCK AND CAR',
  description: 'Gestión de gomería, taller y cuentas por cobrar',
  applicationName: 'Truck and Car',
  // Habilita la instalación en iOS: pantalla completa y nombre bajo el icono.
  appleWebApp: {
    capable: true,
    title: 'Truck & Car',
    statusBarStyle: 'default',
  },
  // iOS anterior a 16.4 sólo reconoce la etiqueta propia de Apple.
  other: { 'apple-mobile-web-app-capable': 'yes' },
};

export const viewport: Viewport = {
  themeColor: '#111827',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full bg-dark text-slate-100">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
