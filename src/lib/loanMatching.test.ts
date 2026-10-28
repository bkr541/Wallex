/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { amountTolerance, candidatesFor, dateWindow, manualOptions, matchInstallments, providerMatch, resolveOptions } from './loanMatching.ts';
import { buildLink, confirmedPayments, coverageFor, createLinkStore, normalizeLinks, reconcileLinks, type InstallmentLink, type LinkRepository } from './loanLinks.ts';
import { scheduleFor, type Loan } from './loans.ts';
import type { Txn } from './wallex';

/* ------------------------------------------------------------------------------------------------ fixtures */
let seq = 0;
const tx = (o: Partial<Txn> & { amount: number; date: string }): Txn => ({
  id: `t${++seq}`,
  accountId: 'chk',
  authorizedDate: null,
  merchant: 'AFFIRM',
  logos: [],
  category: '',
  categoryKey: '',
  categoryDetailKey: '',
  channel: '',
  pending: false,
  details: [{ label: 'Bank Description', value: 'AFFIRM INC PAYMENT' }],
  ...o,
});

// Four payments of $150 every two weeks: Jan 10, Jan 24, Feb 7, Feb 21.
const affirm: Loan = { id: 'A', lender: 'Affirm', item: '', amount: 600, apr: 0, count: 4, frequency: 'biweekly', firstDate: '2026-01-10', type: 'bnpl' };
const inst = (loan: Loan, n: number) => scheduleFor(loan).find((i) => i.n === n)!;

const memoryRepo = (): LinkRepository & { saved: InstallmentLink[] } => {
  const repo = { saved: [] as InstallmentLink[], load: () => repo.saved, save: (l: InstallmentLink[]) => void (repo.saved = l) };
  return repo;
};
const confirm = (store: ReturnType<typeof createLinkStore>, loan: Loan, n: number, t: Txn) => store.link(buildLink(loan, inst(loan, n), t, 'suggestion'));
const match = (loans: Loan[], txns: Txn[], links: InstallmentLink[] = []) => matchInstallments({ loans, links, txns });

/* ----------------------------------------------------------------------------------------------- matching */
test('one payment fits one installment, with the reasons why', () => {
  const t = tx({ amount: -150, date: '2026-01-11' });
  const { candidates } = match([affirm], [t]);
  assert.equal(candidates.length, 1);
  const c = candidates[0];
  assert.deepEqual([c.loanId, c.installment, c.txn.id, c.kind, c.confidence, c.ambiguous], ['A', 1, t.id, 'exact', 'high', false]);
  assert.equal(c.dayDiff, 1);
  assert.ok(c.reasons.some((r) => /merchant is Affirm/.test(r)));
  assert.ok(c.reasons.some((r) => /exactly \$150\.00/.test(r)));
});

test('the lender’s name alone is not a match', () => {
  const rows = [
    tx({ amount: -400, date: '2026-01-11' }), // wrong amount
    tx({ amount: -150, date: '2026-03-20' }), // right amount, nowhere near a due date
    tx({ amount: -150, date: '2026-01-10', merchant: 'STARBUCKS', details: [] }), // right amount and day, other merchant
    tx({ amount: 150, date: '2026-01-10' }), // money in
  ];
  assert.equal(match([affirm], rows).candidates.length, 0);
  // A small payment near a due date can only ever be a low-confidence piece of the installment.
  const small = match([affirm], [tx({ amount: -37.12, date: '2026-01-11' })]).candidates;
  assert.deepEqual(small.map((c) => [c.kind, c.confidence]), [['partial', 'low']]);
  assert.equal(match([affirm], [tx({ amount: -3, date: '2026-01-11' })]).candidates.length, 0);
});

test('only loans classified as pay-later are matched', () => {
  const t = tx({ amount: -150, date: '2026-01-10' });
  const { type: _t, ...legacy } = affirm;
  assert.equal(match([legacy as Loan], [t]).candidates.length, 0);
  assert.equal(match([{ ...affirm, type: 'personal' }], [t]).candidates.length, 0);
});

test('the bank description can identify the provider when the merchant cannot', () => {
  const t = tx({ amount: -150, date: '2026-01-10', merchant: 'Peloton', details: [{ label: 'Bank Description', value: 'AFFIRM INC 4NF' }] });
  assert.equal(providerMatch('Affirm', t), 'description');
  assert.equal(match([affirm], [t]).candidates[0].provider, 'description');
});

