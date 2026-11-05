'use client';

import { FileDown, Printer } from 'lucide-react';

// Abre el diálogo del navegador con todos los detalles desplegados para que el
// PDF / la impresión conserven el mismo contenido que se ve en pantalla.
function printDocument(title: string) {
  const opened: HTMLDetailsElement[] = [];
  document.querySelectorAll<HTMLDetailsElement>('details').forEach((detail) => {
    if (!detail.open) {
      detail.open = true;
      opened.push(detail);
    }
  });

  const previousTitle = document.title;
  document.title = title;
  window.print();
  document.title = previousTitle;
  opened.forEach((detail) => {
    detail.open = false;
  });
}

export default function ReportActions({ title }: { title: string }) {
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => printDocument(title)}
        className="btn-secondary text-xs"
        title="En el diálogo elegí «Guardar como PDF»"
      >
        <FileDown className="h-4 w-4" />
        Exportar PDF
      </button>
      <button type="button" onClick={() => printDocument(title)} className="btn-primary text-xs">
        <Printer className="h-4 w-4" />
        Imprimir
      </button>
    </div>
  );
}
