import PageHeader from '@/components/ui';
import ReportActions from '@/components/reports/ReportActions';
import ReportFilters from '@/components/reports/ReportFilters';
import CashReport from '@/components/reports/CashReport';
import { findReport, periodLabel, type ReportMeta, type ReportParams } from '@/lib/reports';
import { UNIT_GARAGE, unitLabel } from '@/lib/tenant';

/** Operario de Garaje 14 cuyos cierres de caja controla admin2. */
const GARAGE_OPERATOR = 'garaje14';

/**
 * Vista del módulo "Informes" para admin2: el cierre de caja de Garaje 14,
 * acotado a la unidad y al operario garaje14, para controlar sus rendiciones.
 */
export default function GarageCashClose({ params }: { params: ReportParams }) {
  const fixed: ReportParams = { ...params, report: 'caja', user: GARAGE_OPERATOR };
  const meta = { ...(findReport('caja') as ReportMeta), operators: false };

  return (
    <div>
      <PageHeader
        title="Informes"
        subtitle={`Cierre de caja de ${unitLabel(UNIT_GARAGE)} · operario ${GARAGE_OPERATOR}`}
        actions={<ReportActions title="Cierre de Caja" />}
      />

      <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          Período: {periodLabel(fixed.from, fixed.to)} · Usuario: {GARAGE_OPERATOR}
        </p>
      </div>

      <ReportFilters meta={meta} params={fixed} operators={[GARAGE_OPERATOR]} />

      <CashReport params={fixed} unit={UNIT_GARAGE} />
    </div>
  );
}
