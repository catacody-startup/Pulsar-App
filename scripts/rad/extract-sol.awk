# Extrae de un archivo RDR del RAD (PDS PPI) una línea por observación:
#   inicio UTC (AAAA-DDD HH:MM:SS), sol y hora local de Marte, duración (s),
#   dosis total B (silicio) y E (plástico, parecido a tejido) en µGy/h.
# Uso: curl -s <URL .TXT> | awk -f extract-sol.awk
/^\[OBSERVATION:/          { utc = ""; mars = ""; dur = ""; b = ""; e = "" }
/^START_OBS_UTC=/          { split($0, a, "\""); utc = a[2] }
/^START_OBS_MARS=/         { split($0, a, "\""); mars = a[2] }
/^OBS_DURATION=/           { split($0, a, "="); dur = a[2] }
/^\[DOSIMETRY_TOTAL_DOSE_B:/ { getline; getline; b = $1 }
/^\[DOSIMETRY_TOTAL_DOSE_E:/ {
  getline; getline; e = $1
  if (utc != "" && b != "") printf "%s,%s,%s,%s,%s\n", utc, mars, dur, b, e
}
