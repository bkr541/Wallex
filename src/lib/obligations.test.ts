/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCalendarEvents } from '../components/calendar/data.ts';
import { buildForecast, HORIZON } from './forecast.ts';
import { buildLink, createLinkStore, reconcileLinks, type LinkRepository } from './loanLinks.ts';
import { createPaymentStore, type PaymentData, type PaymentRepository } from './loanPayments.ts';
import { claimedStreams, loanCommitments, monthBounds, NO_LOANS, obligationsBetween, obligationsForMonth, obligationTotals, upcomingWithLoans, type LoanObligationData } from './obligations.ts';
import { commitments, upcomingPayments } from './overview.ts';
import { scheduleFor, type Loan } from './loans.ts';
import { getRules } from './rules.ts';
import type { Analysis, Recurring } from './recurring.ts';
import type { LinkedAccount, Txn } from './wallex';

/* ------------------------------------------------------------------------------------------------ fixtures */
const TODAY = '2026-03-10';
const accounts: LinkedAccount[] = [{ id: 'chk', name: 'Checking', mask: '1', type: 'depository', subtype: 'checking', available: 5000, current: 5000 }];

let seq = 0;
const tx = (date: string, amount: number, merchant = 'KLARNA', over: Partial<Txn> = {}): Txn => ({
  id: `t${++seq}`, accountId: 'chk', date, authorizedDate: null, merchant, logos: [], category: 'General Merchandise', categoryKey: 'GENERAL_MERCHANDISE', categoryDetailKey: '', channel: 'Online',
  pending: false, amount, details: [{ label: 'Bank Description', value: `${merchant} PAYMENT` }], ...over,
});

// $150 a month for six months, Jan 15 to Jun 15, unless said otherwise.
const loan = (id: string, over: Partial<Loan> = {}): Loan => ({ id, lender: 'Klarna', item: '', amount: 900, apr: 0, count: 6, frequency: 'monthly', firstDate: '2026-01-15', type: 'bnpl', ...over });
const inst = (l: Loan, n: number) => scheduleFor(l)[n - 1];

// A recurring stream the way the detector reports one: monthly on the 15th, $150.
const stream = (id: string, name: string, charges: Txn[], over: { typical?: number; next?: string; kind?: Recurring['kind'] } = {}): Recurring =>
  ({
    id, name, kind: over.kind ?? 'installment', confidence: 'confirmed', logos: [], active: true, charges, settlement: null, paidOnCard: false, monthly: over.typical ?? 150,
    schedule: [{ next: over.next ?? '2026-03-15', periodDays: 30, day: 15, typical: over.typical ?? 150, min: over.typical ?? 150, max: over.typical ?? 150, fixed: true, spread: 0, count: charges.length }],
  }) as unknown as Recurring;
const analysisOf = (...items: Recurring[]): Analysis => ({ items, counts: {}, monthlyTotal: 0, earliest: null, latest: null, monthsOfHistory: 3 }) as unknown as Analysis;

const memoryLinks = (): LinkRepository => ({ load: () => [], save: () => {} });
const memoryPayments = (): PaymentRepository & { saved: PaymentData } => {
  const repo = { saved: { payments: [], adjustments: [] } as PaymentData, load: () => repo.saved, save: (d: PaymentData) => void (repo.saved = d) };
  return repo;
};

// Loans, the transactions the person linked to installments, and anything recorded by hand.
function data(loans: Loan[], opts: { links?: [Loan, number, Txn][]; txns?: Txn[]; pay?: (s: ReturnType<typeof createPaymentStore>) => void } = {}): LoanObligationData {
  const store = createLinkStore(memoryLinks());
  for (const [l, n, t] of opts.links ?? []) store.link(buildLink(l, inst(l, n), t, 'manual'));
  const payments = createPaymentStore(memoryPayments());
  opts.pay?.(payments);
  const txns = opts.txns ?? (opts.links ?? []).map(([, , t]) => t);
  return { loans, links: store.get(), views: reconcileLinks(store.get(), txns, { knownAccountIds: new Set(['chk']) }), payments: payments.get() };
}

const range = (analysis: Analysis | null, loanData: LoanObligationData | null, from = TODAY, to = '2026-06-08', today = TODAY) => obligationsBetween({ today, from, to, analysis, loanData });
const forecast = (analysis: Analysis, loanData: LoanObligationData | null, txns: Txn[] = [], today = TODAY) => buildForecast(txns, accounts, analysis, today, getRules(), loanData)!;
const billsOf = (f: ReturnType<typeof forecast>) => f.events.filter((e) => e.kind === 'bill');
const sum = (list: { amount: number }[]) => Math.round(list.reduce((s, e) => s + e.amount, 0) * 100) / 100;

