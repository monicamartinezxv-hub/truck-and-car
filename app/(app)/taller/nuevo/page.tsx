import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { query } from '@/lib/db';
import { canEditPrices } from '@/lib/auth';
import { requireModule } from '@/lib/nav';
import { SERVICES } from '@/lib/constants';
import PageHeader, { Flash } from '@/components/ui';
import JobForm, { type ClientOption, type StockOption } from '@/components/JobForm';
import { createJob } from '@/app/actions/jobs';
import type { FlashParams } from '@/lib/flash';

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<FlashParams>;
}) {
  const user = await requireModule('/taller');
  const { msg, err } = await searchParams;

  const clients = await query<ClientOption>(
    `SELECT c.id, c.name,
            COALESCE((SELECT v.plate FROM client_vehicles v WHERE v.client_id = c.id AND v.plate <> '' LIMIT 1), '') AS plate
     FROM clients c WHERE c.unit_id = $1 ORDER BY c.name`,
    [user.unit],
  );

  const stock = await query<StockOption>(
    `SELECT id, product_name, category, quantity, price
     FROM stock_items
     WHERE unit_id = $1 AND section = 'general' AND quantity > 0
     ORDER BY product_name`,
    [user.unit],
  );

  return (
    <div>
      <PageHeader
        title="Nuevo trabajo"
        subtitle="Registrá los servicios y artículos del trabajo"
        actions={
          <Link href="/taller" className="btn-secondary">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        }
      />
      <Flash success={msg} error={err} />
      <JobForm
        action={createJob}
        clients={clients}
        stock={stock}
        services={SERVICES}
        submitLabel="Guardar trabajo"
        canEditPrices={canEditPrices(user.role)}
      />
    </div>
  );
}
