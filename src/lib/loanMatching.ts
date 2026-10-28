import { providerOf, scheduleFor, type Installment, type Loan, type LoanFrequency } from './loans.ts';
import type { InstallmentLink } from './loanLinks';
import type { Txn } from './wallex';

// Works out which bank transactions could be the payment for which installment of which pay-later loan. It only ever
// suggests: nothing here links a transaction. A link is made when the person confirms one (see loanLinks.ts).
//
// Money out is negative on a Txn. Every amount below is a positive "how much was paid".

/* ------------------------------------------------------------------------------------------------ tolerances */
export interface MatchOptions {
  dateWindowDays: number; // how far from the due date a payment may land
  amountPct: number; // how far off the amount may be, as a share of the installment
  amountFloor: number; // ...but never tighter than this many dollars
  amountCap: number; // ...and never looser than this many dollars
}

export const DEFAULT_MATCH_OPTIONS: MatchOptions = { dateWindowDays: 5, amountPct: 0.01, amountFloor: 0.5, amountCap: 5 };
// However it is configured, the tolerances stay inside these, so a loose setting cannot make everything a match.
export const MATCH_LIMITS = { dateWindowDays: 14, amountPct: 0.05, amountCap: 20 } as const;

export function resolveOptions(given: Partial<MatchOptions> = {}): MatchOptions {
  const pick = (v: number | undefined, fallback: number, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(0, v)) : fallback);
  const amountCap = pick(given.amountCap, DEFAULT_MATCH_OPTIONS.amountCap, MATCH_LIMITS.amountCap);
  return {
    dateWindowDays: Math.floor(pick(given.dateWindowDays, DEFAULT_MATCH_OPTIONS.dateWindowDays, MATCH_LIMITS.dateWindowDays)),
    amountPct: pick(given.amountPct, DEFAULT_MATCH_OPTIONS.amountPct, MATCH_LIMITS.amountPct),
    amountFloor: Math.min(amountCap, pick(given.amountFloor, DEFAULT_MATCH_OPTIONS.amountFloor, MATCH_LIMITS.amountCap)),
    amountCap,
  };
}

const cents = (n: number) => Math.round(n * 100) / 100;
const PERIOD_DAYS: Record<LoanFrequency, number> = { weekly: 7, biweekly: 14, monthly: 30 };

export const amountTolerance = (expected: number, o: MatchOptions) => cents(Math.min(o.amountCap, Math.max(o.amountFloor, expected * o.amountPct)));
// Never more than half a payment period, so a payment cannot sit inside the window of two neighbouring installments.
export const dateWindow = (frequency: LoanFrequency, o: MatchOptions) => Math.min(o.dateWindowDays, Math.floor(PERIOD_DAYS[frequency] / 2));
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);

/* ------------------------------------------------------------------------------------------------- provider */
const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
export const descriptionOf = (t: Pick<Txn, 'details'>) => t.details.find((d) => d.label === 'Bank Description')?.value ?? '';

// Whether the transaction is from this lender, judged by the merchant name and the bank's own description. The lender's
// name alone is never enough to link a payment: the amount and the date have to fit as well.
export function providerMatch(lender: string, t: Pick<Txn, 'merchant' | 'details'>): 'merchant' | 'description' | null {
  const description = descriptionOf(t);
  const known = providerOf(lender);
  if (known) {
    if (providerOf(t.merchant) === known) return 'merchant';
    return description && providerOf(description) === known ? 'description' : null;
  }
  const key = squash(lender);
  if (key.length < 4) return null;
  if (squash(t.merchant).includes(key)) return 'merchant';
  return squash(description).includes(key) ? 'description' : null;
}

// How close in days a transaction is to a date: the nearer of the day it posted and the day it was made.
const dayDistance = (t: Txn, iso: string) => Math.min(Math.abs(daysBetween(t.date, iso)), t.authorizedDate ? Math.abs(daysBetween(t.authorizedDate, iso)) : Infinity);

/* ---------------------------------------------------------------------------------------------- candidates */
export type Confidence = 'high' | 'medium' | 'low';
export type CandidateKind = 'exact' | 'near' | 'partial';

export interface Candidate {
  loanId: string;
  installment: number;
  txn: Txn;
  kind: CandidateKind; // exact amount, within tolerance, or only part of what is still owed on the installment
  confidence: Confidence;
  score: number; // 0..1, for ordering
  ambiguous: boolean; // the same transaction, or the same installment, has another plausible partner
  competing: { loanId: string; installment: number }[]; // other installments this transaction could be paying
  alsoFits: string[]; // other transactions that could be paying this installment in full
  amountDiff: number; // paid minus what is still owed on the installment
  dayDiff: number;
  provider: 'merchant' | 'description';
  reasons: string[];
}

