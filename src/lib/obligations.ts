import type { LinkView, InstallmentLink } from './loanLinks';
import { amountTolerance, dateWindow, daysBetween, providerMatch, resolveOptions } from './loanMatching.ts';
import type { PaymentData } from './loanPayments';
import type { LoanRole } from './loanRoles';
import { scheduleFor, type Loan } from './loans.ts';
import { upcomingPayments, type CommitmentGroup, type UpcomingPayment } from './overview';
import { epochDay, isoFromEpochDay } from './patterns';
import type { Analysis } from './recurring';
import { bankEvidenceFromViews, repaymentFor, type InstallmentStatus, type Repayment } from './repayment.ts';

// Money Wallex knows is due, in one shape, from every place it comes from.
//
// Two sources feed it: the recurring payments the Recurring tab detected (a prediction from past charges), and the
// installments of pay-later loans from the Loans page (a schedule the person entered). Overview, Schedule and Forecast
// all read their upcoming payments from here instead of working them out themselves, so the same installment is the same
// figure everywhere and is never taken out of the cash twice.
//
// Two entries are treated as one obligation only on evidence: a transaction the person confirmed as paying a loan's
// installment that also belongs to a recurring stream. A provider's name alone proves nothing, because one provider can
// have several loans. When the evidence does not settle it, both entries stay, are marked, and are listed as ambiguities.

/* ---------------------------------------------------------------------------------------------------- model */
export type ObligationSource = 'loan' | 'recurring';
export type ObligationStatus = InstallmentStatus | 'predicted'; // a recurring prediction has no payment status yet
export type ObligationEvidence = 'bank-confirmed' | 'recorded' | 'schedule' | 'pattern';

export interface Obligation {
  id: string; // `loan:${loanId}:${installment}` or `recurring:${the prediction's id}`
  source: ObligationSource;
  loanId?: string;
  installment?: number;
  installmentId?: string; // `${loanId}:${installment}`, the same key the bank links use
  recurringId?: string;
  name: string; // the lender, or the merchant
  logos: string[];
  type: string; // 'bnpl' for a loan installment; for a prediction, the Recurring tab's kind (bill, subscription, debt...)
  date: string; // YYYY-MM-DD
  earliest: string;
  latest: string;
  expected: number; // what the schedule or pattern asks for
  paid: number; // confirmed paid: bank payments and ones the person recorded, net of refunds
  remaining: number; // still due; 0 once paid, waived or canceled
  status: ObligationStatus;
  estimated: boolean; // the amount or the date is a prediction
  evidence: ObligationEvidence; // what the figures rest on
  transactionIds: string[]; // the bank transactions linked to it, or the charges behind a prediction
  count?: number; // installments in the loan
  overlap: { with: string[]; reason: string } | null; // may be the same payment as another entry; both are kept
  payment?: UpcomingPayment; // the prediction it came from, untouched
}

export interface Ambiguity {
  id: string;
  kind: 'claimed-by-several' | 'same-provider';
  obligationIds: string[];
  amount: number; // the largest of them: what could be counted twice
  reason: string;
}

export interface Folded {
  prediction: Obligation; // the recurring prediction that was left out...
  installment: Obligation; // ...because this installment is the same payment
}

export interface ObligationResult {
  obligations: Obligation[]; // date order
  folded: Folded[];
  ambiguities: Ambiguity[];
}

export interface LoanObligationData {
  loans: Loan[];
  links: InstallmentLink[];
  views: LinkView[];
  payments: PaymentData;
  roles?: LoanRole[]; // transactions the person tied to a loan as its purchase, down payment, fees and so on (see bnpl.ts)
}

export const NO_LOANS: LoanObligationData = { loans: [], links: [], views: [], payments: { payments: [], adjustments: [] } };

export interface ObligationRequest {
  today: string;
  from: string; // YYYY-MM-DD, inclusive
  to: string; // inclusive
  analysis: Analysis | null;
  loanData?: LoanObligationData | null;
}

