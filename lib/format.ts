export function formatMoney(value: number | string | null, currency = 'PYG'): string {
  const amount = Number(value ?? 0);
  const text = amount.toLocaleString('es-PY', {
    maximumFractionDigits: currency === 'USD' ? 2 : 0,
  });
  return `${text} ${currency === 'USD' ? 'USD' : 'Gs'}`;
}

export function formatNumber(value: number | string | null): string {
  return Number(value ?? 0).toLocaleString('es-PY');
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '-';
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-PY');
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function daysSince(value: string | null | undefined): number {
  if (!value) return 0;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

export function isDateISO(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}
