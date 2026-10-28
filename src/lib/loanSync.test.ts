/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { keyOf, stable, supabaseRemote, toRows, fromRows, sameRecord, type EntityName, type RemoteApi } from './loanCloud.ts';
import { createLinkStore, type InstallmentLink } from './loanLinks.ts';
import { backupKey, importLegacy, LEGACY_KEYS, planImport, readLegacy } from './loanMigration.ts';
import { createPaymentStore, type LoanAdjustment, type ManualPayment } from './loanPayments.ts';
import { createRoleStore, type LoanRole } from './loanRoles.ts';
import { createSyncEngine, SYNC_KEY, type KeyValue } from './loanSyncEngine.ts';
import { createLoanStore, type Loan } from './loans.ts';
import { createFakeDb, type FakeDb } from './testing/fakeSupabase.ts';
import type { Txn } from './wallex';

/* ------------------------------------------------------------------------------------------------ fixtures */
const ALICE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';

const klarna = (id = 'loan-1', over: Partial<Loan> = {}): Loan => ({ id, lender: 'Klarna', item: 'Sofa', amount: 400, apr: 0, count: 4, frequency: 'monthly', firstDate: '2026-02-01', type: 'bnpl', bnpl: { merchant: 'Wayfair', category: 'Furniture', purchaseDate: '2026-01-15', purchaseAmount: 500, downPayment: 100, planId: 'KL-9' }, ...over });
const linkFor = (loanId: string, n: number, txnId: string, over: Partial<InstallmentLink> = {}): InstallmentLink => ({ id: `${loanId}:${n}:${txnId}`, loanId, installment: n, lender: 'Klarna', txnId, accountId: 'chk', expectedAmount: 100, actualAmount: 100, expectedDate: '2026-02-01', actualDate: '2026-02-01', status: 'linked', source: 'manual', pendingAtLink: false, createdAt: '2026-02-02T10:00:00.000Z', ...over });
const paymentFor = (loanId: string, id = 'pay-1', over: Partial<ManualPayment> = {}): ManualPayment => ({ id, loanId, installment: 2, amount: 100, date: '2026-03-01', source: 'cash', note: 'paid in the app', createdAt: '2026-03-01T09:00:00.000Z', ...over });
const roleFor = (loanId: string, txnId: string, over: Partial<LoanRole> = {}): LoanRole => ({ id: `${loanId}:${txnId}`, loanId, txnId, accountId: 'chk', role: 'fee', amount: -7.5, date: '2026-03-10', createdAt: '2026-03-10T09:00:00.000Z', ...over });
const feeFor = (loanId: string, id = 'adj-1'): LoanAdjustment => ({ id, loanId, kind: 'fee', amount: 12.34, date: '2026-03-05', createdAt: '2026-03-05T09:00:00.000Z' });

interface Timer { fn: () => void; ms: number; cancelled: boolean }

// One device: its storage, the four stores the screens read, and the engine joining them to the account.
function device(db: FakeDb, o: { storage?: Map<string, string>; id?: string; remote?: RemoteApi; failStorage?: () => boolean } = {}) {
  const kv = o.storage ?? new Map<string, string>();
  const storage: KeyValue = {
    get: (k) => kv.get(k) ?? null,
    set: (k, v) => {
      if (o.failStorage?.()) throw new Error('storage full');
      kv.set(k, v);
    },
    remove: (k) => void kv.delete(k),
  };
  const timers: Timer[] = [];
  const deviceId = o.id ?? 'device-a';
  const remote: RemoteApi = o.remote ?? {
    fetch: (userId) => supabaseRemote(db.client(userId), deviceId).fetch(userId),
    apply: (userId, op) => supabaseRemote(db.client(userId), deviceId).apply(userId, op),
  };
  let engineRef: ReturnType<typeof createSyncEngine>;
  const send = (entity: EntityName) => (next: unknown[]) => engineRef.save(entity, next);
  const loans = createLoanStore({ load: () => [], save: send('loan') });
  const links = createLinkStore({ load: () => [], save: send('link') });
  const payments = createPaymentStore({ load: () => ({ payments: [], adjustments: [] }), save: (d) => { send('payment')(d.payments); send('adjustment')(d.adjustments); } });
  const roles = createRoleStore({ load: () => [], save: send('role') });
  const engine = createSyncEngine({
    remote,
    storage,
    show: (v) => {
      loans.hydrate(v.loan as Loan[]);
      links.hydrate(v.link as InstallmentLink[]);
      payments.hydrate({ payments: v.payment as ManualPayment[], adjustments: v.adjustment as LoanAdjustment[] });
      roles.hydrate(v.role as LoanRole[]);
    },
    setTimer: (fn, ms) => {
      const t = { fn, ms, cancelled: false };
      timers.push(t);
      return () => void (t.cancelled = true);
    },
  });
  engineRef = engine;
  return { engine, loans, links, payments, roles, kv, storage, timers, pendingTimers: () => timers.filter((t) => !t.cancelled), runTimers: async () => { for (const t of timers.splice(0)) if (!t.cancelled) t.fn(); await engine.flush(); } };
}
type Device = ReturnType<typeof device>;

const dbRows = (db: FakeDb, table: string, userId?: string) => (db.tables[table] ?? []).filter((r) => !userId || r.user_id === userId);
const settle = async (d: Device) => { await d.engine.flush(); };

