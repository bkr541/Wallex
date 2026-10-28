import { useSyncExternalStore } from 'react';
import { syncedRepository } from './loanRepo';
import type { Txn } from './wallex';

// Loans the person types in themselves: buy-now-pay-later plans, a car, a personal loan. Banks and Plaid have no
// feed for most of these, so Wallex keeps the details on this device and works out the rest.

export type LoanFrequency = 'weekly' | 'biweekly' | 'monthly';

// What kind of loan it is, set by the person. It does not depend on the lender's name or on how the bank tags the payments.
export type LoanType = 'bnpl' | 'personal' | 'auto' | 'other';

export const LOAN_TYPES: { value: LoanType; label: string }[] = [
  { value: 'bnpl', label: 'Buy Now, Pay Later' },
  { value: 'personal', label: 'Personal Loan' },
  { value: 'auto', label: 'Auto Loan' },
  { value: 'other', label: 'Other Loan' },
];

export const loanTypeLabel = (t: LoanType) => LOAN_TYPES.find((x) => x.value === t)?.label ?? 'Other Loan';

// What a pay-later plan was for. Every field is optional: nothing is filled in on the person's behalf.
export interface BnplDetails {
  merchant?: string; // the store the purchase was made at
  category?: string; // what kind of purchase it was
  purchaseDate?: string; // YYYY-MM-DD
  purchaseAmount?: number; // the full price, before any down payment
  downPayment?: number; // paid up front, so not part of the amount financed
  planId?: string; // the provider's own reference for the plan
}

export interface Loan {
  id: string;
  lender: string; // for a pay-later plan, the provider
  item: string; // what it paid for, optional; for a pay-later plan, the purchase description
  amount: number; // what was financed, after any down payment
  apr: number; // yearly interest in percent; 0 for most pay-in-4 plans
  count: number; // how many payments in all
  frequency: LoanFrequency;
  firstDate: string; // YYYY-MM-DD, the first payment
  type?: LoanType; // missing on loans saved before types existed, until the person picks one
  bnpl?: BnplDetails;
}

export const FREQUENCIES: { value: LoanFrequency; label: string; perYear: number }[] = [
  { value: 'weekly', label: 'Weekly', perYear: 52 },
  { value: 'biweekly', label: 'BiWeekly', perYear: 26 },
  { value: 'monthly', label: 'Monthly', perYear: 12 },
];

const cents = (n: number) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------------------------------------------- dates */
// Dates are YYYY-MM-DD strings, worked out in UTC so a time zone can never move a payment to another day.
const parse = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m: m - 1, d };
};
const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function addPeriods(iso: string, frequency: LoanFrequency, n: number): string {
  const { y, m, d } = parse(iso);
  if (frequency === 'monthly') {
    const t = m + n;
    const year = y + Math.floor(t / 12);
    const month = ((t % 12) + 12) % 12;
    const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return fmt(Date.UTC(year, month, Math.min(d, last))); // the 31st lands on the 30th or 28th in a short month
  }
  return fmt(Date.UTC(y, m, d + n * (frequency === 'weekly' ? 7 : 14)));
}

export const todayIso = () => {
  const t = new Date();
  return fmt(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()));
};

export const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/* ------------------------------------------------------------------------------------------------ maths */
export interface Installment {
  n: number; // 1-based
  date: string;
  payment: number;
  interest: number;
  principal: number;
  balance: number; // what is still owed after this one
}

const ratePerPeriod = (l: Pick<Loan, 'apr' | 'frequency'>) =>
  l.apr / 100 / (FREQUENCIES.find((f) => f.value === l.frequency)?.perYear ?? 12);

// The regular payment: an even split when there is no interest, the standard loan formula when there is.
export function paymentFor(l: Pick<Loan, 'amount' | 'apr' | 'count' | 'frequency'>): number {
  if (!(l.amount > 0) || !(l.count > 0)) return 0;
  const r = ratePerPeriod(l);
  if (r === 0) return cents(l.amount / l.count);
  return cents((l.amount * r) / (1 - Math.pow(1 + r, -l.count)));
}

