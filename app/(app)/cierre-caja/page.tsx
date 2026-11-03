import PageHeader from '@/components/ui';
import ReportActions from '@/components/reports/ReportActions';
import ReportFilters from '@/components/reports/ReportFilters';
import CashReport from '@/components/reports/CashReport';
import { requireModule } from '@/lib/nav';
import { findReport, parseReportParams, periodLabel } from '@/lib/reports';
import { UNIT_GARAGE, unitLabel } from '@/lib/tenant';

/** Operario cuyos movimientos forman este cierre de caja. */
const GARAGE_OPERATOR = 'garaje14';

/**
 * Módulo exclusivo del encargado de Garaje 14 (admin2). Reutiliza el informe de
 * cierre de caja, pero acotado a la unidad y al operario de Garaje 14: nunca
 * muestra movimientos de Casa Central (usergomeria / usertaller).
 */
export default async function CashClosePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireModule('/cierre-caja');
  const parsed = parseReportParams(await searchParams);
  const params = { ...parsed, report: 'caja', user: GARAGE_OPERATOR };
  const meta = { ...(findReport('caja') as NonNullable<ReturnType<typeof findReport>>), operators: false };

  return (
    <div>
      <PageHeader
        title="Cierre de Caja"
        subtitle={`Movimientos de ${unitLabel(UNIT_GARAGE)} · operario ${GARAGE_OPERATOR}`}
        actions={<ReportActions title="Cierre de Caja" />}
      />

      <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          Período: {periodLabel(params.from, params.to)} · Usuario: {GARAGE_OPERATOR}
        </p>
      </div>

      <ReportFilters meta={meta} params={params} operators={[GARAGE_OPERATOR]} basePath="/cierre-caja" />

      <CashReport params={params} unit={UNIT_GARAGE} />
    </div>
  );
}
