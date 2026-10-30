import Link from 'next/link';
import {
  Banknote,
  CircleDot,
  CreditCard,
  FileBarChart,
  HardHat,
  UserSearch,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import PageHeader from '@/components/ui';
import ReportActions from '@/components/reports/ReportActions';
import ReportFilters from '@/components/reports/ReportFilters';
import ClientDetailReport from '@/components/reports/ClientDetailReport';
import TiresReport from '@/components/reports/TiresReport';
import ClientMovementsReport from '@/components/reports/ClientMovementsReport';
import CreditClientsReport from '@/components/reports/CreditClientsReport';
import EmployeesReport from '@/components/reports/EmployeesReport';
import ReceivablesReport from '@/components/reports/ReceivablesReport';
import CashReport from '@/components/reports/CashReport';
import JobsReport from '@/components/reports/JobsReport';
import { REPORTS, findReport, operatorOptions, parseReportParams, periodLabel } from '@/lib/reports';

const ICONS: Record<string, typeof FileBarChart> = {
  cliente: UserSearch,
  cubiertas: CircleDot,
  gestion: Users,
  credito: CreditCard,
  funcionarios: HardHat,
  cuentas: Wallet,
  caja: Banknote,
  trabajos: Wrench,
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = parseReportParams(await searchParams);
  const meta = findReport(params.report);

  if (!meta) {
    return (
      <div>
        <PageHeader
          title="Informes y Reportes"
          subtitle="Elegí un reporte para consultar, exportar a PDF o imprimir"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REPORTS.map((report) => {
            const Icon = ICONS[report.id] ?? FileBarChart;
            return (
              <Link
                key={report.id}
                href={`/informes?report=${report.id}`}
                className="card flex flex-col gap-2 transition hover:border-accent/60"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-white">
                  <span className="rounded-lg bg-accent/15 p-1.5 text-accent">
                    <Icon className="h-4 w-4" />
                  </span>
                  {report.title}
                </span>
                <span className="text-xs text-slate-400">{report.description}</span>
                <span className="mt-auto text-[11px] font-semibold text-accent">Abrir reporte →</span>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  const operators = meta.operators ? await operatorOptions() : [];

  return (
    <div>
      <PageHeader
        title={meta.title}
        subtitle={meta.description}
        actions={<ReportActions title={meta.title} />}
      />

      <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2">
        <Link href="/informes" className="btn-link">
          ← Todos los informes
        </Link>
        <p className="text-xs text-slate-500">
          Período: {periodLabel(params.from, params.to)}
          {params.user ? ` · Usuario: ${params.user}` : ''}
        </p>
      </div>

      <ReportFilters meta={meta} params={params} operators={operators} />

      {meta.id === 'cliente' ? <ClientDetailReport params={params} /> : null}
      {meta.id === 'cubiertas' ? <TiresReport params={params} /> : null}
      {meta.id === 'gestion' ? <ClientMovementsReport params={params} /> : null}
      {meta.id === 'credito' ? <CreditClientsReport params={params} /> : null}
      {meta.id === 'funcionarios' ? <EmployeesReport params={params} /> : null}
      {meta.id === 'cuentas' ? <ReceivablesReport params={params} /> : null}
      {meta.id === 'caja' ? <CashReport params={params} /> : null}
      {meta.id === 'trabajos' ? <JobsReport params={params} /> : null}
    </div>
  );
}