/* ------------------------------------------------------------------------------------------ creating and reading */
test('a loan created on one device is on the account and shows on another', async () => {
  const db = createFakeDb();
  const a = device(db, { id: 'phone' });
  await a.engine.start(ALICE);
  a.loans.save(klarna());
  await settle(a);

  const row = dbRows(db, 'loans', ALICE)[0];
  assert.deepEqual([row.id, row.user_id, row.amount_cents, row.installment_count, row.loan_type, row.revision, row.deleted_at], ['loan-1', ALICE, 40000, 4, 'bnpl', 1, null]); // cents, not dollars
  assert.deepEqual(dbRows(db, 'loan_bnpl_purchases', ALICE).map((r) => [r.loan_id, r.purchase_cents, r.down_payment_cents, r.merchant]), [['loan-1', 50000, 10000, 'Wayfair']]);

  const b = device(db, { id: 'laptop' });
  await b.engine.start(ALICE);
  assert.deepEqual(b.loans.get(), [klarna()]); // the whole record, purchase details and all
  assert.equal(b.engine.status().phase, 'ready');
});

test('several loans under one account, each keeping its own id', async () => {
  const db = createFakeDb();
  const a = device(db);
  await a.engine.start(ALICE);
  a.loans.save(klarna('loan-1'));
  a.loans.save(klarna('loan-2', { lender: 'Affirm', bnpl: undefined, amount: 250 }));
  a.loans.save({ id: 'loan-old', lender: 'Credit Union', item: '', amount: 9000, apr: 6.5, count: 36, frequency: 'monthly', firstDate: '2026-01-01' }); // saved before types existed
  await settle(a);
  const b = device(db);
  await b.engine.start(ALICE);
  assert.deepEqual(b.loans.get().map((l) => l.id).sort(), ['loan-1', 'loan-2', 'loan-old']);
  const old = b.loans.get().find((l) => l.id === 'loan-old')!;
  assert.equal('type' in old, false); // still unclassified, never assumed to be pay-later
  assert.equal(dbRows(db, 'loans', ALICE).find((r) => r.id === 'loan-old')?.loan_type, null);
  assert.equal(dbRows(db, 'loan_bnpl_purchases').length, 1); // only the loan with a purchase has a row
});

test('updating a loan changes it on the account and on another device after it looks again', async () => {
  const db = createFakeDb();
  const a = device(db);
  const b = device(db, { id: 'laptop' });
  await a.engine.start(ALICE);
  await b.engine.start(ALICE);
  a.loans.save(klarna());
  await settle(a);
  await b.engine.refresh();
  a.loans.save(klarna('loan-1', { item: 'Couch', apr: 12.5, bnpl: { merchant: 'Wayfair', purchaseAmount: 520 } }));
  await settle(a);
  assert.deepEqual(dbRows(db, 'loans')[0] && [dbRows(db, 'loans')[0].item, dbRows(db, 'loans')[0].apr, dbRows(db, 'loans')[0].revision], ['Couch', 12.5, 2]);
  assert.deepEqual(dbRows(db, 'loan_bnpl_purchases')[0].purchase_cents, 52000);
  await b.engine.refresh();
  assert.deepEqual(b.loans.get()[0].bnpl, { merchant: 'Wayfair', purchaseAmount: 520 });
  assert.equal(b.loans.get()[0].apr, 12.5);
});

test('removing details from a loan removes them from the account', async () => {
  const db = createFakeDb();
  const a = device(db);
  await a.engine.start(ALICE);
  a.loans.save(klarna());
  await settle(a);
  a.loans.save(klarna('loan-1', { bnpl: undefined }));
  await settle(a);
  assert.equal(dbRows(db, 'loan_bnpl_purchases').filter((r) => !r.deleted_at).length, 0);
  const b = device(db);
  await b.engine.start(ALICE);
  assert.equal(b.loans.get()[0].bnpl, undefined);
});

/* ------------------------------------------------------------------------------------------------- deleting */
test('deleting a loan leaves a tombstone and takes what hangs off it', async () => {
  const db = createFakeDb();
  const a = device(db);
  await a.engine.start(ALICE);
  a.loans.save(klarna());
  a.links.link(linkFor('loan-1', 1, 'tx-1'));
  a.payments.addPayment({ loanId: 'loan-1', installment: 2, amount: 100, date: '2026-03-01', source: 'cash' });
  await settle(a);
  a.loans.remove('loan-1');
  a.links.removeForLoan('loan-1');
  a.payments.removeForLoan('loan-1');
  await settle(a);

  const loan = dbRows(db, 'loans')[0];
  assert.equal(loan.id, 'loan-1'); // still there, as a tombstone
  assert.ok(loan.deleted_at);
  assert.equal(loan.deleted_by, 'device-a');
  for (const t of ['loan_installment_links', 'loan_manual_payments', 'loan_bnpl_purchases']) assert.ok(dbRows(db, t).every((r) => r.deleted_at), t);

  const b = device(db);
  await b.engine.start(ALICE);
  assert.deepEqual([b.loans.get().length, b.links.get().length, b.payments.get().payments.length], [0, 0, 0]);
});

