import type { LinkView } from './loanLinks';
import { amountTolerance, daysBetween, resolveOptions } from './loanMatching.ts';
import type { LoanAdjustment, ManualPayment } from './loanPayments';
import { scheduleFor, statusFor, type Installment, type Loan } from './loans.ts';

// What has actually been paid on a loan, as against what the schedule says should have been.
//
// scheduleFor() gives the contract: each installment's date, amount, interest and principal. This file lays the evidence
// of payment over it: bank transactions the person linked, payments they recorded by hand, refunds and adjustments.
// A date passing is not evidence of anything, so an installment only counts as paid when a payment says so. Everything
// here is plain calculation on its inputs, with the date it is judged on passed in, so it can be tested without a screen.

/* ------------------------------------------------------------------------------------------------ inputs */
// Bank evidence for one loan, from the links in loanLinks.ts. Amounts are positive.
export interface BankPayment { id: string; installment: number; amount: number; date: string } // posted, net of refunds
export interface BankPending { installment: number; amount: number; date: string } // linked but not posted: not a payment yet
export interface BankReversal { installment: number; amount: number; date: string } // refunded
export interface BankEvidence { payments: BankPayment[]; pending: BankPending[]; reversed: BankReversal[] }
export const NO_BANK: BankEvidence = { payments: [], pending: [], reversed: [] };

export function bankEvidenceFromViews(views: LinkView[], loanId: string): BankEvidence {
  const out: BankEvidence = { payments: [], pending: [], reversed: [] };
  for (const v of views) {
    if (v.link.loanId !== loanId) continue;
    const n = v.link.installment;
    if (v.state === 'posted' && v.paid > 0 && v.txn) out.payments.push({ id: v.link.txnId, installment: n, amount: v.paid, date: v.txn.date });
    if (v.state === 'pending') out.pending.push({ installment: n, amount: v.link.actualAmount, date: v.link.actualDate });
    if ((v.state === 'posted' || v.state === 'reversed') && v.refunded > 0) out.reversed.push({ installment: n, amount: v.refunded, date: v.link.actualDate });
  }
  return out;
}

export interface RepaymentInput {
  loan: Loan;
  asOf: string; // YYYY-MM-DD: the day everything is judged on
  bank?: BankEvidence;
  manual?: ManualPayment[];
  adjustments?: LoanAdjustment[];
  trackedFrom?: string; // payments are known from this date on; by default, the due date of the earliest installment with any evidence
  upcomingDays?: number; // an unpaid installment this close is "upcoming" (default 7)
  graceDays?: number; // an unpaid installment this recently due is "due", not yet past due (default 2)
}

/* ----------------------------------------------------------------------------------------------- results */
// Evidence and the calendar kept apart. The first six describe an installment nobody has paid, judged by its date alone;
// the rest are what the payments say.
export type InstallmentStatus =
  | 'scheduled' // further off than a week
  | 'upcoming' // due within the week
  | 'due' // due now or only just
  | 'pastDue' // due long ago, no payment, and payments are being tracked from before then
  | 'unverified' // due in the past with nothing to show for it, or only a pending payment: not known either way
  | 'partial' // some of it paid
  | 'paidBank' // paid, confirmed by bank transactions
  | 'paidManual' // paid, with at least part recorded by the person
  | 'reversed' // it was paid and then refunded
  | 'waived'
  | 'canceled';

export const STATUS_LABEL: Record<InstallmentStatus, string> = {
  scheduled: 'Scheduled',
  upcoming: 'Upcoming',
  due: 'Due',
  pastDue: 'Past Due',
  unverified: 'Unverified',
  partial: 'Partly Paid',
  paidBank: 'Bank Confirmed',
  paidManual: 'Recorded By You',
  reversed: 'Refunded',
  waived: 'Waived',
  canceled: 'Canceled',
};

export interface PaymentShare {
  kind: 'bank' | 'manual';
  id: string; // the transaction id, or the manual payment's id
  amount: number; // how much of it went to this installment
  date: string;
  spill?: boolean; // it came from a payment larger than the installment it was made for
}