test('tolerances are bounded', () => {
  const o = resolveOptions({ dateWindowDays: 100, amountPct: 0.9, amountCap: 500, amountFloor: 900 });
  assert.equal(o.dateWindowDays, 14);
  assert.equal(o.amountPct, 0.05);
  assert.equal(o.amountCap, 20);
  assert.ok(o.amountFloor <= o.amountCap);
  assert.equal(amountTolerance(150, resolveOptions()), 1.5);
  assert.equal(amountTolerance(10, resolveOptions()), 0.5);
  assert.equal(amountTolerance(5000, resolveOptions()), 5);
  assert.equal(dateWindow('weekly', resolveOptions({ dateWindowDays: 14 })), 3);
  assert.equal(dateWindow('monthly', resolveOptions({ dateWindowDays: 14 })), 14);
  assert.deepEqual(resolveOptions({ dateWindowDays: NaN }), resolveOptions());
});

test('date and amount tolerances decide what is close enough', () => {
  const day = (n: number) => `2026-01-${String(10 + n).padStart(2, '0')}`;
  assert.equal(match([affirm], [tx({ amount: -150, date: day(5) })]).candidates.length, 1); // five days is the edge of the window
  assert.equal(match([affirm], [tx({ amount: -150, date: day(6) })]).candidates.length, 0);
  const near = match([affirm], [tx({ amount: -150.9, date: day(0) })]).candidates;
  assert.equal(near[0].kind, 'near');
  assert.equal(near[0].confidence, 'medium');
  assert.equal(match([affirm], [tx({ amount: -160, date: day(0) })]).candidates.length, 0); // over by more than the tolerance
  // The made-on date counts as well as the posted date.
  assert.equal(match([affirm], [tx({ amount: -150, date: '2026-01-14', authorizedDate: '2026-01-10' })]).candidates[0].dayDiff, 0);
});

test('two loans from one lender are told apart by amount and date', () => {
  const second: Loan = { ...affirm, id: 'B', amount: 180, count: 3, frequency: 'monthly', firstDate: '2026-01-12' }; // $60 monthly
  const t150 = tx({ amount: -150, date: '2026-01-10' });
  const t60 = tx({ amount: -60, date: '2026-01-13' });
  const { candidates } = match([affirm, second], [t150, t60]);
  assert.equal(candidates.length, 2);
  assert.deepEqual(candidates.map((c) => [c.txn.id, c.loanId, c.ambiguous]).sort(), [[t150.id, 'A', false], [t60.id, 'B', false]].sort());
});

test('the same payment fitting two loans is ambiguous and never decided by Wallex', () => {
  const twin: Loan = { ...affirm, id: 'B', firstDate: '2026-01-12' }; // same $150, two days later
  const t = tx({ amount: -150, date: '2026-01-11' });
  const { candidates } = match([affirm, twin], [t]);
  assert.equal(candidates.length, 2);
  for (const c of candidates) {
    assert.equal(c.ambiguous, true);
    assert.equal(c.confidence, 'low');
    assert.equal(c.competing.length, 1);
  }
  const store = createLinkStore(memoryRepo());
  assert.equal(store.get().length, 0); // matching alone links nothing
});

test('two transactions that could pay one installment are both flagged', () => {
  const a = tx({ amount: -150, date: '2026-01-10' });
  const b = tx({ amount: -150, date: '2026-01-12', accountId: 'card' });
  const { candidates } = match([affirm], [a, b]);
  assert.equal(candidates.length, 2);
  assert.ok(candidates.every((c) => c.ambiguous && c.alsoFits.length === 1 && c.confidence === 'low'));
});

test('once one is confirmed the other no longer competes', () => {
  const twin: Loan = { ...affirm, id: 'B', firstDate: '2026-01-12' };
  const t1 = tx({ amount: -150, date: '2026-01-11' });
  const t2 = tx({ amount: -150, date: '2026-01-12' });
  const store = createLinkStore(memoryRepo());
  assert.ok(confirm(store, affirm, 1, t1).ok);
  const { candidates } = match([affirm, twin], [t1, t2], store.get());
  const rest = candidates.filter((c) => c.txn.id === t2.id);
  assert.ok(rest.every((c) => c.loanId === 'B' || c.installment !== 1));
  assert.ok(candidates.every((c) => c.txn.id !== t1.id));
  assert.equal(candidatesFor({ candidates, duplicateTxnIds: new Set() }, 'B', 1).length, 1);
});

