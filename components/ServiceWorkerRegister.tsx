'use client';

import { useEffect } from 'react';

/**
 * Registra el service worker de la PWA (`public/sw.js`).
 * En desarrollo el SW se registra sin caché (`?env=development`), así el hot reload sigue funcionando.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const env = process.env.NODE_ENV === 'production' ? 'production' : 'development';
    navigator.serviceWorker.register(`/sw.js?env=${env}`, { scope: '/' }).catch(() => {
      /* sin service worker la app sigue funcionando normalmente */
    });
  }, []);

  return null;
}
