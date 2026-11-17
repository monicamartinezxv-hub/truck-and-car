#!/usr/bin/env bash
# Extrae un respaldo del código de la app creado por scripts/backup.sh.
#
#   ./scripts/restore-app.sh backups/app/truck-and-car-20260101-120000.tar.gz [destino]
#
# Nunca escribe encima de la copia en uso: por defecto extrae en
# restores/app-<fecha>/ para comparar o copiar a mano. Para volver al código
# respaldado en este mismo proyecto, extraé el archivo sobre la carpeta del
# proyecto: `tar -xzf <archivo> -C /ruta/del/proyecto`.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FILE="${1:-}"
DEST="${2:-$ROOT/restores/app-$(date +%Y%m%d-%H%M%S)}"

if [[ -z "$FILE" ]]; then
  echo "Uso: $0 <archivo.tar.gz> [destino]" >&2
  echo "Respaldos disponibles:" >&2
  ls -1t "$ROOT"/backups/app/*.tar.gz >&2 2>/dev/null || echo "  (ninguno todavía)" >&2
  exit 2
fi

if [[ ! -f "$FILE" ]]; then
  echo "ERROR: no existe el archivo $FILE" >&2
  exit 1
fi

if [[ -d "$DEST" && -n "$(ls -A "$DEST" 2>/dev/null)" ]]; then
  echo "ERROR: el destino $DEST ya existe y no está vacío." >&2
  exit 1
fi

mkdir -p "$DEST"
tar -xzf "$FILE" -C "$DEST"

echo "→ Código extraído en: $DEST"
echo "Para usarlo, copiá los archivos sobre el proyecto y levantá la app con"
echo "  docker compose -f docker-compose.base44.yml up -d --build"
echo "Los datos no vienen en este archivo: la base se restaura con scripts/restore-db.sh."