/* ---------------------------------------------------------------------------------- one installment, everywhere */
test('one installment is the same payment on Loans, Overview, Schedule and Forecast', () => {
  const a = loan('A');
  const d = data([a]);
  const none = analysisOf();

  const ob = range(none, d).obligations.find((o) => o.installmentId === 'A:3')!;
  assert.deepEqual([ob.id, ob.date, ob.expected, ob.remaining, ob.status, ob.source, ob.type], ['loan:A:3', '2026-03-15', 150, 150, 'upcoming', 'loan', 'bnpl']);
  assert.equal(inst(a, 3).date, '2026-03-15'); // the Loans page's own schedule

  const overview = upcomingWithLoans(none, TODAY, 30, d).find((p) => p.loan?.installment === 3)!;
  assert.deepEqual([overview.id, overview.date, overview.amount, overview.loan?.loanId], ['loan:A:3', '2026-03-15', 150, 'A']);

  const schedule = buildCalendarEvents(none, TODAY, d).find((e) => e.id === 'loan:A:3')!;
  assert.deepEqual([schedule.date, schedule.amount, schedule.bnpl?.status, schedule.bnpl?.installment, schedule.bnpl?.loanId], ['2026-03-15', 150, 'upcoming', 3, 'A']);

  const bill = billsOf(forecast(none, d)).find((e) => e.id === 'bill-loan:A:3')!;
  assert.deepEqual([bill.date, bill.amount, bill.day, bill.loanId], ['2026-03-15', 150, 5, 'A']);
});

test('principal is never an extra cash outflow: only the installments are', () => {
  const f = forecast(analysisOf(), data([loan('A', { amount: 900 })]));
  assert.equal(sum(billsOf(f).filter((e) => e.day <= 90)), 450); // Mar, Apr, May: not the $900 financed
});

/* ------------------------------------------------------------------------------------- the same provider twice */
test('two loans from one provider with identical dates and amounts stay two obligations', () => {
  const a = loan('A');
  const b = loan('B');
  const { obligations } = range(analysisOf(), data([a, b]));
  const march = obligations.filter((o) => o.date === '2026-03-15');
  assert.deepEqual(march.map((o) => o.id).sort(), ['loan:A:3', 'loan:B:3']);
  assert.equal(sum(march.map((o) => ({ amount: o.remaining }))), 300);
  const bills = billsOf(forecast(analysisOf(), data([a, b]))).filter((e) => e.date === '2026-03-15');
  assert.equal(bills.length, 2);
});

/* --------------------------------------------------------------------------------- recurring-payment overlap */
test('linked payments show a recurring stream is the loan: it is counted once, not twice', () => {
  const a = loan('A');
  const k1 = tx('2026-01-15', -150);
  const k2 = tx('2026-02-15', -150);
  const analysis = analysisOf(stream('R1', 'Klarna', [k2, k1]));
  const d = data([a], { links: [[a, 1, k1], [a, 2, k2]] });

  const baseline = billsOf(forecast(analysis, null, [k1, k2]));
  assert.equal(baseline.length, 3); // the prediction alone: Mar, Apr, May
  const withLoan = range(analysis, d);
  assert.deepEqual(withLoan.obligations.filter((o) => o.source === 'recurring'), []);
  assert.equal(withLoan.folded.length, 3);
  assert.ok(withLoan.folded.every((f) => f.installment.loanId === 'A' && f.prediction.source === 'recurring'));
  assert.deepEqual(withLoan.ambiguities, []);

  const bills = billsOf(forecast(analysis, d, [k1, k2]));
  assert.equal(sum(bills), sum(baseline)); // 450 either way, never 900
  assert.ok(bills.every((e) => e.loanId === 'A'));
  assert.deepEqual(upcomingWithLoans(analysis, TODAY, 30, d).map((p) => p.id), ['loan:A:3']);
  assert.deepEqual(claimedStreams(analysis, d, TODAY), new Set(['R1']));
  assert.deepEqual(commitments(analysis, claimedStreams(analysis, d, TODAY)).debt.items, []);
});