export interface InstallmentRepayment {
  n: number;
  date: string;
  expected: number; // what the schedule asks for; 0 once waived or canceled
  status: InstallmentStatus;
  applied: number; // paid against it: bank + manual
  bank: number;
  manual: number;
  pending: number; // linked to a pending bank transaction, not counted
  reversed: number; // refunded
  shortfall: number; // what is still owed on it
  principalPaid: number;
  interestPaid: number;
  shares: PaymentShare[];
}

export interface Repayment {
  asOf: string;
  rows: InstallmentRepayment[];
  superseded: { id: string; txnId: string }[]; // manual payments matched by a bank payment and so not counted twice

  // money
  financed: number; // the original principal
  scheduledRemainingPrincipal: number; // what is left if every payment dated up to asOf was made: the calendar's answer, not a balance
  principalPaid: number; // estimated from what is recorded
  principalWaived: number;
  principalRemaining: number; // estimated; the lender's own payoff figure may differ
  outstandingPayments: number; // installments not yet covered, in dollars
  remainingFutureInterest: number; // interest in later installments not yet covered
  interestPaid: number;
  feesRecorded: number;
  verifiedPaid: number; // bank-confirmed payments
  manualPaid: number; // recorded by the person
  extraPaid: number; // paid beyond what any due installment asked for, and not pinned to a later one

  // counts
  expectedCount: number; // installments dated on or before asOf
  expectedAmount: number;
  confirmedCount: number; // fully paid, by bank or by the person
  bankConfirmedCount: number;
  overdueCount: number;
  unverifiedCount: number;
  unverifiedAmount: number; // what the unverified past installments add up to
  unpaidCount: number; // all installments not yet covered, past and future

  progress: number; // 0..1, principal paid as a share of the amount financed
  nextScheduled: InstallmentRepayment | null; // the next installment by date, paid or not
  nextUnpaid: InstallmentRepayment | null; // the first one still to be paid
  done: boolean; // every installment is paid, waived or canceled
  completion: string; // the date the loan finishes: the last payment made once done, otherwise the last scheduled date
  completionLate: boolean; // that scheduled date has already passed with payments still owed
}

/* ------------------------------------------------------------------------------------------ calculation */
const cents = (n: number) => Math.round(n * 100) / 100;
const MANUAL_MATCH_DAYS = 10;

interface Contribution { kind: 'bank' | 'manual'; id: string; installment?: number; amount: number; date: string }

