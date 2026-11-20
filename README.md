# TRUCK AND CAR

Aplicación de gestión para gomería y taller (clientes, vehículos, trabajos, stock de cubiertas y
artículos, cuentas por cobrar, caja y reportes). Rebuild en **Next.js 15 + PostgreSQL** a partir de
la aplicación original en un solo archivo HTML.

## Módulos

- **Dashboard** — clientes, trabajos del día, saldo por cobrar, ventas y clientes en mora.
- **Clientes** — datos, vehículos, historial de trabajos y cuentas por cobrar.
- **Gomería / Taller** — trabajos con servicios/artículos, checklist y condición de pago
  (efectivo, deuda, QR o transferencia).
- **Cuentas por Cobrar** — cobros totales, abonos por cuenta o por cliente (imputados a las cuentas más antiguas).
- **Stock e Inventario** / **Stock de Artículos (Garaje 14)** — altas, edición y control de stock.
- **Stock de Cubiertas** — cubiertas guardadas por cliente.
- **Caja y Ventas** — apertura/cierre por operador, ventas del día y cobros.
- **Funcionarios** — personal, deudas y producción.
- **Informes** — consolidado de cuentas, reporte por cliente y reporte de cubiertas (imprimibles).
- **Usuarios** — administración de accesos y contraseñas (sólo administrador).

## Desarrollo

```bash
docker compose -f docker-compose.base44.yml up -d
```

La app queda en http://localhost:3000 (login con `admin` / `1234`, ver `AGENTS.md` para el resto de
usuarios). El esquema y los usuarios iniciales se aplican automáticamente con el servicio `migrate`.

## Respaldos

```bash
./scripts/backup.sh          # base de datos + código de la app
./scripts/backup.sh db       # sólo la base (pg_dump)
./scripts/backup.sh app      # sólo el código (tar.gz)
```

Los archivos quedan en `backups/db/` y `backups/app/` (ignorados por git) y se conservan los
últimos 14 de cada tipo (`BACKUP_KEEP` para cambiarlo).

El servicio `backup` del compose hace la copia **automática todos los días a las 23:00** (hora de
Paraguay) y guarda el mismo par de archivos con `-auto-` en el nombre. Desde la app, el módulo
**Historial de Respaldos** (sólo `admin`, en el menú lateral) lista todas las copias con fecha,
tipo y tamaño, y el botón **Crear copia ahora** genera una copia manual sin usar la terminal.

Para volver atrás:

```bash
./scripts/restore-db.sh backups/db/truckcar-20260101-120000.dump
./scripts/restore-app.sh backups/app/truck-and-car-20260101-120000.tar.gz
```

`restore-db.sh` pide escribir `RESTAURAR`, guarda antes un respaldo de seguridad
(`pre-restore-<fecha>.dump`) y reemplaza todos los datos dentro de una sola transacción.
`restore-app.sh` extrae el código en una carpeta nueva (`restores/`), nunca encima de la copia en
uso.
