import type { Role } from './auth';
import { UNIT_GARAGE, UNIT_MAIN } from './tenant';

type UserLike = { username: string; role: Role; unit?: string };

/**
 * Stock: sólo el administrador principal y el usuario admin2 cargan o
 * modifican artículos. El resto de los usuarios lo consulta en modo lectura.
 */
export function canEditStock(user: UserLike): boolean {
  return user.role === 'admin' || user.username === 'admin2';
}

/**
 * Garaje 14 y admin2 trabajan con "Mantenimiento": venden artículos, así que
 * no usan el selector de servicios ni el checklist de revisión.
 */
export function usesMaintenance(user: Pick<UserLike, 'username' | 'role'>): boolean {
  return user.username === 'garaje14' || user.username === 'admin2' || user.role === 'admin2';
}

/** Nombre del módulo de trabajos según el perfil. */
export function workshopLabel(user: Pick<UserLike, 'username' | 'role'>): string {
  return usesMaintenance(user) ? 'Mantenimiento' : 'Gomería / Taller';
}

/**
 * Vehículos: Garaje 14 y admin2 trabajan con mantenimiento y no cargan datos
 * de vehículos. El resto (admin y operarios de Casa Central) sí los usa.
 */
export function showsVehicles(user: Pick<UserLike, 'username' | 'role'>): boolean {
  return !usesMaintenance(user);
}

/**
 * admin2 escribe la categoría de un artículo libremente, sin catálogo fijo.
 * El administrador principal mantiene el selector de categorías.
 */
export function typesStockCategory(user: Pick<UserLike, 'username' | 'role'>): boolean {
  return user.username === 'admin2' || user.role === 'admin2';
}

/** El usuario garaje14 no registra ventas: su caja sólo rinde sus trabajos. */
export function canRegisterSales(user: Pick<UserLike, 'username'>): boolean {
  return user.username !== 'garaje14';
}

/** Sección del inventario que abastece los artículos de un trabajo. */
export function stockSection(unit: string): 'general' | 'garaje14' {
  return unit === UNIT_GARAGE ? 'garaje14' : 'general';
}

/**
 * Privacidad de trabajos: los operarios de Casa Central (usertaller,
 * usergomeria) sólo ven los trabajos que cargaron ellos. `null` significa
 * "todos los de la unidad" (admin, admin2 y garaje14).
 */
export function jobOwnerScope(user: UserLike): string | null {
  return user.role === 'user' && user.unit === UNIT_MAIN ? user.username : null;
}

/**
 * Visibilidad de clientes: el administrador y admin2 (encargado de su unidad)
 * ven todos los de su unidad. Para el resto, los clientes que carga la
 * administración se comparten y los de un operario sólo los ve quien los creó.
 * `seeAllParam` es el placeholder del booleano y `userParam` el del usuario.
 */
export function clientVisibilitySql(
  alias: string,
  seeAllParam: string,
  userParam: string,
): string {
  return `(${seeAllParam}::boolean OR ${alias}.created_by = '' OR ${alias}.created_by = ${userParam}
    OR ${alias}.created_by IN (SELECT username FROM users WHERE role IN ('admin', 'admin2')))`;
}

/** admin y admin2 supervisan todos los clientes de su unidad. */
export function seesAllClients(user: Pick<UserLike, 'role'>): boolean {
  return user.role === 'admin' || user.role === 'admin2';
}
