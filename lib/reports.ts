import { query } from './db';
import { formatDate } from './format';

export type ReportMeta = {
  id: string;
  title: string;
  description: string;
  period: 'range' | 'none';
  operators: boolean;
  clientSearch?: boolean;
};

export const REPORTS: ReportMeta[] = [
  {
    id: 'cliente',
    title: 'Reporte Detallado por Cliente',
    description: 'Datos completos, deudas e historial de un cliente. Buscá por nombre o cédula.',
    period: 'range',
    operators: true,
    clientSearch: true,
  },
  {
    id: 'cubiertas',
    title: 'Reporte de Cubiertas - Clientes',
    description: 'Control y stock de cubiertas registradas, agrupadas por cliente.',
    period: 'range',
    operators: true,
    clientSearch: true,
  },
  {
    id: 'gestion',
    title: 'Gestión de Clientes',
    description: 'Movimientos y balance por cliente en un rango de fechas.',
    period: 'range',
    operators: true,
  },
  {
    id: 'credito',
    title: 'Clientes a Crédito',
    description: 'Estado de deudores, montos y status de pago por período.',
    period: 'range',
    operators: true,
  },
  {
    id: 'funcionarios',
    title: 'Funcionarios',
    description: 'Rendimiento, métricas y saldos de empleados por rango de fechas.',
    period: 'range',
    operators: false,
  },
  {
    id: 'cuentas',
    title: 'Cuentas por Cobrar',
    description: 'Morosidad detallada con segmentación cronológica por antigüedad.',
    period: 'range',
    operators: true,
  },
  {
    id: 'caja',
    title: 'Cierre de Caja',
    description: 'Ingresos, egresos y flujo de efectivo desglosado por operario.',
    period: 'range',
    operators: true,
  },
  {
    id: 'trabajos',
    title: 'Trabajos Realizados',
    description: 'Historial detallado de trabajos por fecha y operario.',
    period: 'range',
    operators: true,
  },
];

export function findReport(id: string): ReportMeta | null {
  return REPORTS.find((report) => report.id === id) ?? null;
}

export type ReportParams = {
  report: string;
  from: string;
  to: string;
  user: string;
  q: string;
  client: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseReportParams(params: Record<string, string | string[] | undefined>): ReportParams {
  const text = (key: string) => {
    const value = params[key];
    return typeof value === 'string' ? value.trim() : '';
  };
  return {
    report: text('report'),
    from: DATE_RE.test(text('from')) ? text('from') : '',
    to: DATE_RE.test(text('to')) ? text('to') : '',
    user: text('user'),
    q: text('q'),
    client: text('client'),
  };
}

export async function operatorOptions(): Promise<string[]> {
  const rows = await query<{ username: string }>(
    `SELECT username FROM users WHERE username <> ''
     UNION SELECT created_by FROM jobs WHERE created_by <> ''
     UNION SELECT created_by FROM sales WHERE created_by <> ''
     UNION SELECT created_by FROM debt_payments WHERE created_by <> ''
     UNION SELECT created_by FROM tire_records WHERE created_by <> ''
     UNION SELECT owner_username FROM cash_sessions WHERE owner_username <> ''
     ORDER BY username`,
  );
  return rows.map((row) => row.username);
}

export function periodLabel(from: string, to: string): string {
  if (!from && !to) return 'Todo el período';
  return `${from ? formatDate(from) : 'inicio'} — ${to ? formatDate(to) : 'hoy'}`;
}
