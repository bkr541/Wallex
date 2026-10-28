/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildLink, createLinkStore, reconcileLinks, type InstallmentLink, type LinkRepository } from './loanLinks.ts';
import { createPaymentStore, normalizeAdjustments, normalizePayments, type LoanAdjustment, type ManualPayment, type PaymentData, type PaymentRepository } from './loanPayments.ts';
import { scheduleFor, statusFor, type Loan } from './loans.ts';
import { bankEvidenceFromViews, repaymentFor, type BankEvidence } from './repayment.ts';
import type { Txn } from './wallex';

/* ------------------------------------------------------------------------------------------------ fixtures */
// $600 in four $150 payments every two weeks, no interest: Jan 10, Jan 24, Feb 7, Feb 21.
const affirm: Loan = { id: 'A', lender: 'Affirm', item: '', amount: 600, apr: 0, count: 4, frequency: 'biweekly', firstDate: '2026-01-10', type: 'bnpl' };
// $1,200 over twelve months at 12% a year: $106.62 a payment, $12.00 of the first one is interest.
const car: Loan = { id: 'C', lender: 'Credit Union', item: '', amount: 1200, apr: 12, count: 12, frequency: 'monthly', firstDate: '2026-01-15', type: 'personal' };
const legacy: Loan = { id: 'L', lender: 'Affirm', item: 'Peloton', amount: 600, apr: 0, count: 4, frequency: 'biweekly', firstDate: '2026-01-10' }; // saved before types

const bank = (...payments: [number, number, string][]): BankEvidence => ({
  payments: payments.map(([installment, amount, date], i) => ({ id: `tx${i}`, installment, amount, date })),
  pending: [],
  reversed: [],
});
let seq = 0;
const manual = (loanId: string, amount: number, date: string, installment?: number): ManualPayment => ({ id: `m${++seq}`, loanId, amount, date, source: 'cash', createdAt: '', ...(installment ? { installment } : {}) });
const status = (r: ReturnType<typeof repaymentFor>) => r.rows.map((x) => x.status);

/* --------------------------------------------------------------------------------------------- the calendar */
test('payments that are not due yet are scheduled, upcoming or due, and nothing is paid', () => {
  assert.deepEqual(status(repaymentFor({ loan: affirm, asOf: '2025-12-01' })), ['scheduled', 'scheduled', 'scheduled', 'scheduled']);
  assert.deepEqual(status(repaymentFor({ loan: affirm, asOf: '2026-01-05' })).slice(0, 2), ['upcoming', 'scheduled']);
  assert.equal(repaymentFor({ loan: affirm, asOf: '2026-01-10' }).rows[0].status, 'due');
  assert.equal(repaymentFor({ loan: affirm, asOf: '2026-01-11' }).rows[0].status, 'due'); // still inside the grace days
  const r = repaymentFor({ loan: affirm, asOf: '2025-12-01' });
  assert.deepEqual([r.principalRemaining, r.progress, r.confirmedCount, r.expectedCount, r.outstandingPayments], [600, 0, 0, 0, 600]);
  assert.equal(r.nextScheduled?.n, 1);
  assert.equal(r.nextUnpaid?.n, 1);
  assert.equal(r.completion, '2026-02-21');
  assert.equal(r.completionLate, false);
});

test('a date passing is not a payment: past installments with no evidence are unverified, never confirmed or overdue', () => {
  const r = repaymentFor({ loan: affirm, asOf: '2026-03-01' });
  assert.deepEqual(status(r), ['unverified', 'unverified', 'unverified', 'unverified']);
  assert.equal(r.overdueCount, 0);
  assert.equal(r.unverifiedCount, 4);
  assert.equal(r.unverifiedAmount, 600);
  assert.equal(r.expectedCount, 4);
  assert.equal(r.confirmedCount, 0);
  assert.equal(r.bankConfirmedCount, 0);
  assert.equal(r.principalRemaining, 600); // the balance does not fall because time has passed
  assert.equal(r.progress, 0);
  assert.equal(r.done, false);
  assert.equal(r.completionLate, true);
  // The calendar's own answer is still there, kept apart and named as what it is.
  assert.equal(r.scheduledRemainingPrincipal, 0);
  assert.equal(statusFor(affirm, '2026-03-01').paid, 4);
});

