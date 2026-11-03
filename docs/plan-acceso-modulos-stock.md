# Plan — Acceso a módulos, stock, privacidad y mantenimiento

Reglas implementadas en `lib/nav.ts` (menú + guarda de ruta), `lib/permissions.ts` (permisos
finos), `app/actions/stock.ts` (escrituras de inventario) y `lib/reports.ts` (alcance de los
informes).

## 1. Menú lateral y acceso por ruta

| usuario | módulos visibles | bloqueado a nivel de ruta |
| --- | --- | --- |
| `usergomeria`, `usertaller` | Dashboard, Clientes, Gomería / Taller, Cuentas por Cobrar, Cubiertas, **Stock e Inventario**, Caja | Stock de Artículos (`/stock/garaje14`), Informes, Usuarios, Funcionarios |
| `garaje14` | Dashboard, Clientes, **Mantenimiento**, Stock de Artículos, Caja y Ventas | Stock e Inventario (`/stock`), Informes, el resto |
| `admin2` | Los mismos de `garaje14` + **Informes** | Stock e Inventario (`/stock`), el resto |
| `admin` | todos los módulos, sin restricciones | — |

La guarda es doble: `visibleNav()` arma el menú y `requireModule(href)` se ejecuta en el
servidor al comienzo de cada página, así una URL escrita a mano tampoco habilita el módulo.

## 2. Stock: sólo admin y admin2 escriben

`canEditStock()` devuelve verdadero sólo para el rol `admin` y para el usuario `admin2`.
`/stock` y `/stock/garaje14` ocultan el alta, la edición y el borrado para `usertaller`,
`usergomeria` y `garaje14` (que ven el aviso "sólo consulta"), y `saveStock` / `deleteStock`
rechazan la escritura en el servidor. admin2 sólo escribe en el inventario de su unidad
(Garaje 14); admin puede con ambos. Los precios base siguen reservados a `admin`/`admin2`
(`canEditPrices`).

## 3. Privacidad de trabajos y clientes

- **Trabajos**: `jobOwnerScope()` devuelve el usuario para los operarios de Casa Central
  (`usertaller`, `usergomeria`), y `null` (= todos los de la unidad) para `admin`, `admin2` y
  `garaje14`. El filtro se aplica en la lista de `/taller`, en el detalle (un trabajo ajeno
  responde 404), en `updateJob`/`deleteJob` y en "Últimos trabajos" del dashboard.
- **Clientes**: `clients.created_by` guarda el autor. `clientVisibilitySql()` deja ver los
  clientes propios, los cargados por la administración (`admin`, `admin2`) y, para `admin` y
  `admin2`, todos los de su unidad. Lo cargado por `usergomeria`, `usertaller` o `garaje14` sólo
  lo ve quien lo creó. El filtro se aplica en la lista, el detalle (404 si no es visible),
  `updateClient` y los selectores de cliente de los trabajos.

## 4. Mantenimiento (garaje14 y admin2)

`workshopLabel()` renombra el módulo "Gomería / Taller" a **Mantenimiento** en el menú y en el
encabezado de la página. `usesMaintenance()` hace que `JobForm` oculte el selector de servicios y
el checklist de revisión (queda sólo "Observaciones"), y los artículos se toman del inventario de
la unidad (`stockSection`): Garaje 14 usa la sección `garaje14`.

`garaje14` no registra ventas: `canRegisterSales()` oculta el panel "Registrar venta" en
`/caja` y `registerSale` rechaza el POST.

## 5. Informes de admin2

admin2 no tiene el informe de Casa Central: `/informes` renderiza
`components/reports/GarageCashClose.tsx`, el cierre de caja acotado a `unit_id = garaje14` y al
operario `garaje14`, con filtro de período. El antiguo módulo `/cierre-caja` ahora redirige a
`/informes`.

## Verificación

```bash
docker compose -f docker-compose.base44.yml exec web npx tsc --noEmit
```

Comprobaciones por usuario (`http://localhost:3000/login`): menú visible, redirección al entrar
por URL a un módulo ajeno, stock sin formulario para operarios, "Mantenimiento" sin servicios ni
checklist, caja de `garaje14` sin "Registrar venta" y `/informes` de admin2 con los cierres de
`garaje14`.
