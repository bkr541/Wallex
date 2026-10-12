import { useSyncExternalStore } from 'react';
import { syncGoals } from './cloud';

// Savings goals the person sets: a name, an amount to reach, and how much is set aside so far. The amounts are the
// person's own, not read from a bank account. Kept in localStorage and synced to the account like the other settings.

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  monthly: number | null; // what they plan to set aside each month, to estimate when it will be reached
  created: string; // YYYY-MM-DD
}

const KEY = 'wallex-goals';
const MAX_GOALS = 12;

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function sanitizeGoals(raw: unknown): Goal[] {
  if (!Array.isArray(raw)) return [];
  const out: Goal[] = [];
  for (const g of raw) {
    if (!g || typeof g !== 'object') continue;
    const r = g as Record<string, unknown>;
    const target = num(r.target);
    const saved = num(r.saved);
    if (typeof r.id !== 'string' || typeof r.name !== 'string' || !r.name.trim() || target === null || target <= 0) continue;
    const monthly = num(r.monthly);
    out.push({
      id: r.id,
      name: r.name.trim().slice(0, 60),
      target: Math.round(target * 100) / 100,
      saved: Math.max(0, Math.round((saved ?? 0) * 100) / 100),
      monthly: monthly !== null && monthly > 0 ? Math.round(monthly * 100) / 100 : null,
      created: typeof r.created === 'string' ? r.created : '',
    });
  }
  return out.slice(0, MAX_GOALS);
}

function load(): Goal[] {
  try {
    return sanitizeGoals(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
  } catch {
    return [];
  }
}

let state = load();
const listeners = new Set<() => void>();

function save(next: Goal[]) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Not remembering is fine; goals last until the app is closed.
  }
  listeners.forEach((l) => l());
}

export const getGoals = () => state;
export const canAddGoal = () => state.length < MAX_GOALS;

function commit(next: Goal[]) {
  save(sanitizeGoals(next));
  void syncGoals(state);
}

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function addGoal(input: { name: string; target: number; saved?: number; monthly?: number | null }) {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `g${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
  commit([...state, { id, name: input.name, target: input.target, saved: input.saved ?? 0, monthly: input.monthly ?? null, created: localToday() }]);
}

export const updateGoal = (id: string, patch: Partial<Omit<Goal, 'id' | 'created'>>) => commit(state.map((g) => (g.id === id ? { ...g, ...patch } : g)));
export const removeGoal = (id: string) => commit(state.filter((g) => g.id !== id));

// Used when the account's saved goals arrive after sign-in.
export function hydrateGoals(next: unknown) {
  save(sanitizeGoals(next));
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useGoals = (): Goal[] => useSyncExternalStore(subscribe, getGoals, getGoals);
