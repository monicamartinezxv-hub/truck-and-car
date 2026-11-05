export const CURRENCIES = ['PYG', 'USD'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const PAYMENT_CONDITIONS = ['EFECTIVO', 'DEUDA', 'QR', 'TRANSFERENCIA'] as const;
export type PaymentCondition = (typeof PAYMENT_CONDITIONS)[number];

/** Condiciones para perfiles sin acceso a QR y transferencia. */
export const BASIC_PAYMENT_CONDITIONS: readonly PaymentCondition[] = ['EFECTIVO', 'DEUDA'];

/** Condición que representa el pago al momento en efectivo. */
export const CASH_CONDITION: PaymentCondition = 'EFECTIVO';
/** Condición que genera la cuenta por cobrar. */
export const DEBT_CONDITION: PaymentCondition = 'DEUDA';

/**
 * Valida la condición enviada por el formulario. Una condición fuera de la
 * lista permitida (POST manipulado o sesión sin permiso) cae en EFECTIVO.
 */
export function parsePaymentCondition(
  value: FormDataEntryValue | null | undefined,
  allowed: readonly PaymentCondition[] = PAYMENT_CONDITIONS,
): PaymentCondition {
  const raw = String(value ?? '').trim().toUpperCase();
  return allowed.find((condition) => condition === raw) ?? CASH_CONDITION;
}

export const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'QR'] as const;

export const SERVICES = [
  'Alineación Camión',
  'Alineación Carreta',
  'Alineación de Vehículos',
  'Balanceo',
  'Pizada',
  'Rotación',
  'Reparo',
  'Prisionero',
  'Calibración',
  'Pico p/camión',
  'Cambio de aceite',
  'Cambio de bracito y muñequín',
  'Montaje',
  'Vulcanización',
  'Auxilio',
  'Mecánica',
  'Cámara para moto',
  'Cámara para camión',
  'Frizada',
  'Venta de cubiertas nuevas',
  'Venta de cubiertas usadas',
  'Venta de llantas',
  'Aceite',
];

// Servicios que descuentan automáticamente de una categoría del stock.
export const SERVICE_TO_STOCK_CATEGORY: Record<string, string> = {
  'Cámara para moto': 'Cámara p/moto',
  'Venta de cubiertas nuevas': 'Cubierta nueva',
  'Venta de cubiertas usadas': 'Cubierta usada',
  'Venta de llantas': 'Llantas',
  Aceite: 'Aceite',
  'Cambio de aceite': 'Aceite',
};

export const CHECKLIST_ITEMS = [
  'Frenos',
  'Luces',
  'Niveles de fluidos',
  'Suspensión',
  'Dirección',
];

export const STOCK_CATEGORIES = [
  'Cubierta nueva',
  'Cubierta usada',
  'Cámara p/moto',
  'Cámara p/camión',
  'Llantas',
  'Aceite',
  'Artículo',
];
