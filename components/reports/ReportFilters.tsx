'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import type { ReportMeta, ReportParams } from '@/lib/reports';
import { PAYMENT_CONDITION_LABELS, PAYMENT_CONDITIONS } from '@/lib/constants';

const FILTER_KEYS = ['from', 'to', 'user', 'q', 'cond'];

export default function ReportFilters({
  meta,
  params,
  operators,
  basePath = '/informes',
}: {
  meta: ReportMeta;
  params: ReportParams;
  operators: string[];
  /** Ruta que recibe los filtros (el módulo Cierre de Caja usa la suya). */
  basePath?: string;
}) {
  const router = useRouter();
  const active = Boolean(params.from || params.to || params.user || params.q || params.cond);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const search = new URLSearchParams(basePath === '/informes' ? { report: meta.id } : {});
    FILTER_KEYS.forEach((key) => {
      const value = String(data.get(key) ?? '').trim();
      if (value) search.set(key, value);
    });
    router.push(`${basePath}?${search.toString()}`);
  }

  return (
    <form onSubmit={submit} className="no-print card mb-4 flex flex-wrap items-end gap-3">
      {meta.period === 'range' ? (
        <>
          <div>
            <label className="label" htmlFor="from">
              Desde
            </label>
            <input id="from" name="from" type="date" defaultValue={params.from} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="to">
              Hasta
            </label>
            <input id="to" name="to" type="date" defaultValue={params.to} className="input" />
          </div>
        </>
      ) : null}

      {meta.operators ? (
        <div>
          <label className="label" htmlFor="user">
            Usuario
          </label>
          <select id="user" name="user" defaultValue={params.user} className="input min-w-[11rem]">
            <option value="">Todos los usuarios</option>
            {operators.map((username) => (
              <option key={username} value={username}>
                {username}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {meta.conditions ? (
        <div>
          <label className="label" htmlFor="cond">
            Condición de pago
          </label>
          <select id="cond" name="cond" defaultValue={params.cond} className="input min-w-[11rem]">
            <option value="">Todas las condiciones</option>
            {PAYMENT_CONDITIONS.map((condition) => (
              <option key={condition} value={condition}>
                {PAYMENT_CONDITION_LABELS[condition]}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {meta.clientSearch ? (
        <div className="min-w-[14rem]">
          <label className="label" htmlFor="q">
            Buscar cliente
          </label>
          <input id="q" name="q" defaultValue={params.q} placeholder="Nombre o cédula" className="input" />
        </div>
      ) : null}

      <button type="submit" className="btn-primary">
        Generar reporte
      </button>

      {active ? (
        <Link href={`/informes?report=${meta.id}`} className="btn-secondary">
          Limpiar filtros
        </Link>
      ) : null}
    </form>
  );
}
