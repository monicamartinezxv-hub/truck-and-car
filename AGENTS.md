# TRUCK AND CAR — notas de desarrollo

Rebuild en Next.js 15 (App Router, TypeScript, Tailwind) + PostgreSQL de la app de gomería/taller
"TRUCK AND CAR". Toda la interfaz está en español.

## Cómo se levanta

```bash
docker compose -f docker-compose.base44.yml up -d --build
```

- `db` — PostgreSQL 16 (usuario/clave/base `truckcar`). Datos en el volumen `db_data`.
- `migrate` — servicio de una sola ejecución: `npm install` + `scripts/init-db.mjs`
  (crea el esquema idempotente desde `db/schema.sql` y siembra los usuarios).
- `web` — `next dev` en `0.0.0.0:3000` desde el código montado (hot reload con polling).

El esquema es idempotente (`CREATE TABLE IF NOT EXISTS`). Un cambio de esquema se agrega a
`db/schema.sql` con su `ALTER TABLE ... IF NOT EXISTS` y se aplica re-ejecutando
`docker compose ... run --rm migrate` (o reiniciando el servicio `migrate`).

## Usuarios sembrados

| usuario | contraseña | rol | acceso |
| --- | --- | --- | --- |
| `admin` | `1234` | admin | todo |
| `admin2` | `4132` | admin2 | limitado a Garaje 14 |
| `usertaller` | `4321` | user | operador |
| `usergomeria` | `4321` | user | operador |
| `garaje14` | `4213` | user | módulos básicos |

`garaje14` y `admin2` sólo ven Dashboard, Clientes, Taller, Caja y Stock de Artículos
(`lib/nav.ts`). Las contraseñas se guardan con scrypt (`lib/auth.ts`).

## Verificación

- Typecheck: `docker compose -f docker-compose.base44.yml exec web npx tsc --noEmit`
- No hay suite de tests; la verificación es manual sobre `http://localhost:3000/login`.
- Un flujo completo: login → crear cliente → stock → trabajo con "Deuda" (crea la cuenta por
  cobrar y descuenta stock) → abono en Cuentas por Cobrar → caja (apertura, venta, cierre).

## Detalles que no se ven en los archivos

- **Sesión por cookie firmada** (`tc_session`, HMAC-SHA256 con `AUTH_SECRET`). Si `AUTH_SECRET`
  cambia, todas las sesiones se invalidan. La clave viene de `/run/base44/app.env`; el archivo
  `.env.base44-defaults` sólo aporta un valor de desarrollo cuando no hay secreto.
- **Server Actions necesitan el origen del preview**: el proxy sirve en `3000-<suffix>` mientras
  el Host interno es `3000-<sandbox>.e2b.app`. `next.config.mjs` agrega ese host a
  `allowedDevOrigins` y a `experimental.serverActions.allowedOrigins` **sólo** cuando
  `BASE44_PREVIEW_MODE === '1'`; sin la bandera ambas listas quedan vacías.
- **Login y logout son formularios POST normales** a `app/api/login` y `app/api/logout` (route
  handlers), no Server Actions. En `next dev` cada recompilación cambia los IDs de las Server
  Actions: una pestaña abierta desde antes enviaba un ID viejo, el POST devolvía 404
  ("Failed to find Server Action") y el navegador mostraba la pantalla de excepción en el cliente.
  Con un POST a un route handler el login nunca depende de un ID de acción.
- `app/global-error.tsx` reemplaza el error genérico de Next por un aviso con botón **Recargar**
  (pasa cuando la app se recompila con la ventana abierta).
- Las acciones redirigen con `?msg=` / `?err=` (ver `lib/flash.ts`) y las páginas los muestran con
  el componente `Flash`. Es el mecanismo de confirmación que reemplaza los toasts del original.
- Al crear un trabajo con condición **Deuda** se crea automáticamente la cuenta por cobrar; al
  editar el trabajo se actualiza el saldo sólo si la cuenta sigue impaga. Al eliminar un trabajo se
  elimina su cuenta impaga asociada.
- El stock descuenta automáticamente por categoría (`SERVICE_TO_STOCK_CATEGORY`) y también por
  artículo elegido; editar un trabajo **no** vuelve a descontar stock.
- `pg` devuelve `numeric` como string y `date` como Date: `lib/db.ts` registra type parsers para
  que lleguen como `number` y `'YYYY-MM-DD'`.
- La importación de `pg` en `app/actions/jobs.ts` es sólo de tipos (`PoolClient`), para no romper
  la regla de `'use server'` de exportar únicamente funciones async.