test('the balance stays put as the date moves on', () => {
  const dates = ['2026-01-01', '2026-01-20', '2026-02-10', '2026-06-01'];
  assert.deepEqual(dates.map((d) => repaymentFor({ loan: affirm, asOf: d }).principalRemaining), [600, 600, 600, 600]);
  assert.deepEqual(dates.map((d) => repaymentFor({ loan: affirm, asOf: d, bank: bank([1, 150, '2026-01-10']) }).principalRemaining), [450, 450, 450, 450]);
});

test('loans saved before types existed get the same honest view', () => {
  const r = repaymentFor({ loan: legacy, asOf: '2026-03-01' });
  assert.deepEqual([r.unverifiedCount, r.overdueCount, r.principalRemaining, r.rows.length], [4, 0, 600, 4]);
  assert.deepEqual(scheduleFor(legacy).map((i) => [i.n, i.date, i.payment]), [[1, '2026-01-10', 150], [2, '2026-01-24', 150], [3, '2026-02-07', 150], [4, '2026-02-21', 150]]);
});

/* ------------------------------------------------------------------------------------------ bank payments */
test('bank-confirmed payments are paid, and what is left is past due once payments are being tracked', () => {
  const r = repaymentFor({ loan: affirm, asOf: '2026-03-01', bank: bank([1, 150, '2026-01-11'], [2, 150, '2026-01-24']) });
  assert.deepEqual(status(r), ['paidBank', 'paidBank', 'pastDue', 'pastDue']);
  assert.deepEqual([r.principalPaid, r.principalRemaining, r.progress, r.verifiedPaid, r.manualPaid], [300, 300, 0.5, 300, 0]);
  assert.deepEqual([r.confirmedCount, r.bankConfirmedCount, r.overdueCount, r.unverifiedCount, r.unpaidCount, r.outstandingPayments], [2, 2, 2, 0, 2, 300]);
  assert.equal(r.nextUnpaid?.n, 3);
  assert.equal(r.completionLate, true);
});

test('history from before the first known payment stays unverified, not overdue', () => {
  const r = repaymentFor({ loan: affirm, asOf: '2026-03-01', bank: bank([3, 150, '2026-02-07']) });
  assert.deepEqual(status(r), ['unverified', 'unverified', 'paidBank', 'pastDue']);
  assert.equal(r.unverifiedAmount, 300);
  assert.equal(repaymentFor({ loan: affirm, asOf: '2026-03-01', trackedFrom: '2026-01-01' }).overdueCount, 4); // unless told otherwise
});

test('an installment is due before it is past due', () => {
  const r = repaymentFor({ loan: affirm, asOf: '2026-02-08', bank: bank([1, 150, '2026-01-10'], [2, 150, '2026-01-24']) });
  assert.equal(r.rows[2].status, 'due');
  assert.equal(repaymentFor({ loan: affirm, asOf: '2026-02-10', bank: bank([1, 150, '2026-01-10'], [2, 150, '2026-01-24']) }).rows[2].status, 'pastDue');
});

test('a missed payment between paid ones is past due, and the balance counts it as owed', () => {
  const r = repaymentFor({ loan: affirm, asOf: '2026-03-01', bank: bank([1, 150, '2026-01-10'], [3, 150, '2026-02-07'], [4, 150, '2026-02-21']) });
  assert.deepEqual(status(r), ['paidBank', 'pastDue', 'paidBank', 'paidBank']);
  assert.equal(r.principalRemaining, 150);
  assert.equal(r.outstandingPayments, 150);
  assert.equal(r.nextUnpaid?.n, 2);
  assert.equal(r.done, false);
});