// Every payment from the first to the last. The final one clears whatever is left, so rounding never leaves a stray cent.
export function scheduleFor(l: Loan): Installment[] {
  const out: Installment[] = [];
  const pmt = paymentFor(l);
  const r = ratePerPeriod(l);
  let balance = l.amount;
  for (let n = 1; n <= l.count; n++) {
    const interest = cents(balance * r);
    const last = n === l.count;
    const payment = last ? cents(balance + interest) : pmt;
    const principal = cents(payment - interest);
    balance = last ? 0 : cents(balance - principal);
    out.push({ n, date: addPeriods(l.firstDate, l.frequency, n - 1), payment, interest, principal, balance });
  }
  return out;
}

export interface LoanStatus {
  schedule: Installment[];
  payment: number;
  paid: number; // payments whose date has come
  left: number; // payments still to make
  remaining: number; // what is still owed
  paidOff: number; // 0..1 of the amount financed
  next: Installment | null;
  payoffDate: string;
  totalInterest: number;
  totalToPay: number;
  done: boolean;
  notStarted: boolean;
}

// A payment counts as made once its date has come. The balance follows the calendar, so it stays right without anyone
// having to tick payments off.
export function statusFor(l: Loan, today = todayIso()): LoanStatus {
  const schedule = scheduleFor(l);
  const paidList = schedule.filter((s) => s.date <= today);
  const paid = paidList.length;
  const remaining = paid === 0 ? l.amount : schedule[paid - 1].balance;
  const next = schedule[paid] ?? null;
  const totalInterest = cents(schedule.reduce((s, i) => s + i.interest, 0));
  return {
    schedule,
    payment: paymentFor(l),
    paid,
    left: l.count - paid,
    remaining,
    paidOff: l.amount > 0 ? Math.min(1, Math.max(0, (l.amount - remaining) / l.amount)) : 0,
    next,
    payoffDate: schedule[schedule.length - 1]?.date ?? l.firstDate,
    totalInterest,
    totalToPay: cents(l.amount + totalInterest),
    done: paid >= l.count,
    notStarted: paid === 0,
  };
}

/* ----------------------------------------------------------------------------------------------- storage */
const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const money = (v: unknown, min: number) => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= min ? n : undefined;
};

function normalizeBnpl(raw: unknown): BnplDetails | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const purchaseDate = typeof r.purchaseDate === 'string' && isDate(r.purchaseDate) ? r.purchaseDate : undefined;
  const purchaseAmount = money(r.purchaseAmount, 0);
  const out: BnplDetails = {
    merchant: text(r.merchant),
    category: text(r.category),
    purchaseDate,
    purchaseAmount: purchaseAmount && purchaseAmount > 0 ? purchaseAmount : undefined,
    downPayment: money(r.downPayment, 0),
    planId: text(r.planId),
  };
  for (const k of Object.keys(out) as (keyof BnplDetails)[]) if (out[k] === undefined) delete out[k];
  return Object.keys(out).length ? out : undefined;
}

// Reads one stored loan. Loans saved before types existed come back without a type, and are never guessed to be pay-later.
export function normalizeLoan(raw: unknown): Loan | null {
  if (!raw || typeof raw !== 'object') return null;
  const l = raw as Record<string, unknown>;
  if (typeof l.id !== 'string' || typeof l.lender !== 'string') return null;
  if (!(Number(l.amount) > 0) || !(Number(l.count) > 0) || !isDate(String(l.firstDate))) return null;
  const loan: Loan = {
    id: l.id,
    lender: l.lender,
    item: typeof l.item === 'string' ? l.item : '',
    amount: Number(l.amount),
    apr: Number(l.apr) || 0,
    count: Math.round(Number(l.count)),
    frequency: ['weekly', 'biweekly', 'monthly'].includes(l.frequency as string) ? (l.frequency as LoanFrequency) : 'monthly',
    firstDate: String(l.firstDate),
  };
  if (LOAN_TYPES.some((t) => t.value === l.type)) loan.type = l.type as LoanType;
  const bnpl = normalizeBnpl(l.bnpl);
  if (bnpl) loan.bnpl = bnpl;
  return loan;
}

export function normalizeLoans(raw: unknown): Loan[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeLoan).filter((l): l is Loan => l !== null);
}

// Where loans saved before accounts existed were kept: one key on the device, shared by whoever used it. It is never read as
// the signed-in person's loans. loanMigration.ts offers it to the account that is signed in, and only on their say-so.
export const LEGACY_LOANS_KEY = 'wallex-loans';