/* ------------------------------------------------------------------------------------------- duplicates */
test('an identical transaction the installments cannot account for is treated as a duplicate', () => {
  const first = tx({ id: 'a1', amount: -150, date: '2026-01-10' });
  const copy = tx({ id: 'a2', amount: -150, date: '2026-01-10' });
  const { candidates, duplicateTxnIds } = match([affirm], [copy, first]);
  assert.deepEqual([...duplicateTxnIds], ['a2']);
  assert.deepEqual(candidates.map((c) => c.txn.id), ['a1']);
  assert.equal(candidates[0].ambiguous, false);
});

test('identical same-day payments are kept when two installments are waiting for them', () => {
  const twin: Loan = { ...affirm, id: 'B' };
  const rows = [tx({ id: 'a1', amount: -150, date: '2026-01-10' }), tx({ id: 'a2', amount: -150, date: '2026-01-10' })];
  const { duplicateTxnIds, candidates } = match([affirm, twin], rows);
  assert.equal(duplicateTxnIds.size, 0);
  assert.equal(candidates.length, 4);
  assert.ok(candidates.every((c) => c.ambiguous));
});

/* -------------------------------------------------------------------------------------- pending / posted */
test('a pending payment is a weaker suggestion, and it is not a confirmed payment', () => {
  const pending = tx({ amount: -150, date: '2026-01-10', pending: true });
  const c = match([affirm], [pending]).candidates[0];
  assert.equal(c.confidence, 'medium');
  assert.ok(c.reasons.some((r) => /pending/.test(r)));

  const store = createLinkStore(memoryRepo());
  assert.ok(confirm(store, affirm, 1, pending).ok);
  const views = reconcileLinks(store.get(), [pending]);
  assert.equal(views[0].state, 'pending');
  assert.equal(views[0].paid, 0);
  const cov = coverageFor('A', inst(affirm, 1), views);
  assert.deepEqual([cov.state, cov.paid, cov.pending], ['pending', 0, 150]);
  assert.deepEqual(confirmedPayments(views), []);
});

test('a pending charge with a posted twin is not suggested twice', () => {
  const pending = tx({ amount: -150, date: '2026-01-10', pending: true });
  const posted = tx({ amount: -150, date: '2026-01-11' });
  assert.deepEqual(match([affirm], [pending, posted]).candidates.map((c) => c.txn.id), [posted.id]);
});

test('when a pending charge settles under a new id, the link follows it', () => {
  const pending = tx({ id: 'pend', amount: -150, date: '2026-01-10', pending: true });
  const store = createLinkStore(memoryRepo());
  const linked = confirm(store, affirm, 1, pending);
  assert.ok(linked.ok);

  const posted = tx({ id: 'post', amount: -150, date: '2026-01-12' });
  const views = reconcileLinks(store.get(), [posted]);
  assert.equal(views[0].state, 'missing');
  assert.equal(views[0].replacement?.id, 'post');

  const moved = store.replaceTxn(views[0].link.id, views[0].replacement!);
  assert.ok(moved.ok);
  assert.equal(store.get().length, 1);
  assert.equal(store.get()[0].txnId, 'post');
  assert.deepEqual(store.get()[0].previousTxnIds, ['pend']);
  const after = reconcileLinks(store.get(), [posted]);
  assert.equal(after[0].state, 'posted');
  assert.equal(coverageFor('A', inst(affirm, 1), after).state, 'paid');
});

test('a pending charge is not swapped for a successor that could belong to another link', () => {
  const twin: Loan = { ...affirm, id: 'B' };
  const store = createLinkStore(memoryRepo());
  confirm(store, affirm, 1, tx({ id: 'p1', amount: -150, date: '2026-01-10', pending: true }));
  confirm(store, twin, 1, tx({ id: 'p2', amount: -150, date: '2026-01-10', pending: true }));
  const views = reconcileLinks(store.get(), [tx({ id: 'post', amount: -150, date: '2026-01-11' })]);
  assert.ok(views.every((v) => v.state === 'missing' && v.replacement === null));
});

test('a posted payment that disappears is kept as missing, never replaced or counted', () => {
  const posted = tx({ id: 'gone', amount: -150, date: '2026-01-10' });
  const store = createLinkStore(memoryRepo());
  confirm(store, affirm, 1, posted);
  const lookalike = tx({ id: 'other', amount: -150, date: '2026-01-11' });
  const views = reconcileLinks(store.get(), [lookalike]);
  assert.equal(views[0].state, 'missing');
  assert.equal(views[0].replacement, null);
  assert.equal(views[0].paid, 0);
  assert.equal(store.get().length, 1); // still on record
  assert.equal(coverageFor('A', inst(affirm, 1), views).state, 'unlinked');
});

