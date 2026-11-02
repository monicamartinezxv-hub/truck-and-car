# Plan de trabajo — Aislamiento por unidad de negocio

## Objetivo

Separar por completo la unidad **Garaje 14** (usuarios `admin2` y `garaje14`) del resto de la
operación (**Casa Central**: `admin`, `usertaller`, `usergomeria`). Ninguna de las dos unidades
puede ver ni compartir clientes, stock, trabajos, ventas, cobros, caja ni funcionarios de la otra.

## Modelo de datos

Cada tabla con datos operativos lleva `unit_id TEXT NOT NULL DEFAULT 'principal'`:

| Tabla | Notas |
| --- | --- |
| `users` | Define a qué unidad pertenece cada sesión. |
| `clients` | Los vehículos (`client_vehicles`) heredan la unidad del cliente. |
| `stock_items` | `section` sigue distinguiendo área (`general` / `garaje14`); el aislamiento lo da `unit_id`. |
| `jobs` | Los ítems (`job_items`) heredan la unidad del trabajo. |
| `receivables`, `debt_payments`, `sales` | Movimientos y cobros. |
| `employees` | La producción (`production_entries`) hereda la unidad del funcionario. |
| `tire_records`, `cash_sessions` | Cubiertas por cliente y cajas. |

Las tablas hijas no duplican `unit_id`: siempre se accede a ellas a través del padre, que ya está
filtrado por unidad.

## Reglas de aislamiento

1. La sesión (`tc_session`) guarda la unidad del usuario; una cookie sin unidad se invalida.
2. Toda consulta de lectura filtra por `unit_id = <unidad de la sesión>`.
3. Toda escritura inserta `unit_id` de la sesión y todo `UPDATE`/`DELETE` agrega
   `AND unit_id = <unidad>` como segunda barrera ante un ID manipulado.
4. Un registro de otra unidad responde como inexistente (`notFound()` / mensaje de error), nunca
   como acceso denegado, para no filtrar su existencia.
5. El alcance por operario (`created_by`) se mantiene dentro de la unidad: un admin ve el
   consolidado **de su unidad**, no el de la otra.

## Fases del trabajo

| Fase | Alcance | Estado |
| --- | --- | --- |
| 1. Esquema | `unit_id` en las 10 tablas operativas, índices por unidad y asignación de `admin2`/`garaje14` a `garaje14`. | Hecho |
| 2. Sesión | `SessionUser.unit`, `authenticate`/`createSession`/`getSession`, invalidación de cookies viejas, semilla de usuarios con unidad. | Hecho |
| 3. Lecturas | Filtro por unidad en dashboard, clientes, taller, stock, caja, cuentas por cobrar, cubiertas, funcionarios y los 8 informes. | Hecho |
| 4. Escrituras | `unit_id` en altas y `AND unit_id` en modificaciones/bajas de todas las acciones. | Hecho |
| 5. Verificación | Typecheck, migración aplicada y prueba cruzada: datos creados en Garaje 14 invisibles para Casa Central y viceversa. | Hecho |
| 6. Operación | Alta de usuarios hereda la unidad de quien crea; la barra lateral muestra la unidad activa. | Hecho |

## Cómo se aplica

```bash
docker compose -f docker-compose.base44.yml run --rm migrate   # agrega columnas y unidades
docker compose -f docker-compose.base44.yml up -d web
```

Los datos existentes quedan en `principal`; la migración es idempotente.

## Riesgos y siguientes pasos

- **Cookies previas**: al no tener unidad, las sesiones abiertas se cierran y hay que volver a
  iniciar sesión una vez.
- **Alta de usuarios por unidad**: hoy el usuario nuevo hereda la unidad de quien lo crea. Si se
  necesitan usuarios de Garaje 14 creados desde Casa Central, hay que agregar un selector de unidad
  (requiere decisión de negocio).
- **Reportes consolidados entre unidades**: no existen por diseño. Si se pide un consolidado, debe
  ser una vista explícita de superusuario, no un cambio de los filtros actuales.
