/**
 * Lightweight user preferences for Atticus Lite, persisted to localStorage.
 * Kept tiny and dependency-free; a backend implementation can later sync these
 * to the partner profile.
 */

export interface LiteSettings {
  haptics: boolean;
}

const STORAGE_KEY = 'atticus.lite.settings.v1';
const DEFAULTS: LiteSettings = { haptics: true };

const isBrowser = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const loadSettings = (): LiteSettings => {
  if (!isBrowser()) return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<LiteSettings>) };
  } catch {
    return { ...DEFAULTS };
  }
};

export const saveSettings = (s: LiteSettings): void => {
  if (!isBrowser()) return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
};

export const getSetting = <K extends keyof LiteSettings>(key: K): LiteSettings[K] =>
  loadSettings()[key];
