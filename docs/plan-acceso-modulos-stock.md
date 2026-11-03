# Plan — Acceso a módulos de stock, cierre de caja de Garaje 14 y supervisión del admin

Reglas implementadas en `lib/nav.ts` (menú + guarda de ruta), `app/actions/stock.ts`
(separación de inventarios) y `lib/reports.ts` (alcance de los informes).

## 1. Menú lateral y acceso por ruta

| usuario | módulos visibles | bloqueado a nivel de ruta |
| --- | --- | --- |
| `usergomeria`, `usertaller` | Dashboard, Clientes, Taller, Cuentas por Cobrar, Cubiertas, **Stock e Inventario**, Caja | `Stock de Artículos` (`/stock/garaje14`) |
| `garaje14` | Dashboard, Clientes, Taller, Caja, **Stock de Artículos** | `Stock e Inventario` (`/stock`) y el resto de los módulos |
| `admin2` | **Cierre de Caja** (`/cierre-caja`) únicamente | todo lo demás (redirige a `/cierre-caja`) |
| `admin` | todos los módulos, sin restricciones | — |

La guarda es doble: `visibleNav()` arma el menú y `requireModule(href)` se ejecuta en el
servidor al comienzo de cada página, así una URL escrita a mano tampoco habilita el módulo.
`homeHref()` define la página de inicio (admin2 entra directo a `/cierre-caja`).

## 2. Inventarios independientes

- `/stock` → `unit_id = principal` **y** `section = 'general'` (Casa Central).
- `/stock/garaje14` → `unit_id = garaje14` **y** `section = 'garaje14'` (Garaje 14).

`saveStock` / `deleteStock` resuelven la unidad desde la sección (nunca desde el formulario),
exigen que el usuario pertenezca a esa unidad (o sea `admin`) y filtran por
`id + unit_id + section`, de modo que un alta o una edición de un inventario jamás toca el otro.
Los precios base siguen reservados a `admin` / `admin2` (`canEditPrices`): para el resto el
precio enviado se ignora.

## 3. Cierre de Caja de admin2

`app/(app)/cierre-caja/page.tsx` reutiliza el informe `caja` con la unidad `garaje14` fija y el
operario `garaje14` fijo. admin2 no accede a `/informes`, y aunque lo intentara no vería datos de
Casa Central porque toda la consulta está acotada por unidad + operario.

## 4. Supervisión del administrador principal

`reportScope(session)` devuelve `''` (todas las unidades) para el rol `admin` y la unidad del
usuario para el resto. Con `''` las consultas de los ocho informes se comportan como
`($n = '' OR unit_id = $n)`, y `operatorOptions('')` lista los operarios de todas las unidades:
el admin puede elegir `garaje14` en el filtro "Usuario" de Informes y Reportes y ver su historial
completo. El menú del admin no cambia.

## Verificación

```bash
# Typecheck
docker compose -f docker-compose.base44.yml exec web npx tsc --noEmit
```

Comprobaciones manuales por usuario (`http://localhost:3000/login`): menú visible, redirección al
entrar por URL a un módulo ajeno y contenido de `/informes?report=trabajos&user=garaje14` con el
usuario `admin`.
