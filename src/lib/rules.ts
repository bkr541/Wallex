import { useSyncExternalStore } from 'react';
import { syncRules } from './cloud';

// The rules the person has chosen for how Wallex counts their money: what is spending, what is income, which
// categories are bills, and where Patterns draws its lines. One object feeds every screen (Patterns, Overview and
// the detail views), so they cannot disagree. Kept in localStorage and synced to the account like the other settings.

export type RuleDays = 30 | 60 | 90;
export type IncomeFrom = 'pay' | 'all';

export interface Rules {
  countCardPayments: boolean; // count payments to a linked card as spending, even though its purchases are counted too
  ignoredMerchants: string[]; // merchant keys left out of spending everywhere
  incomeFrom: IncomeFrom; // only pay the bank tags as income, or every deposit that is not your own money moving
  defaultDays: RuleDays; // the period Patterns opens with
  minMonthly: number; // the monthly amount below which Patterns draws no circle
  maxCircles: number; // the most circles Patterns draws (the phone view shows fewer)
  billCategories: string[]; // Plaid categories whose merchants are treated as bills
}

export const BILL_CATEGORY_OPTIONS: { key: string; label: string }[] = [
  { key: 'RENT_AND_UTILITIES', label: 'Rent & Utilities' },
  { key: 'LOAN_PAYMENTS', label: 'Loan Payments' },
  { key: 'GOVERNMENT_AND_NON_PROFIT', label: 'Government' },
  { key: 'MEDICAL', label: 'Medical' },
  { key: 'GENERAL_SERVICES', label: 'Services' },
  { key: 'TRANSPORTATION', label: 'Transportation' },
  { key: 'HOME_IMPROVEMENT', label: 'Home' },
  { key: 'PERSONAL_CARE', label: 'Personal Care' },
  { key: 'ENTERTAINMENT', label: 'Entertainment' },
  { key: 'TRAVEL', label: 'Travel' },
  { key: 'FOOD_AND_DRINK', label: 'Food & Drink' },
  { key: 'GENERAL_MERCHANDISE', label: 'Shopping' },
  { key: 'BANK_FEES', label: 'Bank Fees' },
];

export const MIN_AMOUNTS = [0, 25, 50, 100] as const;
export const DAY_OPTIONS: RuleDays[] = [30, 60, 90];
export const MAX_CIRCLES_RANGE = { min: 4, max: 14 } as const;

export const DEFAULT_RULES: Rules = {
  countCardPayments: false,
  ignoredMerchants: [],
  incomeFrom: 'pay',
  defaultDays: 30,
  minMonthly: 0,
  maxCircles: 14,
  billCategories: ['RENT_AND_UTILITIES', 'LOAN_PAYMENTS', 'GOVERNMENT_AND_NON_PROFIT'],
};

const KEY = 'wallex-rules';
const CATEGORY_ORDER = BILL_CATEGORY_OPTIONS.map((o) => o.key);

const sortedCategories = (keys: string[]) =>
  [...new Set(keys)].filter((k) => CATEGORY_ORDER.includes(k)).sort((a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b));

// Anything stored (or arriving from the account) is checked, so an old or damaged value falls back to the default
// instead of breaking a screen.
export function sanitizeRules(raw: unknown): Rules {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const d = DEFAULT_RULES;
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.length > 0) : null);
  const bills = strings(r.billCategories);
  const ignored = strings(r.ignoredMerchants);
  return {
    countCardPayments: typeof r.countCardPayments === 'boolean' ? r.countCardPayments : d.countCardPayments,
    ignoredMerchants: ignored ? [...new Set(ignored)] : d.ignoredMerchants,
    incomeFrom: r.incomeFrom === 'all' || r.incomeFrom === 'pay' ? r.incomeFrom : d.incomeFrom,
    defaultDays: DAY_OPTIONS.includes(r.defaultDays as RuleDays) ? (r.defaultDays as RuleDays) : d.defaultDays,
    minMonthly: typeof r.minMonthly === 'number' && MIN_AMOUNTS.includes(r.minMonthly as (typeof MIN_AMOUNTS)[number]) ? r.minMonthly : d.minMonthly,
    maxCircles:
      typeof r.maxCircles === 'number'
        ? Math.min(MAX_CIRCLES_RANGE.max, Math.max(MAX_CIRCLES_RANGE.min, Math.round(r.maxCircles)))
        : d.maxCircles,
    billCategories: bills ? sortedCategories(bills) : d.billCategories,
  };
}

function load(): Rules {
  try {
    return sanitizeRules(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
  } catch {
    return DEFAULT_RULES;
  }
}

let state = load();
const listeners = new Set<() => void>();

function save(next: Rules) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Not remembering the choice is fine; it lasts until the app is closed.
  }
  listeners.forEach((l) => l());
}

export const getRules = () => state;

export function setRules(patch: Partial<Rules>) {
  save(sanitizeRules({ ...state, ...patch }));
  void syncRules(state);
}

export function resetRules(keys?: (keyof Rules)[]) {
  const patch: Partial<Rules> = {};
  for (const k of keys ?? (Object.keys(DEFAULT_RULES) as (keyof Rules)[])) (patch as Record<string, unknown>)[k] = DEFAULT_RULES[k];
  setRules(patch);
}

// Used when the account's saved rules arrive after sign-in.
export function hydrateRules(next: unknown) {
  save(sanitizeRules(next));
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// The rules that differ from the defaults, so a screen can say its numbers are not the standard ones.
export const changedRules = (rules: Rules): (keyof Rules)[] =>
  (Object.keys(DEFAULT_RULES) as (keyof Rules)[]).filter((k) => !same(rules[k], DEFAULT_RULES[k]));

export const rulesAreDefault = (rules: Rules) => changedRules(rules).length === 0;

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useRules = (): Rules => useSyncExternalStore(subscribe, getRules, getRules);
