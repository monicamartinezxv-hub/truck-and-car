'use client';

import { Printer } from 'lucide-react';

export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-secondary no-print">
      <Printer className="h-4 w-4" />
      Imprimir / PDF
    </button>
  );
}