test('a second loan from the same provider is not absorbed by the first one’s stream', () => {
  const a = loan('A');
  const b = loan('B');
  const k1 = tx('2026-01-15', -150);
  const k2 = tx('2026-02-15', -150);
  const analysis = analysisOf(stream('R1', 'Klarna', [k2, k1]));
  const d = data([a, b], { links: [[a, 1, k1], [a, 2, k2]] });
  const { obligations, folded } = range(analysis, d);
  assert.equal(folded.length, 3);
  assert.ok(folded.every((f) => f.installment.loanId === 'A'));
  assert.equal(obligations.filter((o) => o.loanId === 'B' && o.status !== 'unverified').length, 3); // B keeps all its installments
  assert.equal(sum(billsOf(forecast(analysis, d, [k1, k2]))), 900);
});

test('when the evidence cannot say which loan, both stay, are marked, and nothing is assumed', () => {
  const a = loan('A');
  const b = loan('B');
  const ka = tx('2026-01-15', -150);
  const kb = tx('2026-02-15', -150);
  const analysis = analysisOf(stream('R1', 'Klarna', [kb, ka]));
  const d = data([a, b], { links: [[a, 1, ka], [b, 2, kb]] }); // one stream, tied to both loans
  const result = range(analysis, d);
  assert.equal(result.folded.length, 0);
  assert.equal(result.ambiguities.length, 3);
  assert.ok(result.ambiguities.every((x) => x.kind === 'claimed-by-several' && x.obligationIds.length === 3 && x.amount === 150));
  const open = result.obligations.filter((o) => o.status !== 'unverified');
  assert.equal(open.length, 9); // 3 predictions and 3 installments of each loan: nothing discarded
  assert.ok(open.every((o) => o.overlap !== null));

  const totals = obligationTotals(result);
  assert.equal(totals.remaining, 1350);
  assert.equal(totals.overlapRemaining, 1350);
  assert.equal(totals.ambiguities, 3);
  assert.ok(upcomingWithLoans(analysis, TODAY, 30, d).every((p) => p.overlap));
  assert.ok(billsOf(forecast(analysis, d, [ka, kb])).every((e) => e.overlap));
});

test('the provider’s name alone never removes anything', () => {
  const a = loan('A');
  const unlinked = [tx('2026-01-15', -150), tx('2026-02-15', -150)];
  const analysis = analysisOf(stream('R1', 'Klarna', unlinked.slice().reverse()));
  const d = data([a]); // no payment is linked
  const result = range(analysis, d);
  assert.equal(result.folded.length, 0);
  assert.equal(result.obligations.filter((o) => o.source === 'recurring').length, 3);
  assert.equal(result.obligations.filter((o) => o.source === 'loan' && o.status !== 'unverified').length, 3);
  assert.deepEqual(result.ambiguities.map((x) => x.kind), ['same-provider', 'same-provider', 'same-provider']);
  assert.equal(obligationTotals(result).remaining, 900); // both are counted, as flagged

  // A different lender, or the same lender at an amount that does not line up, is not even flagged.
  assert.deepEqual(range(analysisOf(stream('R2', 'Netflix', [], { kind: 'subscription' })), d).ambiguities, []);
  assert.deepEqual(range(analysisOf(stream('R3', 'Klarna', unlinked, { typical: 40 })), d).ambiguities, []);
});

/* ----------------------------------------------------------------------------------------- payments and status */
test('a confirmed payment settles the installment everywhere, even one made early', () => {
  const a = loan('A');
  const early = tx('2026-03-12', -150);
  const d = data([a], { links: [[a, 4, early]] }); // installment 4 is due Apr 15
  const ob = range(analysisOf(), d, TODAY, '2026-06-08').obligations.find((o) => o.installmentId === 'A:4')!;
  assert.deepEqual([ob.status, ob.paid, ob.remaining, ob.evidence, ob.transactionIds], ['paidBank', 150, 0, 'bank-confirmed', [early.id]]);
  assert.equal(billsOf(forecast(analysisOf(), d, [early])).some((e) => e.date === '2026-04-15'), false);
  assert.equal(upcomingWithLoans(analysisOf(), TODAY, 60, d).some((p) => p.date === '2026-04-15'), false);
  const event = buildCalendarEvents(analysisOf(), TODAY, d).find((e) => e.id === 'loan:A:4')!;
  assert.deepEqual([event.paid, event.bnpl?.status, event.amount], [true, 'paidBank', 150]);
  assert.equal(obligationTotals(range(analysisOf(), d)).paid, 150);
});

