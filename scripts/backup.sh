#!/usr/bin/env bash
# Respaldos de TRUCK AND CAR.
#
#   ./scripts/backup.sh          # base de datos + código de la app
#   ./scripts/backup.sh db       # sólo la base (pg_dump)
#   ./scripts/backup.sh app      # sólo el código (tar.gz)
#
# Los archivos quedan en backups/db/ y backups/app/ (fuera de git). Se conservan
# los últimos BACKUP_KEEP respaldos de cada tipo (14 por defecto).
#
# Para restaurar: scripts/restore-db.sh y scripts/restore-app.sh.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WHAT="${1:-all}"
KEEP="${BACKUP_KEEP:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"

if [[ -n "${BASE44_CONFIG_ROOT:-}" && -f "${BASE44_CONFIG_ROOT}/docker-compose.base44.yml" ]]; then
  COMPOSE_FILE="${BASE44_CONFIG_ROOT}/docker-compose.base44.yml"
else
  COMPOSE_FILE="$ROOT/docker-compose.base44.yml"
fi

dc() {
  docker compose --project-name "${COMPOSE_PROJECT_NAME:-app}" \
    --project-directory "$ROOT" -f "$COMPOSE_FILE" "$@"
}

prune() {
  local dir="$1" pattern="$2"
  ls -1t "$dir"/$pattern 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm -f
}

backup_db() {
  local dir="$ROOT/backups/db" file
  mkdir -p "$dir"
  file="$dir/truckcar-$STAMP.dump"
  echo "→ Base de datos: $file"
  # pg_dump en formato custom: ya viene comprimido y se restaura con pg_restore.
  dc exec -T db sh -ec 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$file"
  if [[ ! -s "$file" ]] || ! dc exec -T db pg_restore -l < "$file" > /dev/null; then
    rm -f "$file"
    echo "ERROR: el respaldo de la base quedó vacío o ilegible." >&2
    exit 1
  fi
  echo "  listo ($(du -h "$file" | cut -f1), verificado)"
  prune "$dir" 'truckcar-*.dump'
}

backup_app() {
  local dir="$ROOT/backups/app" file
  mkdir -p "$dir"
  file="$dir/truck-and-car-$STAMP.tar.gz"
  echo "→ Código de la app: $file"
  tar -czf "$file" -C "$ROOT" \
    --exclude=./node_modules --exclude=./.next --exclude=./.git \
    --exclude=./backups --exclude=./restores \
    --exclude=./next-env.d.ts --exclude=./tsconfig.tsbuildinfo \
    --exclude='*.log' .
  echo "  listo ($(du -h "$file" | cut -f1), $(tar -tzf "$file" | wc -l | tr -d ' ') archivos)"
  prune "$dir" 'truck-and-car-*.tar.gz'
}

case "$WHAT" in
  db) backup_db ;;
  app) backup_app ;;
  all)
    backup_db
    backup_app
    ;;
  *)
    echo "Uso: $0 [db|app|all]" >&2
    exit 2
    ;;
esac

echo
echo "Respaldos en: $ROOT/backups"
