#!/usr/bin/env bash
# ============================================================================
# Baja del PDS (nodo PPI) las observaciones del RAD de Curiosity para un rango
# de soles y guarda una línea por observación en scripts/rad/raw/sol-NNNN.csv:
#   utc, sol y hora local de Marte, duración (s), dosis B y E (µGy/h).
#
# Dataset: MSL-M-RAD-3-RDR-V1.0 (https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/)
# Cada archivo de un sol pesa ~86 MB: se procesa en streaming, sin guardarlo.
#
# Uso: bash scripts/rad/fetch.sh 1780 1830 [procesos en paralelo, 4 por defecto]
# ============================================================================
set -euo pipefail

FROM=${1:?primer sol}
TO=${2:?último sol}
JOBS=${3:-4}
BASE="https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/DATA"
DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DIR/raw"
mkdir -p "$OUT"

# Carpetas del tipo SOL_01773_01869/ y el rango de soles que cubren.
FOLDERS=$(curl -fsS "$BASE/" | grep -o 'SOL_[0-9]\{5\}_[0-9]\{5\}' | sort -u)

fetch_sol() {
  local sol=$1 folder file
  for f in $FOLDERS; do
    local lo=$((10#${f:4:5})) hi=$((10#${f:10:5}))
    if (( sol >= lo && sol <= hi )); then folder=$f; break; fi
  done
  [ -n "${folder:-}" ] || { echo "sol $sol: sin carpeta" >&2; return 0; }
  file=$(curl -fsS "$BASE/$folder/" | grep -o "RAD_RDR_[0-9_]*_$(printf %04d "$sol")_V[0-9]*\.TXT" | sort -u | tail -1)
  [ -n "$file" ] || { echo "sol $sol: sin archivo" >&2; return 0; }
  curl -fsS --retry 3 "$BASE/$folder/$file" | awk -f "$DIR/extract-sol.awk" > "$OUT/sol-$sol.csv.tmp"
  mv "$OUT/sol-$sol.csv.tmp" "$OUT/sol-$sol.csv"
  echo "sol $sol: $(wc -l < "$OUT/sol-$sol.csv") observaciones ($file)"
}
export -f fetch_sol
export BASE DIR OUT FOLDERS

seq "$FROM" "$TO" | xargs -P "$JOBS" -I{} bash -c 'fetch_sol {}'
