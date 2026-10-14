import { useSyncExternalStore } from 'react';
import { syncDemo } from './cloud';
import { incomeTypeOf, INCOME_TYPE_LABEL, type IncomeType } from './incomeType';
import type { Txn } from './wallex';

// Demo mode, for showing the app to other people. With it on, transactions that match any of the suppress conditions are removed
// before anything else sees them, so they never reach Recurring, Patterns, Forecast, Schedule, Insights or a total. Only a
// developer account can turn it on (see the Demo tab), and it applies to that account only.

export const MAX_CONDITIONS = 10;

export type FieldId = 'merchant' | 'category' | 'incomeType' | 'channel' | 'status' | 'postedDate' | 'authDate' | 'amount' | 'description' | 'account';
export type OpId = 'is' | 'isNot' | 'contains' | 'notContains' | 'startsWith' | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'before' | 'after';
type Kind = 'text' | 'number' | 'date' | 'pick';

// The columns of the transactions table, as the Transactions page shows them.
export const FIELDS: { id: FieldId; label: string; kind: Kind }[] = [
  { id: 'merchant', label: 'Merchant', kind: 'text' },
  { id: 'category', label: 'Category', kind: 'text' },
  { id: 'incomeType', label: 'Income Type', kind: 'pick' },
  { id: 'channel', label: 'Type', kind: 'text' },
  { id: 'status', label: 'Status', kind: 'pick' },
  { id: 'postedDate', label: 'Posted Date', kind: 'date' },
  { id: 'authDate', label: 'Auth Date', kind: 'date' },
  { id: 'amount', label: 'Amount', kind: 'number' },
  { id: 'description', label: 'Bank Description', kind: 'text' },
  { id: 'account', label: 'Account', kind: 'text' },
];

export const OPERATORS: Record<Kind, { id: OpId; label: string }[]> = {
  text: [
    { id: 'is', label: 'is equal to' },
    { id: 'isNot', label: 'is not equal to' },
    { id: 'contains', label: 'contains' },
    { id: 'notContains', label: 'does not contain' },
    { id: 'startsWith', label: 'starts with' },
  ],
  number: [
    { id: 'gt', label: 'is greater than' },
    { id: 'gte', label: 'is at least' },
    { id: 'lt', label: 'is less than' },
    { id: 'lte', label: 'is at most' },
    { id: 'eq', label: 'is equal to' },
    { id: 'neq', label: 'is not equal to' },
  ],
  date: [
    { id: 'is', label: 'is' },
    { id: 'before', label: 'is before' },
    { id: 'after', label: 'is after' },
  ],
  pick: [
    { id: 'is', label: 'is' },
    { id: 'isNot', label: 'is not' },
  ],
};

export const kindOf = (f: FieldId): Kind => FIELDS.find((x) => x.id === f)!.kind;

export const PICK_VALUES: Record<'incomeType' | 'status', { value: string; label: string }[]> = {
  incomeType: (Object.keys(INCOME_TYPE_LABEL) as IncomeType[]).map((k) => ({ value: k, label: INCOME_TYPE_LABEL[k] })),
  status: [
    { value: 'pending', label: 'Pending' },
    { value: 'posted', label: 'Posted' },
  ],
};

export interface Condition {
  id: string;
  field: FieldId;
  op: OpId;
  value: string;
}

export interface DemoConfig {
  enabled: boolean;
  suppress: boolean;
  conditions: Condition[];
}

export const DEFAULT_DEMO: DemoConfig = { enabled: false, suppress: false, conditions: [] };

const KEY = 'wallex-demo';

export function sanitizeDemo(raw: unknown): DemoConfig {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const conditions: Condition[] = [];
  if (Array.isArray(r.conditions)) {
    for (const c of r.conditions) {
      if (!c || typeof c !== 'object') continue;
      const x = c as Record<string, unknown>;
      const field = FIELDS.find((f) => f.id === x.field)?.id;
      if (!field || typeof x.id !== 'string') continue;
      const op = OPERATORS[kindOf(field)].find((o) => o.id === x.op)?.id ?? OPERATORS[kindOf(field)][0].id;
      conditions.push({ id: x.id, field, op, value: typeof x.value === 'string' ? x.value : '' });
    }
  }
  return { enabled: r.enabled === true, suppress: r.suppress === true, conditions: conditions.slice(0, MAX_CONDITIONS) };
}

function load(): DemoConfig {
  try {
    return sanitizeDemo(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
  } catch {
    return DEFAULT_DEMO;
  }
}

let state = load();
const listeners = new Set<() => void>();

function save(next: DemoConfig) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Not remembering is fine.
  }
  listeners.forEach((l) => l());
}

export const getDemo = () => state;

export function setDemo(patch: Partial<DemoConfig>) {
  save(sanitizeDemo({ ...state, ...patch }));
  void syncDemo(state);
}

export function hydrateDemo(next: unknown) {
  save(sanitizeDemo(next));
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useDemo = (): DemoConfig => useSyncExternalStore(subscribe, getDemo, getDemo);

/* ------------------------------------------------------------------------------------------ matching */

const norm = (s: string) => s.trim().toLowerCase();
const num = (s: string) => {
  const n = Number(s.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
};

// Whether the condition is true for the transaction. A condition with no value yet is never true, so a half-written one suppresses nothing.
export function matches(t: Txn, c: Condition, accountName: (id: string) => string): boolean {
  const value = c.value;
  if (value.trim() === '') return false;
  const kind = kindOf(c.field);

  if (kind === 'number') {
    const n = num(value);
    if (n === null) return false;
    const a = Math.abs(t.amount); // the size of the amount, whether money came in or went out
    switch (c.op) {
      case 'gt': return a > n;
      case 'gte': return a >= n;
      case 'lt': return a < n;
      case 'lte': return a <= n;
      case 'eq': return Math.abs(a - n) < 0.005;
      case 'neq': return Math.abs(a - n) >= 0.005;
    }
    return false;
  }

  if (kind === 'date') {
    const d = c.field === 'authDate' ? t.authorizedDate : t.date;
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    return c.op === 'before' ? d < value : c.op === 'after' ? d > value : d === value;
  }

  if (kind === 'pick') {
    const actual = c.field === 'status' ? (t.pending ? 'pending' : 'posted') : (incomeTypeOf(t) ?? 'none');
    return c.op === 'isNot' ? actual !== value : actual === value;
  }

  const text =
    c.field === 'merchant' ? t.merchant
    : c.field === 'category' ? t.category
    : c.field === 'channel' ? t.channel
    : c.field === 'account' ? accountName(t.accountId)
    : (t.details.find((d) => d.label === 'Bank Description')?.value ?? t.merchant);
  const a = norm(text);
  const b = norm(value);
  switch (c.op) {
    case 'is': return a === b;
    case 'isNot': return a !== b;
    case 'contains': return a.includes(b);
    case 'notContains': return !a.includes(b);
    case 'startsWith': return a.startsWith(b);
  }
  return false;
}

// The transactions left once the suppress conditions are applied: one that matches any condition is removed.
export function suppressed(txns: Txn[], config: DemoConfig, accountName: (id: string) => string): { kept: Txn[]; removed: number } {
  if (!config.enabled || !config.suppress || config.conditions.length === 0) return { kept: txns, removed: 0 };
  const kept = txns.filter((t) => !config.conditions.some((c) => matches(t, c, accountName)));
  return { kept, removed: txns.length - kept.length };
}
