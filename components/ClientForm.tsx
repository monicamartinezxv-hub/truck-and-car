'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { CASH_CONDITION, PAYMENT_CONDITIONS, type PaymentCondition } from '@/lib/constants';
import SubmitButton from '@/components/SubmitButton';

export type VehicleDraft = {
  id?: number;
  brand: string;
  model: string;
  engine: string;
  plate: string;
  transmission: string;
};

export type ClientDraft = {
  id?: number;
  name: string;
  ci_ruc: string;
  phone: string;
  address: string;
  payment_condition: string;
  vehicles: VehicleDraft[];
};

const EMPTY_VEHICLE: VehicleDraft = {
  brand: '',
  model: '',
  engine: '',
  plate: '',
  transmission: '',
};

export default function ClientForm({
  action,
  initial,
  submitLabel,
  showVehicles = true,
  conditions = PAYMENT_CONDITIONS,
}: {
  action: (formData: FormData) => void | Promise<void>;
  initial?: ClientDraft;
  submitLabel: string;
  /** Garaje 14 y admin2 no cargan vehículos (ver `showsVehicles`). */
  showVehicles?: boolean;
  /** Condiciones de pago habilitadas para el usuario (ver `paymentConditions`). */
  conditions?: readonly PaymentCondition[];
}) {
  const [vehicles, setVehicles] = useState<VehicleDraft[]>(
    initial?.vehicles.length ? initial.vehicles : [EMPTY_VEHICLE],
  );

  const update = (index: number, key: keyof VehicleDraft, value: string) => {
    setVehicles((current) =>
      current.map((vehicle, position) =>
        position === index ? { ...vehicle, [key]: value } : vehicle,
      ),
    );
  };

  const addVehicle = () => setVehicles((current) => [...current, { ...EMPTY_VEHICLE }]);
  const removeVehicle = (index: number) =>
    setVehicles((current) =>
      current.length === 1 ? [{ ...EMPTY_VEHICLE }] : current.filter((_, position) => position !== index),
    );

  return (
    <form action={action} className="space-y-4">
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      {showVehicles ? (
        <input
          type="hidden"
          name="vehicles"
          value={JSON.stringify(
            vehicles.filter((vehicle) =>
              [vehicle.brand, vehicle.model, vehicle.engine, vehicle.plate, vehicle.transmission].some(
                (value) => value.trim() !== '',
              ),
            ),
          )}
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">
            Nombre / Razón social *
          </label>
          <input id="name" name="name" className="input" defaultValue={initial?.name ?? ''} required />
        </div>
        <div>
          <label className="label" htmlFor="ci_ruc">
            CI / RUC
          </label>
          <input id="ci_ruc" name="ci_ruc" className="input" defaultValue={initial?.ci_ruc ?? ''} />
        </div>
        <div>
          <label className="label" htmlFor="phone">
            Teléfono
          </label>
          <input id="phone" name="phone" className="input" defaultValue={initial?.phone ?? ''} />
        </div>
        <div>
          <label className="label" htmlFor="payment_condition">
            Condición de pago
          </label>
          <select
            id="payment_condition"
            name="payment_condition"
            className="input"
            defaultValue={initial?.payment_condition ?? CASH_CONDITION}
          >
            {conditions.map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="address">
            Dirección
          </label>
          <input id="address" name="address" className="input" defaultValue={initial?.address ?? ''} />
        </div>
      </div>

      {showVehicles ? (
      <div className="rounded-xl border border-surface/60 bg-dark/40 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-200">Vehículos</p>
          <button type="button" onClick={addVehicle} className="btn-link">
            <Plus className="h-3.5 w-3.5" />
            Agregar vehículo
          </button>
        </div>

        <div className="space-y-3">
          {vehicles.map((vehicle, index) => (
            <div key={vehicle.id ?? `new-${index}`} className="grid gap-2 sm:grid-cols-6">
              <input
                className="input sm:col-span-1"
                placeholder="Marca"
                value={vehicle.brand}
                onChange={(event) => update(index, 'brand', event.target.value)}
              />
              <input
                className="input sm:col-span-1"
                placeholder="Modelo"
                value={vehicle.model}
                onChange={(event) => update(index, 'model', event.target.value)}
              />
              <input
                className="input sm:col-span-1"
                placeholder="Motor"
                value={vehicle.engine}
                onChange={(event) => update(index, 'engine', event.target.value)}
              />
              <input
                className="input sm:col-span-1"
                placeholder="Chapa"
                value={vehicle.plate}
                onChange={(event) => update(index, 'plate', event.target.value)}
              />
              <input
                className="input sm:col-span-1"
                placeholder="Transmisión"
                value={vehicle.transmission}
                onChange={(event) => update(index, 'transmission', event.target.value)}
              />
              <button
                type="button"
                onClick={() => removeVehicle(index)}
                className="btn-secondary justify-center px-2 py-1.5 text-red-300"
                aria-label="Quitar vehículo"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
      ) : null}

      <SubmitButton className="btn-primary" pendingLabel="Guardando…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