test('a deleted loan is not brought back by a device that was offline', async () => {
  const db = createFakeDb();
  const a = device(db, { id: 'phone' });
  const b = device(db, { id: 'laptop' });
  await a.engine.start(ALICE);
  a.loans.save(klarna());
  a.links.link(linkFor('loan-1', 1, 'tx-1'));
  await settle(a);
  await b.engine.start(ALICE);

  db.net.down = true; // the laptop loses its connection and edits the loan, and adds a payment to it
  b.loans.save(klarna('loan-1', { item: 'Edited offline' }));
  b.payments.addPayment({ loanId: 'loan-1', installment: 2, amount: 100, date: '2026-03-01', source: 'cash' });
  await settle(b);
  db.net.down = false;

  a.loans.remove('loan-1'); // the phone deletes it
  await settle(a);

  await b.engine.refresh();
  const s = b.engine.status();
  assert.equal(b.loans.get().length, 0); // not resurrected
  assert.deepEqual(s.conflicts.map((c) => [c.entity, c.reason]), [['loan', 'deleted-elsewhere']]);
  assert.equal(s.pending, 0); // the payment that had nowhere to go is not left queued
  assert.ok(dbRows(db, 'loans')[0].deleted_at);
  assert.equal(dbRows(db, 'loan_manual_payments').length, 0);

  // The person can keep what they typed as a new loan, with a new id.
  b.engine.resolve(s.conflicts[0].id, 'restore');
  await settle(b);
  assert.equal(b.loans.get().length, 1);
  assert.notEqual(b.loans.get()[0].id, 'loan-1');
  assert.equal(b.loans.get()[0].item, 'Edited offline');
  assert.equal(dbRows(db, 'loans').filter((r) => !r.deleted_at).length, 1);
});

/* ------------------------------------------------------------------------------------ concurrent edits */
test('two devices editing the same loan: the newer wins, and the other change is kept to one side', async () => {
  const db = createFakeDb();
  const a = device(db, { id: 'phone' });
  const b = device(db, { id: 'laptop' });
  await a.engine.start(ALICE);
  a.loans.save(klarna());
  await settle(a);
  await b.engine.start(ALICE);

  db.net.down = true;
  b.loans.save(klarna('loan-1', { item: 'From the laptop' })); // made offline, on revision 1
  await settle(b);
  db.net.down = false;
  a.loans.save(klarna('loan-1', { lender: 'Klarna Inc' })); // reaches the account first
  await settle(a);

  await settle(b);
  const s = b.engine.status();
  assert.deepEqual(s.conflicts.map((c) => [c.reason, (c.mine as Loan).item]), [['changed-elsewhere', 'From the laptop']]);
  assert.equal(b.loans.get()[0].lender, 'Klarna Inc'); // the account's copy is what shows
  assert.equal(b.loans.get()[0].item, 'Sofa');
  assert.equal(dbRows(db, 'loans')[0].item, 'Sofa'); // and the account never took the stale write
  assert.equal(dbRows(db, 'loans')[0].revision, 2);

  // The person applies theirs again, on top of what is there now.
  b.engine.resolve(s.conflicts[0].id, 'reapply');
  await settle(b);
  assert.equal(dbRows(db, 'loans')[0].item, 'From the laptop');
  assert.equal(dbRows(db, 'loans')[0].revision, 3);
  assert.equal(b.engine.status().conflicts.length, 0);
});

test('an edit on top of the latest copy is applied, not treated as a clash', async () => {
  const db = createFakeDb();
  const a = device(db, { id: 'phone' });
  const b = device(db, { id: 'laptop' });
  await a.engine.start(ALICE);
  a.loans.save(klarna());
  await settle(a);
  await b.engine.start(ALICE);
  a.loans.save(klarna('loan-1', { lender: 'Klarna Inc' }));
  await settle(a);
  await b.engine.refresh(); // the laptop sees it before editing
  b.loans.save({ ...b.loans.get()[0], item: 'Both' });
  await settle(b);
  assert.deepEqual([dbRows(db, 'loans')[0].lender, dbRows(db, 'loans')[0].item, b.engine.status().conflicts.length], ['Klarna Inc', 'Both', 0]);
});

test('a payment edited on two devices follows the same rule', async () => {
  const db = createFakeDb();
  const a = device(db, { id: 'phone' });
  const b = device(db, { id: 'laptop' });
  await a.engine.start(ALICE);
  a.loans.save(klarna());
  a.payments.addPayment({ loanId: 'loan-1', installment: 2, amount: 100, date: '2026-03-01', source: 'cash' });
  await settle(a);
  await b.engine.start(ALICE);
  const id = a.payments.get().payments[0].id;
  db.net.down = true;
  b.payments.updatePayment(id, { loanId: 'loan-1', installment: 2, amount: 90, date: '2026-03-01', source: 'cash' });
  await settle(b);
  db.net.down = false;
  a.payments.updatePayment(id, { loanId: 'loan-1', installment: 2, amount: 110, date: '2026-03-01', source: 'cash' });
  await settle(a);
  await settle(b);
  assert.equal(dbRows(db, 'loan_manual_payments')[0].amount_cents, 11000);
  assert.deepEqual(b.engine.status().conflicts.map((c) => [c.entity, c.reason]), [['payment', 'changed-elsewhere']]);
  assert.equal(b.payments.get().payments[0].amount, 110);
});