/* ----------------------------------------------------------------------------------------- loan installments */
const repayments = (data: LoanObligationData, today: string) =>
  new Map(
    data.loans
      .filter((l) => l.type === 'bnpl')
      .map((l) => [l.id, repaymentFor({ loan: l, asOf: today, bank: bankEvidenceFromViews(data.views, l.id), manual: data.payments.payments, adjustments: data.payments.adjustments })] as [string, Repayment]),
  );

function loanObligations(data: LoanObligationData, today: string, from: string, to: string): Obligation[] {
  const out: Obligation[] = [];
  const reps = repayments(data, today);
  for (const loan of data.loans) {
    const rep = reps.get(loan.id);
    if (!rep) continue; // only loans the person classified as pay-later
    const schedule = scheduleFor(loan);
    for (const row of rep.rows) {
      if (row.date < from || row.date > to) continue;
      const linked = data.views.filter((v) => v.link.loanId === loan.id && v.link.installment === row.n);
      const closed = row.status === 'waived' || row.status === 'canceled';
      out.push({
        id: `loan:${loan.id}:${row.n}`,
        source: 'loan',
        loanId: loan.id,
        installment: row.n,
        installmentId: `${loan.id}:${row.n}`,
        name: loan.lender,
        logos: [...new Set(linked.flatMap((v) => v.txn?.logos ?? []))],
        type: 'bnpl',
        date: row.date,
        earliest: row.date,
        latest: row.date,
        expected: schedule[row.n - 1].payment,
        paid: row.applied,
        remaining: closed ? 0 : row.shortfall,
        status: row.status,
        estimated: false,
        evidence: row.status === 'paidBank' ? 'bank-confirmed' : row.status === 'paidManual' ? 'recorded' : 'schedule',
        transactionIds: [...new Set(linked.map((v) => v.link.txnId))],
        count: loan.count,
        overlap: null,
      });
    }
  }
  return out;
}

/* ------------------------------------------------------------------------------------ recurring predictions */
function recurringObligations(analysis: Analysis | null, today: string, from: string, to: string): Obligation[] {
  const window = epochDay(to) - epochDay(today);
  if (!analysis || window < 1) return [];
  return upcomingPayments(analysis, today, window)
    .filter((p) => p.date >= from && p.date <= to)
    .map((p) => ({
      id: `recurring:${p.id}`,
      source: 'recurring' as const,
      recurringId: p.recurringId,
      name: p.name,
      logos: p.logos,
      type: p.kind,
      date: p.date,
      earliest: p.earliest,
      latest: p.latest,
      expected: p.amount,
      paid: 0,
      remaining: p.amount,
      status: 'predicted' as const,
      estimated: p.amountApprox || p.dateApprox,
      evidence: 'pattern' as const,
      transactionIds: p.chargeIds,
      overlap: null,
      payment: p,
    }));
}

// Which recurring streams a confirmed payment ties to which loan: a transaction linked to an installment that is also one
// of the stream's charges. This is the primary evidence that the two are the same obligation.
export function recurringClaims(analysis: Analysis | null, links: InstallmentLink[]): Map<string, Set<string>> {
  const owner = new Map<string, string>();
  for (const r of analysis?.items ?? []) for (const c of r.charges) owner.set(c.id, r.id);
  const claims = new Map<string, Set<string>>();
  for (const l of links) {
    if (l.status !== 'linked') continue;
    for (const id of [l.txnId, ...(l.previousTxnIds ?? [])]) {
      const stream = owner.get(id);
      if (stream) claims.set(stream, (claims.get(stream) ?? new Set()).add(l.loanId));
    }
  }
  return claims;
}

