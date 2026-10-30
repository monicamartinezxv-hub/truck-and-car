'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import type { ReportMeta, ReportParams } from '@/lib/reports';

const FILTER_KEYS = ['from', 'to', 'user', 'q'];

export default function ReportFilters({
  meta,
  params,
  operators,
}: {
  meta: ReportMeta;
  params: ReportParams;
  operators: string[];
}) {
  const router = useRouter();
  const active = Boolean(params.from || params.to || params.user || params.q);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const search = new URLSearchParams({ report: meta.id });
    FILTER_KEYS.forEach((key) => {
      const value = String(data.get(key) ?? '').trim();
      if (value) search.set(key, value);
    });
    router.push(`/informes?${search.toString()}`);
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