export interface MatchResult {
  candidates: Candidate[];
  duplicateTxnIds: Set<string>; // identical transactions beyond the ones the installments can account for
}

interface Slot {
  loan: Loan;
  inst: Installment;
  remaining: number; // what is still owed on this installment after the payments already linked to it
  tol: number;
  window: number;
}

const money = (n: number) => `$${Math.abs(n).toFixed(2)}`;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const slotKey = (s: { loan: Loan; inst: Installment }) => `${s.loan.id}:${s.inst.n}`;

export function matchInstallments(input: { loans: Loan[]; links: InstallmentLink[]; txns: Txn[]; options?: Partial<MatchOptions> }): MatchResult {
  const o = resolveOptions(input.options);
  const linked = new Set(input.links.filter((l) => l.status === 'linked').map((l) => l.txnId));
  const rejected = new Set(input.links.filter((l) => l.status === 'rejected').map((l) => l.id));
  const outgoing = input.txns.filter((t) => t.amount < 0 && !linked.has(t.id)); // a refund is not a payment, and a linked one is taken

  interface Pair { slot: Slot; txn: Txn; kind: CandidateKind; amountDiff: number; dayDiff: number; provider: 'merchant' | 'description'; paid: number }
  const pairs: Pair[] = [];
  for (const loan of input.loans) {
    if (loan.type !== 'bnpl') continue; // only loans the person classified as pay-later
    const mine = outgoing.flatMap((t) => {
      const provider = providerMatch(loan.lender, t);
      return provider ? [{ t, provider }] : [];
    });
    if (!mine.length) continue;
    const window = dateWindow(loan.frequency, o);
    for (const inst of scheduleFor(loan)) {
      const covered = input.links.filter((l) => l.status === 'linked' && l.loanId === loan.id && l.installment === inst.n).reduce((s, l) => s + l.actualAmount, 0);
      const tol = amountTolerance(inst.payment, o);
      const remaining = cents(inst.payment - covered);
      if (remaining <= tol) continue; // already covered
      const slot: Slot = { loan, inst, remaining, tol, window };
      for (const { t, provider } of mine) {
        const dayDiff = dayDistance(t, inst.date);
        if (dayDiff > window || rejected.has(`${loan.id}:${inst.n}:${t.id}`)) continue;
        const paid = -t.amount;
        const amountDiff = cents(paid - remaining);
        const kind: CandidateKind | null = Math.abs(amountDiff) <= 0.005 ? 'exact' : Math.abs(amountDiff) <= tol ? 'near' : paid < remaining && paid >= remaining * 0.1 ? 'partial' : null;
        if (kind) pairs.push({ slot, txn: t, kind, amountDiff, dayDiff, provider, paid });
      }
    }
  }

  // A transaction that fits an installment in full is not also offered as a piece of another one.
  const fullFor = new Set(pairs.filter((p) => p.kind !== 'partial').map((p) => p.txn.id));
  pairs.splice(0, pairs.length, ...pairs.filter((p) => p.kind !== 'partial' || !fullFor.has(p.txn.id)));

  // Identical transactions (same account, day, amount and merchant). Two of them are fine when two installments are
  // waiting for them; any beyond what the installments can take are treated as the bank listing one payment twice.
  const groups = new Map<string, Txn[]>();
  const byTxn = new Map<string, Pair[]>();
  for (const p of pairs) byTxn.set(p.txn.id, [...(byTxn.get(p.txn.id) ?? []), p]);
  for (const id of byTxn.keys()) {
    const t = byTxn.get(id)![0].txn;
    const key = `${t.accountId}|${t.date}|${t.amount}|${squash(t.merchant)}|${t.pending}`;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  const duplicateTxnIds = new Set<string>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id));
    const room = new Map<string, number>();
    for (const p of byTxn.get(sorted[0].id)!) room.set(slotKey(p.slot), p.kind === 'partial' ? Math.max(1, Math.floor((p.slot.remaining + p.slot.tol) / p.paid)) : 1);
    const capacity = [...room.values()].reduce((s, n) => s + n, 0);
    sorted.slice(capacity).forEach((t) => duplicateTxnIds.add(t.id));
  }
  const live = pairs.filter((p) => !duplicateTxnIds.has(p.txn.id));

  // A pending charge that has a posted twin in the same account is most likely the same payment before it settled.
  const settled = live.filter((p) => !p.txn.pending);
  const kept = live.filter((p) => !p.txn.pending || !settled.some((q) => q.txn.accountId === p.txn.accountId && q.txn.amount === p.txn.amount && squash(q.txn.merchant) === squash(p.txn.merchant) && slotKey(q.slot) === slotKey(p.slot)));

  const forTxn = new Map<string, Pair[]>();
  const forSlot = new Map<string, Pair[]>();
  for (const p of kept) {
    forTxn.set(p.txn.id, [...(forTxn.get(p.txn.id) ?? []), p]);
    forSlot.set(slotKey(p.slot), [...(forSlot.get(slotKey(p.slot)) ?? []), p]);
  }

  const candidates = kept.map((p): Candidate => {
    const competing = (forTxn.get(p.txn.id) ?? []).filter((q) => q !== p).map((q) => ({ loanId: q.slot.loan.id, installment: q.slot.inst.n }));
    const alsoFits = p.kind === 'partial' ? [] : (forSlot.get(slotKey(p.slot)) ?? []).filter((q) => q !== p && q.kind !== 'partial').map((q) => q.txn.id);
    const ambiguous = competing.length > 0 || alsoFits.length > 0;
    const strong = (p.kind === 'exact' || p.kind === 'near') && p.dayDiff <= 2 && !p.txn.pending;
    const confidence: Confidence = ambiguous || p.kind === 'partial' ? 'low' : strong && p.kind === 'exact' ? 'high' : 'medium';
    const amountScore = p.kind === 'exact' ? 1 : p.kind === 'near' ? 1 - 0.4 * (Math.abs(p.amountDiff) / Math.max(p.slot.tol, 0.01)) : 0.3;
    const score = 0.5 * amountScore + 0.3 * (1 - p.dayDiff / (p.slot.window + 1)) + 0.2 * (p.provider === 'merchant' ? 1 : 0.9);

    const dir = daysBetween(p.txn.date, p.slot.inst.date);
    const reasons = [
      p.provider === 'merchant' ? `The merchant is ${p.slot.loan.lender}` : `The bank’s description names ${p.slot.loan.lender}`,
      p.kind === 'exact' ? `The amount is exactly ${money(p.paid)}` : p.kind === 'near' ? `${money(p.paid)} is ${money(p.amountDiff)} ${p.amountDiff > 0 ? 'over' : 'under'} the ${money(p.slot.remaining)} due` : `${money(p.paid)} is part of the ${money(p.slot.remaining)} still due`,
      dir === 0 ? 'It posted on the due date' : `It posted ${plural(Math.abs(dir), 'day')} ${dir > 0 ? 'after' : 'before'} the due date`,
    ];
    if (p.txn.pending) reasons.push('It is still pending, so it will not count as paid until it posts');
    if (competing.length) reasons.push(`It could also be paying ${plural(competing.length, 'other installment')}`);
    if (alsoFits.length) reasons.push(`${plural(alsoFits.length, 'other transaction')} also fit${alsoFits.length === 1 ? 's' : ''} this installment`);
    return { loanId: p.slot.loan.id, installment: p.slot.inst.n, txn: p.txn, kind: p.kind, confidence, score: cents(score * 1000) / 1000, ambiguous, competing, alsoFits, amountDiff: p.amountDiff, dayDiff: p.dayDiff, provider: p.provider, reasons };
  });
  candidates.sort((a, b) => b.score - a.score || a.txn.id.localeCompare(b.txn.id));
  return { candidates, duplicateTxnIds };
}

