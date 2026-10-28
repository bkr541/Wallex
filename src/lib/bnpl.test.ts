/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bnplSummary, bnplTag, buildBnplLedger, isRepresented, purchaseCategory, spendingView, type BnplLedger } from './bnpl.ts';
import { buildLink, createLinkStore, reconcileLinks } from './loanLinks.ts';
import { createRoleStore, normalizeRoles, type LoanRole, type LoanRoleKind, type RoleRepository } from './loanRoles.ts';
import { scheduleFor, type Loan } from './loans.ts';
import type { LoanObligationData } from './obligations.ts';
import { topCategories } from './insights.ts';
import { flowBetween, overviewScope, spendingBreakdown } from './overview.ts';
import { buildPatterns, DEFAULT_FILTERS, makeScope, RECORDED_ACCOUNT, type PatternFilters } from './patterns.ts';
import { merchantOf } from './recurring.ts';
import { getRules, type Rules } from './rules.ts';
import type { LinkedAccount, Txn } from './wallex';

/* ------------------------------------------------------------------------------------------------ fixtures */
const TODAY = '2026-07-01';
const accounts: LinkedAccount[] = [
  { id: 'chk', name: 'Checking', mask: '1111', type: 'depository', subtype: 'checking', available: 5000, current: 5000 },
  { id: 'sav', name: 'Savings', mask: '2222', type: 'depository', subtype: 'savings', available: 1000, current: 1000 },
  { id: 'card', name: 'Visa', mask: '1234', type: 'credit', subtype: 'credit card', available: null, current: 300 },
];

let seq = 0;
const tx = (date: string, amount: number, merchant = 'KLARNA', over: Partial<Txn> = {}): Txn => ({
  id: `t${++seq}`, accountId: 'chk', date, authorizedDate: null, merchant, logos: [], category: 'Loan Payments', categoryKey: 'LOAN_PAYMENTS', categoryDetailKey: 'LOAN_PAYMENTS_OTHER_PAYMENT',
  channel: 'Online', pending: false, amount, details: [{ label: 'Bank Description', value: `${merchant} PAYMENT` }], ...over,
});

const loan = (id: string, over: Partial<Loan> = {}): Loan => ({ id, lender: 'Klarna', item: '', amount: 400, apr: 0, count: 4, frequency: 'monthly', firstDate: '2026-02-01', type: 'bnpl', ...over });
const withPurchase = (l: Loan, bnpl: NonNullable<Loan['bnpl']>): Loan => ({ ...l, bnpl });
const sched = (l: Loan) => scheduleFor(l);

const roleRepo = (): RoleRepository => ({ load: () => [], save: () => {} });

// Loans, the installments the person linked (loan, installment, transaction) and the roles they gave other transactions.
function data(loans: Loan[], txns: Txn[], opts: { links?: [Loan, number, Txn][]; roles?: [Loan, Txn, LoanRoleKind][] } = {}): LoanObligationData {
  const links = createLinkStore({ load: () => [], save: () => {} });
  for (const [l, n, t] of opts.links ?? []) links.link(buildLink(l, sched(l)[n - 1], t, 'manual'));
  const roles = createRoleStore(roleRepo());
  for (const [l, t, r] of opts.roles ?? []) roles.assign(l.id, t, r);
  return { loans, links: links.get(), views: reconcileLinks(links.get(), txns, { knownAccountIds: new Set(accounts.map((a) => a.id)) }), payments: { payments: [], adjustments: [] }, roles: roles.get() };
}
const ledgerOf = (loans: Loan[], txns: Txn[], opts: Parameters<typeof data>[2] = {}) => buildBnplLedger(txns, data(loans, txns, opts), TODAY);

const scopeFor = (txns: Txn[], account: PatternFilters['account'] = 'all', rules: Rules = getRules()) => makeScope(txns, accounts, { ...DEFAULT_FILTERS, days: 365, account }, rules);
const summary = (txns: Txn[], ledger: BnplLedger, from = '2026-01-01', to = '2026-12-31', account: PatternFilters['account'] = 'all', rules: Rules = getRules()) =>
  bnplSummary(txns, ledger, scopeFor(txns, account, rules), from, to);