test('a pending payment is not a payment', () => {
  const evidence: BankEvidence = { payments: [], pending: [{ installment: 1, amount: 150, date: '2026-01-10' }], reversed: [] };
  const r = repaymentFor({ loan: affirm, asOf: '2026-01-20', bank: evidence });
  assert.equal(r.rows[0].status, 'unverified');
  assert.deepEqual([r.rows[0].pending, r.rows[0].applied, r.principalPaid, r.principalRemaining], [150, 0, 0, 600]);
  assert.equal(repaymentFor({ loan: affirm, asOf: '2026-01-05', bank: evidence }).rows[0].status, 'upcoming');
});

/* ----------------------------------------------------------------------------------------- manual payments */
test('a payment the person recorded counts, and is labelled as theirs', () => {
  const r = repaymentFor({ loan: affirm, asOf: '2026-03-01', manual: [manual('A', 150, '2026-01-10', 1)] });
  assert.equal(r.rows[0].status, 'paidManual');
  assert.deepEqual([r.manualPaid, r.verifiedPaid, r.bankConfirmedCount, r.confirmedCount, r.principalRemaining], [150, 0, 0, 1, 450]);
  assert.equal(r.rows[1].status, 'pastDue'); // recording one makes the loan tracked from then on
  assert.equal(repaymentFor({ loan: affirm, asOf: '2026-03-01', manual: [manual('other-loan', 150, '2026-01-10', 1)] }).confirmedCount, 0);
});

test('a manual payment with no installment goes to the oldest unpaid one that is due', () => {
  const r = repaymentFor({ loan: affirm, asOf: '2026-02-01', manual: [manual('A', 150, '2026-01-12'), manual('A', 150, '2026-01-26')] });
  assert.deepEqual(status(r), ['paidManual', 'paidManual', 'upcoming', 'scheduled']);
  assert.deepEqual(r.rows.map((x) => x.applied), [150, 150, 0, 0]);
});

test('linking the bank transaction afterwards does not count the payment twice', () => {
  const m = manual('A', 150, '2026-01-10', 1);
  const r = repaymentFor({ loan: affirm, asOf: '2026-03-01', manual: [m], bank: bank([1, 150, '2026-01-11']) });
  assert.deepEqual(r.superseded, [{ id: m.id, txnId: 'tx0' }]);
  assert.equal(r.rows[0].status, 'paidBank');
  assert.deepEqual([r.rows[0].applied, r.manualPaid, r.verifiedPaid, r.principalRemaining, r.extraPaid], [150, 0, 150, 450, 0]);
  // The unpinned record is recognised too, and each bank payment only retires one record.
  const loose = manual('A', 150, '2026-01-10');
  const two = repaymentFor({ loan: affirm, asOf: '2026-03-01', manual: [loose, manual('A', 150, '2026-01-10')], bank: bank([1, 150, '2026-01-10']) });
  assert.equal(two.superseded.length, 1);
  assert.equal(two.rows.filter((x) => x.applied > 0).length, 2);
});

test('a record of a different amount or a different time is a separate payment', () => {
  const r = repaymentFor({ loan: affirm, asOf: '2026-03-01', manual: [manual('A', 40, '2026-01-10', 1), manual('A', 150, '2026-01-10', 2)], bank: bank([1, 150, '2026-01-10']) });
  assert.equal(r.superseded.length, 0);
  assert.equal(r.rows[0].applied, 150);
  assert.equal(r.rows[1].status, 'paidManual');
  const late = repaymentFor({ loan: affirm, asOf: '2026-03-01', manual: [manual('A', 150, '2026-02-15', 1)], bank: bank([1, 150, '2026-01-10']) });
  assert.equal(late.superseded.length, 0);
});

/* ------------------------------------------------------------------------------------------ partial payments */
test('a partial payment is not a whole installment', () => {
  const r = repaymentFor({ loan: affirm, asOf: '2026-03-01', manual: [manual('A', 60, '2026-01-10', 1)] });
  assert.equal(r.rows[0].status, 'partial');
  assert.deepEqual([r.rows[0].shortfall, r.principalPaid, r.principalRemaining, r.outstandingPayments, r.confirmedCount], [90, 60, 540, 540, 0]);
  assert.equal(r.progress, 0.1);
});

