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

`lib/nav.ts` decide qué módulos ve cada usuario y `requireModule(href)` bloquea la ruta en el
servidor cuando el menú la oculta (las páginas lo llaman en lugar de `requireUser`): `admin` ve
todo; `usergomeria`/`usertaller` ven **Stock e Inventario** pero no **Stock de Artículos**;
`garaje14` ve Dashboard, Clientes, **Mantenimiento**, **Stock de Artículos** y **Caja y Ventas**;
`admin2` tiene esos mismos módulos más **Informes**, donde controla los cierres de caja de
`garaje14`. Todos entran al dashboard tras el login (`homeHref`). Los permisos finos viven en
`lib/permissions.ts` y el plan está en `docs/plan-acceso-modulos-stock.md`. Las contraseñas se
guardan con scrypt (`lib/auth.ts`).

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
- **Logo del login**: `app/login/page.tsx` muestra `components/BrandLogo.tsx`, que sirve
  `public/logo-truckcar.png` (mismo nombre). Si el archivo no está, cae al icono del camión de
  `lucide-react`, así el login nunca queda con una imagen rota. La lista de "Usuarios de prueba"
  ya no se muestra en el login; las credenciales sembradas están en la tabla de arriba.
- Las acciones redirigen con `?msg=` / `?err=` (ver `lib/flash.ts`) y las páginas los muestran con
  el componente `Flash`. Es el mecanismo de confirmación que reemplaza los toasts del original.
- Al crear un trabajo con condición **Deuda** se crea automáticamente la cuenta por cobrar; al
  editar el trabajo se actualiza el saldo sólo si la cuenta sigue impaga. Al eliminar un trabajo se
  elimina su cuenta impaga asociada.
- El stock descuenta automáticamente por categoría (`SERVICE_TO_STOCK_CATEGORY`) y también por
  artículo elegido; editar un trabajo **no** vuelve a descontar stock.
- `pg` devuelve `numeric` como string y `date` como Date: `lib/db.ts` registra type parsers para
  que lleguen como `number` y `'YYYY-MM-DD'`.
- **Informes y Reportes** (`app/(app)/informes/page.tsx`): sin `?report=` muestra la grilla de
  ocho tarjetas; con `?report=<id>` renderiza el informe correspondiente. Cada informe vive en
  `components/reports/*Report.tsx` (server components que consultan `lib/db`) y comparte
  `ReportFilters` (cliente: navega con `router.push`, no con un GET que recarga el documento, porque
  el proxy de la vista previa devuelve al inicio), `ReportActions` (Exportar PDF / Imprimir con
  `window.print` y todos los `details` desplegados) y `ui.tsx` (`ReportFrame`, `Metric`, `Drill`).
  El drill-down usa `<details>` nativo, así funciona sin JS y se imprime completo.
- Filtros por operario: las tablas guardan el usuario en `created_by` (y `cash_sessions.owner_username`);
  `lib/reports.ts#operatorOptions` arma la lista con los usuarios y los valores ya usados.
- La importación de `pg` en `app/actions/jobs.ts` es sólo de tipos (`PoolClient`), para no romper
  la regla de `'use server'` de exportar únicamente funciones async.
- **Precios de artículos por rol**: `canEditPrices()` (`lib/auth.ts`) devuelve verdadero sólo para
  `admin` y `admin2`. En `components/JobForm.tsx` el precio de un ítem que vino del stock es de
  solo lectura para los operadores, y `app/actions/jobs.ts#withOfficialPrices` reescribe el
  `unit_price` con `stock_items.price` en el servidor (create y update), así un POST manipulado
  tampoco puede cambiar la tarifa. Los precios base se editan sólo desde `/stock` y
  `/stock/garaje14`, y únicamente con `admin`/`admin2` (ver `saveStock`).