test('links are not judged while the bank’s transactions are not loaded, or for an account that did not load', () => {
  const t = tx({ amount: -150, date: '2026-01-10' });
  const store = createLinkStore(memoryRepo());
  confirm(store, affirm, 1, t);
  assert.equal(reconcileLinks(store.get(), null)[0].state, 'unknown');
  assert.equal(reconcileLinks(store.get(), [], { knownAccountIds: new Set(['other']) })[0].state, 'unknown');
  assert.equal(reconcileLinks(store.get(), [], { knownAccountIds: new Set(['chk']) })[0].state, 'missing');
});

/* --------------------------------------------------------------------------------------------- splits */
test('a payment split in two is matched piece by piece', () => {
  const monthly: Loan = { ...affirm, id: 'M', amount: 100, count: 2, frequency: 'monthly', firstDate: '2026-01-15' }; // $50 each
  const a = tx({ amount: -30, date: '2026-01-15' });
  const b = tx({ amount: -20, date: '2026-01-16' });
  const first = match([monthly], [a, b]);
  assert.ok(first.candidates.filter((c) => c.installment === 1).every((c) => c.kind === 'partial' && c.confidence === 'low'));

  const store = createLinkStore(memoryRepo());
  assert.ok(confirm(store, monthly, 1, a).ok);
  let views = reconcileLinks(store.get(), [a, b]);
  let cov = coverageFor('M', inst(monthly, 1), views);
  assert.deepEqual([cov.state, cov.paid], ['partial', 30]);

  // What is left to pay is $20, so the second piece is now an exact fit.
  const rest = match([monthly], [a, b], store.get()).candidates.find((c) => c.txn.id === b.id && c.installment === 1)!;
  assert.deepEqual([rest.kind, rest.confidence], ['exact', 'high']);

  assert.ok(confirm(store, monthly, 1, b).ok);
  views = reconcileLinks(store.get(), [a, b]);
  cov = coverageFor('M', inst(monthly, 1), views);
  assert.deepEqual([cov.state, cov.paid, cov.views.length], ['paid', 50, 2]);
  assert.equal(match([monthly], [a, b], store.get()).candidates.filter((c) => c.installment === 1).length, 0); // covered
});

test('two equal pieces of one installment are not mistaken for a duplicate', () => {
  const monthly: Loan = { ...affirm, id: 'M', amount: 100, count: 2, frequency: 'monthly', firstDate: '2026-01-15' };
  const { duplicateTxnIds, candidates } = match([monthly], [tx({ id: 'x1', amount: -25, date: '2026-01-15' }), tx({ id: 'x2', amount: -25, date: '2026-01-15' })]);
  assert.equal(duplicateTxnIds.size, 0);
  assert.equal(candidates.length, 2);
});

/* -------------------------------------------------------------------------------------------- refunds */
test('money in is never suggested as a payment, and a full refund reverses the payment', () => {
  const paid = tx({ id: 'pay', amount: -150, date: '2026-01-10' });
  const refund = tx({ id: 'ref', amount: 150, date: '2026-01-20' });
  assert.deepEqual(match([affirm], [refund]).candidates, []);

  const store = createLinkStore(memoryRepo());
  confirm(store, affirm, 1, paid);
  const views = reconcileLinks(store.get(), [paid, refund]);
  assert.equal(views[0].state, 'reversed');
  assert.equal(views[0].paid, 0);
  assert.equal(views[0].refunds[0].id, 'ref');
  assert.equal(coverageFor('A', inst(affirm, 1), views).state, 'unlinked');
  assert.deepEqual(confirmedPayments(views), []);
});

test('a partial refund reduces what counts as paid', () => {
  const paid = tx({ amount: -150, date: '2026-01-10' });
  const store = createLinkStore(memoryRepo());
  confirm(store, affirm, 1, paid);
  const views = reconcileLinks(store.get(), [paid, tx({ amount: 40, date: '2026-01-18' })]);
  assert.deepEqual([views[0].state, views[0].paid, views[0].refunded], ['posted', 110, 40]);
  assert.equal(coverageFor('A', inst(affirm, 1), views).state, 'partial');
});