/* ----------------------------------------------------------------------------- what hangs off a loan */
test('links, payments, adjustments and roles are saved and come back as they were', async () => {
  const db = createFakeDb();
  const a = device(db);
  await a.engine.start(ALICE);
  a.loans.save(klarna());
  const link = linkFor('loan-1', 1, 'tx-1', { previousTxnIds: ['tx-0'], pendingAtLink: true });
  a.links.link(link);
  a.links.reject(linkFor('loan-1', 2, 'tx-2', { status: 'rejected', source: 'suggestion' }));
  a.payments.addPayment({ loanId: 'loan-1', installment: 3, amount: 33.33, date: '2026-04-01', source: 'lender-app', note: 'part' });
  a.payments.markInstallment('loan-1', 4, 'waived', 'goodwill');
  a.payments.addFee('loan-1', 12.34, '2026-03-05');
  a.roles.assign('loan-1', { id: 'tx-fee', accountId: 'chk', date: '2026-03-10', amount: -7.5 } as Txn, 'fee');
  a.roles.assign('loan-1', { id: 'tx-back', accountId: 'chk', date: '2026-03-12', amount: 40.1 } as Txn, 'refund');
  await settle(a);

  assert.equal(dbRows(db, 'loan_installment_links', ALICE).length, 2);
  assert.deepEqual(dbRows(db, 'loan_installment_links').find((r) => r.id === link.id), { ...dbRows(db, 'loan_installment_links').find((r) => r.id === link.id)!, expected_cents: 10000, previous_txn_ids: ['tx-0'], pending_at_link: true, status: 'linked' });
  assert.deepEqual(dbRows(db, 'loan_manual_payments').map((r) => [r.amount_cents, r.source, r.note]), [[3333, 'lender-app', 'part']]);
  assert.deepEqual(dbRows(db, 'loan_adjustments').map((r) => [r.kind, r.installment, r.amount_cents]).sort(), [['fee', null, 1234], ['waived', 4, null]]);
  assert.deepEqual(dbRows(db, 'loan_transaction_roles').map((r) => [r.role, r.amount_cents]).sort(), [['fee', -750], ['refund', 4010]]);

  const b = device(db);
  await b.engine.start(ALICE);
  const same = <T,>(x: T[], y: T[], entity: EntityName) => assert.deepEqual(x.map((r) => stable(r)).sort(), y.map((r) => stable(r)).sort(), entity);
  same(b.links.get(), a.links.get(), 'link');
  same(b.payments.get().payments, a.payments.get().payments, 'payment');
  same(b.payments.get().adjustments, a.payments.get().adjustments, 'adjustment');
  same(b.roles.get(), a.roles.get(), 'role');
});

test('removing a link, and putting it back, works on the device that removed it', async () => {
  const db = createFakeDb();
  const a = device(db, { id: 'phone' });
  await a.engine.start(ALICE);
  a.loans.save(klarna());
  const link = linkFor('loan-1', 1, 'tx-1');
  a.links.link(link);
  await settle(a);
  a.links.unlink(link.id);
  await settle(a);
  assert.ok(dbRows(db, 'loan_installment_links')[0].deleted_at);
  a.links.link(link); // changed their mind
  await settle(a);
  assert.equal(dbRows(db, 'loan_installment_links')[0].deleted_at, null);
  assert.equal(a.engine.status().conflicts.length, 0);
});

test('a link deleted on another device is not put back by this one', async () => {
  const db = createFakeDb();
  const a = device(db, { id: 'phone' });
  const b = device(db, { id: 'laptop' });
  await a.engine.start(ALICE);
  a.loans.save(klarna());
  const link = linkFor('loan-1', 1, 'tx-1');
  a.links.link(link);
  await settle(a);
  await b.engine.start(ALICE);
  a.links.unlink(link.id);
  await settle(a);
  // The laptop, still showing the link, removes and re-adds it before it hears.
  db.net.down = true;
  b.links.unlink(link.id);
  b.links.link(link);
  await settle(b);
  db.net.down = false;
  await settle(b);
  assert.ok(dbRows(db, 'loan_installment_links')[0].deleted_at); // still deleted
});

test('one transaction cannot pay two installments, even from two devices', async () => {
  const db = createFakeDb();
  const a = device(db, { id: 'phone' });
  const b = device(db, { id: 'laptop' });
  await a.engine.start(ALICE);
  a.loans.save(klarna());
  await settle(a);
  await b.engine.start(ALICE);
  db.net.down = true;
  b.links.link(linkFor('loan-1', 2, 'tx-1'));
  await settle(b);
  db.net.down = false;
  a.links.link(linkFor('loan-1', 1, 'tx-1'));
  await settle(a);
  await settle(b);
  assert.equal(dbRows(db, 'loan_installment_links').filter((r) => !r.deleted_at).length, 1);
  const c = b.engine.status().conflicts;
  assert.deepEqual(c.map((x) => [x.entity, x.reason]), [['link', 'rejected']]);
  assert.match(c[0].message ?? '', /duplicate key/);
  await b.engine.refresh();
  assert.deepEqual(b.links.get().map((l) => l.installment), [1]); // the one the account holds
});