const cents = (n: number) => Math.round(n * 100) / 100;

// The two figures must always be reconcilable to the cent.
function assertReconciles(s: ReturnType<typeof summary>) {
  assert.equal(cents(s.cashOut - s.lessPrincipal - s.lessDownPayments + s.plusRecordedPurchases), s.purchaseSpending);
}

// $400 bought at a furniture store, financed in four $100 payments from February.
const furniture = (over: Partial<Loan> = {}, bnpl: Partial<NonNullable<Loan['bnpl']>> = {}) =>
  withPurchase(loan('A', over), { merchant: 'Wayfair', category: 'Furniture', purchaseDate: '2026-01-15', purchaseAmount: 400, ...bnpl });
const installments = (l: Loan, merchant = 'KLARNA') => sched(l).map((i) => tx(i.date, -i.payment, merchant));

/* ------------------------------------------------------------------------------------------ the main example */
test('a $400 purchase financed in four $100 payments is $400 of spending, not $800', () => {
  const l = furniture();
  const paid = installments(l);
  const ledger = ledgerOf([l], paid, { links: paid.map((t, i) => [l, i + 1, t] as [Loan, number, Txn]) });
  const s = summary(paid, ledger);

  assert.equal(s.cashOut, 400); // the four payments really left the account
  assert.equal(s.purchaseSpending, 400); // and the purchase is counted once
  assert.deepEqual([s.lessPrincipal, s.lessDownPayments, s.plusRecordedPurchases], [400, 0, 400]);
  assert.deepEqual([s.repaymentCash, s.principalRepaid, s.interest, s.fees, s.purchases, s.financed], [400, 400, 0, 0, 400, 400]);
  assertReconciles(s);

  // The purchase is on its own day, in its own category, with no bank movement behind it.
  const view = spendingView(paid, ledger);
  const bought = view.find((t) => t.id === 'recorded-purchase:A')!;
  assert.deepEqual([bought.date, bought.amount, bought.categoryKey, bought.category, bought.accountId, bought.merchant], ['2026-01-15', -400, 'HOME_IMPROVEMENT', 'Home Improvement', RECORDED_ACCOUNT, 'Wayfair']);
  assert.deepEqual(view.filter((t) => t.amount !== 0).map((t) => t.id), ['recorded-purchase:A']); // the four installments carry no spending of their own
  assert.equal(view.length, 5); // but they stay in the list, at nothing
  assert.equal(summary(paid, ledger, '2026-01-01', '2026-01-31').purchaseSpending, 400); // in January
  assert.equal(summary(paid, ledger, '2026-01-01', '2026-01-31').cashOut, 0); // with no cash out in January
  assert.equal(summary(paid, ledger, '2026-02-01', '2026-04-30').purchaseSpending, 0);
  assert.equal(summary(paid, ledger, '2026-02-01', '2026-02-28').cashOut, 100);
});

test('the spending breakdown puts the purchase under its own category, not Loans', () => {
  const l = furniture();
  const paid = installments(l);
  const ledger = ledgerOf([l], paid, { links: paid.map((t, i) => [l, i + 1, t] as [Loan, number, Txn]) });
  const scope = overviewScope(paid, accounts, 365);
  assert.deepEqual(spendingBreakdown(paid, scope).slices.map((x) => [x.key, x.amount]), [['LOAN_PAYMENTS', 400]]); // as the bank sees it
  assert.deepEqual(spendingBreakdown(spendingView(paid, ledger), scope).slices.map((x) => [x.key, x.amount]), [['HOME_IMPROVEMENT', 400]]);
  assert.equal(flowBetween(paid, scope, '2026-01-01').moneyOut, 400); // Money out is the cash, unchanged
});