/* --------------------------------------------------------------------------------------------- the selector */
export function obligationsBetween(req: ObligationRequest): ObligationResult {
  const data = req.loanData ?? NO_LOANS;
  const predictions = recurringObligations(req.analysis, req.today, req.from, req.to);
  const installments = loanObligations(data, req.today, req.from, req.to);
  if (!installments.length) return { obligations: predictions, folded: [], ambiguities: [] }; // nothing to reconcile: as before

  const o = resolveOptions();
  const loans = new Map(data.loans.map((l) => [l.id, l]));
  const claims = recurringClaims(req.analysis, data.links);
  const open = installments.filter((i) => i.status !== 'waived' && i.status !== 'canceled');
  const taken = new Set<string>();
  const dropped = new Set<string>();
  const folded: Folded[] = [];
  const ambiguities: Ambiguity[] = [];
  const mark = (x: Obligation, withIds: string[], reason: string) => {
    x.overlap = { with: [...new Set([...(x.overlap?.with ?? []), ...withIds])], reason };
  };

  // Whether an installment sits where a prediction does: close in date and in amount, judged by the loan's own rhythm.
  const aligned = (p: Obligation, i: Obligation) => {
    const loan = loans.get(i.loanId!)!;
    return Math.abs(daysBetween(p.date, i.date)) <= dateWindow(loan.frequency, o) && Math.abs(p.expected - i.expected) <= amountTolerance(i.expected, o);
  };

  for (const p of [...predictions].sort((a, b) => a.date.localeCompare(b.date))) {
    const owners = claims.get(p.recurringId ?? '');
    if (owners?.size) {
      // Linked payments show this stream is (at least partly) a loan's. An installment of that loan where this prediction
      // falls is the same payment, provided only one loan could be the one.
      const fits = open.filter((i) => owners.has(i.loanId!) && !taken.has(i.id) && aligned(p, i));
      const loansFit = new Set(fits.map((i) => i.loanId));
      if (loansFit.size === 1) {
        const mine = fits.sort((a, b) => Math.abs(daysBetween(p.date, a.date)) - Math.abs(daysBetween(p.date, b.date)))[0];
        taken.add(mine.id);
        dropped.add(p.id);
        folded.push({ prediction: p, installment: mine });
        continue;
      }
      if (loansFit.size > 1) {
        const ids = [p.id, ...fits.map((i) => i.id)];
        const reason = 'Linked payments tie this stream to more than one loan, and more than one installment fits it.';
        for (const x of [p, ...fits]) mark(x, ids.filter((id) => id !== x.id), reason);
        ambiguities.push({ id: `ambiguous:${p.id}`, kind: 'claimed-by-several', obligationIds: ids, amount: Math.max(p.expected, ...fits.map((i) => i.expected)), reason });
        continue;
      }
    }
    // No confirmed link between them. The same lender with a payment landing where an installment does is worth
    // pointing out, but a name and a date are not proof, so both stay.
    const near = open.filter((i) => !taken.has(i.id) && providerMatch(loans.get(i.loanId!)!.lender, { merchant: p.name, details: [] }) !== null && aligned(p, i));
    if (near.length) {
      const ids = [p.id, ...near.map((i) => i.id)];
      const reason = 'Looks like the same lender and schedule, but no linked payment confirms it. Both are counted until you link the payments.';
      for (const x of [p, ...near]) mark(x, ids.filter((id) => id !== x.id), reason);
      ambiguities.push({ id: `possible:${p.id}`, kind: 'same-provider', obligationIds: ids, amount: Math.max(p.expected, ...near.map((i) => i.expected)), reason });
    }
  }

  const obligations = [...installments, ...predictions.filter((p) => !dropped.has(p.id))].sort((a, b) => a.date.localeCompare(b.date) || b.expected - a.expected || a.id.localeCompare(b.id));
  return { obligations, folded, ambiguities };
}

// A calendar month, "YYYY-MM": the payments that fall on its actual days, not a monthly average.
export function monthBounds(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number);
  return { from: `${month}-01`, to: `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}` };
}

export const obligationsForMonth = (req: Omit<ObligationRequest, 'from' | 'to'>, month: string) => obligationsBetween({ ...req, ...monthBounds(month) });

/* ------------------------------------------------------------------------------------------------ totals */
// Money that is owed and known to be unpaid. A past installment nobody has recorded is "unverified", not owed.
export const isOpen = (o: Obligation) => o.remaining > 0 && o.status !== 'unverified';

export interface ObligationTotals {
  count: number; // open obligations
  remaining: number; // still due across them
  bnplCount: number;
  bnplRemaining: number;
  estimatedRemaining: number; // part of the total that rests on a prediction
  overlapRemaining: number; // part that may also be counted as another entry
  paid: number; // confirmed paid, of the installments in the range
  unverifiedCount: number; // past installments nothing is recorded for: left out of the figures above
  ambiguities: number;
}

