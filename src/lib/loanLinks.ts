import { useSyncExternalStore } from 'react';
import { syncedRepository } from './loanRepo';
import { amountTolerance, daysBetween, providerMatch, resolveOptions, type MatchOptions } from './loanMatching.ts';
import type { Installment, Loan } from './loans';
import type { Txn } from './wallex';

// The record of which bank transaction paid which installment of which pay-later loan. It is kept apart from the Plaid
// transactions, which are never changed: a link holds the transaction's id and a snapshot of what it looked like, so it
// survives the bank refreshing, a pending charge settling, or a transaction vanishing from the feed.
//
// Money out is negative on a Txn; the amounts here are positive "how much was paid".

export type LinkStatus = 'linked' | 'rejected'; // the person's decision
export type LinkSource = 'suggestion' | 'manual'; // they accepted a suggested match, or picked the transaction themselves

export interface InstallmentLink {
  id: string; // `${loanId}:${installment}:${txnId}`
  loanId: string;
  installment: number; // 1-based, the same n as the loan's schedule
  lender: string; // the lender when the link was made, to recognise refunds from the same place
  txnId: string;
  accountId: string;
  expectedAmount: number;
  actualAmount: number;
  expectedDate: string; // YYYY-MM-DD
  actualDate: string;
  status: LinkStatus;
  source: LinkSource;
  pendingAtLink: boolean; // it was still pending when linked
  createdAt: string; // ISO timestamp
  previousTxnIds?: string[]; // earlier ids this payment had, e.g. the pending one that settled
}

/* ----------------------------------------------------------------------------------------------- building */
export function buildLink(loan: Loan, inst: Installment, txn: Txn, source: LinkSource, now = new Date()): InstallmentLink | null {
  if (txn.amount >= 0) return null; // only money out can be a payment
  return {
    id: `${loan.id}:${inst.n}:${txn.id}`,
    loanId: loan.id,
    installment: inst.n,
    lender: loan.lender,
    txnId: txn.id,
    accountId: txn.accountId,
    expectedAmount: inst.payment,
    actualAmount: -txn.amount,
    expectedDate: inst.date,
    actualDate: txn.date,
    status: 'linked',
    source,
    pendingAtLink: txn.pending,
    createdAt: now.toISOString(),
  };
}

export function normalizeLinks(raw: unknown): InstallmentLink[] {
  if (!Array.isArray(raw)) return [];
  const out: InstallmentLink[] = [];
  const takenTxns = new Set<string>();
  const ids = new Set<string>();
  const iso = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const l = r as Record<string, unknown>;
    if (typeof l.loanId !== 'string' || typeof l.txnId !== 'string' || typeof l.accountId !== 'string') continue;
    if (!Number.isInteger(l.installment) || (l.installment as number) < 1) continue;
    if (!(Number(l.actualAmount) > 0) || !(Number(l.expectedAmount) > 0) || !iso(l.expectedDate) || !iso(l.actualDate)) continue;
    const status: LinkStatus = l.status === 'rejected' ? 'rejected' : 'linked';
    const link: InstallmentLink = {
      id: `${l.loanId}:${l.installment}:${l.txnId}`,
      loanId: l.loanId,
      installment: l.installment as number,
      lender: typeof l.lender === 'string' ? l.lender : '',
      txnId: l.txnId,
      accountId: l.accountId,
      expectedAmount: Number(l.expectedAmount),
      actualAmount: Number(l.actualAmount),
      expectedDate: l.expectedDate as string,
      actualDate: l.actualDate as string,
      status,
      source: l.source === 'suggestion' ? 'suggestion' : 'manual',
      pendingAtLink: l.pendingAtLink === true,
      createdAt: typeof l.createdAt === 'string' ? l.createdAt : '',
    };
    if (Array.isArray(l.previousTxnIds)) link.previousTxnIds = l.previousTxnIds.filter((x): x is string => typeof x === 'string');
    if (ids.has(link.id)) continue;
    // One outgoing transaction pays one installment. If stored data says otherwise, the first link keeps it.
    if (status === 'linked') {
      if (takenTxns.has(link.txnId)) continue;
      takenTxns.add(link.txnId);
    }
    ids.add(link.id);
    out.push(link);
  }
  return out;
}

/* ------------------------------------------------------------------------------------------------ storage */
// Where the links go when they change. The store only talks to this: while someone is signed in it is their account
// (see loanRepo.ts and loanSync.ts); in tests it is memory.
export interface LinkRepository {
  load(): InstallmentLink[];
  save(links: InstallmentLink[]): void;
}

// Where links were kept before accounts existed. It is read only by loanMigration.ts, and only if the person asks.
export const LINKS_KEY = 'wallex-loan-links';

export type LinkResult = { ok: true; link: InstallmentLink } | { ok: false; reason: 'txn-already-linked' | 'not-found' | 'not-outgoing'; existing?: InstallmentLink };

