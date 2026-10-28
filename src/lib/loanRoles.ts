import { useSyncExternalStore } from 'react';
import { syncedRepository } from './loanRepo';
import type { Txn } from './wallex';

// Bank transactions the person has said belong to a pay-later loan, other than its installment payments (those are
// linked in loanLinks.ts). A role is a confirmed relationship between one transaction and one loan: the bank charge
// for the original purchase, the down payment, a financing fee, a refund or an adjustment. Wallex never works one out
// from a merchant name; the person picks the transaction.

export type LoanRoleKind = 'purchase' | 'down-payment' | 'fee' | 'refund' | 'adjustment';

export const ROLE_OPTIONS: { value: LoanRoleKind; label: string; hint: string }[] = [
  { value: 'purchase', label: 'Original Purchase', hint: 'The charge for the item itself' },
  { value: 'down-payment', label: 'Down Payment', hint: 'Paid up front, before the installments' },
  { value: 'fee', label: 'Financing Fee', hint: 'A late fee or other charge from the lender' },
  { value: 'refund', label: 'Refund', hint: 'Money back for the purchase or a payment' },
  { value: 'adjustment', label: 'Adjustment', hint: 'Any other change the lender made' },
];
export const roleLabel = (r: LoanRoleKind) => ROLE_OPTIONS.find((o) => o.value === r)?.label ?? 'Adjustment';

export interface LoanRole {
  id: string; // `${loanId}:${txnId}`
  loanId: string;
  txnId: string;
  accountId: string;
  role: LoanRoleKind;
  amount: number; // the transaction's amount when it was assigned: negative out, positive in
  date: string; // YYYY-MM-DD
  note?: string;
  createdAt: string;
}

export function normalizeRoles(raw: unknown): LoanRole[] {
  if (!Array.isArray(raw)) return [];
  const taken = new Set<string>();
  const out: LoanRole[] = [];
  for (const r of raw) {
    const x = (r ?? {}) as Record<string, unknown>;
    if (typeof x.loanId !== 'string' || typeof x.txnId !== 'string' || typeof x.accountId !== 'string') continue;
    if (!ROLE_OPTIONS.some((o) => o.value === x.role)) continue;
    if (!Number.isFinite(Number(x.amount)) || Number(x.amount) === 0 || typeof x.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x.date)) continue;
    if (taken.has(x.txnId)) continue; // a transaction has one role
    taken.add(x.txnId);
    const role: LoanRole = {
      id: `${x.loanId}:${x.txnId}`,
      loanId: x.loanId,
      txnId: x.txnId,
      accountId: x.accountId,
      role: x.role as LoanRoleKind,
      amount: Math.round(Number(x.amount) * 100) / 100,
      date: x.date,
      createdAt: typeof x.createdAt === 'string' ? x.createdAt : '',
    };
    if (typeof x.note === 'string' && x.note.trim()) role.note = x.note.trim();
    out.push(role);
  }
  return out;
}

export interface RoleRepository {
  load(): LoanRole[];
  save(roles: LoanRole[]): void;
}

// Where roles were kept before accounts existed. Read only by loanMigration.ts, and only if the person asks.
export const ROLES_KEY = 'wallex-loan-roles';

export type RoleResult = { ok: true; role: LoanRole } | { ok: false; reason: 'txn-has-role' | 'wrong-direction'; existing?: LoanRole };

export function createRoleStore(repo: RoleRepository, now: () => Date = () => new Date()) {
  let state = normalizeRoles(repo.load());
  const listeners = new Set<() => void>();
  const commit = (next: LoanRole[]) => {
    state = next;
    repo.save(next);
    listeners.forEach((l) => l());
  };

  return {
    get: () => state,
    subscribe(cb: () => void) {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },

    // Replaces the roles with the account's copy (or with nothing, when the person changes). Not written back.
    hydrate(next: LoanRole[]) {
      state = next;
      listeners.forEach((l) => l());
    },

    // Gives a transaction a role in a loan. A refund is money in; every other role is money out. A transaction that
    // already has a role is never moved: remove it first. A loan has one original purchase, so a new one replaces the old.
    assign(loanId: string, txn: Txn, role: LoanRoleKind, note?: string): RoleResult {
      if ((role === 'refund') !== (txn.amount > 0)) return { ok: false, reason: 'wrong-direction' };
      const existing = state.find((r) => r.txnId === txn.id);
      if (existing) return { ok: false, reason: 'txn-has-role', existing };
      const next: LoanRole = {
        id: `${loanId}:${txn.id}`,
        loanId,
        txnId: txn.id,
        accountId: txn.accountId,
        role,
        amount: Math.round(txn.amount * 100) / 100,
        date: txn.date,
        createdAt: now().toISOString(),
        ...(note?.trim() ? { note: note.trim() } : {}),
      };
      commit([...state.filter((r) => !(role === 'purchase' && r.loanId === loanId && r.role === 'purchase')), next]);
      return { ok: true, role: next };
    },

    remove(id: string) {
      if (state.some((r) => r.id === id)) commit(state.filter((r) => r.id !== id));
    },

    removeForLoan(loanId: string) {
      if (state.some((r) => r.loanId === loanId)) commit(state.filter((r) => r.loanId !== loanId));
    },
  };
}

export const loanRoles = createRoleStore(syncedRepository<LoanRole>('role'));

export function useLoanRoles(): LoanRole[] {
  return useSyncExternalStore(loanRoles.subscribe, loanRoles.get);
}