test('without confirmed links nothing is assumed: the payments stay spending, and are flagged', () => {
  const l = furniture();
  const paid = installments(l);
  const ledger = ledgerOf([l], paid); // nothing linked
  const s = summary(paid, ledger);
  assert.deepEqual([s.cashOut, s.purchaseSpending, s.lessPrincipal], [400, 800, 0]); // both counted, as they cannot be told apart yet
  assert.deepEqual(s.unclassified, { count: 4, amount: 400 });
  assert.ok([...ledger.classes.values()].every((c) => c.primary === 'unclassified' && !c.confirmed && c.basis === 'provider-name'));
  assert.deepEqual(bnplTag(ledger, paid[0].id), { label: 'Maybe BNPL', full: 'Possibly Pay-Later', detail: 'Not confirmed', confirmed: false });
  assertReconciles(s);
});

/* ---------------------------------------------------------------------------------------------- down payments */
test('a purchase with a down payment: the down payment is part of the purchase, not on top of it', () => {
  const l = furniture({ amount: 400 }, { purchaseAmount: 500, downPayment: 100 });
  const down = tx('2026-01-15', -100, 'WAYFAIR', { category: 'Home Improvement', categoryKey: 'HOME_IMPROVEMENT', categoryDetailKey: '' });
  const paid = installments(l);
  const txns = [down, ...paid];
  const ledger = ledgerOf([l], txns, { links: paid.map((t, i) => [l, i + 1, t] as [Loan, number, Txn]), roles: [[l, down, 'down-payment']] });
  const s = summary(txns, ledger);
  assert.deepEqual([s.cashOut, s.purchaseSpending, s.lessPrincipal, s.lessDownPayments, s.plusRecordedPurchases], [500, 500, 400, 100, 500]);
  assertReconciles(s);
  assert.equal(ledger.classes.get(down.id)?.primary, 'down-payment');
  assert.deepEqual(ledger.loans.get('A')?.notes, []);

  // If the down payment is not linked, it is counted twice and Wallex says so.
  const unlinked = ledgerOf([l], txns, { links: paid.map((t, i) => [l, i + 1, t] as [Loan, number, Txn]) });
  assert.equal(summary(txns, unlinked).purchaseSpending, 600);
  assert.match(unlinked.loans.get('A')!.notes[0], /down payment/i);
});

test('a purchase price that does not match the financing is noted, not corrected', () => {
  const l = furniture({ amount: 400 }, { purchaseAmount: 650, downPayment: 100 });
  assert.match(ledgerOf([l], []).loans.get('A')!.notes.join(' '), /not the amount financed plus the down payment/);
});

/* --------------------------------------------------------------------------------------------- interest and fees */
test('interest stays an expense and principal does not count as spending again', () => {
  const l = furniture({ amount: 1200, count: 12, apr: 12, firstDate: '2026-02-15' }, { purchaseAmount: 1200 });
  const paid = installments(l);
  const ledger = ledgerOf([l], paid, { links: paid.map((t, i) => [l, i + 1, t] as [Loan, number, Txn]) });
  const first = ledger.classes.get(paid[0].id)!;
  assert.deepEqual(first.parts, [{ role: 'principal-repayment', amount: 94.62 }, { role: 'interest', amount: 12 }]);
  assert.equal(first.primary, 'principal-repayment');

  const s = summary(paid, ledger, '2026-01-01', '2027-12-31');
  const totalInterest = cents(sched(l).reduce((n, i) => n + i.interest, 0));
  assert.equal(s.principalRepaid, 1200); // exact, to the cent
  assert.equal(s.interest, totalInterest);
  assert.equal(s.cashOut, cents(1200 + totalInterest));
  assert.equal(s.purchaseSpending, cents(1200 + totalInterest)); // the purchase, plus the cost of financing it
  assert.equal(cents(s.principalRepaid + s.interest), s.repaymentCash);
  assertReconciles(s);
  const view = spendingView(paid, ledger);
  assert.equal(view.find((t) => t.id === paid[0].id)?.amount, -12); // what remains of the first installment is its interest
});

