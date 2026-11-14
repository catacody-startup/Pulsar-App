// ============================================================================
// Guarda en src/data/donkiSep2017.json las respuestas de DONKI (NASA) de los
// días del evento de septiembre de 2017, recortadas a los campos que usa
// Pulsar. Sirven para repetir el evento en la demo y como datos de los tests.
//
// Pide los datos al proxy de Pulsar (que agrega la key de NASA), o los lee de
// respuestas ya bajadas (CME.json, SEP.json, GST.json, IPS.json en una carpeta):
//   node scripts/donki/snapshot.mjs [https://pulsar.catacody.com]
//   node scripts/donki/snapshot.mjs --dir <carpeta>
// ============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = process.argv[2] === '--dir' ? process.argv[3] : null;
const BASE = (!DIR && process.argv[2]) || 'https://pulsar.catacody.com';
const START = '2017-09-04';
const END = '2017-09-20';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'data', 'donkiSep2017.json');

async function get(type) {
  if (DIR) return JSON.parse(fs.readFileSync(path.join(DIR, `${type}.json`), 'utf8'));
  const res = await fetch(`${BASE}/api/donki/${type}?startDate=${START}&endDate=${END}`);
  if (!res.ok) throw new Error(`${type}: HTTP ${res.status}`);
  return res.json();
}

const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));

const [cme, sep, gst, ips] = await Promise.all(['CME', 'SEP', 'GST', 'IPS'].map(get));
const out = {
  source: 'NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information), via api.nasa.gov',
  range: { startDate: START, endDate: END },
  CME: cme.map((c) => ({
    ...pick(c, ['activityID', 'startTime', 'sourceLocation', 'link']),
    cmeAnalyses: (c.cmeAnalyses ?? []).map((a) => ({
      ...pick(a, ['isMostAccurate', 'speed', 'type']),
      enlilList: (a.enlilList ?? []).map((e) => ({
        ...pick(e, ['estimatedShockArrivalTime']),
        impactList: (e.impactList ?? []).map((i) => pick(i, ['location', 'arrivalTime', 'isGlancingBlow'])),
      })),
    })),
  })),
  SEP: sep.map((s) => ({
    ...pick(s, ['sepID', 'eventTime', 'link']),
    instruments: (s.instruments ?? []).map((i) => pick(i, ['displayName'])),
  })),
  GST: gst.map((g) => ({
    ...pick(g, ['gstID', 'startTime', 'link']),
    allKpIndex: (g.allKpIndex ?? []).map((k) => pick(k, ['observedTime', 'kpIndex'])),
  })),
  IPS: ips.map((i) => pick(i, ['activityID', 'location', 'eventTime', 'link'])),
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`CME ${cme.length} · SEP ${sep.length} · GST ${gst.length} · IPS ${ips.length} → ${path.relative(process.cwd(), OUT)}`);
