/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

// Loans saved before accounts sat in localStorage under one key, shared by whoever used the device. A stand-in for it is put there
// before the module loads, to show it is never read as anyone's loans (the account is the record now: see loanSync.ts).
const device = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => device.get(k) ?? null,
  setItem: (k: string, v: string) => void device.set(k, v),
  removeItem: (k: string) => void device.delete(k),
};

const LEGACY = [
  { id: 'loan-old-1', lender: 'Affirm', item: 'Peloton', amount: 600, apr: 0, count: 4, frequency: 'biweekly', firstDate: '2026-01-10' },
  { id: 'loan-old-2', lender: 'Credit Union', item: '', amount: 12000, apr: 6.5, count: 48, frequency: 'monthly', firstDate: '2026-02-01' },
];
device.set('wallex-loans', JSON.stringify(LEGACY));

const loans = await import('./loans.ts');
const { createLoanStore, normalizeLoan, normalizeLoans, paymentFor, scheduleFor, statusFor, suggestedLoanType, addPeriods, newLoanId } = loans;
type Loan = ReturnType<typeof normalizeLoans>[number];

// A store whose records are saved to memory, started with the loans the person had before types existed (as an import
// of the device's old loans would hand them over).
const repo = { saved: normalizeLoans(LEGACY), load: () => repo.saved, save: (l: Loan[]) => void (repo.saved = l) };
const loanStore = createLoanStore(repo);
const { get: getLoans, save: saveLoan, remove: removeLoan } = loanStore;
const stored = () => repo.saved as unknown as Record<string, unknown>[];

test('loans saved on the device before accounts are never loaded as the signed-in person’s', () => {
  assert.deepEqual(loans.getLoans(), []); // the module's own store starts empty
  assert.equal(device.get('wallex-loans'), JSON.stringify(LEGACY)); // and does not touch the device's copy
  loans.saveLoan({ id: 'x', lender: 'L', item: '', amount: 10, apr: 0, count: 1, frequency: 'monthly', firstDate: '2026-01-01' }); // no sink: goes nowhere
  loans.removeLoan('x');
  assert.equal(device.get('wallex-loans'), JSON.stringify(LEGACY));
});

test('a store can be replaced with the account’s copy without writing it back', () => {
  const written: Loan[][] = [];
  const s = createLoanStore({ load: () => [], save: (l) => void written.push(l) });
  let calls = 0;
  const off = s.subscribe(() => void calls++);
  s.hydrate(normalizeLoans(LEGACY));
  assert.deepEqual([s.get().length, written.length, calls], [2, 0, 1]);
  s.save({ ...s.get()[0], item: 'changed' });
  assert.deepEqual([written.length, calls], [1, 2]);
  s.hydrate([]);
  off();
  assert.deepEqual(s.get(), []);
});

test('loans saved before types existed load unchanged and stay unclassified', () => {
  const [a, b] = getLoans();
  assert.equal(getLoans().length, 2);
  assert.deepEqual(a, LEGACY[0]);
  assert.deepEqual(b, LEGACY[1]);
  assert.equal(a.type, undefined);
  assert.equal(a.bnpl, undefined);
  assert.equal('type' in a, false);
});

test('reading old loans never rewrites what was stored', () => {
  assert.deepEqual(normalizeLoans(LEGACY), LEGACY);
  assert.equal(device.get('wallex-loans'), JSON.stringify(LEGACY));
});

const base = { item: '', apr: 0, count: 4, frequency: 'monthly' as const, firstDate: '2026-03-01' };

test('a legacy loan from a pay-later provider is suggested as pay-later but not classified', () => {
  assert.equal(suggestedLoanType('Affirm'), 'bnpl');
  assert.equal(suggestedLoanType(' klarna '), 'bnpl');
  assert.equal(suggestedLoanType('Zip'), 'bnpl');
  assert.equal(suggestedLoanType('Credit Union'), undefined);
  assert.equal(suggestedLoanType(''), undefined);
  assert.equal(getLoans()[0].type, undefined);
});

test('normalizing fills in defaults for old records and drops unusable ones', () => {
  const out = normalizeLoans([
    { id: 'a', lender: 'X', amount: '250', count: '5.4', firstDate: '2026-05-05' },
    { id: 'b', lender: 'X', amount: 0, count: 3, firstDate: '2026-05-05' },
    { id: 'c', lender: 'X', amount: 10, count: 3, firstDate: 'soon' },
    { lender: 'X', amount: 10, count: 3, firstDate: '2026-05-05' },
    null,
    'text',
  ]);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0], { id: 'a', lender: 'X', item: '', amount: 250, apr: 0, count: 5, frequency: 'monthly', firstDate: '2026-05-05' });
  assert.deepEqual(normalizeLoans({ not: 'a list' }), []);
});

test('an unknown type is ignored rather than read as a loan type', () => {
  assert.equal(normalizeLoan({ ...LEGACY[0], type: 'payday' })?.type, undefined);
  assert.equal(normalizeLoan({ ...LEGACY[0], type: 'auto' })?.type, 'auto');
});

test('each loan type can be created and is stored with the loan', () => {
  for (const type of ['bnpl', 'personal', 'auto', 'other'] as const) {
    const loan: Loan = { ...base, id: `new-${type}`, lender: `Lender ${type}`, amount: 1000, type };
    saveLoan(loan);
    assert.equal(getLoans().find((l) => l.id === loan.id)?.type, type);
    assert.equal(stored().find((l) => l.id === loan.id)?.type, type);
  }
  assert.equal(getLoans().length, 6);
});

