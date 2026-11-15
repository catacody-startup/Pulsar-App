import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DATA_SOURCES } from '../config/about';
import { ACTIONS, NO_ALERTS_TEXT, PLAN_ITEM_LABEL, SPACE_WEATHER_HEADS_UP, ACTION_DONE } from '../config/actions';
import { CHECKIN_QUESTIONS } from '../config/checkin';
import { CREW } from '../config/crew';
import { MISSION } from '../config/mission';
import { ACTIVITY_LABEL, INDICATORS, STATUS_LABEL } from '../config/indicators';
import { SCENARIOS } from '../config/scenarios';
import { SPACE_WEATHER_LABEL } from '../config/spaceWeather';
import { RULES } from '../config/thresholds';
import { TREND_RANGES } from '../config/trends';
import { ES } from './es';
import { chooseLocale, initialLocale, setLocale, t } from './i18n';

/** Texts of the config that the app shows (translated where they are shown). */
function configTexts(): string[] {
  const out: string[] = [];
  for (const r of Object.values(RULES) as { text: string; basis?: string }[]) out.push(r.text, ...(r.basis ? [r.basis] : []));
  for (const a of Object.values(ACTIONS)) out.push(a.title, ...a.steps);
  out.push(...SPACE_WEATHER_HEADS_UP.steps, NO_ALERTS_TEXT, ...Object.values(PLAN_ITEM_LABEL), ACTION_DONE.button, ACTION_DONE.undo);
  for (const q of CHECKIN_QUESTIONS) out.push(q.question, q.low, q.high);
  for (const s of SCENARIOS) out.push(s.label, s.description);
  for (const i of Object.values(INDICATORS)) out.push(i.label, i.inSentence, i.unit);
  out.push(...Object.values(STATUS_LABEL), ...Object.values(ACTIVITY_LABEL), ...Object.values(SPACE_WEATHER_LABEL));
  out.push(MISSION.site.name, ...CREW.map((c) => c.role), ...TREND_RANGES.map((r) => r.label), ...DATA_SOURCES.map((d) => d.use));
  return out;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !name.endsWith('.test.ts') ? [path] : [];
  });
}

/** The literal texts given to t(…): every quoted string in its first argument (ternaries included). */
function literalKeys(code: string): string[] {
  const keys: string[] = [];
  const call = /(?<![\w.])t\(/g;
  for (let m = call.exec(code); m; m = call.exec(code)) {
    let depth = 0;
    for (let i = m.index + 2; i < code.length; i++) {
      const c = code[i]!;
      if (c === "'") {
        let j = i + 1;
        let s = '';
        while (code[j] !== "'") {
          if (code[j] === '\\') j++;
          s += code[j];
          j++;
        }
        keys.push(s);
        i = j;
      } else if (c === '(' || c === '[' || c === '{') {
        if (c === '{' && depth === 0) break; // the vars
        depth++;
      } else if (c === ')' || c === ']' || c === '}') {
        if (depth === 0) break;
        depth--;
      } else if (c === ',' && depth === 0) break;
    }
  }
  return keys;
}

/** Messages of the habitat server that devices may show. */
function serverKeys(): string[] {
  const code = readFileSync(join(__dirname, '../../server/app.ts'), 'utf8');
  return [...code.matchAll(/new HttpError\(\d+, '([^']+)'/g)].map((m) => m[1]!);
}

const hasWords = (s: string) => /[A-Za-z]{2,}/.test(s);

describe('translations', () => {
  afterEach(() => setLocale('en'));

  it('every text of the config, the components and the server has its Spanish', () => {
    const code = sourceFiles(join(__dirname, '..')).map((f) => readFileSync(f, 'utf8'));
    const keys = new Set([...configTexts(), ...code.flatMap(literalKeys), ...serverKeys()].filter(hasWords));
    const missing = [...keys].filter((k) => !(k in ES));
    // I18N_DUMP=<file>: write the missing texts there, to translate them.
    if (process.env.I18N_DUMP) writeFileSync(process.env.I18N_DUMP, JSON.stringify(missing, null, 1));
    expect(missing, `Missing in src/i18n/es.ts:\n${missing.map((k) => JSON.stringify(k)).join(',\n')}`).toEqual([]);
  });

  it('keeps the placeholders of each text', () => {
    for (const [en, es] of Object.entries(ES)) {
      const names = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
      expect(names(es), en).toEqual(names(en));
    }
  });

  it('starts in English, whatever the browser says, and remembers the language picked', () => {
    const store = new Map<string, string>();
    const g = globalThis as { localStorage?: unknown; navigator?: unknown };
    const saved = { localStorage: g.localStorage };
    g.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    try {
      expect(initialLocale()).toBe('en');
      chooseLocale('es');
      expect(initialLocale()).toBe('es');
      chooseLocale('en');
      expect(initialLocale()).toBe('en');
    } finally {
      g.localStorage = saved.localStorage;
    }
  });

  it('translates and fills in placeholders', () => {
    expect(t('Sol {sol}', { sol: 12 })).toBe('Sol 12');
    setLocale('es');
    expect(t('Am I OK?')).toBe('¿Estoy bien?');
    expect(t('Not a key at all')).toBe('Not a key at all');
  });
});
