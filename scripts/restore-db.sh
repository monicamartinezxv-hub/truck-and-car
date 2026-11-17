#!/usr/bin/env bash
# Restaura la base de datos desde un respaldo creado por scripts/backup.sh.
#
#   ./scripts/restore-db.sh backups/db/truckcar-20260101-120000.dump
#   ./scripts/restore-db.sh <archivo> --yes     # sin pedir confirmación
#
# ATENCIÓN: reemplaza TODOS los datos actuales. Antes de tocar nada se guarda un
# respaldo de seguridad en backups/db/pre-restore-<fecha>.dump, así que si el
# archivo elegido era el equivocado se puede volver atrás con este mismo script.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FILE="${1:-}"
CONFIRM="${2:-}"

if [[ -z "$FILE" ]]; then
  echo "Uso: $0 <archivo.dump> [--yes]" >&2
  echo "Respaldos disponibles:" >&2
  ls -1t "$ROOT"/backups/db/*.dump >&2 2>/dev/null || echo "  (ninguno todavía)" >&2
  exit 2
fi

if [[ ! -f "$FILE" ]]; then
  echo "ERROR: no existe el archivo $FILE" >&2
  exit 1
fi

FILE="$(cd "$(dirname "$FILE")" && pwd)/$(basename "$FILE")"

if [[ -n "${BASE44_CONFIG_ROOT:-}" && -f "${BASE44_CONFIG_ROOT}/docker-compose.base44.yml" ]]; then
  COMPOSE_FILE="${BASE44_CONFIG_ROOT}/docker-compose.base44.yml"
else
  COMPOSE_FILE="$ROOT/docker-compose.base44.yml"
fi

dc() {
  docker compose --project-name "${COMPOSE_PROJECT_NAME:-app}" \
    --project-directory "$ROOT" -f "$COMPOSE_FILE" "$@"
}

if [[ "$CONFIRM" != "--yes" ]]; then
  echo "Se van a REEMPLAZAR todos los datos con los del archivo:"
  echo "  $FILE"
  read -r -p "Escribí RESTAURAR para continuar: " answer
  [[ "$answer" == "RESTAURAR" ]] || { echo "Cancelado."; exit 1; }
fi

mkdir -p "$ROOT/backups/db"
SAFE="$ROOT/backups/db/pre-restore-$(date +%Y%m%d-%H%M%S).dump"
echo "→ Respaldo de seguridad del estado actual: $SAFE"
dc exec -T db sh -ec 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$SAFE"
if [[ ! -s "$SAFE" ]]; then
  echo "ERROR: no se pudo respaldar el estado actual. No se restauró nada." >&2
  exit 1
fi

echo "→ Restaurando…"
dc exec -T db sh -ec \
  'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"'
dc exec -T db sh -ec \
  'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges --single-transaction --exit-on-error' < "$FILE"

echo
echo "Listo. Recargá la app (F5)."
echo "Si el respaldo es de una versión anterior, aplicá los cambios de esquema con:"
echo "  docker compose -f docker-compose.base44.yml run --rm migrate"