test('a bank charge confirmed as an installment is shown once on the calendar', () => {
  const a = loan('A');
  const k1 = tx('2026-01-15', -150);
  const analysis = analysisOf(stream('R1', 'Klarna', [k1]));
  const events = buildCalendarEvents(analysis, TODAY, data([a], { links: [[a, 1, k1]] }));
  assert.equal(events.filter((e) => e.date === '2026-01-15').length, 1);
  assert.equal(events.find((e) => e.date === '2026-01-15')?.bnpl?.status, 'paidBank');
  // Without the link it is a plain bank charge, with no loan status.
  const plain = buildCalendarEvents(analysis, TODAY, data([a]));
  assert.ok(plain.some((e) => e.id === k1.id && e.paid && !e.bnpl));
});

test('a part-paid installment is owed only for what is left', () => {
  const a = loan('A');
  const d = data([a], { pay: (s) => void s.addPayment({ loanId: 'A', installment: 3, amount: 60, date: '2026-03-08', source: 'cash' }) });
  const ob = range(analysisOf(), d).obligations.find((o) => o.installmentId === 'A:3')!;
  assert.deepEqual([ob.status, ob.paid, ob.remaining, ob.expected, ob.evidence], ['partial', 60, 90, 150, 'schedule']);
  const p = upcomingWithLoans(analysisOf(), TODAY, 30, d).find((x) => x.loan?.installment === 3)!;
  assert.deepEqual([p.amount, p.loan?.partly], [90, true]);
  assert.equal(billsOf(forecast(analysisOf(), d)).find((e) => e.date === '2026-03-15')?.amount, 90);
});

test('a payment recorded by hand is labelled as such', () => {
  const d = data([loan('A')], { pay: (s) => void s.addPayment({ loanId: 'A', installment: 3, amount: 150, date: '2026-03-09', source: 'lender-app' }) });
  const ob = range(analysisOf(), d).obligations.find((o) => o.installmentId === 'A:3')!;
  assert.deepEqual([ob.status, ob.remaining, ob.evidence], ['paidManual', 0, 'recorded']);
  assert.equal(billsOf(forecast(analysisOf(), d)).some((e) => e.date === '2026-03-15'), false);
});

test('a canceled or waived installment is not owed', () => {
  const d = data([loan('A')], { pay: (s) => { s.markInstallment('A', 4, 'canceled'); s.markInstallment('A', 5, 'waived'); } });
  const obs = range(analysisOf(), d).obligations;
  assert.deepEqual(obs.filter((o) => o.installment === 4 || o.installment === 5).map((o) => [o.status, o.remaining]), [['canceled', 0], ['waived', 0]]);
  assert.deepEqual(billsOf(forecast(analysisOf(), d)).map((e) => e.date), ['2026-03-15']);
  assert.deepEqual(upcomingWithLoans(analysisOf(), TODAY, 90, d).map((p) => p.date), ['2026-03-15']);
  const cal = buildCalendarEvents(analysisOf(), TODAY, d).find((e) => e.id === 'loan:A:4')!;
  assert.deepEqual([cal.paid, cal.counted, cal.bnpl?.status], [false, false, 'canceled']);
});

test('past installments nobody has recorded are unverified: listed, but not counted as owed', () => {
  const result = range(analysisOf(), data([loan('A')]), '2026-01-01', TODAY);
  assert.deepEqual(result.obligations.map((o) => [o.date, o.status]), [['2026-01-15', 'unverified'], ['2026-02-15', 'unverified']]);
  const totals = obligationTotals(result);
  assert.deepEqual([totals.count, totals.remaining, totals.unverifiedCount], [0, 0, 2]);
  assert.equal(billsOf(forecast(analysisOf(), data([loan('A')]))).some((e) => e.date < TODAY), false);
});

test('only loans classified as pay-later are used', () => {
  const personal = loan('P', { type: 'personal' });
  const { type: _t, ...legacy } = loan('L');
  assert.deepEqual(range(analysisOf(), data([personal, legacy as Loan])).obligations, []);
});

/* --------------------------------------------------------------------------------------------- dates */
test('weekly and biweekly installments land on their own dates', () => {
  const weekly = loan('W', { amount: 400, count: 8, frequency: 'weekly', firstDate: '2026-03-11' }); // $50
  const biweekly = loan('B', { amount: 400, count: 4, frequency: 'biweekly', firstDate: '2026-03-12' }); // $100
  const ups = upcomingWithLoans(analysisOf(), TODAY, 30, data([weekly, biweekly]));
  assert.deepEqual(ups.filter((p) => p.loan?.loanId === 'W').map((p) => p.date), ['2026-03-11', '2026-03-18', '2026-03-25', '2026-04-01', '2026-04-08']);
  assert.deepEqual(ups.filter((p) => p.loan?.loanId === 'B').map((p) => p.date), ['2026-03-12', '2026-03-26', '2026-04-09']);
  assert.deepEqual(ups.map((p) => p.date), [...ups.map((p) => p.date)].sort());
});