test('financing fees are counted as costs and kept apart from the loan', () => {
  const l = furniture();
  const fee = tx('2026-03-10', -7.5, 'KLARNA', { category: 'Bank Fees', categoryKey: 'BANK_FEES' });
  const ledger = ledgerOf([l], [fee], { roles: [[l, fee, 'fee']] });
  assert.equal(ledger.classes.get(fee.id)?.primary, 'financing-fee');
  assert.equal(ledger.loans.get('A')?.feesPaid, 7.5);
  const s = summary([fee], ledger);
  assert.deepEqual([s.fees, s.cashOut, s.purchaseSpending, s.lessPrincipal], [7.5, 7.5, 407.5, 0]); // $7.50 plus the recorded $400 purchase
  assert.equal(spendingView([fee], ledger).includes(fee), true); // untouched
});

/* ---------------------------------------------------------------------------------------------------- refunds */
test('refunds are money back, recorded as such, and change no spending figure', () => {
  const l = furniture();
  const back = tx('2026-03-20', 100, 'WAYFAIR', { category: 'Income', categoryKey: 'INCOME', categoryDetailKey: 'INCOME_OTHER_INCOME' });
  const ledger = ledgerOf([l], [back], { roles: [[l, back, 'refund']] });
  const c = ledger.classes.get(back.id)!;
  assert.deepEqual([c.primary, c.confirmed, c.basis], ['refund', true, 'recorded-role']);
  const s = summary([back], ledger);
  assert.deepEqual([s.refunds, s.cashOut, s.purchaseSpending], [100, 0, 400]);
  assert.equal(flowBetween([back], overviewScope([back], accounts, 365), '2026-01-01').moneyIn, 100); // still money in
  // A partial refund is the amount the lender returned.
  const partial = tx('2026-03-25', 33.33, 'WAYFAIR');
  assert.equal(summary([back, partial], ledgerOf([l], [back, partial], { roles: [[l, back, 'refund'], [l, partial, 'refund']] })).refunds, 133.33);
});

test('a refund of a payment the person linked is noticed, but not marked confirmed', () => {
  const l = furniture();
  const [p1, p2] = [tx('2026-02-01', -100), tx('2026-03-01', -100)];
  const back = tx('2026-03-10', 100);
  const txns = [p1, p2, back];
  const ledger = ledgerOf([l], txns, { links: [[l, 1, p1], [l, 2, p2]] });
  const c = ledger.classes.get(back.id)!;
  assert.deepEqual([c.primary, c.confirmed, c.basis, c.loanId], ['refund', false, 'refund-of-linked-payment', 'A']);
  assert.equal(summary(txns, ledger).refunds, 100);
});

test('a refund role only fits money in, and a payment role only money out', () => {
  const store = createRoleStore(roleRepo());
  const out = tx('2026-03-01', -50);
  const inn = tx('2026-03-02', 50);
  assert.deepEqual(store.assign('A', out, 'refund'), { ok: false, reason: 'wrong-direction' });
  assert.deepEqual(store.assign('A', inn, 'fee'), { ok: false, reason: 'wrong-direction' });
  assert.equal(store.assign('A', inn, 'refund').ok, true);
  assert.equal(store.get().length, 1);
});

/* --------------------------------------------------------------------------- what is in the bank, and what is not */
test('the purchase and the repayments both in the bank: the purchase is counted once, as the bank shows it', () => {
  const l = furniture();
  const bought = tx('2026-01-15', -400, 'WAYFAIR', { category: 'Home Improvement › Furniture', categoryKey: 'HOME_IMPROVEMENT', categoryDetailKey: 'HOME_IMPROVEMENT_FURNITURE' });
  const paid = installments(l);
  const txns = [bought, ...paid];
  const ledger = ledgerOf([l], txns, { links: paid.map((t, i) => [l, i + 1, t] as [Loan, number, Txn]), roles: [[l, bought, 'purchase']] });
  assert.equal(ledger.purchases.length, 0); // nothing recorded on top of the real charge
  assert.equal(ledger.loans.get('A')?.purchaseTxnId, bought.id);
  const s = summary(txns, ledger);
  assert.deepEqual([s.cashOut, s.purchaseSpending, s.purchases, s.plusRecordedPurchases, s.lessPrincipal], [800, 400, 400, 0, 400]); // the cash really did leave twice
  const view = spendingView(txns, ledger);
  assert.equal(view.find((t) => t.id === bought.id)?.category, 'Home Improvement › Furniture'); // its own category, as the bank gave it
  assertReconciles(s);
});