export const candidatesFor = (result: MatchResult, loanId: string, installment: number) => result.candidates.filter((c) => c.loanId === loanId && c.installment === installment);

/* ---------------------------------------------------------------------------------------- picking by hand */
export interface ManualOption {
  txn: Txn;
  dayDiff: number;
  providerMatch: boolean;
  linkedTo: InstallmentLink | null; // already someone's payment: shown, but it cannot be taken without removing that link first
  possibleDuplicate: boolean;
}

// Money-out transactions near an installment's due date, for the person to choose from when no suggestion is right.
export function manualOptions(input: { loan: Loan; installment: number; links: InstallmentLink[]; txns: Txn[]; duplicateTxnIds?: Set<string>; maxDays?: number; limit?: number }): ManualOption[] {
  const inst = scheduleFor(input.loan).find((i) => i.n === input.installment);
  if (!inst) return [];
  const taken = new Map(input.links.filter((l) => l.status === 'linked').map((l) => [l.txnId, l]));
  return input.txns
    .filter((t) => t.amount < 0)
    .map((txn) => ({ txn, dayDiff: dayDistance(txn, inst.date), providerMatch: providerMatch(input.loan.lender, txn) !== null, linkedTo: taken.get(txn.id) ?? null, possibleDuplicate: input.duplicateTxnIds?.has(txn.id) ?? false }))
    .filter((x) => x.dayDiff <= (input.maxDays ?? 30) && !(x.linkedTo?.loanId === input.loan.id && x.linkedTo.installment === input.installment))
    .sort((a, b) => Number(b.providerMatch) - Number(a.providerMatch) || a.dayDiff - b.dayDiff || a.txn.id.localeCompare(b.txn.id))
    .slice(0, input.limit ?? 25);
}