/* ---------------------------------------------------------------------------------- accounts and devices */
test('different accounts see only their own loans, and the database turns away anything else', async () => {
  const db = createFakeDb();
  const a = device(db);
  await a.engine.start(ALICE);
  a.loans.save(klarna('loan-1'));
  a.links.link(linkFor('loan-1', 1, 'tx-1'));
  await settle(a);
  const b = device(db);
  await b.engine.start(BOB);
  assert.deepEqual(b.loans.get(), []);
  b.loans.save(klarna('loan-b', { lender: 'Affirm' }));
  await settle(b);
  assert.deepEqual(a.loans.get().map((l) => l.id), ['loan-1']);
  assert.deepEqual(b.loans.get().map((l) => l.id), ['loan-b']);

  // Bob's client, asking for Alice's rows directly, gets nothing; writing to them changes nothing; naming her as owner is refused.
  const bob = db.client(BOB);
  assert.deepEqual((await bob.from('loans').select('*').eq('user_id', ALICE)).data, []);
  assert.deepEqual((await bob.from('loan_installment_links').select('*').eq('user_id', ALICE)).data, []);
  const hit = await bob.from('loans').update({ lender: 'Hacked' }).eq('user_id', ALICE).eq('id', 'loan-1').select();
  assert.deepEqual(hit.data, []);
  assert.equal(dbRows(db, 'loans', ALICE)[0].lender, 'Klarna');
  const forged = await bob.from('loans').upsert({ user_id: ALICE, id: 'loan-x', lender: 'X', amount_cents: 100, installment_count: 1, frequency: 'monthly', first_date: '2026-01-01', apr: 0, item: '' }, { onConflict: 'user_id,id' }).select();
  assert.equal(forged.error?.code, '42501');
  const stolen = await bob.from('loan_manual_payments').upsert({ user_id: BOB, id: 'p', loan_id: 'loan-1', amount_cents: 100, paid_on: '2026-01-01', source: 'cash' }, { onConflict: 'user_id,id' }).select();
  assert.equal(stolen.error?.code, '23503'); // a payment cannot be hung on a loan that is not the same user's
});

test('switching accounts clears the screen at once and never lets one person’s changes reach another', async () => {
  const db = createFakeDb();
  const d = device(db);
  await d.engine.start(ALICE);
  d.loans.save(klarna('loan-a'));
  await settle(d);
  db.net.down = true; // Alice makes a change that cannot be saved yet
  d.loans.save(klarna('loan-a', { item: 'Unsaved change' }));
  await settle(d);
  db.net.down = false;
  assert.equal(d.engine.status().pending, 1);

  d.engine.stop(); // she signs out
  assert.deepEqual(d.loans.get(), []); // gone from the screen immediately
  d.loans.save(klarna('loan-ghost')); // nothing can be saved with nobody signed in
  assert.equal(d.engine.status().owner, null);

  await d.engine.start(BOB);
  assert.deepEqual(d.loans.get(), []); // Bob sees none of Alice's
  assert.equal(d.engine.status().pending, 0);
  await settle(d);
  assert.deepEqual(dbRows(db, 'loans', BOB), []); // and her unsaved change was not applied to his account
  assert.equal(dbRows(db, 'loans', ALICE)[0].item, 'Sofa');

  // Alice comes back: her change is still waiting for her, and is saved then.
  d.engine.stop();
  await d.engine.start(ALICE);
  assert.equal(d.loans.get()[0].item, 'Unsaved change'); // shown straight away
  await settle(d);
  assert.equal(dbRows(db, 'loans', ALICE)[0].item, 'Unsaved change');
  assert.equal(d.engine.status().pending, 0);
});

test('signing out drops this device’s copy of the account’s records but keeps unsaved changes', async () => {
  const db = createFakeDb();
  const d = device(db);
  await d.engine.start(ALICE);
  d.loans.save(klarna());
  await settle(d);
  assert.ok(JSON.parse(d.kv.get(SYNC_KEY(ALICE))!).base.loan['loan-1']);
  db.net.down = true;
  d.loans.save(klarna('loan-2'));
  await settle(d);
  d.engine.stop();
  const blob = JSON.parse(d.kv.get(SYNC_KEY(ALICE))!);
  assert.equal(blob.base, undefined);
  assert.deepEqual(blob.pending.map((o: { key: string }) => o.key), ['loan-2']);
});

test('one person’s saved queue is never read for another', async () => {
  const db = createFakeDb();
  const d = device(db);
  d.kv.set(SYNC_KEY(BOB), JSON.stringify({ v: 1, owner: ALICE, pending: [{ id: 'x', entity: 'loan', kind: 'put', key: 'loan-z', record: klarna('loan-z'), baseRevision: null, queuedAt: 1, attempts: 0 }], conflicts: [] }));
  await d.engine.start(BOB);
  await settle(d);
  assert.deepEqual(dbRows(db, 'loans'), []); // a blob that names someone else is ignored
});

test('an answer that arrives after the person has changed is ignored', async () => {
  const db = createFakeDb();
  let release!: () => void;
  const slow: RemoteApi = {
    fetch: async (userId) => {
      if (userId === ALICE) await new Promise<void>((r) => (release = r));
      return supabaseRemote(db.client(userId), 'device-a').fetch(userId);
    },
    apply: (userId, op) => supabaseRemote(db.client(userId), 'device-a').apply(userId, op),
  };
  const seed = device(db);
  await seed.engine.start(ALICE);
  seed.loans.save(klarna('loan-a'));
  await settle(seed);

  const d = device(db, { remote: slow });
  const first = d.engine.start(ALICE); // Alice's answer is slow
  await Promise.resolve();
  d.engine.stop();
  await d.engine.start(BOB);
  release();
  await first;
  assert.deepEqual(d.loans.get(), []);
  assert.equal(d.engine.status().owner, BOB);
});

