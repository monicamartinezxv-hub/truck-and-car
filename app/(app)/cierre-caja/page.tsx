import { redirect } from 'next/navigation';

/**
 * El módulo "Cierre de Caja" se unificó en Informes: admin2 controla allí los
 * cierres de Garaje 14. La ruta vieja queda como redirección.
 */
export default function CashCloseLegacyPage() {
  redirect('/informes');
}