test('repayments with no original purchase transaction and no purchase on record keep counting as they always did', () => {
  const l = loan('A'); // just a loan: no purchase date or price
  assert.equal(isRepresented(l), false);
  const paid = installments(l);
  const ledger = ledgerOf([l], paid, { links: paid.map((t, i) => [l, i + 1, t] as [Loan, number, Txn]) });
  assert.equal(spendingView(paid, ledger), paid); // the same list
  const s = summary(paid, ledger);
  assert.deepEqual([s.cashOut, s.purchaseSpending, s.lessPrincipal, s.plusRecordedPurchases], [400, 400, 0, 0]);
  assert.equal(s.principalRepaid, 400); // still known to be principal, for the debt
  assert.equal(ledger.classes.get(paid[0].id)?.represented, false);
});

test('a purchase recorded without a bank transaction moves no cash', () => {
  const l = furniture();
  const ledger = ledgerOf([l], []);
  const s = summary([], ledger);
  assert.deepEqual([s.cashOut, s.purchaseSpending, s.purchases], [0, 400, 400]);
  assert.equal(flowBetween([], overviewScope([], accounts, 365), '2026-01-01').moneyOut, 0);
  // It belongs to no account, so a view of one account does not include it.
  assert.equal(summary([], ledger, '2026-01-01', '2026-12-31', 'checking').purchaseSpending, 0);
  assert.equal(summary([], ledger, '2026-01-01', '2026-12-31', 'credit').purchaseSpending, 0);
});

