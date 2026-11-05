import { redirect } from 'next/navigation';
import { requireUser, type Role, type SessionUser } from './auth';
import { workshopLabel } from './permissions';

export type NavItem = {
  href: string;
  label: string;
  roles: Role[];
};

/** Inventarios separados: uno por unidad de negocio. */
export const STOCK_MAIN_HREF = '/stock';
export const STOCK_GARAGE_HREF = '/stock/garaje14';

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', roles: ['admin', 'admin2', 'user'] },
  { href: '/clientes', label: 'Gestión de Clientes', roles: ['admin', 'admin2', 'user'] },
  { href: '/taller', label: 'Gomería / Taller', roles: ['admin', 'admin2', 'user'] },
  { href: '/cuentas-por-cobrar', label: 'Cuentas por Cobrar', roles: ['admin', 'admin2', 'user'] },
  { href: '/cubiertas', label: 'Stock de Cubiertas', roles: ['admin', 'admin2', 'user'] },
  { href: STOCK_MAIN_HREF, label: 'Stock e Inventario', roles: ['admin', 'user'] },
  { href: STOCK_GARAGE_HREF, label: 'Stock de Artículos', roles: ['admin', 'admin2', 'user'] },
  { href: '/caja', label: 'Caja y Ventas', roles: ['admin', 'admin2', 'user'] },
  { href: '/funcionarios', label: 'Funcionarios', roles: ['admin'] },
  { href: '/informes', label: 'Informes y Reportes', roles: ['admin', 'admin2'] },
  { href: '/usuarios', label: 'Usuarios', roles: ['admin'] },
];

/** Módulos de Garaje 14: son los mismos para garaje14 y para admin2. */
const GARAGE_MODULES = ['/', '/clientes', '/taller', '/caja', STOCK_GARAGE_HREF];

/** admin2 es el encargado de Garaje 14 (rol propio o usuario homónimo). */
function isGarageManager(username: string, role: Role): boolean {
  return username === 'admin2' || role === 'admin2';
}

function isGarageProfile(username: string, role: Role): boolean {
  return username === 'garaje14' || isGarageManager(username, role);
}

function allowedHrefs(username: string, role: Role): string[] {
  // El administrador principal conserva todos los módulos, sin restricciones.
  if (role === 'admin') return NAV_ITEMS.map((item) => item.href);

  if (isGarageProfile(username, role)) {
    // admin2 tiene los módulos de Garaje 14 más control de caja en Informes.
    return isGarageManager(username, role) ? [...GARAGE_MODULES, '/informes'] : GARAGE_MODULES;
  }

  // Operarios de Casa Central: inventario general, nunca el stock de Garaje 14
  // (ni los módulos de administración, que sus roles no incluyen).
  return NAV_ITEMS.filter(
    (item) => item.roles.includes(role) && item.href !== STOCK_GARAGE_HREF,
  ).map((item) => item.href);
}

export function visibleNav(username: string, role: Role): NavItem[] {
  const allowed = allowedHrefs(username, role);
  return NAV_ITEMS.filter((item) => allowed.includes(item.href)).map((item) => {
    // Garaje 14 y admin2 ven el módulo de trabajos como "Mantenimiento".
    if (item.href === '/taller') return { ...item, label: workshopLabel({ username, role }) };
    if (item.href === '/informes' && role !== 'admin') return { ...item, label: 'Informes' };
    return item;
  });
}

export function canAccess(username: string, role: Role, href: string): boolean {
  const path = href.split('?')[0];
  // Se resuelve el módulo por el prefijo MÁS LARGO del menú, así `/stock/garaje14`
  // no hereda el permiso de `/stock` (son inventarios distintos).
  const module = NAV_ITEMS.map((item) => item.href)
    .filter((item) => path === item || path.startsWith(`${item}/`))
    .sort((a, b) => b.length - a.length)[0];
  return module ? allowedHrefs(username, role).includes(module) : false;
}

/** Página de inicio tras el login: todos los perfiles entran al dashboard. */
export function homeHref(): string {
  return '/';
}

/**
 * Guarda de ruta: además de exigir sesión, bloquea los módulos que el menú
 * no muestra para ese usuario (acceso directo por URL incluido).
 */
export async function requireModule(href: string): Promise<SessionUser> {
  const session = await requireUser();
  if (!canAccess(session.username, session.role, href)) {
    redirect(homeHref());
  }
  return session;
}