export function obligationTotals(result: ObligationResult): ObligationTotals {
  const open = result.obligations.filter(isOpen);
  const sum = (list: Obligation[]) => Math.round(list.reduce((s, o) => s + o.remaining, 0) * 100) / 100;
  const bnpl = open.filter((o) => o.source === 'loan');
  return {
    count: open.length,
    remaining: sum(open),
    bnplCount: bnpl.length,
    bnplRemaining: sum(bnpl),
    estimatedRemaining: sum(open.filter((o) => o.estimated)),
    overlapRemaining: sum(open.filter((o) => o.overlap)),
    paid: Math.round(result.obligations.reduce((s, o) => s + o.paid, 0) * 100) / 100,
    unverifiedCount: result.obligations.filter((o) => o.status === 'unverified').length,
    ambiguities: result.ambiguities.length,
  };
}

/* ---------------------------------------------------------------------------------------------- consumers */
// The upcoming-payments list Overview and Forecast already work with, now including loan installments and without the
// predictions those installments replace. With no pay-later loans it is exactly what upcomingPayments gives.
export function upcomingWithLoans(analysis: Analysis, today: string, windowDays: number, loanData?: LoanObligationData | null): UpcomingPayment[] {
  if (!loanData?.loans.some((l) => l.type === 'bnpl')) return upcomingPayments(analysis, today, windowDays);
  const result = obligationsBetween({ today, from: today, to: isoFromEpochDay(epochDay(today) + windowDays), analysis, loanData });
  return result.obligations.filter((o) => o.date >= today && isOpen(o)).map(toUpcoming).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : b.amount - a.amount));
}

export function toUpcoming(o: Obligation): UpcomingPayment {
  if (o.source === 'recurring' && o.payment) return o.overlap ? { ...o.payment, overlap: o.overlap.reason } : o.payment;
  return {
    id: o.id,
    name: o.name,
    logos: o.logos,
    kind: 'installment',
    date: o.date,
    earliest: o.earliest,
    latest: o.latest,
    amount: o.remaining,
    amountApprox: false,
    dateApprox: false,
    paidMonths: [],
    chargeIds: o.transactionIds,
    loan: { loanId: o.loanId!, installment: o.installment!, count: o.count ?? 0, partly: o.paid > 0 },
    ...(o.overlap ? { overlap: o.overlap.reason } : {}),
  };
}

// The recurring streams whose payments are counted as a loan's, so a monthly commitments total does not count them twice.
export function claimedStreams(analysis: Analysis | null, loanData: LoanObligationData | null | undefined, today: string): Set<string> {
  if (!loanData?.loans.length) return new Set();
  const active = new Set([...repayments(loanData, today)].filter(([, r]) => !r.done).map(([id]) => id));
  const out = new Set<string>();
  for (const [stream, owners] of recurringClaims(analysis, loanData.links)) if ([...owners].some((id) => active.has(id))) out.add(stream);
  return out;
}

// What the pay-later loans take in the current calendar month, added up from the installments that fall in it.
export function loanCommitments(loanData: LoanObligationData | null | undefined, today: string): CommitmentGroup {
  const empty: CommitmentGroup = { count: 0, monthly: 0, items: [] };
  if (!loanData?.loans.some((l) => l.type === 'bnpl')) return empty;
  const { from, to } = monthBounds(today.slice(0, 7));
  const inMonth = loanObligations(loanData, today, from, to).filter((o) => o.status !== 'waived' && o.status !== 'canceled');
  const items = new Map<string, number>();
  for (const o of inMonth) items.set(o.loanId!, (items.get(o.loanId!) ?? 0) + o.expected);
  const named = [...items].map(([id, monthly]) => ({ name: loanData.loans.find((l) => l.id === id)!.lender, monthly: Math.round(monthly * 100) / 100 })).sort((a, b) => b.monthly - a.monthly);
  return { count: named.length, monthly: Math.round(named.reduce((s, i) => s + i.monthly, 0) * 100) / 100, items: named };
}