export interface LoanRepository {
  load(): Loan[];
  save(loans: Loan[]): void;
}

// The loans of whoever is signed in. They live in memory; every change goes to `repo` (the account, via loanSync.ts), and
// `hydrate` replaces them when the account's copy arrives or when the person changes.
export function createLoanStore(repo: LoanRepository) {
  let state: Loan[] = normalizeLoans(repo.load());
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  return {
    get: () => state,
    subscribe(cb: () => void) {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },
    save(loan: Loan) {
      state = state.some((l) => l.id === loan.id) ? state.map((l) => (l.id === loan.id ? loan : l)) : [...state, loan];
      repo.save(state);
      notify();
    },
    remove(id: string) {
      state = state.filter((l) => l.id !== id);
      repo.save(state);
      notify();
    },
    hydrate(next: Loan[]) {
      state = next;
      notify();
    },
  };
}

export const loanStore = createLoanStore(syncedRepository<Loan>('loan'));

export const saveLoan = (loan: Loan) => loanStore.save(loan);
export const removeLoan = (id: string) => loanStore.remove(id);
export const getLoans = () => loanStore.get();
export const hydrateLoans = (next: Loan[]) => loanStore.hydrate(next);
export const newLoanId = () => `loan-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function useLoans(): Loan[] {
  return useSyncExternalStore(loanStore.subscribe, loanStore.get);
}

/* ------------------------------------------------------------------------------------- finding them in the bank */
const LENDERS: { test: RegExp; name: string }[] = [
  { test: /AFFIRM/i, name: 'Affirm' },
  { test: /KLARNA/i, name: 'Klarna' },
  { test: /AFTERPAY/i, name: 'Afterpay' },
  { test: /SEZZLE/i, name: 'Sezzle' },
  { test: /QUADPAY|\bZIP\s?(PAY|CO)\b/i, name: 'Zip' },
  { test: /PAYPAL\s*CREDIT|PAYPAL.*PAY\s*IN\s*4/i, name: 'PayPal Credit' },
  { test: /PERPAY/i, name: 'Perpay' },
];

// The well-known pay-later provider a piece of text names, spelled the one way: "AFFIRM INC 4NF" and "affirm" both give "Affirm".
export const providerOf = (text: string): string | undefined => {
  const name = text.trim();
  if (!name) return undefined;
  return LENDERS.find((l) => l.name.toLowerCase() === name.toLowerCase() || l.test.test(name))?.name;
};

// Whether a lender's name is one of the pay-later providers above. It only suggests a type: the person confirms it.
export const suggestedLoanType = (lender: string): LoanType | undefined => (providerOf(lender) ? 'bnpl' : undefined);

export interface BankLoanHint {
  lender: string;
  logos: string[];
  payments: number;
  typical: number; // the usual payment
  last: string;
  first: string;
  frequency: LoanFrequency;
}

// Payments to well-known pay-later lenders, found in the bank's own transactions. They show that a plan exists and what it
// costs each time, but not what it was for or how many payments there are, so the person fills in the rest.
export function bankLoanHints(txns: Txn[]): BankLoanHint[] {
  const by = new Map<string, Txn[]>();
  for (const t of txns) {
    if (t.amount >= 0) continue;
    const lender = LENDERS.find((l) => l.test.test(`${t.merchant} ${t.category}`))?.name;
    if (lender) by.set(lender, [...(by.get(lender) ?? []), t]);
  }
  return [...by.entries()].map(([lender, list]) => {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    const gaps = sorted.slice(1).map((t, i) => (Date.parse(t.date) - Date.parse(sorted[i].date)) / 86_400_000).sort((a, b) => a - b);
    const gap = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 30;
    const amounts = sorted.map((t) => Math.abs(t.amount)).sort((a, b) => a - b);
    return {
      lender,
      logos: [...new Set([...sorted].reverse().flatMap((t) => t.logos))],
      payments: sorted.length,
      typical: amounts[Math.floor(amounts.length / 2)],
      last: sorted[sorted.length - 1].date,
      first: sorted[0].date,
      frequency: gap <= 9 ? 'weekly' : gap <= 20 ? 'biweekly' : 'monthly',
    } as BankLoanHint;
  });
}
