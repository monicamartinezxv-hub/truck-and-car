const CONDITION_TONES: Record<string, string> = {
  EFECTIVO: 'bg-emerald-500/15 text-emerald-300',
  DEUDA: 'bg-amber-500/15 text-amber-300',
  QR: 'bg-blue-500/15 text-blue-300',
  TRANSFERENCIA: 'bg-violet-500/15 text-violet-300',
};

/** Etiqueta de color uniforme para la condición de pago en listados y reportes. */
export default function PaymentConditionBadge({ condition }: { condition: string }) {
  return (
    <span className={`badge ${CONDITION_TONES[condition] ?? 'bg-slate-500/15 text-slate-300'}`}>
      {condition || '-'}
    </span>
  );
}
