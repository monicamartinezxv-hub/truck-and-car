'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { one, query, withTransaction } from '@/lib/db';
import { requireUser, type SessionUser } from '@/lib/auth';
import { parsePaymentCondition } from '@/lib/constants';
import { clientVisibilitySql, paymentConditions, seesAllClients } from '@/lib/permissions';
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

function clientFields(formData: FormData, user: SessionUser) {
  return {
    name: String(formData.get('name') ?? '').trim(),
    ci_ruc: String(formData.get('ci_ruc') ?? '').trim(),
    phone: String(formData.get('phone') ?? '').trim(),
    address: String(formData.get('address') ?? '').trim(),
    payment_condition: parsePaymentCondition(
      formData.get('payment_condition'),
      paymentConditions(user),
    ),
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
  const fields = clientFields(formData, user);
  if (!fields.name) redirect(flashError('/clientes', 'El nombre del cliente es obligatorio'));

  const vehicles = parseVehicles(formData.get('vehicles'));

  const clientId = await withTransaction(async (client) => {
    const countRow = await client.query<{ next: number }>(
      `SELECT count(*)::int + 1 AS next FROM clients WHERE unit_id = $1`,
      [user.unit],
    );
    const code = `CLI-${String(countRow.rows[0]?.next ?? 1).padStart(4, '0')}`;
    const inserted = await client.query<{ id: number }>(
      `INSERT INTO clients (client_code, name, ci_ruc, phone, address, payment_condition, unit_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        code,
        fields.name,
        fields.ci_ruc,
        fields.phone,
        fields.address,
        fields.payment_condition,
        user.unit,
        user.username,
      ],
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
  const user = await requireUser();
  const id = Number(formData.get('id'));
  const fields = clientFields(formData, user);
  if (!id || !fields.name) redirect(flashError('/clientes', 'Datos del cliente incompletos'));

  // Sólo se editan los clientes visibles para el usuario (propios o compartidos).
  const owned = await one<{ id: number }>(
    `SELECT c.id FROM clients c
     WHERE c.id = $1 AND c.unit_id = $2 AND ${clientVisibilitySql('c', '$3', '$4')}`,
    [id, user.unit, seesAllClients(user), user.username],
  );
  if (!owned) redirect(flashError('/clientes', 'Cliente no encontrado'));

  // El formulario de Garaje 14 / admin2 no envía vehículos: sin el campo no se
  // toca la tabla (si no, se borrarían los vehículos ya cargados del cliente).
  const rawVehicles = formData.get('vehicles');
  const vehicles = parseVehicles(rawVehicles);

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE clients SET name = $1, ci_ruc = $2, phone = $3, address = $4, payment_condition = $5
       WHERE id = $6 AND unit_id = $7`,
      [
        fields.name,
        fields.ci_ruc,
        fields.phone,
        fields.address,
        fields.payment_condition,
        id,
        user.unit,
      ],
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

  if (rawVehicles !== null) await syncVehicles(id, vehicles);

  revalidatePath('/clientes');
  revalidatePath(`/clientes/${id}`);
  redirect(flashSuccess(`/clientes/${id}`, 'Cliente actualizado'));
}

export async function deleteClient(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get('id'));
  if (!id) redirect(flashError('/clientes', 'Cliente inválido'));

  const openDebt = await query<{ count: number }>(
    `SELECT count(*)::int AS count FROM receivables
     WHERE client_id = $1 AND unit_id = $2 AND NOT paid`,
    [id, user.unit],
  );
  if ((openDebt[0]?.count ?? 0) > 0) {
    redirect(flashError('/clientes', 'El cliente tiene cuentas por cobrar abiertas'));
  }

  await query('DELETE FROM clients WHERE id = $1 AND unit_id = $2', [id, user.unit]);
  revalidatePath('/clientes');
  redirect(flashSuccess('/clientes', `Cliente eliminado (${user.username})`));
}