/* ------------------------------------------------------------------------------------------------- offline */
test('changes made offline survive a restart and are saved when the network returns', async () => {
  const db = createFakeDb();
  const kv = new Map<string, string>();
  const a = device(db, { storage: kv });
  await a.engine.start(ALICE);
  db.net.down = true;
  a.loans.save(klarna());
  a.links.link(linkFor('loan-1', 1, 'tx-1'));
  await settle(a);
  assert.deepEqual([a.engine.status().phase, a.engine.status().pending], ['offline', 2]);
  assert.deepEqual(dbRows(db, 'loans'), []);

  // The app is closed and opened again, still offline.
  const b = device(db, { storage: kv });
  await b.engine.start(ALICE);
  assert.equal(b.engine.status().phase, 'offline');
  assert.deepEqual(b.loans.get().map((l) => l.id), ['loan-1']); // shown from this device's copy
  assert.equal(b.links.get().length, 1);

  db.net.down = false;
  await b.runTimers();
  assert.deepEqual([b.engine.status().phase, b.engine.status().pending], ['ready', 0]);
  assert.equal(dbRows(db, 'loans')[0].id, 'loan-1');
  assert.equal(dbRows(db, 'loan_installment_links').length, 1);
});

test('failed sends are retried with a growing pause, and never dropped', async () => {
  const db = createFakeDb();
  const d = device(db);
  await d.engine.start(ALICE);
  db.net.failNext = 99;
  d.loans.save(klarna());
  await settle(d);
  const delays: number[] = [];
  for (let i = 0; i < 4; i++) {
    const t = d.pendingTimers().filter((x) => x.ms >= 2000);
    delays.push(t[t.length - 1].ms);
    await d.runTimers();
  }
  assert.deepEqual(delays, [2000, 4000, 8000, 16000]);
  assert.equal(d.engine.status().pending, 1); // still there
  assert.equal(d.engine.status().conflicts.length, 0);
  db.net.failNext = 0;
  await d.runTimers();
  assert.deepEqual([d.engine.status().pending, d.engine.status().phase, dbRows(db, 'loans').length], [0, 'ready', 1]);
});

test('a write that succeeded but whose reply was lost is not a conflict, and does not duplicate', async () => {
  const db = createFakeDb();
  const d = device(db);
  await d.engine.start(ALICE);
  db.net.loseReplyNext = 1;
  d.loans.save(klarna());
  await settle(d);
  assert.equal(d.engine.status().pending, 1); // it does not know it worked
  assert.equal(dbRows(db, 'loans').length, 1);
  await d.runTimers();
  assert.deepEqual([d.engine.status().pending, d.engine.status().conflicts.length, dbRows(db, 'loans').length, dbRows(db, 'loans')[0].revision], [0, 0, 1, 1]);

  // The same for an update: the account already has the new value, at a newer revision.
  db.net.loseReplyNext = 1;
  d.loans.save(klarna('loan-1', { item: 'Second' }));
  await settle(d);
  await d.runTimers();
  assert.deepEqual([d.engine.status().pending, d.engine.status().conflicts.length, dbRows(db, 'loans')[0].item, dbRows(db, 'loans')[0].revision], [0, 0, 'Second', 2]);
});

test('a change the database will never accept is shown, and does not hold up the rest', async () => {
  const db = createFakeDb();
  const d = device(db);
  await d.engine.start(ALICE);
  d.loans.save(klarna('loan-bad', { amount: 0.001 })); // rounds to zero cents: the database refuses it
  d.loans.save(klarna('loan-ok'));
  await settle(d);
  assert.deepEqual(dbRows(db, 'loans').map((r) => r.id), ['loan-ok']);
  const s = d.engine.status();
  assert.deepEqual([s.pending, s.phase, s.conflicts.map((c) => [c.entity, c.reason])], [0, 'ready', [['loan', 'rejected']]]);
  assert.equal(d.loans.get().some((l) => l.id === 'loan-bad'), false); // not left on screen as if it were saved
});

test('a device that cannot keep its own copy says so', async () => {
  const db = createFakeDb();
  let full = false;
  const d = device(db, { failStorage: () => full });
  await d.engine.start(ALICE);
  full = true;
  d.loans.save(klarna());
  assert.equal(d.engine.status().deviceCopyFailed, true);
  full = false;
  await settle(d);
  assert.equal(dbRows(db, 'loans').length, 1); // still sent
  assert.equal(d.engine.status().deviceCopyFailed, false);
});

test('reading the account again keeps changes that have not been saved yet', async () => {
  const db = createFakeDb();
  const a = device(db, { id: 'phone' });
  const b = device(db, { id: 'laptop' });
  await a.engine.start(ALICE);
  a.loans.save(klarna('loan-1'));
  await settle(a);
  await b.engine.start(ALICE);
  db.net.down = true;
  b.loans.save(klarna('loan-2')); // waiting
  await settle(b);
  db.net.down = false;
  a.loans.save(klarna('loan-3')); // arrives meanwhile
  await settle(a);
  await b.engine.refresh();
  assert.deepEqual(b.loans.get().map((l) => l.id).sort(), ['loan-1', 'loan-2', 'loan-3']);
  assert.deepEqual(dbRows(db, 'loans').map((r) => r.id).sort(), ['loan-1', 'loan-2', 'loan-3']);
});

