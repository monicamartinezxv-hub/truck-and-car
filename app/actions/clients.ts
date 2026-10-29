'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { query, withTransaction } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { flashError, flashSuccess } from '@/lib/flash';

export type VehicleInput = {
  id?: number;
  brand?: string;
  model?: string;
  engine?: string;
  plate?: string;
  transmission?: string;
};

function parseVehicles(raw: FormDataEntryValue | null): VehicleInput[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as VehicleInput[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function clientFields(formData: FormData) {
  return {
    name: String(formData.get('name') ?? '').trim(),
    ci_ruc: String(formData.get('ci_ruc') ?? '').trim(),
    phone: String(formData.get('phone') ?? '').trim(),
    address: String(formData.get('address') ?? '').trim(),
    payment_condition: String(formData.get('payment_condition') ?? 'Contado'),
  };
}

async function syncVehicles(clientId: number, vehicles: VehicleInput[]) {
  const kept = vehicles.filter((vehicle) => vehicle.id);
  await query(
    `DELETE FROM client_vehicles WHERE client_id = $1 AND NOT (id = ANY($2::int[]))`,
    [clientId, kept.map((vehicle) => vehicle.id)],
  );

  for (const vehicle of vehicles) {
    const values = [
      vehicle.brand ?? '',
      vehicle.model ?? '',
      vehicle.engine ?? '',
      vehicle.plate ?? '',
      vehicle.transmission ?? '',
    ];
    if (vehicle.id) {
      await query(
        `UPDATE client_vehicles
         SET brand = $1, model = $2, engine = $3, plate = $4, transmission = $5
         WHERE id = $6 AND client_id = $7`,
        [...values, vehicle.id, clientId],
      );
    } else {
      await query(
        `INSERT INTO client_vehicles (client_id, brand, model, engine, plate, transmission)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [clientId, ...values],
      );
    }
  }
}

export async function createClient(formData: FormData) {
  const user = await requireUser();
  const fields = clientFields(formData);
  if (!fields.name) redirect(flashError('/clientes', 'El nombre del cliente es obligatorio'));

  const vehicles = parseVehicles(formData.get('vehicles'));

  const clientId = await withTransaction(async (client) => {
    const countRow = await client.query<{ next: number }>(
      `SELECT count(*)::int + 1 AS next FROM clients`,
    );
    const code = `CLI-${String(countRow.rows[0]?.next ?? 1).padStart(4, '0')}`;
    const inserted = await client.query<{ id: number }>(
      `INSERT INTO clients (client_code, name, ci_ruc, phone, address, payment_condition)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [code, fields.name, fields.ci_ruc, fields.phone, fields.address, fields.payment_condition],
    );
    const id = inserted.rows[0].id;
    for (const vehicle of vehicles) {
      await client.query(
        `INSERT INTO client_vehicles (client_id, brand, model, engine, plate, transmission)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          id,
          vehicle.brand ?? '',
          vehicle.model ?? '',
          vehicle.engine ?? '',
          vehicle.plate ?? '',
          vehicle.transmission ?? '',
        ],
      );
    }
    return id;
  });

  revalidatePath('/clientes');
  revalidatePath('/');
  redirect(flashSuccess(`/clientes/${clientId}`, `${fields.name} guardado por ${user.username}`));
}

export async function updateClient(formData: FormData) {
  await requireUser();
  const id = Number(formData.get('id'));
  const fields = clientFields(formData);
  if (!id || !fields.name) redirect(flashError('/clientes', 'Datos del cliente incompletos'));

  const vehicles = parseVehicles(formData.get('vehicles'));

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE clients SET name = $1, ci_ruc = $2, phone = $3, address = $4, payment_condition = $5
       WHERE id = $6`,
      [fields.name, fields.ci_ruc, fields.phone, fields.address, fields.payment_condition, id],
    );
    await client.query(
      `UPDATE jobs SET client_name = $1 WHERE client_id = $2`,
      [fields.name, id],
    );
    await client.query(
      `UPDATE receivables SET client_name = $1 WHERE client_id = $2`,
      [fields.name, id],
    );
  });

  await syncVehicles(id, vehicles);

  revalidatePath('/clientes');
  revalidatePath(`/clientes/${id}`);
  redirect(flashSuccess(`/clientes/${id}`, 'Cliente actualizado'));
}

export async function deleteClient(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get('id'));
  if (!id) redirect(flashError('/clientes', 'Cliente inválido'));

  const openDebt = await query<{ count: number }>(
    'SELECT count(*)::int AS count FROM receivables WHERE client_id = $1 AND NOT paid',
    [id],
  );
  if ((openDebt[0]?.count ?? 0) > 0) {
    redirect(flashError('/clientes', 'El cliente tiene cuentas por cobrar abiertas'));
  }

  await query('DELETE FROM clients WHERE id = $1', [id]);
  revalidatePath('/clientes');
  redirect(flashSuccess('/clientes', `Cliente eliminado (${user.username})`));
}