test('a partial payment on an interest-bearing loan goes to interest first', () => {
  const first = scheduleFor(car)[0];
  assert.deepEqual([first.payment, first.interest, first.principal], [106.62, 12, 94.62]);
  const r = repaymentFor({ loan: car, asOf: '2026-02-01', manual: [manual('C', 50, '2026-01-15', 1)] });
  assert.deepEqual([r.rows[0].interestPaid, r.rows[0].principalPaid, r.principalRemaining], [12, 38, 1162]);
  assert.equal(repaymentFor({ loan: car, asOf: '2026-02-01', manual: [manual('C', 10, '2026-01-15', 1)] }).principalPaid, 0);
});

test('two part payments make a whole one, bank and manual together', () => {
  const r = repaymentFor({ loan: affirm, asOf: '2026-02-01', bank: bank([1, 100, '2026-01-10']), manual: [manual('A', 50, '2026-01-12', 1)] });
  assert.equal(r.rows[0].status, 'paidManual');
  assert.deepEqual([r.rows[0].bank, r.rows[0].manual, r.verifiedPaid, r.manualPaid], [100, 50, 100, 50]);
});

/* ---------------------------------------------------------------------------------------------- reversals */
test('a refunded payment is not paid', () => {
  const evidence: BankEvidence = { payments: [], pending: [], reversed: [{ installment: 1, amount: 150, date: '2026-01-10' }] };
  const r = repaymentFor({ loan: affirm, asOf: '2026-03-01', bank: evidence });
  assert.equal(r.rows[0].status, 'reversed');
  assert.deepEqual([r.principalPaid, r.principalRemaining, r.confirmedCount, r.rows[0].reversed], [0, 600, 0, 150]);
  assert.equal(r.rows[1].status, 'pastDue'); // the refund shows payments were being tracked
});

test('a partly refunded payment is only partly paid', () => {
  const r = repaymentFor({ loan: affirm, asOf: '2026-03-01', bank: { payments: [{ id: 't', installment: 1, amount: 110, date: '2026-01-10' }], pending: [], reversed: [{ installment: 1, amount: 40, date: '2026-01-10' }] } });
  assert.deepEqual([r.rows[0].status, r.rows[0].applied, r.rows[0].shortfall], ['partial', 110, 40]);
});

test('bank evidence comes from the links, with refunds applied', () => {
  const t = (id: string, amount: number, date: string, pending = false): Txn => ({ id, accountId: 'chk', date, authorizedDate: null, merchant: 'AFFIRM', logos: [], category: '', categoryKey: '', categoryDetailKey: '', channel: '', pending, amount, details: [] });
  const repo: LinkRepository = { load: () => [], save: () => {} };
  const store = createLinkStore(repo);
  const [i1, i2, i3] = scheduleFor(affirm);
  const rows = [t('p1', -150, '2026-01-10'), t('p2', -150, '2026-01-24'), t('p3', -150, '2026-02-07', true), t('refund', 150, '2026-02-01')];
  store.link(buildLink(affirm, i1, rows[0], 'manual'));
  store.link(buildLink(affirm, i2, rows[1], 'manual'));
  store.link(buildLink(affirm, i3, rows[2], 'manual'));
  const ev = bankEvidenceFromViews(reconcileLinks(store.get() as InstallmentLink[], rows), 'A');
  assert.deepEqual(ev.payments.map((p) => [p.installment, p.amount]), [[1, 150]]); // installment 2 was refunded in full
  assert.deepEqual(ev.pending.map((p) => p.installment), [3]);
  assert.deepEqual(ev.reversed.map((p) => [p.installment, p.amount]), [[2, 150]]);
  const r = repaymentFor({ loan: affirm, asOf: '2026-03-01', bank: ev });
  assert.deepEqual(status(r), ['paidBank', 'reversed', 'unverified', 'pastDue']);
  assert.equal(r.principalRemaining, 450);
  assert.deepEqual(bankEvidenceFromViews(reconcileLinks(store.get(), rows), 'other'), { payments: [], pending: [], reversed: [] });
});

