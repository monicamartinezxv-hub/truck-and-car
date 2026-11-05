/* Service worker de TRUCK AND CAR.
 *
 * - En desarrollo se registra con `?env=development` y NO intercepta nada (así no rompe el
 *   hot reload ni sirve módulos viejos).
 * - En producción cachea la estructura estática (iconos, manifiesto y la página sin conexión)
 *   y los assets inmutables de Next (`/_next/static/*`), así la app abre al instante en el
 *   celular. Las páginas y los datos NUNCA se cachean: siempre van a la red, porque llevan
 *   sesión y datos de la unidad del usuario.
 */
const VERSION = 'tc-v1';
const IS_DEV = new URL(self.location.href).searchParams.get('env') !== 'production';
const CACHE = `${VERSION}-static`;
const OFFLINE_URL = '/offline';
const PRECACHE = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
  '/logo-truckcar.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  if (IS_DEV) return;
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => {
        /* si falla la precarga el service worker igual se activa */
      }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  if (IS_DEV) return;

  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error()));
    return;
  }

  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/logo-truckcar.png'
  ) {
    event.respondWith(cacheFirst(request));
  }
});
