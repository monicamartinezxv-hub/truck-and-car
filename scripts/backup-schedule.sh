#!/bin/sh
# Respaldo automático diario. Lo corre el servicio `backup` del compose
# (imagen postgres:16-alpine con el código montado y TZ=America/Asuncion).
#
#   BACKUP_AT=23:00 ./scripts/backup-schedule.sh
#
# Revisa la hora cada 20 segundos y dispara el respaldo una sola vez por día.

set -eu

APP_ROOT=${APP_ROOT:-/app}
RUN_AT=${BACKUP_AT:-23:00}

echo "Respaldo automático diario a las $RUN_AT (TZ=${TZ:-UTC})"

last=""
while true; do
  now=$(date +%H:%M)
  today=$(date +%F)
  if [ "$now" = "$RUN_AT" ] && [ "$last" != "$today" ]; then
    # Se marca antes de correr para no repetirlo dentro del mismo minuto.
    last=$today
    echo "[$(date '+%F %H:%M')] iniciando respaldo automático"
    BACKUP_ORIGIN=auto "$APP_ROOT/scripts/backup-run.sh" all \
      || echo "[$(date '+%F %H:%M')] ERROR: el respaldo automático falló"
  fi
  sleep 20
done