export function createLinkStore(repo: LinkRepository) {
  let state = normalizeLinks(repo.load());
  const listeners = new Set<() => void>();
  const commit = (next: InstallmentLink[]) => {
    state = next;
    repo.save(next);
    listeners.forEach((l) => l());
  };
  const linkedTo = (txnId: string) => state.find((l) => l.status === 'linked' && l.txnId === txnId);

  return {
    get: () => state,
    subscribe(cb: () => void) {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },

    // Replaces the links with the account's copy (or with nothing, when the person changes). Not written back.
    hydrate(next: InstallmentLink[]) {
      state = next;
      listeners.forEach((l) => l());
    },

    // Records that this transaction paid this installment. A transaction that already pays something is never moved: the
    // existing link has to be removed first.
    link(link: InstallmentLink | null): LinkResult {
      if (!link) return { ok: false, reason: 'not-outgoing' };
      const existing = linkedTo(link.txnId);
      if (existing) return existing.id === link.id ? { ok: true, link: existing } : { ok: false, reason: 'txn-already-linked', existing };
      const next = { ...link, status: 'linked' as const };
      commit([...state.filter((l) => l.id !== link.id), next]);
      return { ok: true, link: next };
    },

    // Remembers that a suggestion was turned down so it is not offered again.
    reject(link: InstallmentLink | null): LinkResult {
      if (!link) return { ok: false, reason: 'not-outgoing' };
      const existing = state.find((l) => l.id === link.id);
      if (existing?.status === 'linked') return { ok: false, reason: 'txn-already-linked', existing };
      const next = { ...link, status: 'rejected' as const };
      commit([...state.filter((l) => l.id !== link.id), next]);
      return { ok: true, link: next };
    },

    unlink(id: string) {
      if (state.some((l) => l.id === id)) commit(state.filter((l) => l.id !== id));
    },

    removeForLoan(loanId: string) {
      if (state.some((l) => l.loanId === loanId)) commit(state.filter((l) => l.loanId !== loanId));
    },

    // A link follows its payment to the transaction that replaced it, e.g. when a pending charge settles under a new id.
    replaceTxn(id: string, txn: Txn): LinkResult {
      const current = state.find((l) => l.id === id && l.status === 'linked');
      if (!current) return { ok: false, reason: 'not-found' };
      if (txn.amount >= 0) return { ok: false, reason: 'not-outgoing' };
      const taken = linkedTo(txn.id);
      if (taken && taken.id !== id) return { ok: false, reason: 'txn-already-linked', existing: taken };
      const next: InstallmentLink = {
        ...current,
        id: `${current.loanId}:${current.installment}:${txn.id}`,
        txnId: txn.id,
        accountId: txn.accountId,
        actualAmount: -txn.amount,
        actualDate: txn.date,
        pendingAtLink: txn.pending,
        previousTxnIds: [...(current.previousTxnIds ?? []), current.txnId],
      };
      commit(state.map((l) => (l.id === id ? next : l)));
      return { ok: true, link: next };
    },
  };
}

export const loanLinks = createLinkStore(syncedRepository<InstallmentLink>('link'));

export function useLoanLinks(): InstallmentLink[] {
  return useSyncExternalStore(loanLinks.subscribe, loanLinks.get);
}

/* --------------------------------------------------------------------------------------------- reconciling */
// What a link looks like against the bank's transactions right now.
//   posted   the transaction is there and has posted: this is a confirmed payment
//   pending  it is there but has not posted: not a confirmed payment yet
//   reversed it was paid, then refunded in full
//   missing  the bank no longer lists it. The link is kept, but it is not counted as paid
//   unknown  the bank's transactions are not loaded, so nothing can be said
export type LinkState = 'posted' | 'pending' | 'reversed' | 'missing' | 'unknown';

export interface LinkView {
  link: InstallmentLink;
  txn: Txn | null;
  state: LinkState;
  paid: number; // what counts as paid: the posted amount less any refund; 0 unless the state is posted
  refunded: number;
  refunds: Txn[];
  replacement: Txn | null; // the one posted transaction a vanished pending charge has become, when it is clear which
}

export interface ReconcileOptions {
  knownAccountIds?: Set<string>; // accounts that did load; a link in any other account is "unknown", not "missing"
  options?: Partial<MatchOptions>;
}

const REFUND_DAYS = 90;
const REPLACE_DAYS = 7;