/* -------------------------------------------------------------------------- loans saved before accounts */
const LEGACY_LOAN = { id: 'loan-old-1', lender: 'Affirm', item: 'Peloton', amount: 600, apr: 0, count: 4, frequency: 'biweekly', firstDate: '2026-01-10' };
const LEGACY_LOAN_2 = { id: 'loan-old-2', lender: 'Klarna', item: '', amount: 90, apr: 0, count: 3, frequency: 'monthly', firstDate: '2026-02-01', type: 'bnpl' };
function legacyDevice(db: FakeDb) {
  const d = device(db);
  d.kv.set('wallex-loans', JSON.stringify([LEGACY_LOAN, LEGACY_LOAN_2]));
  d.kv.set('wallex-loan-links', JSON.stringify([linkFor('loan-old-2', 1, 'tx-9'), linkFor('loan-gone', 1, 'tx-8')]));
  d.kv.set('wallex-loan-payments', JSON.stringify({ payments: [paymentFor('loan-old-1')], adjustments: [feeFor('loan-old-2')] }));
  d.kv.set('wallex-loan-roles', JSON.stringify([roleFor('loan-old-2', 'tx-7')]));
  return d;
}

test('loans saved before accounts are not anyone’s until a person asks, and signing in does not import them', async () => {
  const db = createFakeDb();
  const d = legacyDevice(db);
  await d.engine.start(ALICE);
  await settle(d);
  assert.deepEqual(d.loans.get(), []);
  assert.deepEqual(dbRows(db, 'loans'), []);
  for (const k of LEGACY_KEYS) assert.ok(d.kv.has(k), k); // untouched
  const legacy = readLegacy(d.storage)!;
  assert.deepEqual([legacy.loans.length, legacy.links.length, legacy.payments.length, legacy.adjustments.length, legacy.roles.length], [2, 1, 1, 1, 1]); // the link to a loan that is not there is left out
});

test('importing keeps every id and value, verifies the account, and only then moves the device’s copy to a backup', async () => {
  const db = createFakeDb();
  const d = legacyDevice(db);
  await d.engine.start(ALICE);
  const before = { ...Object.fromEntries(LEGACY_KEYS.map((k) => [k, d.kv.get(k)])) };

  const result = await importLegacy(d.engine, d.storage, () => new Date('2026-05-01T00:00:00Z'));
  assert.equal(result.status, 'done');
  assert.deepEqual(dbRows(db, 'loans', ALICE).map((r) => r.id).sort(), ['loan-old-1', 'loan-old-2']);
  assert.equal(dbRows(db, 'loans').find((r) => r.id === 'loan-old-1')?.loan_type, null); // not assumed to be pay-later
  assert.equal(dbRows(db, 'loans').find((r) => r.id === 'loan-old-1')?.amount_cents, 60000);
  assert.equal(dbRows(db, 'loan_installment_links').length, 1);
  assert.equal(dbRows(db, 'loan_manual_payments')[0].id, 'pay-1');
  assert.equal(dbRows(db, 'loan_transaction_roles').length, 1);
  assert.deepEqual(d.loans.get().map((l) => l.id).sort(), ['loan-old-1', 'loan-old-2']);

  for (const k of LEGACY_KEYS) assert.equal(d.kv.has(k), false, k); // moved...
  const backup = JSON.parse(d.kv.get(backupKey(ALICE))!);
  assert.deepEqual(backup.raw, before); // ...to a backup that holds exactly what was there
  assert.equal(backup.for, ALICE);
});

test('importing twice does not duplicate, and an account’s own different record is never overwritten', async () => {
  const db = createFakeDb();
  const d = legacyDevice(db);
  await d.engine.start(ALICE);
  // The account already has loan-old-2 under the same id, changed since.
  const other = device(db);
  await other.engine.start(ALICE);
  other.loans.save({ ...LEGACY_LOAN_2, lender: 'Klarna', item: 'Changed in the account' } as Loan);
  await settle(other);
  await d.engine.refresh();

  const first = await importLegacy(d.engine, d.storage);
  assert.equal(first.status, 'done');
  assert.deepEqual(first.status === 'done' && first.plan.differs.map((x) => x.key), ['loan-old-2']);
  assert.equal(dbRows(db, 'loans').find((r) => r.id === 'loan-old-2')?.item, 'Changed in the account');
  assert.equal(dbRows(db, 'loans').length, 2);

  // Put the old keys back, as if the import had been run again from the same data.
  for (const [k, v] of Object.entries(JSON.parse(d.kv.get(backupKey(ALICE))!).raw)) d.kv.set(k, v as string);
  const second = await importLegacy(d.engine, d.storage);
  assert.equal(second.status, 'done');
  assert.equal(second.status === 'done' && second.imported, 0);
  assert.equal(dbRows(db, 'loans').length, 2);
  assert.equal(dbRows(db, 'loan_installment_links').length, 1);
});

