/**
 * English and Spanish. English texts are the keys (they live in the config
 * and the components, as always); `src/i18n/es.ts` has their Spanish.
 * A test checks that every text has its translation.
 *
 *   t('Sol {sol}', { sol: 12 })  →  "Sol 12"
 */
import { ES } from './es';

export type Locale = 'en' | 'es';

export const LOCALES: { id: Locale; label: string; dates: string }[] = [
  { id: 'en', label: 'English', dates: 'en-GB' },
  { id: 'es', label: 'Español', dates: 'es-UY' },
];

let current: Locale = 'en';

/** Browser objects, typed loosely: this module is also bundled into the habitat server (no DOM there). */
const browser = globalThis as {
  document?: { documentElement: { lang: string } };
  localStorage?: { getItem(key: string): string | null; setItem(key: string, value: string): void };
};

const STORAGE_KEY = 'pulsar.locale';

/** Switches the language (for the whole app). */
export function setLocale(locale: Locale) {
  current = locale;
  if (browser.document) browser.document.documentElement.lang = locale;
}

/** The language a person picks: switched now and remembered on this device. */
export function chooseLocale(locale: Locale) {
  setLocale(locale);
  try {
    browser.localStorage?.setItem(STORAGE_KEY, locale);
  } catch {
    // No storage: the choice lasts while the page is open.
  }
}

export function getLocale(): Locale {
  return current;
}

/** Locale for dates and numbers (toLocaleString). */
export function dateLocale(): string {
  return LOCALES.find((l) => l.id === current)!.dates;
}

/** The text in the current language, with {placeholders} filled in. */
export function t(text: string, vars?: Record<string, string | number>): string {
  const s = current === 'es' ? (ES[text] ?? text) : text;
  return vars ? s.replace(/\{(\w+)\}/g, (m: string, k: string) => (k in vars ? String(vars[k]) : m)) : s;
}

/**
 * The language to start in: the one picked before on this device, otherwise
 * English (the judging is global), whatever the browser's language.
 */
export function initialLocale(): Locale {
  try {
    const saved = browser.localStorage?.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'es') return saved;
  } catch {
    // No storage: English.
  }
  return 'en';
}
