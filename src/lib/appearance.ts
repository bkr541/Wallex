import { useSyncExternalStore } from 'react';

// Look-and-feel preferences, remembered between launches. They are applied straight to the document
// (a theme attribute, the accent colour, the root font size), so everything built on the theme variables
// follows without knowing about them.

export type Theme = 'system' | 'light' | 'dark';
export type TextSize = 'small' | 'default' | 'large';

export interface Appearance {
  theme: Theme;
  accent: string; // id from ACCENTS
  textSize: TextSize;
  reduceMotion: boolean; // on = no movement at all, off = follow the system setting
}

export const ACCENTS = [
  { id: 'teal', name: 'Teal', color: '#4fb8a5' },
  { id: 'blue', name: 'Blue', color: '#4aa3ff' },
  { id: 'violet', name: 'Violet', color: '#a67cff' },
  { id: 'pink', name: 'Pink', color: '#ff6fa8' },
  { id: 'orange', name: 'Orange', color: '#ffa94d' },
  { id: 'green', name: 'Green', color: '#5fd38d' },
] as const;

export const TEXT_SIZES: { value: TextSize; label: string; px: number }[] = [
  { value: 'small', label: 'Small', px: 14 },
  { value: 'default', label: 'Default', px: 16 },
  { value: 'large', label: 'Large', px: 18 },
];

export const DEFAULTS: Appearance = { theme: 'dark', accent: 'teal', textSize: 'default', reduceMotion: false };

const KEY = 'wallex-appearance';

function load(): Appearance {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (raw && typeof raw === 'object') {
      return {
        theme: ['system', 'light', 'dark'].includes(raw.theme) ? raw.theme : DEFAULTS.theme,
        accent: ACCENTS.some((a) => a.id === raw.accent) ? raw.accent : DEFAULTS.accent,
        textSize: TEXT_SIZES.some((t) => t.value === raw.textSize) ? raw.textSize : DEFAULTS.textSize,
        reduceMotion: raw.reduceMotion === true,
      };
    }
  } catch {
    // Fall through to the defaults.
  }
  return DEFAULTS;
}

const systemLight = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: light)') : null;

function apply(a: Appearance) {
  const root = document.documentElement;
  const light = a.theme === 'light' || (a.theme === 'system' && !!systemLight?.matches);
  root.dataset.theme = light ? 'light' : 'dark';
  const base = ACCENTS.find((c) => c.id === a.accent)?.color ?? ACCENTS[0].color;
  // On a light background the accent is darkened a little so text in it stays readable.
  const color = light ? `color-mix(in srgb, ${base} 78%, black)` : base;
  root.style.setProperty('--accent', color);
  root.style.setProperty('--accent-soft', `color-mix(in srgb, ${color} 16%, transparent)`);
  root.style.fontSize = `${TEXT_SIZES.find((t) => t.value === a.textSize)?.px ?? 16}px`;
  root.dataset.reduceMotion = a.reduceMotion ? 'true' : 'false';
}

let state = load();
const listeners = new Set<() => void>();
apply(state);
systemLight?.addEventListener('change', () => apply(state));

export function setAppearance(patch: Partial<Appearance>) {
  state = { ...state, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Not remembering the choice is fine.
  }
  apply(state);
  listeners.forEach((l) => l());
}

export const resetAppearance = () => setAppearance(DEFAULTS);

export function useAppearance(): Appearance {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}