test('a month is the payments on its real days, not an average', () => {
  const weekly = loan('W', { amount: 400, count: 8, frequency: 'weekly', firstDate: '2026-03-02' }); // Mar 2, 9, 16, 23, 30
  const d = data([weekly]);
  const march = obligationsForMonth({ today: TODAY, analysis: null, loanData: d }, '2026-03').obligations;
  assert.deepEqual(march.map((o) => o.date), ['2026-03-02', '2026-03-09', '2026-03-16', '2026-03-23', '2026-03-30']);
  assert.deepEqual(loanCommitments(d, TODAY), { count: 1, monthly: 250, items: [{ name: 'Klarna', monthly: 250 }] }); // five Mondays, not 4.33
  assert.equal(obligationsForMonth({ today: TODAY, analysis: null, loanData: d }, '2026-04').obligations.length, 3); // Apr 6, 13, 20: the eighth and last payment
});

test('month ends, leap years and the year turning', () => {
  assert.deepEqual(monthBounds('2026-02'), { from: '2026-02-01', to: '2026-02-28' });
  assert.deepEqual(monthBounds('2028-02'), { from: '2028-02-01', to: '2028-02-29' });
  assert.deepEqual(monthBounds('2026-12'), { from: '2026-12-01', to: '2026-12-31' });
  const endOfMonth = loan('E', { amount: 600, count: 4, firstDate: '2026-01-31' });
  const d = data([endOfMonth]);
  const dates = (m: string) => obligationsForMonth({ today: TODAY, analysis: null, loanData: d }, m).obligations.map((o) => o.date);
  assert.deepEqual([dates('2026-01'), dates('2026-02'), dates('2026-03'), dates('2026-04')], [['2026-01-31'], ['2026-02-28'], ['2026-03-31'], ['2026-04-30']]);
  const leap = loan('Y', { firstDate: '2028-01-31' });
  assert.deepEqual(obligationsForMonth({ today: '2028-01-10', analysis: null, loanData: data([leap]) }, '2028-02').obligations.map((o) => o.date), ['2028-02-29']);
  const dec = loan('D', { firstDate: '2026-12-20', count: 3 });
  assert.deepEqual(obligationsBetween({ today: '2026-12-01', from: '2026-12-15', to: '2027-01-31', analysis: null, loanData: data([dec]) }).obligations.map((o) => o.date), ['2026-12-20', '2027-01-20']);
});

test('the range is inclusive at both ends', () => {
  const d = data([loan('A')]);
  assert.deepEqual(range(analysisOf(), d, '2026-03-15', '2026-04-15').obligations.map((o) => o.date), ['2026-03-15', '2026-04-15']);
  assert.deepEqual(range(analysisOf(), d, '2026-03-16', '2026-04-14').obligations, []);
});

/* ------------------------------------------------------------------------------------------- forecast */
test('known installments take cash out on the right days, and only inside the window', () => {
  const a = loan('A');
  const base = forecast(analysisOf(), null);
  const withLoan = forecast(analysisOf(), data([a]));
  const installments = billsOf(withLoan);
  assert.deepEqual(installments.map((e) => [e.date, e.day, e.amount]), [['2026-03-15', 5, 150], ['2026-04-15', 36, 150], ['2026-05-15', 66, 150]]);
  assert.equal(installments.some((e) => e.date === '2026-06-15'), false); // day 97, past the 90-day horizon
  assert.equal(HORIZON, 90);
  for (const p of withLoan.points.filter((x) => x.day >= 0)) {
    const spent = sum(installments.filter((e) => e.day <= p.day));
    assert.equal(Math.round((base.points.find((b) => b.day === p.day)!.balance - p.balance) * 100) / 100, spent);
  }
});