test('an import cut short leaves the device’s copy alone and can be finished later', async () => {
  const db = createFakeDb();
  let sendsFail = false;
  const remote: RemoteApi = {
    fetch: (u) => supabaseRemote(db.client(u), 'device-a').fetch(u),
    apply: (u, op) => (sendsFail ? Promise.reject(new Error('Failed to fetch')) : supabaseRemote(db.client(u), 'device-a').apply(u, op)),
  };
  const d = device(db, { remote });
  d.kv.set('wallex-loans', JSON.stringify([LEGACY_LOAN, LEGACY_LOAN_2]));
  d.kv.set('wallex-loan-links', JSON.stringify([linkFor('loan-old-2', 1, 'tx-9')]));
  await d.engine.start(ALICE);

  sendsFail = true; // the connection drops while the loans are being added
  const cut = await importLegacy(d.engine, d.storage);
  assert.equal(cut.status, 'incomplete');
  for (const k of ['wallex-loans', 'wallex-loan-links']) assert.ok(d.kv.has(k), k); // not touched
  assert.equal(d.kv.has(backupKey(ALICE)), false);
  assert.equal(d.engine.status().pending, 3); // what was added is waiting...
  assert.equal(JSON.parse(d.kv.get(SYNC_KEY(ALICE))!).pending.length, 3); // ...and survives a restart
  assert.deepEqual(dbRows(db, 'loans'), []);

  sendsFail = false;
  const again = await importLegacy(d.engine, d.storage); // run again: nothing is added twice
  assert.equal(again.status, 'done');
  assert.deepEqual(dbRows(db, 'loans').map((r) => r.id).sort(), ['loan-old-1', 'loan-old-2']);
  assert.equal(dbRows(db, 'loan_installment_links').length, 1);
  assert.equal(d.kv.has('wallex-loans'), false);
  assert.ok(d.kv.has(backupKey(ALICE)));

  // And with the network down from the start, nothing is begun at all.
  const dbDown = createFakeDb();
  dbDown.net.down = true;
  const f = device(dbDown);
  f.kv.set('wallex-loans', JSON.stringify([LEGACY_LOAN]));
  await f.engine.start(BOB);
  assert.equal((await importLegacy(f.engine, f.storage)).status, 'not-ready'); // the account has not been read
  assert.ok(f.kv.has('wallex-loans'));
});

test('an import that cannot be confirmed does not remove the device’s copy', async () => {
  const db = createFakeDb();
  const d = legacyDevice(db);
  await d.engine.start(ALICE);
  const real = d.engine.fetchNow;
  let reads = 0;
  // The account looks fine on the first read but then does not show what was sent.
  d.engine.fetchNow = async () => {
    reads += 1;
    return reads === 1 ? real() : (await real()) && { loan: {}, link: {}, payment: {}, adjustment: {}, role: {} };
  };
  const result = await importLegacy(d.engine, d.storage);
  assert.equal(result.status, 'incomplete');
  for (const k of LEGACY_KEYS) assert.ok(d.kv.has(k), k);
});

test('the plan says what is new, what is already there, and what differs', () => {
  const legacy = { loans: [klarna('a'), klarna('b'), klarna('c')], links: [], payments: [], adjustments: [], roles: [], raw: {} };
  const account = { loan: { a: { value: klarna('a'), revision: 3 }, b: { value: klarna('b', { item: 'different' }), revision: 1 } }, link: {}, payment: {}, adjustment: {}, role: {} };
  const plan = planImport(legacy, account);
  assert.deepEqual([plan.add.loan.map((l) => (l as Loan).id), plan.already, plan.differs.map((d) => d.key)], [['c'], 1, ['b']]);
});

/* ------------------------------------------------------------------------------------------------ row mapping */
test('every record survives the trip to a row and back unchanged', () => {
  const samples: [EntityName, unknown][] = [
    ['loan', klarna()],
    ['loan', { id: 'plain', lender: 'Bank', item: '', amount: 1234.56, apr: 6.125, count: 36, frequency: 'weekly', firstDate: '2026-03-02' }],
    ['link', linkFor('loan-1', 3, 'tx-3', { actualAmount: 99.99, previousTxnIds: ['a', 'b'], status: 'rejected' })],
    ['payment', paymentFor('loan-1')],
    ['payment', { id: 'p2', loanId: 'loan-1', amount: 0.01, date: '2026-01-01', source: 'other', createdAt: '' }],
    ['adjustment', feeFor('loan-1')],
    ['adjustment', { id: 'a2', loanId: 'loan-1', kind: 'canceled', installment: 2, createdAt: '' }],
    ['role', roleFor('loan-1', 'tx-1', { role: 'refund', amount: 19.99 })],
  ];
  for (const [entity, record] of samples) {
    const { main, details } = toRows(ALICE, entity, record);
    const back = fromRows(entity, { ...main, revision: 1 }, details);
    assert.ok(sameRecord(entity, back, record), `${entity} ${keyOf(entity, record)}`);
    assert.equal(main.user_id, ALICE);
  }
  assert.equal(toRows(ALICE, 'loan', klarna('x', { amount: 19.99 })).main.amount_cents, 1999); // whole cents
  assert.equal(toRows(ALICE, 'loan', klarna('x', { amount: 0.07 })).main.amount_cents, 7);
});