/* ------------------------------------------------------------------------------------- maths and rounding */
test('a zero-interest plan paid in full ends at nothing owed, to the cent', () => {
  const third: Loan = { ...affirm, id: 'T', amount: 100, count: 3, frequency: 'monthly', firstDate: '2026-01-01' };
  assert.deepEqual(scheduleFor(third).map((i) => i.payment), [33.33, 33.33, 33.34]);
  const r = repaymentFor({ loan: third, asOf: '2026-06-01', bank: bank([1, 33.33, '2026-01-01'], [2, 33.33, '2026-02-01'], [3, 33.34, '2026-03-01']) });
  assert.deepEqual([r.principalPaid, r.principalRemaining, r.interestPaid, r.done, r.progress], [100, 0, 0, true, 1]);
  // A cent short on the last payment is a rounding difference, not a missed payment.
  const short = repaymentFor({ loan: third, asOf: '2026-06-01', bank: bank([1, 33.33, '2026-01-01'], [2, 33.33, '2026-02-01'], [3, 33.33, '2026-03-01']) });
  assert.deepEqual([short.rows[2].status, short.principalRemaining, short.done], ['paidBank', 0, true]);
  // Two cents of three short is not.
  assert.equal(repaymentFor({ loan: third, asOf: '2026-06-01', bank: bank([1, 33.33, '2026-01-01'], [2, 33.33, '2026-02-01']) }).done, false);
});

test('an interest-bearing loan paid in full adds up exactly', () => {
  const sched = scheduleFor(car);
  const r = repaymentFor({ loan: car, asOf: '2027-06-01', bank: bank(...sched.map((i): [number, number, string] => [i.n, i.payment, i.date])) });
  assert.equal(r.principalPaid, 1200);
  assert.equal(r.principalRemaining, 0);
  assert.equal(r.done, true);
  assert.equal(r.interestPaid, statusFor(car, '2027-06-01').totalInterest);
  assert.equal(r.remainingFutureInterest, 0);
  assert.equal(r.nextUnpaid, null);
  assert.equal(r.completion, '2026-12-15'); // the last payment's date
  assert.equal(r.outstandingPayments, 0);
});

test('future interest stays as scheduled until the installments carrying it are paid', () => {
  const sched = scheduleFor(car);
  const total = sched.reduce((s, i) => s + i.interest, 0);
  const none = repaymentFor({ loan: car, asOf: '2026-03-20' });
  assert.equal(none.remainingFutureInterest, Math.round(sched.filter((i) => i.date > '2026-03-20').reduce((s, i) => s + i.interest, 0) * 100) / 100);
  const paid = repaymentFor({ loan: car, asOf: '2026-03-20', bank: bank([1, sched[0].payment, sched[0].date]) });
  assert.ok(total > 0 && paid.interestPaid === 12);
  assert.equal(paid.remainingFutureInterest, none.remainingFutureInterest); // the future ones are not touched by an earlier payment
});

/* ---------------------------------------------------------------------------------------------- extras */
test('an extra payment does not shorten the loan or cut future interest', () => {
  const sched = scheduleFor(car);
  const r = repaymentFor({ loan: car, asOf: '2026-01-20', bank: bank([1, 500, '2026-01-15']) });
  assert.deepEqual([r.rows[0].applied, r.extraPaid, r.principalPaid], [106.62, 393.38, 94.62]);
  assert.equal(r.rows[1].status, 'scheduled');
  assert.equal(r.completion, sched[11].date);
  assert.equal(r.remainingFutureInterest, repaymentFor({ loan: car, asOf: '2026-01-20' }).remainingFutureInterest);
  assert.equal(r.principalRemaining, 1105.38); // only the first installment's principal is counted off
});