/* ------------------------------------------------------------------------------- credit cards and transfers */
test('installments paid on a linked credit card are handled the same way, and the card payment is still left out', () => {
  const l = furniture();
  const onCard = sched(l).map((i) => tx(i.date, -i.payment, 'KLARNA', { accountId: 'card' }));
  const cardPayment = tx('2026-02-20', -250, 'CHASE CARD PAYMENT', { categoryDetailKey: 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT', details: [{ label: 'Bank Description', value: 'PAYMENT THANK YOU XXXX1234' }] });
  const txns = [...onCard, cardPayment];
  const ledger = ledgerOf([l], txns, { links: onCard.map((t, i) => [l, i + 1, t] as [Loan, number, Txn]) });
  const s = summary(txns, ledger);
  assert.deepEqual([s.cashOut, s.purchaseSpending, s.lessPrincipal, s.plusRecordedPurchases], [400, 400, 400, 400]); // the card payment is in neither
  assertReconciles(s);
  // The rule that counts card payments is unchanged by any of this.
  const counted = summary(txns, ledger, '2026-01-01', '2026-12-31', 'all', { ...getRules(), countCardPayments: true });
  assert.deepEqual([counted.cashOut, counted.purchaseSpending], [650, 650]);
  assertReconciles(counted);
  // Looking at checking alone, neither the card's installments nor the recorded purchase are in view.
  const checking = summary(txns, ledger, '2026-01-01', '2026-12-31', 'checking');
  assert.deepEqual([checking.purchaseSpending, checking.cashOut, checking.plusRecordedPurchases], [250, 250, 0]);
  assertReconciles(checking);
});

test('a transfer between your own accounts is not spending, and is not taken for a loan payment', () => {
  const l = furniture();
  const move = tx('2026-02-02', -500, 'KLARNA SAVINGS', { category: 'Transfer Out', categoryKey: 'TRANSFER_OUT', categoryDetailKey: 'TRANSFER_OUT_ACCOUNT_TRANSFER' });
  const ledger = ledgerOf([l], [move]);
  assert.equal(ledger.classes.has(move.id), false);
  const s = summary([move], ledger);
  assert.deepEqual([s.cashOut, s.unclassified.count], [0, 0]);
});

/* ------------------------------------------------------------------------------------------ several loans */
test('two loans at the same merchant are told apart by their links, never by the name', () => {
  const a = furniture();
  const b = withPurchase(loan('B', { amount: 300, count: 3, firstDate: '2026-03-01' }), { merchant: 'Wayfair', category: 'Furniture', purchaseDate: '2026-02-20', purchaseAmount: 300 });
  const pa = installments(a);
  const pb = sched(b).map((i) => tx(i.date, -i.payment, 'KLARNA'));
  const stray = tx('2026-05-05', -45, 'KLARNA'); // belongs to nothing Wallex has been told about
  const txns = [...pa, ...pb, stray];
  const ledger = ledgerOf([a, b], txns, { links: [...pa.map((t, i) => [a, i + 1, t] as [Loan, number, Txn]), ...pb.map((t, i) => [b, i + 1, t] as [Loan, number, Txn])] });
  assert.deepEqual([ledger.classes.get(pa[0].id)?.loanId, ledger.classes.get(pb[0].id)?.loanId, ledger.classes.get(stray.id)?.primary], ['A', 'B', 'unclassified']);
  const s = summary(txns, ledger);
  assert.deepEqual([s.cashOut, s.purchaseSpending, s.purchases, s.financed, s.unclassified.amount], [745, 745, 700, 700, 45]); // 400 + 300 purchases, plus the stray 45
  assertReconciles(s);
  assert.deepEqual([ledger.loans.get('A')?.principalPaid, ledger.loans.get('B')?.principalPaid], [400, 300]);
  assert.equal(ledger.purchases.length, 2);
});

test('a transaction linked as an installment keeps that, even if it is given a role too', () => {
  const l = furniture();
  const paid = installments(l);
  const ledger = ledgerOf([l], paid, { links: [[l, 1, paid[0]]], roles: [[l, paid[0], 'fee']] });
  assert.equal(ledger.classes.get(paid[0].id)?.basis, 'installment-link');
  assert.equal(ledger.loans.get('A')?.feesPaid, 0);
});

/* ---------------------------------------------------------------------------- the person's rules, and no loans */
test('an ignored merchant stays ignored: ignoring the lender leaves the purchase in, ignoring the store takes it out', () => {
  const l = furniture();
  const paid = installments(l);
  const ledger = ledgerOf([l], paid, { links: paid.map((t, i) => [l, i + 1, t] as [Loan, number, Txn]) });
  const store = merchantOf(ledger.purchases[0]).key;
  const lender = merchantOf(paid[0]).key;
  assert.equal(summary(paid, ledger, '2026-01-01', '2026-12-31', 'all', { ...getRules(), ignoredMerchants: [store] }).purchaseSpending, 0);
  assert.equal(summary(paid, ledger, '2026-01-01', '2026-12-31', 'all', { ...getRules(), ignoredMerchants: [lender] }).purchaseSpending, 400);
});

test('with no pay-later loans, nothing changes', () => {
  const txns = [tx('2026-02-01', -100, 'KLARNA'), tx('2026-02-02', -40, 'Corner Store', { category: 'Food & Drink', categoryKey: 'FOOD_AND_DRINK' })];
  for (const loans of [[], [loan('P', { type: 'personal' })], [(({ type: _t, ...rest }) => rest as Loan)(loan('L'))]]) {
    const ledger = ledgerOf(loans, txns);
    assert.equal(ledger.active, false);
    assert.equal(spendingView(txns, ledger), txns);
    const s = summary(txns, ledger);
    assert.deepEqual([s.cashOut, s.purchaseSpending, s.unclassified.count], [140, 140, 0]);
    assert.equal(bnplTag(ledger, txns[0].id), null);
  }
  assert.equal(buildBnplLedger(txns, null, TODAY).active, false);
});

test('a pay-later loan with nothing recorded about its purchase leaves every figure as it was', () => {
  const l = loan('A');
  const unrelated = [tx('2026-02-02', -40, 'Corner Store', { category: 'Food & Drink', categoryKey: 'FOOD_AND_DRINK', categoryDetailKey: '' })];
  const ledger = ledgerOf([l], unrelated);
  assert.equal(spendingView(unrelated, ledger), unrelated);
  assert.deepEqual(summary(unrelated, ledger).purchaseSpending, 40);
});

/* ------------------------------------------------------------------------------------------ cents and helpers */
test('amounts that do not divide evenly still add up to the cent', () => {
  const l = furniture({ amount: 100, count: 3, firstDate: '2026-02-01' }, { purchaseAmount: 100 });
  assert.deepEqual(sched(l).map((i) => i.payment), [33.33, 33.33, 33.34]);
  const paid = installments(l);
  const ledger = ledgerOf([l], paid, { links: paid.map((t, i) => [l, i + 1, t] as [Loan, number, Txn]) });
  const s = summary(paid, ledger);
  assert.deepEqual([s.principalRepaid, s.cashOut, s.purchaseSpending, s.lessPrincipal], [100, 100, 100, 100]);
  assertReconciles(s);
});

test('two part payments of one installment are split like the whole one', () => {
  const l = furniture({ amount: 1200, count: 12, apr: 12, firstDate: '2026-02-15' }, { purchaseAmount: 1200 });
  const [a, b] = [tx('2026-02-15', -10), tx('2026-02-16', -96.62)]; // together the $106.62 payment
  const ledger = ledgerOf([l], [a, b], { links: [[l, 1, a], [l, 1, b]] });
  assert.deepEqual(ledger.classes.get(a.id)?.parts, [{ role: 'interest', amount: 10 }]);
  assert.deepEqual(ledger.classes.get(b.id)?.parts, [{ role: 'principal-repayment', amount: 94.62 }, { role: 'interest', amount: 2 }]);
});

test('a payment larger than its installment keeps the extra as an adjustment, still counted as spending', () => {
  const l = furniture();
  const big = tx('2026-02-01', -130);
  const ledger = ledgerOf([l], [big], { links: [[l, 1, big]] });
  assert.deepEqual(ledger.classes.get(big.id)?.parts, [{ role: 'principal-repayment', amount: 100 }, { role: 'adjustment', amount: 30 }]);
  assert.equal(spendingView([big], ledger).find((t) => t.id === big.id)?.amount, -30);
});

test('the debt left is an estimate from recorded payments', () => {
  const l = furniture();
  const paid = installments(l).slice(0, 2);
  const ledger = ledgerOf([l], paid, { links: paid.map((t, i) => [l, i + 1, t] as [Loan, number, Txn]) });
  assert.equal(ledger.loans.get('A')?.outstanding, 200);
  assert.equal(summary(paid, ledger).outstanding, 200);
});

test('typed purchase categories land with the bank’s own', () => {
  assert.deepEqual(purchaseCategory('Furniture'), { key: 'HOME_IMPROVEMENT', label: 'Home Improvement' });
  assert.deepEqual(purchaseCategory('Shopping'), { key: 'GENERAL_MERCHANDISE', label: 'General Merchandise' });
  assert.equal(purchaseCategory('Clothing').key, 'GENERAL_MERCHANDISE');
  assert.equal(purchaseCategory('electronics').key, 'GENERAL_MERCHANDISE');
  assert.equal(purchaseCategory('Travel').key, 'TRAVEL');
  assert.equal(purchaseCategory('Entertainment').key, 'ENTERTAINMENT');
  assert.deepEqual(purchaseCategory('Pottery'), { key: 'CUSTOM_POTTERY', label: 'Pottery' });
  assert.deepEqual(purchaseCategory(''), { key: 'UNCATEGORIZED', label: 'Uncategorized' });
  assert.deepEqual(purchaseCategory(undefined), { key: 'UNCATEGORIZED', label: 'Uncategorized' });
});

test('the original transactions are never changed', () => {
  const l = furniture();
  const paid = installments(l);
  const before = JSON.stringify(paid);
  const ledger = ledgerOf([l], paid, { links: paid.map((t, i) => [l, i + 1, t] as [Loan, number, Txn]) });
  spendingView(paid, ledger);
  summary(paid, ledger);
  assert.equal(JSON.stringify(paid), before);
  assert.equal(paid[0].categoryKey, 'LOAN_PAYMENTS');
});

test('roles are cleaned when read, one to a transaction', () => {
  const good = { loanId: 'A', txnId: 't1', accountId: 'chk', role: 'fee', amount: -5, date: '2026-03-01' };
  const out = normalizeRoles([good, { ...good, role: 'purchase' }, { ...good, txnId: 't2', role: 'gift' }, { ...good, txnId: 't3', amount: 0 }, { ...good, txnId: 't4', date: 'x' }, null]);
  assert.deepEqual(out.map((r: LoanRole) => [r.txnId, r.role]), [['t1', 'fee']]);
  const store = createRoleStore(roleRepo());
  const t = tx('2026-03-01', -5);
  assert.equal(store.assign('A', t, 'fee').ok, true);
  assert.equal(store.assign('B', t, 'fee').ok, false); // never moved to another loan
  const [p1, p2] = [tx('2026-01-10', -400), tx('2026-01-11', -400)];
  store.assign('A', p1, 'purchase');
  store.assign('A', p2, 'purchase'); // a loan has one purchase
  assert.deepEqual(store.get().filter((r) => r.role === 'purchase').map((r) => r.txnId), [p2.id]);
  store.removeForLoan('A');
  assert.deepEqual(store.get(), []);
});

/* --------------------------------------------------------------------------------------- the other reports */
test('Insights’ categories and Patterns’ categories read the same pay-later view', () => {
  const l = furniture();
  const paid = installments(l).slice(0, 1); // one installment so far: Feb 1
  const ledger = ledgerOf([l], paid, { links: [[l, 1, paid[0]]] });
  const view = spendingView(paid, ledger);
  const rules = getRules();

  const raw = topCategories(paid, accounts, rules, '2026-02-20', '90');
  const counted = topCategories(view, accounts, rules, '2026-02-20', '90');
  assert.deepEqual(raw.rows.map((r) => [r.key, r.amount]), [['LOAN_PAYMENTS', 100]]);
  assert.deepEqual(counted.rows.map((r) => [r.key, r.amount]), [['HOME_IMPROVEMENT', 400]]);
  assert.equal(counted.total, 400);

  const patterns = (txns: Txn[]) => buildPatterns(txns, accounts, { ...DEFAULT_FILTERS, days: 365 }, undefined, rules).categories.map((c) => c.key);
  assert.deepEqual(patterns(paid), ['LOAN_PAYMENTS']);
  assert.deepEqual(patterns(view), ['HOME_IMPROVEMENT']);
});

test('a purchase recorded in Loans does not stretch how far back the bank’s history is said to reach', () => {
  const l = furniture({}, { purchaseDate: '2025-01-05' }); // long before any bank transaction
  const paid = installments(l);
  const ledger = ledgerOf([l], paid, { links: paid.map((t, i) => [l, i + 1, t] as [Loan, number, Txn]) });
  const raw = makeScope(paid, accounts, { ...DEFAULT_FILTERS, days: 365 }, getRules());
  const withView = makeScope(spendingView(paid, ledger), accounts, { ...DEFAULT_FILTERS, days: 365 }, getRules());
  assert.equal(withView.historyStart, raw.historyStart);
  assert.deepEqual([withView.partial, withView.effectiveDays], [raw.partial, raw.effectiveDays]);
});
