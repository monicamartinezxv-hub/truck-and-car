# TRUCK AND CAR

Aplicación de gestión para gomería y taller (clientes, vehículos, trabajos, stock de cubiertas y
artículos, cuentas por cobrar, caja y reportes). Rebuild en **Next.js 15 + PostgreSQL** a partir de
la aplicación original en un solo archivo HTML.

## Módulos

- **Dashboard** — clientes, trabajos del día, saldo por cobrar, ventas y clientes en mora.
- **Clientes** — datos, vehículos, historial de trabajos y cuentas por cobrar.
- **Gomería / Taller** — trabajos con servicios/artículos, checklist, contado o deuda.
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
