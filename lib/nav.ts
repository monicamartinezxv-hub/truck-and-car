import { redirect } from 'next/navigation';
import { requireUser, type Role, type SessionUser } from './auth';

export type NavItem = {
  href: string;
  label: string;
  roles: Role[];
};

/** Módulo exclusivo del encargado de Garaje 14 (admin2). */
export const CASH_CLOSE_HREF = '/cierre-caja';

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
  { href: '/informes', label: 'Informes y Reportes', roles: ['admin'] },
  { href: '/usuarios', label: 'Usuarios', roles: ['admin'] },
  { href: CASH_CLOSE_HREF, label: 'Cierre de Caja', roles: ['admin2'] },
];

/** admin2 sólo administra el cierre de caja de Garaje 14. */
function isGarageManager(username: string, role: Role): boolean {
  return username === 'admin2' || role === 'admin2';
}

function allowedHrefs(username: string, role: Role): string[] {
  if (isGarageManager(username, role)) return [CASH_CLOSE_HREF];

  const roleItems = NAV_ITEMS.filter(
    (item) => item.roles.includes(role) && item.href !== CASH_CLOSE_HREF,
  ).map((item) => item.href);

  // El administrador principal conserva todos los módulos, sin restricciones
  // (y además puede auditar el módulo de cierre de caja de Garaje 14).
  if (role === 'admin') return [...roleItems, CASH_CLOSE_HREF];

  // Garaje 14 trabaja sólo con su inventario de artículos.
  if (username === 'garaje14') {
    return ['/', '/clientes', '/taller', '/caja', STOCK_GARAGE_HREF];
  }

  // Operarios de Casa Central: inventario general, nunca el stock de Garaje 14.
  return roleItems.filter((href) => href !== STOCK_GARAGE_HREF);
}

export function visibleNav(username: string, role: Role): NavItem[] {
  const allowed = allowedHrefs(username, role);
  // El cierre de caja es un módulo propio de admin2: no se duplica en el menú
  // del administrador, que ya lo consulta desde Informes y Reportes.
  return NAV_ITEMS.filter(
    (item) =>
      allowed.includes(item.href) &&
      (item.href !== CASH_CLOSE_HREF || isGarageManager(username, role)),
  );
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

/** Página de inicio según el perfil: admin2 arranca en su cierre de caja. */
export function homeHref(username: string, role: Role): string {
  return isGarageManager(username, role) ? CASH_CLOSE_HREF : '/';
}

/**
 * Guarda de ruta: además de exigir sesión, bloquea los módulos que el menú
 * no muestra para ese usuario (acceso directo por URL incluido).
 */
export async function requireModule(href: string): Promise<SessionUser> {
  const session = await requireUser();
  if (!canAccess(session.username, session.role, href)) {
    redirect(homeHref(session.username, session.role));
  }
  return session;
}
