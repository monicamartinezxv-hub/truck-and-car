import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { one, query } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { SERVICES } from '@/lib/constants';
import { formatDate, formatMoney } from '@/lib/format';
import PageHeader, { Flash } from '@/components/ui';
import ConfirmButton from '@/components/ConfirmButton';
import JobForm, {
  type ClientOption,
  type ItemDraft,
  type StockOption,
} from '@/components/JobForm';
import { deleteJob, updateJob } from '@/app/actions/jobs';
import type { FlashParams } from '@/lib/flash';

type JobRow = {
  id: number;
  client_id: number | null;
  client_name: string;
  plate: string;
  service_date: string;
  end_date: string | null;
  currency: string;
  payment_condition: string;
  total: number;
  description: string;
  notes: string;
  checklist: Record<string, boolean>;
};

type ItemRow = {
  id: number;
  service: string;
  quantity: number;
  unit_price: number;
  stock_item_id: number | null;
};

type ReceivableRow = {
  id: number;
  balance: number;
  original_balance: number;
  paid: boolean;
  currency: string;
};

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<FlashParams>;
}) {
  await requireUser();
  const { id } = await params;
  const { msg, err } = await searchParams;
  const jobId = Number(id);
  if (!Number.isFinite(jobId)) notFound();

  const job = await one<JobRow>('SELECT * FROM jobs WHERE id = $1', [jobId]);
  if (!job) notFound();

  const items = await query<ItemRow>(
    'SELECT id, service, quantity, unit_price, stock_item_id FROM job_items WHERE job_id = $1 ORDER BY id',
    [jobId],
  );
  const clients = await query<ClientOption>(
    `SELECT c.id, c.name,
            COALESCE((SELECT v.plate FROM client_vehicles v WHERE v.client_id = c.id AND v.plate <> '' LIMIT 1), '') AS plate
     FROM clients c ORDER BY c.name`,
  );
  const stock = await query<StockOption>(
    `SELECT id, product_name, category, quantity, price
     FROM stock_items WHERE section = 'general' AND quantity > 0
     ORDER BY product_name`,
  );
  const receivable = await one<ReceivableRow>(
    'SELECT id, balance, original_balance, paid, currency FROM receivables WHERE job_id = $1 ORDER BY id LIMIT 1',
    [jobId],
  );

  const initialItems: ItemDraft[] = items.map((item) => ({
    key: `item-${item.id}`,
    service: item.service,
    quantity: item.quantity,
    unit_price: Number(item.unit_price),
    stock_item_id: item.stock_item_id,
  }));

  return (
    <div>
      <PageHeader
        title={`Trabajo #${job.id} · ${job.client_name || 'Sin cliente'}`}
        subtitle={`${formatDate(job.service_date)} · ${formatMoney(job.total, job.currency)} · ${job.payment_condition}`}
        actions={
          <Link href="/taller" className="btn-secondary">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        }
      />
      <Flash success={msg} error={err} />

      {receivable ? (
        <div
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            receivable.paid
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
          }`}
        >
          {receivable.paid
            ? 'Cuenta por cobrar cobrada.'
            : `Cuenta por cobrar pendiente: ${formatMoney(receivable.balance, receivable.currency)}.`}{' '}
          <Link href="/cuentas-por-cobrar" className="underline">
            Ver cuentas por cobrar
          </Link>
        </div>
      ) : null}

      <JobForm
        action={updateJob}
        clients={clients}
        stock={stock}
        services={SERVICES}
        initial={{
          id: job.id,
          client_id: job.client_id,
          plate: job.plate,
          service_date: job.service_date,
          end_date: job.end_date ?? '',
          currency: job.currency,
          payment_condition: job.payment_condition,
          notes: job.notes,
          checklist: job.checklist ?? {},
          items: initialItems,
        }}
        submitLabel="Guardar cambios"
      />

      <form action={deleteJob} className="mt-4">
        <input type="hidden" name="id" value={job.id} />
        <ConfirmButton message="¿Eliminar este trabajo?" className="btn-danger">
          <Trash2 className="h-4 w-4" />
          Eliminar trabajo
        </ConfirmButton>
      </form>
    </div>
  );
}
