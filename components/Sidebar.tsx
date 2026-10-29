'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Banknote,
  BarChart3,
  Boxes,
  CircleDot,
  CreditCard,
  HardHat,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Truck,
  UserCog,
  Users,
  Wrench,
} from 'lucide-react';
import type { SessionUser } from '@/lib/auth';
import type { NavItem } from '@/lib/nav';

const ICONS: Record<string, typeof Truck> = {
  '/': LayoutDashboard,
  '/clientes': Users,
  '/taller': Wrench,
  '/cuentas-por-cobrar': CreditCard,
  '/cubiertas': CircleDot,
  '/stock': Package,
  '/stock/garaje14': Boxes,
  '/caja': Banknote,
  '/funcionarios': HardHat,
  '/informes': BarChart3,
  '/usuarios': UserCog,
};

export default function Sidebar({ user, items }: { user: SessionUser; items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  const links = (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const Icon = ICONS[item.href] ?? Package;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
              active
                ? 'bg-surface/70 font-semibold text-accent'
                : 'text-slate-300 hover:bg-surface/40 hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <div className="flex items-center justify-between border-b border-surface/60 bg-card px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-accent" />
          <span className="text-sm font-black tracking-wide">TRUCK AND CAR</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="btn-secondary px-2 py-1.5"
          aria-expanded={open}
          aria-label="Menú"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {open ? (
        <div className="border-b border-surface/60 bg-card p-3 lg:hidden">{links}</div>
      ) : null}

      <aside className="hidden w-64 shrink-0 flex-col border-r border-surface/60 bg-card px-3 py-5 lg:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <Truck className="h-6 w-6 text-accent" />
          <div>
            <p className="text-sm font-black tracking-wide text-white">TRUCK AND CAR</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Gomería · Taller</p>
          </div>
        </div>

        {links}

        <div className="mt-auto space-y-3 border-t border-surface/60 pt-4">
          <div className="px-2">
            <p className="text-sm font-semibold text-white">{user.username}</p>
            <p className="text-xs text-slate-400">{user.label}</p>
          </div>
          <form method="post" action="/api/logout">
            <button type="submit" className="btn-secondary w-full justify-start px-2 py-1.5 text-xs">
              <LogOut className="h-3.5 w-3.5" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
