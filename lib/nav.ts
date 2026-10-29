import type { Role } from './auth';

export type NavItem = {
  href: string;
  label: string;
  roles: Role[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', roles: ['admin', 'admin2', 'user'] },
  { href: '/clientes', label: 'Gestión de Clientes', roles: ['admin', 'admin2', 'user'] },
  { href: '/taller', label: 'Gomería / Taller', roles: ['admin', 'admin2', 'user'] },
  { href: '/cuentas-por-cobrar', label: 'Cuentas por Cobrar', roles: ['admin', 'admin2', 'user'] },
  { href: '/cubiertas', label: 'Stock de Cubiertas', roles: ['admin', 'admin2', 'user'] },
  { href: '/stock', label: 'Stock e Inventario', roles: ['admin'] },
  { href: '/stock/garaje14', label: 'Stock de Artículos', roles: ['admin', 'admin2', 'user'] },
  { href: '/caja', label: 'Caja y Ventas', roles: ['admin', 'admin2', 'user'] },
  { href: '/funcionarios', label: 'Funcionarios', roles: ['admin'] },
  { href: '/informes', label: 'Informes y Reportes', roles: ['admin'] },
  { href: '/usuarios', label: 'Usuarios', roles: ['admin'] },
];

// El taller de Garaje 14 sólo trabaja con los módulos básicos del taller.
const GARAGE_MAINTENANCE_USERS = ['garaje14', 'admin2'];
const GARAGE_ALLOWED = ['/', '/clientes', '/taller', '/caja', '/stock/garaje14'];

export function visibleNav(username: string, role: Role): NavItem[] {
  const restricted = GARAGE_MAINTENANCE_USERS.includes(username);
  return NAV_ITEMS.filter((item) => {
    if (!item.roles.includes(role)) return false;
    if (restricted && !GARAGE_ALLOWED.includes(item.href)) return false;
    return true;
  });
}

export function canAccess(username: string, role: Role, href: string): boolean {
  return visibleNav(username, role).some((item) => item.href === href);
}
