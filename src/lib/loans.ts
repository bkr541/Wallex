import { useSyncExternalStore } from 'react';
import type { Txn } from './wallex';

// Loans the person types in themselves: buy-now-pay-later plans, a car, a personal loan. Banks and Plaid have no
// feed for most of these, so Wallex keeps the details on this device and works out the rest.

export type LoanFrequency = 'weekly' | 'biweekly' | 'monthly';

export interface Loan {
  id: string;
  lender: string;
  item: string; // what it paid for, optional
  amount: number; // what was financed, after any down payment
  apr: number; // yearly interest in percent; 0 for most pay-in-4 plans
  count: number; // how many payments in all
  frequency: LoanFrequency;
  firstDate: string; // YYYY-MM-DD, the first payment
}

export const FREQUENCIES: { value: LoanFrequency; label: string; perYear: number }[] = [
  { value: 'weekly', label: 'Every week', perYear: 52 },
  { value: 'biweekly', label: 'Every 2 weeks', perYear: 26 },
  { value: 'monthly', label: 'Every month', perYear: 12 },
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
const KEY = 'wallex-loans';

function load(): Loan[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((l) => l && typeof l.id === 'string' && typeof l.lender === 'string' && Number(l.amount) > 0 && Number(l.count) > 0 && isDate(String(l.firstDate)))
      .map((l) => ({
        id: l.id,
        lender: l.lender,
        item: typeof l.item === 'string' ? l.item : '',
        amount: Number(l.amount),
        apr: Number(l.apr) || 0,
        count: Math.round(Number(l.count)),
        frequency: ['weekly', 'biweekly', 'monthly'].includes(l.frequency) ? l.frequency : 'monthly',
        firstDate: String(l.firstDate),
      }));
  } catch {
    return [];
  }
}

let state: Loan[] = load();
const listeners = new Set<() => void>();
function commit(next: Loan[]) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // The change then lasts until the app closes.
  }
  listeners.forEach((l) => l());
}

export const saveLoan = (loan: Loan) => commit(state.some((l) => l.id === loan.id) ? state.map((l) => (l.id === loan.id ? loan : l)) : [...state, loan]);
export const removeLoan = (id: string) => commit(state.filter((l) => l.id !== id));
export const newLoanId = () => `loan-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function useLoans(): Loan[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
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

export interface BankLoanHint {
  lender: string;
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
      payments: sorted.length,
      typical: amounts[Math.floor(amounts.length / 2)],
      last: sorted[sorted.length - 1].date,
      first: sorted[0].date,
      frequency: gap <= 9 ? 'weekly' : gap <= 20 ? 'biweekly' : 'monthly',
    } as BankLoanHint;
  });
}
