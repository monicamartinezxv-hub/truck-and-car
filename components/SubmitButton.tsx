'use client';

import { useFormStatus } from 'react-dom';

export default function SubmitButton({
  children,
  className = 'btn-primary',
  pendingLabel = 'Guardando…',
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      aria-busy={pending}
      aria-disabled={pending}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
