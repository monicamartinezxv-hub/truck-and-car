// Unidades de negocio aisladas. Cada registro operativo lleva su unit_id y toda
// consulta se filtra por la unidad del usuario que inició sesión.
export const UNIT_MAIN = 'principal';
export const UNIT_GARAGE = 'garaje14';

export const UNIT_LABELS: Record<string, string> = {
  [UNIT_MAIN]: 'Casa Central',
  [UNIT_GARAGE]: 'Garaje 14',
};

export function unitLabel(unit: string): string {
  return UNIT_LABELS[unit] ?? unit;
}
