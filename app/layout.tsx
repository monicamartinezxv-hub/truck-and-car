import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TRUCK AND CAR',
  description: 'Gestión de gomería, taller y cuentas por cobrar',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full bg-dark text-slate-100">{children}</body>
    </html>
  );
}