test('a refund goes to the latest matching payment, and only once', () => {
  const p1 = tx({ amount: -150, date: '2026-01-10' });
  const p2 = tx({ amount: -150, date: '2026-01-24' });
  const refund = tx({ amount: 150, date: '2026-01-30' });
  const store = createLinkStore(memoryRepo());
  confirm(store, affirm, 1, p1);
  confirm(store, affirm, 2, p2);
  const views = reconcileLinks(store.get(), [p1, p2, refund]);
  assert.deepEqual(views.map((v) => [v.link.installment, v.state]), [[1, 'posted'], [2, 'reversed']]);
});

test('a refund from another lender or account is not applied', () => {
  const paid = tx({ amount: -150, date: '2026-01-10' });
  const store = createLinkStore(memoryRepo());
  confirm(store, affirm, 1, paid);
  const views = reconcileLinks(store.get(), [paid, tx({ amount: 150, date: '2026-01-20', merchant: 'KLARNA', details: [] }), tx({ amount: 150, date: '2026-01-20', accountId: 'card' })]);
  assert.equal(views[0].state, 'posted');
});

/* ------------------------------------------------------------------------------- links and the store */
test('a transaction pays one installment: it is never silently moved', () => {
  const twin: Loan = { ...affirm, id: 'B' };
  const t = tx({ amount: -150, date: '2026-01-10' });
  const store = createLinkStore(memoryRepo());
  assert.ok(confirm(store, affirm, 1, t).ok);
  const again = store.link(buildLink(twin, inst(twin, 1), t, 'manual'));
  assert.equal(again.ok, false);
  assert.equal(!again.ok && again.reason, 'txn-already-linked');
  assert.equal(!again.ok && again.existing?.loanId, 'A');
  assert.deepEqual(store.get().map((l) => l.loanId), ['A']);
  assert.equal(match([affirm, twin], [t], store.get()).candidates.length, 0);
  assert.equal(confirm(store, affirm, 1, t).ok, true); // confirming the same thing twice changes nothing
  assert.equal(store.get().length, 1);
});

test('money in cannot be linked as a payment', () => {
  const store = createLinkStore(memoryRepo());
  const result = store.link(buildLink(affirm, inst(affirm, 1), tx({ amount: 150, date: '2026-01-10' }), 'manual'));
  assert.equal(result.ok, false);
  assert.equal(store.get().length, 0);
});

test('a link records what was expected and what happened', () => {
  const t = tx({ id: 'abc', amount: -149.5, date: '2026-01-11', accountId: 'card' });
  const link = buildLink(affirm, inst(affirm, 1), t, 'manual', new Date('2026-02-01T00:00:00Z'))!;
  assert.deepEqual(link, {
    id: 'A:1:abc', loanId: 'A', installment: 1, lender: 'Affirm', txnId: 'abc', accountId: 'card',
    expectedAmount: 150, actualAmount: 149.5, expectedDate: '2026-01-10', actualDate: '2026-01-11',
    status: 'linked', source: 'manual', pendingAtLink: false, createdAt: '2026-02-01T00:00:00.000Z',
  });
});

test('a rejected suggestion stays rejected, and the person can still choose it by hand', () => {
  const t = tx({ amount: -150, date: '2026-01-10' });
  const store = createLinkStore(memoryRepo());
  assert.ok(store.reject(buildLink(affirm, inst(affirm, 1), t, 'suggestion')).ok);
  assert.equal(match([affirm], [t], store.get()).candidates.length, 0);
  assert.equal(reconcileLinks(store.get(), [t]).length, 0); // a rejection is not a payment
  assert.ok(manualOptions({ loan: affirm, installment: 1, links: store.get(), txns: [t] }).some((o) => o.txn.id === t.id));
  assert.ok(confirm(store, affirm, 1, t).ok);
  assert.deepEqual(store.get().map((l) => l.status), ['linked']);
});

test('removing a link frees the transaction and the installment', () => {
  const t = tx({ amount: -150, date: '2026-01-10' });
  const store = createLinkStore(memoryRepo());
  const r = confirm(store, affirm, 1, t);
  assert.ok(r.ok);
  assert.equal(match([affirm], [t], store.get()).candidates.length, 0);
  store.unlink(r.ok ? r.link.id : '');
  assert.equal(store.get().length, 0);
  assert.equal(match([affirm], [t], store.get()).candidates.length, 1);
  store.unlink('nothing');
});