- **Guardado sin duplicados**: las acciones ya terminan en `redirect` (POST/Redirect/GET), y tras
  guardar un trabajo se vuelve a `/taller` (no al detalle con el formulario cargado), así un F5 no
  reenvía nada. Todos los formularios usan `components/SubmitButton.tsx` (`useFormStatus`), que
  deshabilita el botón mientras la acción está en curso para cortar el doble clic.
- **Unidades de negocio aisladas** (`principal` | `garaje14`): `admin`, `usertaller` y `usergomeria`
  trabajan en `principal`; `admin2` y `garaje14` en `garaje14`. La unidad viaja en la sesión
  (`SessionUser.unit`) y **toda** consulta operativa filtra por `unit_id`; las altas lo escriben y
  los `UPDATE`/`DELETE` agregan `AND unit_id = <unidad>` como segunda barrera. Las tablas hijas
  (`client_vehicles`, `job_items`, `production_entries`) no llevan `unit_id`: se accede a ellas por
  el padre, que ya está filtrado. Una cookie sin unidad se invalida, así que un despliegue de este
  cambio obliga a iniciar sesión de nuevo. El detalle del plan está en
  `docs/plan-aislamiento-unidades.md`.
- **Inventarios separados por unidad**: `/stock` trabaja siempre con `unit_id = 'principal'` +
  `section = 'general'`, y `/stock/garaje14` con `unit_id = 'garaje14'` + `section = 'garaje14'`.
  `app/actions/stock.ts` resuelve la unidad desde la sección (nunca desde el formulario), exige que
  el usuario pertenezca a esa unidad (o sea `admin`) y filtra `UPDATE`/`DELETE` por
  `id + unit_id + section`: los dos inventarios no se mezclan nunca. El precio base sólo lo cambian
  `admin`/`admin2` (`canEditPrices`); para el resto el precio enviado se ignora.
- **Permisos por rol y usuario** (`lib/permissions.ts`): `canEditStock()` deja cargar y editar
  stock sólo a `admin` y `admin2`; para el resto `/stock` y `/stock/garaje14` son de sólo lectura,
  y `app/actions/stock.ts` rechaza las escrituras. `jobOwnerScope()` limita a `usertaller` y a
  `usergomeria` a sus propios trabajos (lista, detalle, edición, borrado y dashboard).
  `clientVisibilitySql()` usa `clients.created_by` (columna nueva, vacía en las filas viejas =
  compartidas): los clientes del administrador y de admin2 se comparten dentro de la unidad y los
  de un operario sólo los ve quien los creó. En `garaje14`/`admin2` el módulo de trabajos se llama
  **Mantenimiento** (`workshopLabel`), su formulario oculta servicios y checklist
  (`usesMaintenance`) y `garaje14` no registra ventas (`canRegisterSales`, también validado en el
  servidor). El antiguo módulo `/cierre-caja` ahora redirige a `/informes`, donde admin2 ve los
  cierres de `garaje14` (`components/reports/GarageCashClose.tsx`).
  `showsVehicles()` oculta el apartado de **Vehículos** (formulario de alta/edición y panel del
  detalle) a `garaje14` y `admin2`; el resto lo sigue cargando. Como esos formularios no envían el
  campo `vehicles`, `updateClient` sólo sincroniza vehículos cuando el campo llegó (si no, borraría
  los ya cargados). `typesStockCategory()` hace que `admin2` escriba la **Categoría** del artículo
  como texto libre en `/stock/garaje14`; `admin` mantiene el selector `STOCK_CATEGORIES`.
- **Alcance de los informes**: `reportScope(session)` (`lib/reports.ts`) devuelve la unidad del
  usuario y `''` para el rol `admin`. Con `''` las consultas de los ocho informes se leen como
  `($n = '' OR unit_id = $n)` y `operatorOptions('')` lista los operarios de todas las unidades, así
  el administrador audita cualquier unidad (por ejemplo `user=garaje14`) desde Informes y Reportes.
  El `Cierre de Caja` de admin2 es el informe `caja` con unidad y operario `garaje14` fijos.
