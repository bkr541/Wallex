import { useMemo, useSyncExternalStore } from 'react';
import { analyze, type Analysis, type Confidence, type Kind, type Recurring } from './recurring';
import type { LinkedAccount, Txn } from './wallex';

const EMPTY: LinkedAccount[] = [];

// Corrections the user makes to what Wallex detected: a new name, a confirmed type, or "this isn't
// a bill". They are kept in the app's own browser storage (localStorage), which Electron saves in
// the user's profile on this computer, so they survive restarts but are not synced between devices
// and are not part of the Plaid data. The detector itself is never changed: corrections are applied
// on top of its result.

export type HideReason = 'transfer' | 'not-recurring' | 'ignored';

export interface Override {
  label?: string; // the user's own name for it
  kind?: Kind; // the type the user confirmed
  hide?: HideReason; // taken out of the list and the totals
}

type Store = Record<string, Override>;

const KEY = 'wallex-recurring-overrides';
const listeners = new Set<() => void>();
let cache: Store | null = null;

function read(): Store {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function write(next: Store) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage can be blocked; the corrections then last until the app is closed.
  }
  listeners.forEach((l) => l());
}

// Merges into what is already saved for this relationship. An empty result removes the entry.
export function setOverride(id: string, patch: Partial<Override> | null) {
  const store = { ...read() };
  const merged: Override = patch === null ? {} : { ...store[id], ...patch };
  for (const k of Object.keys(merged) as (keyof Override)[]) if (merged[k] === undefined || merged[k] === '') delete merged[k];
  if (Object.keys(merged).length === 0) delete store[id];
  else store[id] = merged;
  write(store);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useOverrides = (): Store => useSyncExternalStore(subscribe, read, read);

export interface Corrected extends Recurring {
  originalName: string;
  originalKind: Kind;
  corrected: boolean; // the user changed something
  userConfirmed: boolean;
  hideReason?: HideReason;
}

const monthlyFromSchedule = (r: Recurring) =>
  r.schedule.length ? r.schedule.reduce((s, p) => s + (p.typical * 30.4375) / p.periodDays, 0) : null;

const KIND_SUMMARY: Record<Kind, string> = {
  bill: 'Bill',
  debt: 'Debt Payment',
  installment: 'Installment',
  subscription: 'Subscription',
  usage: 'Subscription + Usage',
  aggregator: 'Billing Aggregator',
  habit: 'Recurring Habit',
};

// Puts the user's corrections over a fresh analysis. A confirmed type counts as certain, and a billing
// wrapper the user has identified is counted like any other relationship. Hidden ones are returned
// separately so they can be restored.
export function applyOverrides(analysis: Analysis, overrides: Store): Analysis {
  const items: Recurring[] = [];
  const hidden: Recurring[] = [];

  for (const r of analysis.items) {
    const o = overrides[r.id];
    const base: Corrected = { ...r, originalName: r.name, originalKind: r.kind, corrected: !!o, userConfirmed: false };
    if (!o) {
      items.push(base);
      continue;
    }
    if (o.label) base.name = o.label;
    if (o.kind) {
      base.kind = o.kind;
      base.userConfirmed = true;
      base.confidence = 'confirmed' as Confidence;
      base.summary = `${KIND_SUMMARY[o.kind]} · ${r.charges.length || r.recent.length} charges`;
      if (base.status === 'review' || base.status === 'new') base.status = base.active ? 'active' : 'possibly-ended';
      base.uncertainty = null;
      if (base.monthly === null && base.active) {
        base.monthly = monthlyFromSchedule(r);
        base.annual = base.monthly === null ? null : base.monthly * 12;
        base.annualApprox = true;
      }
    }
    if (o.hide) {
      base.hideReason = o.hide;
      hidden.push(base);
    } else {
      items.push(base);
    }
  }

  const order: Confidence[] = ['confirmed', 'likely', 'new', 'review', 'habit'];
  items.sort((a, b) => {
    const c = order.indexOf(a.confidence) - order.indexOf(b.confidence);
    return c !== 0 ? c : (b.monthly ?? 0) - (a.monthly ?? 0) || a.name.localeCompare(b.name);
  });

  const counts: Record<Confidence, number> = { confirmed: 0, likely: 0, new: 0, review: 0, habit: 0 };
  for (const i of items) counts[i.confidence]++;
  const counted = items.filter((i) => i.active && i.monthly && i.confidence !== 'review' && i.confidence !== 'habit');

  return { ...analysis, items, hidden, counts, monthlyTotal: counted.reduce((s, i) => s + (i.monthly ?? 0), 0) };
}

// The detector's result with the user's corrections on top, recomputed when either changes.
// Pass every linked account's transactions (cards included) and the accounts, so a subscription paid with a
// card is found too and knows it was paid on a card.
export function useRecurring(transactions: Txn[] | null, accounts: LinkedAccount[] = EMPTY): Analysis | null {
  const overrides = useOverrides();
  const base = useMemo(
    () => (transactions ? analyze(transactions, undefined, new Set(accounts.filter((a) => a.type === 'credit').map((a) => a.id))) : null),
    [transactions, accounts],
  );
  return useMemo(() => (base ? applyOverrides(base, overrides) : null), [base, overrides]);
}