test('deleting a loan removes its links and no others', () => {
  const twin: Loan = { ...affirm, id: 'B' };
  const store = createLinkStore(memoryRepo());
  confirm(store, affirm, 1, tx({ amount: -150, date: '2026-01-10' }));
  confirm(store, twin, 1, tx({ amount: -150, date: '2026-01-10' }));
  store.removeForLoan('A');
  assert.deepEqual(store.get().map((l) => l.loanId), ['B']);
});

test('installments with nothing linked stay unlinked', () => {
  const t = tx({ amount: -150, date: '2026-01-10' });
  const store = createLinkStore(memoryRepo());
  confirm(store, affirm, 1, t);
  const views = reconcileLinks(store.get(), [t]);
  const states = scheduleFor(affirm).map((i) => coverageFor('A', i, views).state);
  assert.deepEqual(states, ['paid', 'unlinked', 'unlinked', 'unlinked']);
  assert.deepEqual(confirmedPayments(views).map((p) => [p.installment, p.amount, p.date]), [[1, 150, '2026-01-10']]);
});

test('links in different accounts are kept apart', () => {
  const inChecking = tx({ amount: -150, date: '2026-01-10', accountId: 'chk' });
  const onCard = tx({ amount: -150, date: '2026-01-24', accountId: 'card' });
  const store = createLinkStore(memoryRepo());
  confirm(store, affirm, 1, inChecking);
  confirm(store, affirm, 2, onCard);
  assert.deepEqual(store.get().map((l) => l.accountId), ['chk', 'card']);
  const views = reconcileLinks(store.get(), [inChecking], { knownAccountIds: new Set(['chk', 'card']) });
  assert.deepEqual(views.map((v) => v.state), ['posted', 'missing']);
});

/* -------------------------------------------------------------------------------------------- storage */
test('links are saved through the repository and read back', () => {
  const repo = memoryRepo();
  const store = createLinkStore(repo);
  confirm(store, affirm, 1, tx({ amount: -150, date: '2026-01-10' }));
  assert.equal(repo.saved.length, 1);
  const reopened = createLinkStore(repo);
  assert.deepEqual(reopened.get(), store.get());
  let calls = 0;
  const off = reopened.subscribe(() => void calls++);
  reopened.unlink(reopened.get()[0].id);
  off();
  reopened.unlink('nothing');
  assert.equal(calls, 1); // removing something that is not there changes nothing
  assert.equal(repo.saved.length, 0);
});

test('stored links that break the one-transaction rule or are malformed are cleaned on load', () => {
  const good = buildLink(affirm, inst(affirm, 1), tx({ id: 'same', amount: -150, date: '2026-01-10' }), 'manual')!;
  const clash = { ...good, installment: 2, id: 'ignored' };
  const junk = [null, 'x', { ...good, actualAmount: -5 }, { ...good, installment: 0 }, { ...good, actualDate: 'soon' }];
  const out = normalizeLinks([good, clash, good, ...junk]);
  assert.equal(out.length, 1);
  assert.equal(out[0].installment, 1);
  assert.deepEqual(normalizeLinks('nope'), []);
});

test('manual choices list nearby payments, with ones already linked marked', () => {
  const twin: Loan = { ...affirm, id: 'B' };
  const mine = tx({ id: 'm', amount: -150, date: '2026-01-10' });
  const theirs = tx({ id: 't', amount: -150, date: '2026-01-11' });
  const coffee = tx({ id: 'c', amount: -4, date: '2026-01-10', merchant: 'Coffee', details: [] });
  const far = tx({ id: 'far', amount: -150, date: '2026-05-01' });
  const store = createLinkStore(memoryRepo());
  confirm(store, twin, 1, theirs);
  const options = manualOptions({ loan: affirm, installment: 1, links: store.get(), txns: [mine, theirs, coffee, far, tx({ amount: 20, date: '2026-01-10' })] });
  assert.deepEqual(options.map((o) => o.txn.id), ['m', 't', 'c']);
  assert.equal(options.find((o) => o.txn.id === 't')?.linkedTo?.loanId, 'B');
  assert.equal(options.find((o) => o.txn.id === 'c')?.providerMatch, false);
});

test('matching does not change the transactions it is given', () => {
  const rows = [tx({ amount: -150, date: '2026-01-11' }), tx({ amount: 150, date: '2026-01-20' })];
  const before = JSON.stringify(rows);
  const store = createLinkStore(memoryRepo());
  match([affirm], rows);
  confirm(store, affirm, 1, rows[0]);
  reconcileLinks(store.get(), rows);
  assert.equal(JSON.stringify(rows), before);
});