test('pay-later purchase details are stored, and empty ones stay empty', () => {
  const bnpl = { merchant: 'Peloton', category: 'Shopping', purchaseDate: '2026-02-20', purchaseAmount: 800, downPayment: 200, planId: 'AF-123' };
  saveLoan({ ...base, id: 'bnpl-full', lender: 'Affirm', item: 'Bike', amount: 600, type: 'bnpl', bnpl });
  saveLoan({ ...base, id: 'bnpl-bare', lender: 'Klarna', amount: 90, type: 'bnpl' });

  const full = getLoans().find((l) => l.id === 'bnpl-full')!;
  assert.deepEqual(full.bnpl, bnpl);
  assert.equal(full.amount, 600); // still the amount financed, not the price
  assert.equal(full.item, 'Bike'); // the purchase description

  const bare = getLoans().find((l) => l.id === 'bnpl-bare')!;
  assert.equal(bare.bnpl, undefined);
  assert.equal('bnpl' in (stored().find((l) => l.id === 'bnpl-bare') ?? {}), false);
});

test('pay-later details read back from storage are cleaned, with nothing invented', () => {
  const loan = normalizeLoan({
    ...LEGACY[0],
    type: 'bnpl',
    bnpl: { merchant: '  Best Buy ', category: '', purchaseDate: 'yesterday', purchaseAmount: -5, downPayment: 0, planId: 7 },
  })!;
  assert.deepEqual(loan.bnpl, { merchant: 'Best Buy', downPayment: 0 });
  assert.equal(normalizeLoan({ ...LEGACY[0], type: 'bnpl', bnpl: { merchant: '' } })?.bnpl, undefined);
  assert.equal(normalizeLoan({ ...LEGACY[0], bnpl: 'x' })?.bnpl, undefined);
});

test('installment maths is the same for every type', () => {
  const plain = { ...base, amount: 600, count: 12, apr: 9, frequency: 'monthly' as const };
  assert.equal(paymentFor(plain), 52.47);
  const even = { ...base, amount: 600, count: 4, apr: 0, frequency: 'biweekly' as const };
  assert.equal(paymentFor(even), 150);

  for (const type of [undefined, 'bnpl', 'personal', 'auto', 'other'] as const) {
    const loan: Loan = { ...plain, id: 'm', lender: 'L', ...(type ? { type } : {}) };
    const s = scheduleFor(loan);
    assert.equal(s.length, 12);
    assert.equal(s[0].payment, 52.47);
    assert.equal(s[11].balance, 0);
    assert.equal(s[0].date, '2026-03-01');
    assert.equal(s[11].date, '2027-02-01');
  }
});

test('legacy loans keep their schedule and status', () => {
  const [a, b] = getLoans();
  const sa = statusFor(a, '2026-01-25');
  assert.equal(sa.payment, 150);
  assert.equal(sa.paid, 2); // Jan 10 and Jan 24
  assert.equal(sa.remaining, 300);
  assert.equal(sa.next?.date, '2026-02-07');
  assert.equal(sa.payoffDate, '2026-02-21');
  assert.equal(sa.done, false);

  const sb = statusFor(b, '2026-01-01');
  assert.equal(sb.notStarted, true);
  assert.equal(sb.remaining, 12000);
  assert.equal(sb.payment, paymentFor(b));
  assert.equal(scheduleFor(b).length, 48);
  assert.equal(statusFor(a, '2027-01-01').done, true);
});

test('dates step by the loan frequency', () => {
  assert.equal(addPeriods('2026-01-31', 'monthly', 1), '2026-02-28');
  assert.equal(addPeriods('2026-01-10', 'weekly', 2), '2026-01-24');
  assert.equal(addPeriods('2026-01-10', 'biweekly', 1), '2026-01-24');
});

test('editing a legacy loan keeps its id and values, and classifying it only adds the type', () => {
  const before = getLoans().find((l) => l.id === 'loan-old-1')!;
  const count = getLoans().length;
  saveLoan({ ...before, type: 'bnpl' });
  const after = getLoans().find((l) => l.id === 'loan-old-1')!;
  assert.equal(getLoans().length, count);
  assert.deepEqual({ ...after, type: undefined }, { ...before, type: undefined });
  assert.equal(after.type, 'bnpl');

  saveLoan({ ...after, apr: 3, item: 'Treadmill' });
  const edited = getLoans().find((l) => l.id === 'loan-old-1')!;
  assert.equal(edited.apr, 3);
  assert.equal(edited.item, 'Treadmill');
  assert.equal(edited.type, 'bnpl');
  assert.equal(edited.amount, 600);

  // The other legacy loan is untouched, and still unclassified.
  assert.deepEqual(getLoans().find((l) => l.id === 'loan-old-2'), LEGACY[1]);
});

test('editing a new loan can change its type and details', () => {
  const loan = getLoans().find((l) => l.id === 'bnpl-full')!;
  saveLoan({ ...loan, type: 'personal', bnpl: loan.bnpl });
  assert.equal(getLoans().find((l) => l.id === 'bnpl-full')?.type, 'personal');
  assert.equal(getLoans().find((l) => l.id === 'bnpl-full')?.bnpl?.merchant, 'Peloton');
});

test('deleting removes only the chosen loan, old or new, and saves the list', () => {
  const total = getLoans().length;
  removeLoan('loan-old-2');
  removeLoan('new-auto');
  removeLoan('no-such-loan');
  assert.equal(getLoans().length, total - 2);
  assert.equal(getLoans().some((l) => l.id === 'loan-old-2' || l.id === 'new-auto'), false);
  assert.equal(stored().length, total - 2);
  assert.ok(getLoans().some((l) => l.id === 'loan-old-1'));
});

test('new ids do not repeat', () => {
  assert.notEqual(newLoanId(), newLoanId());
});
