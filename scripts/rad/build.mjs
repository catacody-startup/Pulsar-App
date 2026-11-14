// ============================================================================
// Arma src/data/radGale.json con la serie de dosis del RAD de Curiosity
// a partir de scripts/rad/raw/sol-NNNN.csv (ver fetch.sh).
//
// Promedia la dosis del detector E (plástico, parecido al tejido humano),
// ponderada por la duración de cada observación, en tramos de media hora
// local de Marte (48 por sol). Usa solo observaciones completas (481 o 961 s).
// Los tramos sin datos quedan en null.
//
// Uso: node scripts/rad/build.mjs
// ============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(DIR, 'raw');
const OUT = path.join(DIR, '..', '..', 'src', 'data', 'radGale.json');
const BINS = 48;
const STANDARD_DURATIONS = [481, 961];

const files = fs.readdirSync(RAW).filter((f) => /^sol-\d+\.csv$/.test(f));
const bySol = new Map();
for (const f of files) {
  for (const line of fs.readFileSync(path.join(RAW, f), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const [, mars, duration, , doseE] = line.split(',');
    const [solText, clock] = mars.split(' ');
    const [h, m, s] = clock.split(':').map(Number);
    const sol = Number(solText);
    const hours = h + m / 60 + s / 3600;
    const bin = Math.min(BINS - 1, Math.floor((hours / 24) * BINS));
    const dose = Number(doseE);
    const weight = Number(duration);
    if (!Number.isFinite(dose) || !Number.isFinite(weight) || dose <= 0) continue;
    // RAD observes in blocks of 481 s or 961 s; observations of other lengths are
    // cut short at the end of a block and read low, so they are left out.
    if (!STANDARD_DURATIONS.some((d) => Math.abs(weight - d) <= 10)) continue;
    if (!bySol.has(sol)) bySol.set(sol, Array.from({ length: BINS }, () => ({ sum: 0, w: 0 })));
    const cell = bySol.get(sol)[bin];
    cell.sum += dose * weight;
    cell.w += weight;
  }
}

const sols = [...bySol.keys()].sort((a, b) => a - b);
const firstSol = sols[0];
const lastSol = sols.at(-1);
const values = [];
for (let sol = firstSol; sol <= lastSol; sol++) {
  const bins = bySol.get(sol);
  values.push(bins ? bins.map((c) => (c.w > 0 ? Math.round((c.sum / c.w) * 100) / 100 : null)) : Array(BINS).fill(null));
}

const out = {
  source: 'NASA PDS Planetary Plasma Interactions node, MSL RAD Reduced Data Records (MSL-M-RAD-3-RDR-V1.0)',
  url: 'https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/',
  detector: 'E (plastic, tissue-equivalent): total dose rate',
  unit: 'µGy/h',
  firstSol,
  binsPerSol: BINS,
  values,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out) + '\n');

// Resumen por sol, para elegir los soles tranquilos y ubicar el evento.
for (let i = 0; i < values.length; i++) {
  const v = values[i].filter((x) => x !== null);
  const mean = v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
  const max = v.length ? Math.max(...v) : NaN;
  console.log(`sol ${firstSol + i}: ${v.length}/${BINS} tramos, media ${mean.toFixed(2)}, máx ${max.toFixed(2)} µGy/h`);
}
console.log(`→ ${path.relative(process.cwd(), OUT)}`);