export function repaymentFor(input: RepaymentInput): Repayment {
  const { loan, asOf } = input;
  const upcomingDays = input.upcomingDays ?? 7;
  const graceDays = input.graceDays ?? 2;
  const options = resolveOptions();
  const schedule = scheduleFor(loan);
  const byN = new Map(schedule.map((i) => [i.n, i]));
  const tol = (i: Installment) => amountTolerance(i.payment, options);
  const bank = input.bank ?? NO_BANK;
  const adjustments = (input.adjustments ?? []).filter((a) => a.loanId === loan.id);
  const marks = new Map<number, 'waived' | 'canceled'>();
  for (const a of adjustments) if (a.kind !== 'fee' && a.installment !== undefined) marks.set(a.installment, a.kind);
  const feesRecorded = cents(adjustments.filter((a) => a.kind === 'fee').reduce((s, a) => s + (a.amount ?? 0), 0));

  const byDate = (a: { date: string; id?: string }, b: { date: string; id?: string }) => a.date.localeCompare(b.date) || (a.id ?? '').localeCompare(b.id ?? '');
  const manual = (input.manual ?? []).filter((m) => m.loanId === loan.id && m.amount > 0).sort(byDate);

  // A bank payment that matches something the person recorded by hand is that same payment, so the record is not
  // counted as well. A payment of another size or on a clearly different day is left alone.
  const bankC: Contribution[] = bank.payments.filter((p) => p.amount > 0).map((p) => ({ kind: 'bank' as const, id: p.id, installment: p.installment, amount: p.amount, date: p.date })).sort(byDate);
  const claimed = new Set<string>();
  const superseded: { id: string; txnId: string }[] = [];
  for (const b of bankC) {
    const inst = b.installment !== undefined ? byN.get(b.installment) : undefined;
    const allow = inst ? tol(inst) : options.amountFloor;
    let best: { m: ManualPayment; days: number } | null = null;
    for (const m of manual) {
      if (claimed.has(m.id) || (m.installment !== undefined && m.installment !== b.installment) || Math.abs(m.amount - b.amount) > allow) continue;
      const days = Math.abs(daysBetween(m.date, b.date));
      if (days <= MANUAL_MATCH_DAYS && (!best || days < best.days)) best = { m, days };
    }
    if (best) {
      claimed.add(best.m.id);
      superseded.push({ id: best.m.id, txnId: b.id });
    }
  }
  const manualC: Contribution[] = manual.filter((m) => !claimed.has(m.id)).map((m) => ({ kind: 'manual' as const, id: m.id, installment: m.installment, amount: m.amount, date: m.date }));

  // Payments made for a particular installment go to it first, bank before manual. Anything over what it asks for, and
  // anything not made for one, goes into a pool that clears the oldest installments already due.
  const direct = new Map<number, Contribution[]>();
  const pool: Contribution[] = [];
  for (const c of [...bankC, ...manualC]) {
    if (c.installment !== undefined && byN.has(c.installment)) direct.set(c.installment, [...(direct.get(c.installment) ?? []), c]);
    else pool.push(c);
  }

  const shares = new Map<number, PaymentShare[]>();
  const appliedTo = (n: number) => cents((shares.get(n) ?? []).reduce((s, x) => s + x.amount, 0));
  const addShare = (n: number, c: Contribution, amount: number, spill: boolean) => shares.set(n, [...(shares.get(n) ?? []), { kind: c.kind, id: c.id, amount, date: c.date, ...(spill ? { spill } : {}) }]);
  const expectedOf = (i: Installment) => (marks.has(i.n) ? 0 : i.payment);

  for (const inst of schedule) {
    let room = expectedOf(inst);
    for (const c of direct.get(inst.n) ?? []) {
      const take = Math.min(room, c.amount);
      if (take > 0.004) addShare(inst.n, c, cents(take), false);
      room = cents(room - take);
      const over = cents(c.amount - take);
      if (over > tol(inst)) pool.push({ ...c, amount: over }); // a little over is a rounding difference; more is a larger payment
    }
  }
  pool.sort(byDate);
  let extraPaid = 0;
  for (const c of pool) {
    let left = c.amount;
    for (const inst of schedule) {
      if (left <= 0.004) break;
      const e = expectedOf(inst);
      const short = cents(e - appliedTo(inst.n));
      if (e === 0 || inst.date > asOf || short <= tol(inst)) continue;
      const take = Math.min(left, short);
      addShare(inst.n, c, cents(take), true);
      left = cents(left - take);
    }
    if (left > 0.004) extraPaid = cents(extraPaid + left);
  }

  const pendingBy = new Map<number, number>();
  for (const p of bank.pending) pendingBy.set(p.installment, cents((pendingBy.get(p.installment) ?? 0) + p.amount));
  const reversedBy = new Map<number, number>();
  for (const r of bank.reversed) reversedBy.set(r.installment, cents((reversedBy.get(r.installment) ?? 0) + r.amount));

  // The first installment anything is known about. Later ones with nothing paid are properly overdue; earlier ones are
  // history the app never saw, so it cannot say.
  const known = schedule.filter((i) => appliedTo(i.n) > 0 || pendingBy.has(i.n) || reversedBy.has(i.n)).map((i) => i.date).sort();
  const trackedFrom = input.trackedFrom ?? known[0];
  const dueEdge = addDays(asOf, -graceDays);
  const soonEdge = addDays(asOf, upcomingDays);

  const rows: InstallmentRepayment[] = schedule.map((inst) => {
    const expected = expectedOf(inst);
    const mine = shares.get(inst.n) ?? [];
    const bankPaid = cents(mine.filter((s) => s.kind === 'bank').reduce((s, x) => s + x.amount, 0));
    const manualPaid = cents(mine.filter((s) => s.kind === 'manual').reduce((s, x) => s + x.amount, 0));
    const applied = cents(bankPaid + manualPaid);
    const full = expected > 0 && cents(expected - applied) <= tol(inst);
    const shortfall = expected === 0 || full ? 0 : cents(expected - applied);
    const pending = pendingBy.get(inst.n) ?? 0;
    const reversed = reversedBy.get(inst.n) ?? 0;

    let status: InstallmentStatus;
    const mark = marks.get(inst.n);
    if (mark) status = mark;
    else if (full) status = manualPaid > 0 ? 'paidManual' : 'paidBank';
    else if (applied > 0) status = 'partial';
    else if (reversed > 0) status = 'reversed';
    else if (pending > 0 && inst.date <= asOf) status = 'unverified';
    else if (inst.date > soonEdge) status = 'scheduled';
    else if (inst.date > asOf) status = 'upcoming';
    else if (inst.date >= dueEdge) status = 'due';
    else status = trackedFrom !== undefined && inst.date >= trackedFrom ? 'pastDue' : 'unverified';

    // A part payment goes to the interest first, then the principal.
    const principalPaid = mark ? 0 : full ? inst.principal : cents(Math.min(inst.principal, Math.max(0, applied - inst.interest)));
    const interestPaid = mark ? 0 : full ? inst.interest : cents(Math.min(applied, inst.interest));
    return { n: inst.n, date: inst.date, expected, status, applied, bank: bankPaid, manual: manualPaid, pending, reversed, shortfall, principalPaid, interestPaid, shares: mine };
  });

  const live = rows.filter((r) => !marks.has(r.n));
  const isPaid = (r: InstallmentRepayment) => r.status === 'paidBank' || r.status === 'paidManual';
  const principalOf = (n: number) => byN.get(n)!.principal;
  const principalPaid = cents(rows.reduce((s, r) => s + r.principalPaid, 0));
  const principalWaived = cents(rows.filter((r) => marks.has(r.n)).reduce((s, r) => s + principalOf(r.n), 0));
  const unpaid = live.filter((r) => !isPaid(r));
  const past = live.filter((r) => r.date <= asOf);
  const unverified = rows.filter((r) => r.status === 'unverified' && r.date <= asOf);
  const done = rows.length > 0 && unpaid.length === 0;
  const lastDate = schedule[schedule.length - 1]?.date ?? loan.firstDate;
  const paymentDates = rows.flatMap((r) => r.shares.map((s) => s.date)).sort();

  return {
    asOf,
    rows,
    superseded,
    financed: loan.amount,
    scheduledRemainingPrincipal: statusFor(loan, asOf).remaining,
    principalPaid,
    principalWaived,
    principalRemaining: cents(Math.max(0, loan.amount - principalPaid - principalWaived)),
    outstandingPayments: cents(unpaid.reduce((s, r) => s + r.shortfall, 0)),
    remainingFutureInterest: cents(unpaid.filter((r) => r.date > asOf).reduce((s, r) => s + (byN.get(r.n)!.interest - r.interestPaid), 0)),
    interestPaid: cents(rows.reduce((s, r) => s + r.interestPaid, 0)),
    feesRecorded,
    verifiedPaid: cents(rows.reduce((s, r) => s + r.bank, 0)),
    manualPaid: cents(rows.reduce((s, r) => s + r.manual, 0)),
    extraPaid,
    expectedCount: past.length,
    expectedAmount: cents(past.reduce((s, r) => s + r.expected, 0)),
    confirmedCount: live.filter(isPaid).length,
    bankConfirmedCount: live.filter((r) => r.status === 'paidBank').length,
    overdueCount: rows.filter((r) => r.status === 'pastDue').length,
    unverifiedCount: unverified.length,
    unverifiedAmount: cents(unverified.reduce((s, r) => s + r.shortfall, 0)),
    unpaidCount: unpaid.length,
    progress: loan.amount > 0 ? Math.min(1, principalPaid / loan.amount) : 0,
    nextScheduled: live.find((r) => r.date >= asOf) ?? null,
    nextUnpaid: unpaid[0] ?? null,
    done,
    completion: done ? (paymentDates[paymentDates.length - 1] ?? lastDate) : (live[live.length - 1]?.date ?? lastDate),
    completionLate: !done && (live[live.length - 1]?.date ?? lastDate) < asOf,
  };
}

function addDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * 86_400_000).toISOString().slice(0, 10);
}