test('an extra payment clears older installments that are already due', () => {
  const r = repaymentFor({ loan: affirm, asOf: '2026-02-10', bank: bank([1, 450, '2026-01-10']) });
  assert.deepEqual(status(r), ['paidBank', 'paidBank', 'paidBank', 'scheduled']);
  assert.equal(r.rows[1].shares[0].spill, true);
  assert.deepEqual([r.principalRemaining, r.extraPaid], [150, 0]);
});

test('a payment pinned to a later installment pays that one', () => {
  const r = repaymentFor({ loan: affirm, asOf: '2026-01-01', manual: [manual('A', 150, '2026-01-01', 4)] });
  assert.deepEqual(status(r), ['scheduled', 'scheduled', 'scheduled', 'paidManual']);
  assert.equal(r.principalRemaining, 450);
});

test('a payment pinned to an installment that does not exist is treated as unpinned', () => {
  const r = repaymentFor({ loan: affirm, asOf: '2026-02-01', manual: [manual('A', 150, '2026-01-12', 9)] });
  assert.equal(r.rows[0].status, 'paidManual');
});

/* --------------------------------------------------------------------------------------- adjustments */
const adj = (kind: LoanAdjustment['kind'], extra: Partial<LoanAdjustment> = {}): LoanAdjustment => ({ id: `a${++seq}`, loanId: 'A', kind, createdAt: '', ...extra });

test('a waived or canceled installment comes off what is owed, only when recorded', () => {
  const r = repaymentFor({ loan: affirm, asOf: '2026-03-01', bank: bank([1, 150, '2026-01-10'], [3, 150, '2026-02-07']), adjustments: [adj('waived', { installment: 2 }), adj('canceled', { installment: 4 })] });
  assert.deepEqual(status(r), ['paidBank', 'waived', 'paidBank', 'canceled']);
  assert.deepEqual([r.principalWaived, r.principalPaid, r.principalRemaining, r.done, r.outstandingPayments, r.confirmedCount], [300, 300, 0, true, 0, 2]);
  assert.equal(r.rows[1].expected, 0);
  assert.equal(repaymentFor({ loan: affirm, asOf: '2026-03-01' }).rows[1].status, 'unverified');
});

test('recorded fees are kept apart from the schedule', () => {
  const r = repaymentFor({ loan: affirm, asOf: '2026-03-01', adjustments: [adj('fee', { amount: 7 }), adj('fee', { amount: 3.5 }), { ...adj('fee', { amount: 99 }), loanId: 'other' }] });
  assert.deepEqual([r.feesRecorded, r.principalRemaining, r.outstandingPayments], [10.5, 600, 600]);
});

/* ---------------------------------------------------------------------------------------- general */
test('the same input gives the same answer, and nothing passed in is changed', () => {
  const input = { loan: car, asOf: '2026-06-01', bank: bank([1, 106.62, '2026-01-15'], [3, 106.62, '2026-03-15']), manual: [manual('C', 40, '2026-02-15', 2)], adjustments: [adj('fee', { amount: 5, loanId: 'C' })] };
  const before = JSON.stringify(input);
  const a = repaymentFor(input);
  assert.deepEqual(repaymentFor(input), a);
  assert.equal(JSON.stringify(input), before);
});

test('the contractual schedule does not depend on payments', () => {
  const before = JSON.stringify(scheduleFor(car));
  repaymentFor({ loan: car, asOf: '2026-06-01', bank: bank([1, 500, '2026-01-15']), manual: [manual('C', 40, '2026-02-15', 2)] });
  assert.equal(JSON.stringify(scheduleFor(car)), before);
});

/* ------------------------------------------------------------------------------------------------- store */
const memory = (): PaymentRepository & { saved: PaymentData } => {
  const repo = { saved: { payments: [], adjustments: [] } as PaymentData, load: () => repo.saved, save: (d: PaymentData) => void (repo.saved = d) };
  return repo;
};
const input = { loanId: 'A', installment: 1, amount: 150, date: '2026-01-10', source: 'cash' as const };