test('the everyday spending estimate does not also count payments confirmed as installments', () => {
  // The spending estimate looks back from the real today, so these dates are relative to it.
  const ago = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
  const a = loan('A', { firstDate: ago(50) });
  const paid = [tx(ago(50), -150), tx(ago(20), -150)];
  const rest = [tx(ago(30), -40, 'Corner Store'), tx(ago(10), -25, 'Corner Store')];
  const txns = [...paid, ...rest];
  const unlinked = forecast(analysisOf(), data([a], { txns }), txns, ago(0));
  const linked = forecast(analysisOf(), data([a], { txns, links: [[a, 1, paid[0]], [a, 2, paid[1]]] }), txns, ago(0));
  assert.ok(unlinked.everyday.perDay > 0);
  assert.ok(linked.everyday.perDay < unlinked.everyday.perDay);
  assert.ok(Math.abs(linked.everyday.perDay * linked.everyday.windowDays - 65) < 1e-6); // only the two corner-store purchases
});

test('with no loans, nothing changes', () => {
  const k1 = tx('2026-01-15', -150);
  const k2 = tx('2026-02-15', -150);
  const analysis = analysisOf(stream('R1', 'Klarna', [k2, k1]));
  const txns = [k1, k2];
  const expected = forecast(analysis, null, txns);
  const personalOnly = data([loan('P', { type: 'personal' })]);
  assert.deepEqual(forecast(analysis, NO_LOANS, txns), expected);
  assert.deepEqual(forecast(analysis, personalOnly, txns), expected);
  assert.deepEqual(upcomingWithLoans(analysis, TODAY, 90, NO_LOANS), upcomingPayments(analysis, TODAY, 90));
  assert.deepEqual(upcomingWithLoans(analysis, TODAY, 90, personalOnly), upcomingPayments(analysis, TODAY, 90));
  assert.deepEqual(commitments(analysis, claimedStreams(analysis, NO_LOANS, TODAY)), commitments(analysis));
  assert.deepEqual(loanCommitments(NO_LOANS, TODAY), { count: 0, monthly: 0, items: [] });
  assert.deepEqual(buildCalendarEvents(analysis, TODAY, NO_LOANS), buildCalendarEvents(analysis, TODAY, null));
  assert.ok(buildCalendarEvents(analysis, TODAY, null).every((e) => !e.bnpl));
  assert.deepEqual(range(analysis, NO_LOANS).obligations.map((o) => o.payment), upcomingPayments(analysis, TODAY, 90));
});

/* --------------------------------------------------------------------------------- editing a loan, commitments */
test('editing a loan changes its obligations everywhere, with no second copy of the schedule to fall out of step', () => {
  const before = data([loan('A')]);
  const after = data([loan('A', { amount: 600, firstDate: '2026-03-20', count: 6 })]); // $100 from Mar 20
  const dates = (d: LoanObligationData) => upcomingWithLoans(analysisOf(), TODAY, 60, d).map((p) => [p.date, p.amount]);
  assert.deepEqual(dates(before), [['2026-03-15', 150], ['2026-04-15', 150]]);
  assert.deepEqual(dates(after), [['2026-03-20', 100], ['2026-04-20', 100]]);
  assert.deepEqual(billsOf(forecast(analysisOf(), after)).map((e) => [e.date, e.amount]), [['2026-03-20', 100], ['2026-04-20', 100], ['2026-05-20', 100]]);
  assert.equal(buildCalendarEvents(analysisOf(), TODAY, after).find((e) => e.id === 'loan:A:1')?.date, '2026-03-20');
});

test('loans count toward this month’s commitments, once, and drop out when waived or finished', () => {
  const a = loan('A');
  assert.deepEqual(loanCommitments(data([a]), TODAY), { count: 1, monthly: 150, items: [{ name: 'Klarna', monthly: 150 }] });
  const waivedNow = data([a], { pay: (s) => s.markInstallment('A', 3, 'waived') });
  assert.deepEqual(loanCommitments(waivedNow, TODAY), { count: 0, monthly: 0, items: [] });
  assert.equal(loanCommitments(data([a]), '2026-07-10').count, 0); // all six are over
});

test('streams are only claimed for loans that are still running', () => {
  const a = loan('A', { amount: 300, count: 2, firstDate: '2026-01-15' }); // finished by Feb 15
  const k1 = tx('2026-01-15', -150);
  const k2 = tx('2026-02-15', -150);
  const analysis = analysisOf(stream('R1', 'Klarna', [k2, k1]));
  const finished = data([a], { links: [[a, 1, k1], [a, 2, k2]] });
  assert.deepEqual(claimedStreams(analysis, finished, TODAY), new Set()); // its own payments are the whole loan
  const running = data([loan('A')], { links: [[loan('A'), 1, k1], [loan('A'), 2, k2]] });
  assert.deepEqual(claimedStreams(analysis, running, TODAY), new Set(['R1']));
});