export function reconcileLinks(links: InstallmentLink[], txns: Txn[] | null, opts: ReconcileOptions = {}): LinkView[] {
  const o = resolveOptions(opts.options);
  const active = links.filter((l) => l.status === 'linked');
  const byId = new Map((txns ?? []).map((t) => [t.id, t]));
  const taken = new Set(active.map((l) => l.txnId));

  const views: LinkView[] = active.map((link) => {
    const txn = byId.get(link.txnId) ?? null;
    const loaded = txns !== null && (!opts.knownAccountIds || opts.knownAccountIds.has(link.accountId));
    const state: LinkState = !loaded ? 'unknown' : !txn ? 'missing' : txn.pending ? 'pending' : 'posted';
    return { link, txn, state, paid: 0, refunded: 0, refunds: [], replacement: null };
  });

  // Refunds come back as money in from the same lender, in the same account, after the payment. The latest payment
  // that could be the one refunded takes each refund, so older identical payments are not wrongly reversed.
  const refundPool = (txns ?? []).filter((t) => t.amount > 0);
  const claimed = new Set<string>();
  for (const v of views.filter((x) => x.state === 'posted').sort((a, b) => b.link.actualDate.localeCompare(a.link.actualDate) || b.link.installment - a.link.installment)) {
    const paid = -v.txn!.amount;
    const tol = amountTolerance(v.link.expectedAmount, o);
    const options = refundPool
      .filter((r) => !claimed.has(r.id) && r.accountId === v.link.accountId && !r.pending && providerMatch(v.link.lender, r) !== null)
      .filter((r) => daysBetween(r.date, v.txn!.date) >= 0 && daysBetween(r.date, v.txn!.date) <= REFUND_DAYS && r.amount <= paid + tol && r.amount >= paid * 0.1)
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    for (const r of options) {
      if (v.refunded >= paid - tol) break;
      if (v.refunded + r.amount > paid + tol) continue;
      claimed.add(r.id);
      v.refunded = Math.round((v.refunded + r.amount) * 100) / 100;
      v.refunds.push(r);
    }
    if (v.refunded >= paid - tol && v.refunded > 0) v.state = 'reversed';
    else v.paid = Math.round((paid - v.refunded) * 100) / 100;
  }

  // A pending charge that vanished and has one clear posted successor. Only pending ones: a posted payment that
  // disappears is left as "missing" for the person to look at.
  const spare = (txns ?? []).filter((t) => t.amount < 0 && !t.pending && !taken.has(t.id));
  const successors = new Map<InstallmentLink, Txn[]>();
  for (const v of views.filter((x) => x.state === 'missing' && x.link.pendingAtLink)) {
    const tol = amountTolerance(v.link.expectedAmount, o);
    successors.set(
      v.link,
      spare.filter((t) => t.accountId === v.link.accountId && providerMatch(v.link.lender, t) !== null && Math.abs(-t.amount - v.link.actualAmount) <= tol && daysBetween(t.date, v.link.actualDate) >= 0 && daysBetween(t.date, v.link.actualDate) <= REPLACE_DAYS),
    );
  }
  for (const v of views) {
    const options = successors.get(v.link);
    if (options?.length !== 1) continue;
    const contested = [...successors.entries()].some(([other, list]) => other !== v.link && list.some((t) => t.id === options[0].id));
    if (!contested) v.replacement = options[0];
  }
  return views;
}

/* -------------------------------------------------------------------------------- what an installment has */
export type InstallmentState = 'unlinked' | 'pending' | 'partial' | 'paid';

export interface InstallmentCoverage {
  loanId: string;
  installment: number;
  expected: number;
  paid: number; // from posted transactions only
  pending: number; // linked but not yet posted; not counted as paid
  state: InstallmentState;
  views: LinkView[];
}

// How much of an installment is confirmed paid by linked transactions. An installment with no links is just "unlinked":
// the loan's own date-based status is not affected by any of this.
export function coverageFor(loanId: string, inst: Pick<Installment, 'n' | 'payment'>, views: LinkView[], options?: Partial<MatchOptions>): InstallmentCoverage {
  const mine = views.filter((v) => v.link.loanId === loanId && v.link.installment === inst.n);
  const paid = Math.round(mine.reduce((s, v) => s + v.paid, 0) * 100) / 100;
  const pending = Math.round(mine.filter((v) => v.state === 'pending').reduce((s, v) => s + v.link.actualAmount, 0) * 100) / 100;
  const tol = amountTolerance(inst.payment, resolveOptions(options));
  const state: InstallmentState = paid >= inst.payment - tol ? 'paid' : paid > 0 ? 'partial' : pending > 0 ? 'pending' : 'unlinked';
  return { loanId, installment: inst.n, expected: inst.payment, paid, pending, state, views: mine };
}

export interface ConfirmedPayment {
  loanId: string;
  installment: number;
  txnId: string;
  accountId: string;
  amount: number;
  date: string;
}

// The payments a later paid/unpaid calculation can rely on: posted transactions the person linked, net of refunds.
export const confirmedPayments = (views: LinkView[]): ConfirmedPayment[] =>
  views.filter((v) => v.state === 'posted' && v.paid > 0).map((v) => ({ loanId: v.link.loanId, installment: v.link.installment, txnId: v.link.txnId, accountId: v.link.accountId, amount: v.paid, date: v.txn!.date }));
