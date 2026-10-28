import { useSyncExternalStore } from 'react';
import { syncedRepository } from './loanRepo';
import { isDate } from './loans.ts';

// What the person records themselves about a loan: payments made outside the bank feed (cash, the lender's app, a
// card Wallex cannot see) and adjustments such as a waived installment. Bank-confirmed payments live in loanLinks.ts;
// the sum of all of it is worked out in repayment.ts.

export type PaymentSource = 'bank-transfer' | 'debit-card' | 'credit-card' | 'lender-app' | 'cash' | 'other';

export const PAYMENT_SOURCES: { value: PaymentSource; label: string }[] = [
  { value: 'lender-app', label: 'Lender’s App' },
  { value: 'debit-card', label: 'Debit Card' },
  { value: 'credit-card', label: 'Credit Card' },
  { value: 'bank-transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
];
export const sourceLabel = (s: PaymentSource) => PAYMENT_SOURCES.find((x) => x.value === s)?.label ?? 'Other';

export interface ManualPayment {
  id: string;
  loanId: string;
  installment?: number; // the installment it pays; without one it goes to the oldest unpaid installment
  amount: number; // positive, what was paid
  date: string; // YYYY-MM-DD
  source: PaymentSource;
  note?: string;
  createdAt: string;
}

// 'waived' and 'canceled' take an installment off what is owed, and only ever because the person said so.
// A 'fee' is an extra charge the lender added; it is recorded but does not change the schedule.
export type AdjustmentKind = 'waived' | 'canceled' | 'fee';

export interface LoanAdjustment {
  id: string;
  loanId: string;
  kind: AdjustmentKind;
  installment?: number; // required for waived and canceled
  amount?: number; // required for a fee
  date?: string;
  note?: string;
  createdAt: string;
}

export interface PaymentData {
  payments: ManualPayment[];
  adjustments: LoanAdjustment[];
}

/* -------------------------------------------------------------------------------------------- reading */
const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const SOURCES = PAYMENT_SOURCES.map((s) => s.value);

export function normalizePayments(raw: unknown): ManualPayment[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: ManualPayment[] = [];
  for (const r of raw) {
    const p = (r ?? {}) as Record<string, unknown>;
    if (typeof p.id !== 'string' || typeof p.loanId !== 'string' || seen.has(p.id)) continue;
    if (!(Number(p.amount) > 0) || !isDate(String(p.date))) continue;
    seen.add(p.id);
    const payment: ManualPayment = {
      id: p.id,
      loanId: p.loanId,
      amount: Math.round(Number(p.amount) * 100) / 100,
      date: String(p.date),
      source: SOURCES.includes(p.source as PaymentSource) ? (p.source as PaymentSource) : 'other',
      createdAt: typeof p.createdAt === 'string' ? p.createdAt : '',
    };
    if (Number.isInteger(p.installment) && (p.installment as number) >= 1) payment.installment = p.installment as number;
    const note = text(p.note);
    if (note) payment.note = note;
    out.push(payment);
  }
  return out;
}

export function normalizeAdjustments(raw: unknown): LoanAdjustment[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: LoanAdjustment[] = [];
  for (const r of raw) {
    const a = (r ?? {}) as Record<string, unknown>;
    if (typeof a.id !== 'string' || typeof a.loanId !== 'string' || seen.has(a.id)) continue;
    if (a.kind !== 'waived' && a.kind !== 'canceled' && a.kind !== 'fee') continue;
    const adj: LoanAdjustment = { id: a.id, loanId: a.loanId, kind: a.kind, createdAt: typeof a.createdAt === 'string' ? a.createdAt : '' };
    if (a.kind === 'fee') {
      if (!(Number(a.amount) > 0)) continue;
      adj.amount = Math.round(Number(a.amount) * 100) / 100;
    } else {
      if (!Number.isInteger(a.installment) || (a.installment as number) < 1) continue;
      adj.installment = a.installment as number;
    }
    if (typeof a.date === 'string' && isDate(a.date)) adj.date = a.date;
    const note = text(a.note);
    if (note) adj.note = note;
    seen.add(a.id);
    out.push(adj);
  }
  return out;
}

/* ------------------------------------------------------------------------------------------- storage */
// Where the records go when they change: the account while someone is signed in (see loanRepo.ts), memory in tests.
export interface PaymentRepository {
  load(): PaymentData;
  save(data: PaymentData): void;
}

// Where these were kept before accounts existed. Read only by loanMigration.ts, and only if the person asks.
export const PAYMENTS_KEY = 'wallex-loan-payments';

// Payments and adjustments are two lists in the account.
const syncedPayments: PaymentRepository = {
  load: () => ({ payments: [], adjustments: [] }),
  save(data) {
    syncedRepository<ManualPayment>('payment').save(data.payments);
    syncedRepository<LoanAdjustment>('adjustment').save(data.adjustments);
  },
};

export interface PaymentInput {
  loanId: string;
  installment?: number;
  amount: number;
  date: string;
  source: PaymentSource;
  note?: string;
}

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function createPaymentStore(repo: PaymentRepository, now: () => Date = () => new Date()) {
  let state: PaymentData = (() => {
    const d = repo.load();
    return { payments: normalizePayments(d.payments), adjustments: normalizeAdjustments(d.adjustments) };
  })();
  const listeners = new Set<() => void>();
  const commit = (next: PaymentData) => {
    state = next;
    repo.save(next);
    listeners.forEach((l) => l());
  };
  const valid = (i: PaymentInput) => Number.isFinite(i.amount) && i.amount > 0 && isDate(i.date) && (i.installment === undefined || (Number.isInteger(i.installment) && i.installment >= 1));
  const clean = (i: PaymentInput) => ({
    loanId: i.loanId,
    amount: Math.round(i.amount * 100) / 100,
    date: i.date,
    source: i.source,
    ...(i.installment !== undefined ? { installment: i.installment } : {}),
    ...(i.note?.trim() ? { note: i.note.trim() } : {}),
  });

  return {
    get: () => state,
    subscribe(cb: () => void) {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },

    // Replaces everything with the account's copy (or with nothing, when the person changes). Not written back.
    hydrate(next: PaymentData) {
      state = next;
      listeners.forEach((l) => l());
    },

    addPayment(input: PaymentInput): ManualPayment | null {
      if (!valid(input)) return null;
      const payment: ManualPayment = { ...clean(input), id: newId('pay'), createdAt: now().toISOString() };
      commit({ ...state, payments: [...state.payments, payment] });
      return payment;
    },

    updatePayment(id: string, input: PaymentInput): ManualPayment | null {
      const current = state.payments.find((p) => p.id === id);
      if (!current || !valid(input)) return null;
      const next: ManualPayment = { ...clean(input), id, createdAt: current.createdAt };
      commit({ ...state, payments: state.payments.map((p) => (p.id === id ? next : p)) });
      return next;
    },

    removePayment(id: string) {
      if (state.payments.some((p) => p.id === id)) commit({ ...state, payments: state.payments.filter((p) => p.id !== id) });
    },

    // Waives or cancels one installment, or clears that mark with null. One mark per installment.
    markInstallment(loanId: string, installment: number, kind: 'waived' | 'canceled' | null, note?: string) {
      const rest = state.adjustments.filter((a) => !(a.loanId === loanId && a.installment === installment && a.kind !== 'fee'));
      const adj: LoanAdjustment[] = kind ? [{ id: newId('adj'), loanId, kind, installment, createdAt: now().toISOString(), ...(note?.trim() ? { note: note.trim() } : {}) }] : [];
      commit({ ...state, adjustments: [...rest, ...adj] });
    },

    addFee(loanId: string, amount: number, date?: string, note?: string): LoanAdjustment | null {
      if (!Number.isFinite(amount) || amount <= 0) return null;
      const fee: LoanAdjustment = { id: newId('adj'), loanId, kind: 'fee', amount: Math.round(amount * 100) / 100, createdAt: now().toISOString(), ...(date && isDate(date) ? { date } : {}), ...(note?.trim() ? { note: note.trim() } : {}) };
      commit({ ...state, adjustments: [...state.adjustments, fee] });
      return fee;
    },

    removeAdjustment(id: string) {
      if (state.adjustments.some((a) => a.id === id)) commit({ ...state, adjustments: state.adjustments.filter((a) => a.id !== id) });
    },

    removeForLoan(loanId: string) {
      if (state.payments.some((p) => p.loanId === loanId) || state.adjustments.some((a) => a.loanId === loanId)) {
        commit({ payments: state.payments.filter((p) => p.loanId !== loanId), adjustments: state.adjustments.filter((a) => a.loanId !== loanId) });
      }
    },
  };
}

export const loanPayments = createPaymentStore(syncedPayments);

export function useLoanPayments(): PaymentData {
  return useSyncExternalStore(loanPayments.subscribe, loanPayments.get);
}
