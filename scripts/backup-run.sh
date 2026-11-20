#!/bin/sh
# Respaldo de la base y/o del código, ejecutado DENTRO de un contenedor que
# tenga pg_dump y tar (el servicio `web` o el servicio `backup`).
#
#   ./scripts/backup-run.sh [db|app|all]
#
# Variables:
#   DATABASE_URL    cadena de conexión (obligatoria para la base)
#   APP_ROOT        raíz del código a respaldar (por defecto /app)
#   BACKUP_DIR      carpeta destino (por defecto $APP_ROOT/backups)
#   BACKUP_KEEP     cuántos respaldos conservar por tipo (14)
#   BACKUP_ORIGIN   manual | auto  (auto agrega -auto al nombre del archivo)

set -eu

WHAT=${1:-all}
APP_ROOT=${APP_ROOT:-/app}
DIR=${BACKUP_DIR:-$APP_ROOT/backups}
KEEP=${BACKUP_KEEP:-14}
ORIGIN=${BACKUP_ORIGIN:-manual}
STAMP=$(date +%Y%m%d-%H%M%S)

if [ "$ORIGIN" = "auto" ]; then
  TAG="-auto"
else
  TAG=""
fi

prune() {
  dir=$1
  pattern=$2
  [ -d "$dir" ] || return 0
  # Los más nuevos primero; se borra todo lo que pase de KEEP.
  ls -1t "$dir"/$pattern 2>/dev/null | tail -n +"$((KEEP + 1))" | while read -r old; do
    rm -f "$old"
  done
}

backup_db() {
  mkdir -p "$DIR/db"
  file="$DIR/db/truckcar$TAG-$STAMP.dump"
  if [ -z "${DATABASE_URL:-}" ]; then
    echo "ERROR: falta DATABASE_URL" >&2
    return 1
  fi
  pg_dump "$DATABASE_URL" -Fc > "$file"
  if [ ! -s "$file" ] || ! pg_restore -l "$file" > /dev/null; then
    rm -f "$file"
    echo "ERROR: el respaldo de la base quedó vacío o ilegible" >&2
    return 1
  fi
  echo "base: $file ($(du -h "$file" | cut -f1))"
  prune "$DIR/db" 'truckcar*.dump'
}

backup_app() {
  mkdir -p "$DIR/app"
  file="$DIR/app/truck-and-car$TAG-$STAMP.tar.gz"
  tar -czf "$file" -C "$APP_ROOT" \
    --exclude=./node_modules --exclude=./.next --exclude=./.git \
    --exclude=./backups --exclude=./restores \
    --exclude=./next-env.d.ts --exclude=./tsconfig.tsbuildinfo \
    --exclude='*.log' .
  echo "app: $file ($(du -h "$file" | cut -f1))"
  prune "$DIR/app" 'truck-and-car*.tar.gz'
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