test('manual payments can be added, edited and removed, and are saved', () => {
  const repo = memory();
  const store = createPaymentStore(repo, () => new Date('2026-02-01T00:00:00Z'));
  const p = store.addPayment({ ...input, note: '  paid in the app  ' })!;
  assert.deepEqual([p.amount, p.note, p.createdAt, p.source], [150, 'paid in the app', '2026-02-01T00:00:00.000Z', 'cash']);
  assert.equal(repo.saved.payments.length, 1);

  const edited = store.updatePayment(p.id, { ...input, amount: 120.456, source: 'lender-app' })!;
  assert.deepEqual([edited.id, edited.amount, edited.source, edited.note, edited.createdAt], [p.id, 120.46, 'lender-app', undefined, p.createdAt]);
  assert.equal(store.get().payments.length, 1);

  assert.deepEqual(createPaymentStore(repo).get().payments, store.get().payments);
  store.removePayment(p.id);
  store.removePayment('nothing');
  assert.equal(store.get().payments.length, 0);
});

test('payments that make no sense are refused', () => {
  const store = createPaymentStore(memory());
  for (const bad of [{ ...input, amount: 0 }, { ...input, amount: -5 }, { ...input, amount: NaN }, { ...input, date: 'soon' }, { ...input, installment: 0 }, { ...input, installment: 1.5 }]) assert.equal(store.addPayment(bad), null);
  assert.equal(store.updatePayment('missing', input), null);
  assert.equal(store.get().payments.length, 0);
  assert.ok(store.addPayment({ loanId: 'A', amount: 10, date: '2026-01-01', source: 'other' })); // an installment is optional
});

test('an installment is waived or canceled one way at a time, and the mark can be cleared', () => {
  const store = createPaymentStore(memory());
  store.markInstallment('A', 2, 'waived');
  store.markInstallment('A', 2, 'canceled', 'item returned');
  assert.deepEqual(store.get().adjustments.map((a) => [a.kind, a.installment, a.note]), [['canceled', 2, 'item returned']]);
  store.markInstallment('A', 3, 'waived');
  store.markInstallment('A', 2, null);
  assert.deepEqual(store.get().adjustments.map((a) => a.installment), [3]);
  assert.ok(store.addFee('A', 5));
  assert.equal(store.addFee('A', 0), null);
  store.markInstallment('A', 3, null);
  assert.deepEqual(store.get().adjustments.map((a) => a.kind), ['fee']); // clearing a mark leaves fees alone
});

test('deleting a loan removes its records and no others', () => {
  const store = createPaymentStore(memory());
  store.addPayment(input);
  store.addPayment({ ...input, loanId: 'B' });
  store.markInstallment('A', 1, 'waived');
  store.markInstallment('B', 1, 'waived');
  store.removeForLoan('A');
  assert.deepEqual(store.get().payments.map((p) => p.loanId), ['B']);
  assert.deepEqual(store.get().adjustments.map((a) => a.loanId), ['B']);
});

test('stored records are cleaned on load', () => {
  const good = { id: 'p', loanId: 'A', amount: 10, date: '2026-01-01', source: 'wire', installment: 2, note: ' hi ' };
  const out = normalizePayments([good, good, { ...good, id: 'q', amount: 0 }, { ...good, id: 'r', date: 'x' }, null, 'x', { ...good, id: 's', installment: 0 }]);
  assert.deepEqual(out.map((p) => [p.id, p.source, p.installment, p.note]), [['p', 'other', 2, 'hi'], ['s', 'other', undefined, 'hi']]);
  assert.deepEqual(normalizePayments('no'), []);
  const adjs = normalizeAdjustments([{ id: 'a', loanId: 'A', kind: 'waived', installment: 2 }, { id: 'b', loanId: 'A', kind: 'waived' }, { id: 'c', loanId: 'A', kind: 'fee', amount: 3 }, { id: 'd', loanId: 'A', kind: 'fee' }, { id: 'e', loanId: 'A', kind: 'gift', installment: 1 }]);
  assert.deepEqual(adjs.map((a) => a.id), ['a', 'c']);
});
