import { amountTolerance, providerMatch, resolveOptions } from './loanMatching.ts';
import type { LoanRole } from './loanRoles';
import { scheduleFor, isDate, type Loan } from './loans.ts';
import type { LoanObligationData } from './obligations';
import { RECORDED_ACCOUNT, type PatternScope } from './patterns';
import { bankEvidenceFromViews, repaymentFor } from './repayment.ts';
import { BILL_CATEGORY_OPTIONS } from './rules';
import type { Txn } from './wallex';

// What a bank transaction means to a pay-later loan, and what each report should make of it.
//
// A pay-later loan has more moving parts than a purchase: the item bought, the part paid up front, the amount financed, the
// installments (each made of principal and interest), fees, refunds, and the cash that actually leaves the bank. Counting
// the item and then every installment as spending would count the same thing twice. So three figures are kept apart:
//
//   cash out           every dollar that left the accounts, installments included. This is the existing Money out.
//   purchase spending  what was bought, when it was bought, in the category it belongs to. The principal inside an
//                      installment, and a down payment, are not spending again; interest and fees are.
//   debt               what is still owed on the loans.
//
// Nothing is guessed. A transaction is part of a loan only through a link or role the person confirmed. Payments that merely
// look like a loan's (the provider's name) are tagged "possibly pay-later" and change no total.
// Money amounts below are positive unless a Txn's own `amount` is meant.

/* ---------------------------------------------------------------------------------------------- classification */
export type BnplRole = 'purchase' | 'down-payment' | 'principal-repayment' | 'interest' | 'financing-fee' | 'refund' | 'adjustment' | 'unclassified';

export const BNPL_ROLE_LABEL: Record<BnplRole, string> = {
  purchase: 'Pay-Later Purchase',
  'down-payment': 'Pay-Later Down Payment',
  'principal-repayment': 'Pay-Later Repayment',
  interest: 'Pay-Later Interest',
  'financing-fee': 'Pay-Later Fee',
  refund: 'Pay-Later Refund',
  adjustment: 'Pay-Later Adjustment',
  unclassified: 'Possibly Pay-Later',
};

export interface BnplPart { role: BnplRole; amount: number }

export interface BnplClass {
  txnId: string;
  loanId?: string; // absent for "possibly pay-later"
  installment?: number;
  primary: BnplRole; // the part that names the transaction
  parts: BnplPart[]; // what it is made of; the amounts add up to the transaction
  confirmed: boolean; // the person linked it, as against a likeness Wallex noticed
  basis: 'installment-link' | 'recorded-role' | 'refund-of-linked-payment' | 'provider-name';
  represented: boolean; // its loan's purchase is counted as a purchase, so the principal in it is not spending again
}

const cents = (n: number) => Math.round(n * 100) / 100;
const sumOf = (c: BnplClass, ...roles: BnplRole[]) => cents(c.parts.filter((p) => roles.includes(p.role)).reduce((s, p) => s + p.amount, 0));

/* -------------------------------------------------------------------------------------------- the loan's purchase */
// A loan's purchase is counted as spending when the person has said what it was and when: a price and a date. Without
// both, the installments are all there is to go on, so they keep counting as they always did.
export const isRepresented = (loan: Loan) => loan.type === 'bnpl' && !!loan.bnpl?.purchaseDate && isDate(loan.bnpl.purchaseDate) && (loan.bnpl.purchaseAmount ?? 0) > 0;

const LABELS: Record<string, string> = {
  GENERAL_MERCHANDISE: 'General Merchandise',
  HOME_IMPROVEMENT: 'Home Improvement',
  TRAVEL: 'Travel',
  ENTERTAINMENT: 'Entertainment',
  MEDICAL: 'Medical',
  FOOD_AND_DRINK: 'Food & Drink',
  PERSONAL_CARE: 'Personal Care',
  TRANSPORTATION: 'Transportation',
  GENERAL_SERVICES: 'General Services',
};
const WORDS: [RegExp, string][] = [
  [/furnit|home|garden|appliance|improv|decor/, 'HOME_IMPROVEMENT'],
  [/travel|flight|hotel|vacation|airline|cruise/, 'TRAVEL'],
  [/entertain|ticket|concert|game|movie/, 'ENTERTAINMENT'],
  [/medical|dental|health|vision|pharm/, 'MEDICAL'],
  [/food|grocer|restaurant|dining/, 'FOOD_AND_DRINK'],
  [/beauty|salon|personal care/, 'PERSONAL_CARE'],
  [/cloth|apparel|fashion|shoe|electronic|computer|laptop|phone|shopping|merchandise|retail|general/, 'GENERAL_MERCHANDISE'],
];

// The category a typed-in purchase category stands for, by the same keys the bank's categories use, so a purchase lands
// with the others of its kind. Something Wallex does not recognise keeps its own name as its own category.
export function purchaseCategory(text: string | undefined): { key: string; label: string } {
  const t = (text ?? '').trim();
  if (!t) return { key: 'UNCATEGORIZED', label: 'Uncategorized' };
  const option = BILL_CATEGORY_OPTIONS.find((o) => o.label.toLowerCase() === t.toLowerCase() || o.key.toLowerCase() === t.toLowerCase().replace(/[^a-z]+/g, '_'));
  const key = option?.key ?? WORDS.find(([re]) => re.test(t.toLowerCase()))?.[1];
  if (key) return { key, label: LABELS[key] ?? option?.label ?? t };
  return { key: `CUSTOM_${t.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`, label: t };
}

function recordedPurchase(loan: Loan): Txn {
  const b = loan.bnpl!;
  const cat = purchaseCategory(b.category);
  const id = `recorded-purchase:${loan.id}`;
  return {
    id,
    accountId: RECORDED_ACCOUNT, // not in any bank account: it moves no cash
    date: b.purchaseDate!,
    authorizedDate: null,
    merchant: b.merchant || loan.item || `${loan.lender} purchase`,
    logos: [],
    category: cat.label,
    categoryKey: cat.key,
    categoryDetailKey: '',
    channel: 'Recorded',
    pending: false,
    amount: -cents(b.purchaseAmount!),
    details: [
      { label: 'Source', value: 'Recorded in Loans. This is not a bank transaction.' },
      { label: 'Loan', value: `${loan.lender}${loan.item ? ` · ${loan.item}` : ''}` },
      { label: 'Amount Financed', value: `$${loan.amount.toFixed(2)}` },
      ...(b.downPayment ? [{ label: 'Down Payment', value: `$${b.downPayment.toFixed(2)}` }] : []),
      { label: 'Transaction ID', value: id },
    ],
  };
}

/* ------------------------------------------------------------------------------------------------ the ledger */
export interface LoanReport {
  loanId: string;
  lender: string;
  represented: boolean; // its purchase is counted as spending
  purchaseTxnId: string | null; // the bank charge confirmed as the purchase
  purchaseAmount: number | null;
  financed: number;
  downPayment: number | null;
  principalPaid: number; // principal in confirmed bank payments, whatever the loan's state
  interestPaid: number;
  feesPaid: number;
  outstanding: number; // estimated principal still owed: not a payoff figure from the lender
  notes: string[]; // things that cannot be told apart yet
}

export interface BnplLedger {
  active: boolean; // there is at least one pay-later loan
  classes: Map<string, BnplClass>;
  loans: Map<string, LoanReport>;
  purchases: Txn[]; // purchases recorded in Loans that have no bank transaction
}

export const NO_BNPL: BnplLedger = { active: false, classes: new Map(), loans: new Map(), purchases: [] };
const EMPTY = NO_BNPL;

export function buildBnplLedger(txns: Txn[], data: LoanObligationData | null | undefined, today: string): BnplLedger {
  const bnplLoans = (data?.loans ?? []).filter((l) => l.type === 'bnpl');
  if (!data || !bnplLoans.length) return EMPTY;

  const loanById = new Map(bnplLoans.map((l) => [l.id, l]));
  const byId = new Map(txns.map((t) => [t.id, t]));
  const classes = new Map<string, BnplClass>();
  const options = resolveOptions();
  const represented = new Map(bnplLoans.map((l) => [l.id, isRepresented(l)]));

  // 1. Installment payments the person linked. Each is split the way the schedule splits an installment: interest first,
  //    then principal, so two part payments of one installment add up to the whole.
  const links = data.links.filter((l) => l.status === 'linked' && loanById.has(l.loanId) && byId.get(l.txnId)?.amount! < 0);
  const groups = new Map<string, typeof links>();
  for (const l of links) groups.set(`${l.loanId}:${l.installment}`, [...(groups.get(`${l.loanId}:${l.installment}`) ?? []), l]);
  for (const group of groups.values()) {
    const loan = loanById.get(group[0].loanId)!;
    const inst = scheduleFor(loan)[group[0].installment - 1];
    let interestLeft = inst?.interest ?? 0;
    let principalLeft = inst?.principal ?? 0;
    for (const l of [...group].sort((a, b) => byId.get(a.txnId)!.date.localeCompare(byId.get(b.txnId)!.date) || a.txnId.localeCompare(b.txnId))) {
      const t = byId.get(l.txnId)!;
      const paid = cents(-t.amount);
      const interest = cents(Math.min(paid, interestLeft));
      interestLeft = cents(interestLeft - interest);
      const principal = cents(Math.min(paid - interest, principalLeft));
      principalLeft = cents(principalLeft - principal);
      const rest = cents(paid - interest - principal); // more than the installment asks for: not split any further
      const parts: BnplPart[] = [
        { role: 'principal-repayment' as const, amount: principal },
        { role: 'interest' as const, amount: interest },
        { role: 'adjustment' as const, amount: rest },
      ].filter((p) => p.amount > 0);
      classes.set(t.id, {
        txnId: t.id,
        loanId: loan.id,
        installment: l.installment,
        primary: principal > 0 ? 'principal-repayment' : interest > 0 ? 'interest' : 'adjustment',
        parts,
        confirmed: true,
        basis: 'installment-link',
        represented: represented.get(loan.id)!,
      });
    }
  }

  // 2. Transactions the person gave a role in a loan. A transaction already linked as an installment keeps that.
  const purchaseTxn = new Map<string, string>();
  for (const r of (data.roles ?? []) as LoanRole[]) {
    const t = byId.get(r.txnId);
    const loan = loanById.get(r.loanId);
    if (!t || !loan || classes.has(t.id)) continue;
    const amount = cents(Math.abs(t.amount));
    const role: BnplRole = r.role === 'fee' ? 'financing-fee' : r.role;
    if (r.role === 'purchase') purchaseTxn.set(loan.id, t.id);
    classes.set(t.id, { txnId: t.id, loanId: loan.id, primary: role, parts: [{ role, amount }], confirmed: true, basis: 'recorded-role', represented: represented.get(loan.id)! });
  }

  // 3. A refund that came back for a payment the person linked. The payment is confirmed; that this money in is its
  //    refund is only judged from the lender, account and amount, so it is not marked confirmed.
  for (const v of data.views) {
    if (!loanById.has(v.link.loanId)) continue;
    for (const r of v.refunds) {
      if (classes.has(r.id)) continue;
      classes.set(r.id, { txnId: r.id, loanId: v.link.loanId, installment: v.link.installment, primary: 'refund', parts: [{ role: 'refund', amount: cents(r.amount) }], confirmed: false, basis: 'refund-of-linked-payment', represented: represented.get(v.link.loanId)! });
    }
  }

  // 4. Anything else from a lender that has a loan here: noted, never counted as the loan's.
  for (const t of txns) {
    if (classes.has(t.id) || t.categoryDetailKey.startsWith('TRANSFER_')) continue;
    if (!bnplLoans.some((l) => providerMatch(l.lender, t))) continue;
    classes.set(t.id, { txnId: t.id, primary: 'unclassified', parts: [{ role: 'unclassified', amount: cents(Math.abs(t.amount)) }], confirmed: false, basis: 'provider-name', represented: false });
  }

  // Each loan's own figures and, where its purchase is spending, the purchase to put in the spending view.
  const loans = new Map<string, LoanReport>();
  const purchases: Txn[] = [];
  const evidenceByLoan = new Map(bnplLoans.map((l) => [l.id, repaymentFor({ loan: l, asOf: today, bank: bankEvidenceFromViews(data.views, l.id), manual: data.payments.payments, adjustments: data.payments.adjustments })]));
  for (const loan of bnplLoans) {
    const mine = [...classes.values()].filter((c) => c.loanId === loan.id && c.confirmed);
    const inBank = purchaseTxn.get(loan.id) ?? null;
    const notes: string[] = [];
    const b = loan.bnpl;
    if (represented.get(loan.id)) {
      if (b?.downPayment && !mine.some((c) => c.primary === 'down-payment')) notes.push('The down payment is counted inside the purchase. If it also shows in your bank, link it so it is not counted twice.');
      if (b?.purchaseAmount !== undefined && b.downPayment !== undefined && Math.abs(b.purchaseAmount - (loan.amount + b.downPayment)) > amountTolerance(loan.amount, options)) notes.push('The purchase price is not the amount financed plus the down payment.');
      if (!inBank) purchases.push(recordedPurchase(loan));
    }
    loans.set(loan.id, {
      loanId: loan.id,
      lender: loan.lender,
      represented: represented.get(loan.id)!,
      purchaseTxnId: inBank,
      purchaseAmount: b?.purchaseAmount ?? null,
      financed: loan.amount,
      downPayment: b?.downPayment ?? null,
      principalPaid: cents(mine.reduce((s, c) => s + sumOf(c, 'principal-repayment'), 0)),
      interestPaid: cents(mine.reduce((s, c) => s + sumOf(c, 'interest'), 0)),
      feesPaid: cents(mine.reduce((s, c) => s + sumOf(c, 'financing-fee'), 0)),
      outstanding: evidenceByLoan.get(loan.id)!.principalRemaining,
      notes,
    });
  }
  return { active: true, classes, loans, purchases };
}

/* ----------------------------------------------------------------------------------------------- the two views */
// The part of a transaction that is not spending again: the principal inside an installment, and a down payment, of a loan
// whose purchase is counted. It is still cash that left, so Money out keeps it.
const notSpendingAgain = (c: BnplClass | undefined) => (c && c.confirmed && c.represented && c.loanId ? sumOf(c, 'principal-repayment', 'down-payment') : 0);

// The transactions as a spending report should see them. For every loan whose purchase is counted, installments are cut
// back to their interest (and fees) and the down payment drops out, and the purchase itself is added on its own day. The
// bank's own transactions are not changed; this is a derived list. With no pay-later loans it is the list it was given.
export function spendingView(txns: Txn[], ledger: BnplLedger): Txn[] {
  if (!ledger.active || (!ledger.purchases.length && ![...ledger.classes.values()].some((c) => notSpendingAgain(c) > 0))) return txns;
  const out: Txn[] = [];
  for (const t of txns) {
    const gone = t.amount < 0 ? notSpendingAgain(ledger.classes.get(t.id)) : 0;
    if (!gone) {
      out.push(t);
      continue;
    }
    // A payment with nothing left to count stays in the list at zero, so the bank's history still reaches back as far as it did.
    const left = cents(-t.amount - gone);
    out.push({ ...t, amount: left > 0.004 ? -left : 0 });
  }
  return [...out, ...ledger.purchases];
}

// Whether money in a transaction is already represented somewhere else, so a report need not count it again.
export const isRepresentedElsewhere = (ledger: BnplLedger, txnId: string) => notSpendingAgain(ledger.classes.get(txnId)) > 0;

/* ------------------------------------------------------------------------------------------------- summary */
export interface BnplSummary {
  active: boolean;
  cashOut: number; // what left the accounts, installments included (Money out)
  purchaseSpending: number; // what was bought, counted once (the spending view)
  // How the second follows from the first, to the cent.
  lessPrincipal: number; // principal inside installments of loans whose purchase is counted
  lessDownPayments: number; // down payments inside those purchases
  plusRecordedPurchases: number; // purchases recorded in Loans with no bank transaction
  repaymentCash: number; // installments paid in the period
  principalRepaid: number;
  interest: number;
  fees: number;
  adjustments: number;
  purchases: number; // pay-later purchases made in the period, recorded or in the bank
  financed: number; // financed by the loans purchased in the period
  refunds: number; // money back on pay-later loans
  unclassified: { count: number; amount: number }; // from a lender with a loan here but not linked: counted as ordinary spending
  outstanding: number; // estimated principal still owed on every pay-later loan
}

export function bnplSummary(txns: Txn[], ledger: BnplLedger, scope: PatternScope, from: string, to: string): BnplSummary {
  const inRange = (t: Txn) => t.date >= from && t.date <= to && scope.accountOk(t);
  const spending = (list: Txn[]) => cents(list.filter((t) => inRange(t) && scope.isSpending(t)).reduce((s, t) => s - t.amount, 0));
  const view = spendingView(txns, ledger);

  const out: BnplSummary = {
    active: ledger.active,
    cashOut: spending(txns),
    purchaseSpending: spending(view),
    lessPrincipal: 0,
    lessDownPayments: 0,
    plusRecordedPurchases: spending(ledger.purchases),
    repaymentCash: 0,
    principalRepaid: 0,
    interest: 0,
    fees: 0,
    adjustments: 0,
    purchases: 0,
    financed: 0,
    refunds: 0,
    unclassified: { count: 0, amount: 0 },
    outstanding: cents([...ledger.loans.values()].reduce((s, l) => s + l.outstanding, 0)),
  };
  if (!ledger.active) return out;

  const purchased = new Set<string>();
  for (const t of txns) {
    const c = ledger.classes.get(t.id);
    if (!c || !inRange(t)) continue;
    if (c.primary === 'unclassified') {
      out.unclassified.count += 1;
      if (t.amount < 0 && scope.isSpending(t)) out.unclassified.amount = cents(out.unclassified.amount + -t.amount);
      continue;
    }
    if (c.primary === 'refund') {
      if (t.amount > 0) out.refunds = cents(out.refunds + t.amount);
      continue;
    }
    if (t.amount >= 0 || !scope.isSpending(t)) continue; // not cash out under the person's rules
    if (c.basis === 'installment-link') {
      out.repaymentCash = cents(out.repaymentCash + -t.amount);
      out.principalRepaid = cents(out.principalRepaid + sumOf(c, 'principal-repayment'));
      out.interest = cents(out.interest + sumOf(c, 'interest'));
      out.adjustments = cents(out.adjustments + sumOf(c, 'adjustment'));
    }
    if (c.primary === 'financing-fee') out.fees = cents(out.fees + sumOf(c, 'financing-fee'));
    if (c.primary === 'adjustment' && c.basis === 'recorded-role') out.adjustments = cents(out.adjustments + sumOf(c, 'adjustment'));
    if (c.primary === 'purchase') {
      out.purchases = cents(out.purchases + -t.amount);
      if (c.loanId) purchased.add(c.loanId);
    }
    const gone = notSpendingAgain(c);
    if (c.primary === 'down-payment') out.lessDownPayments = cents(out.lessDownPayments + gone);
    else out.lessPrincipal = cents(out.lessPrincipal + gone);
  }
  for (const p of ledger.purchases) {
    if (!inRange(p) || !scope.isSpending(p)) continue;
    out.purchases = cents(out.purchases + -p.amount);
    purchased.add(p.id.replace('recorded-purchase:', ''));
  }
  for (const id of purchased) out.financed = cents(out.financed + (ledger.loans.get(id)?.financed ?? 0));
  return out;
}

export const hasPayLaterActivity = (s: BnplSummary) => s.active && (s.repaymentCash > 0 || s.purchases > 0 || s.fees > 0 || s.refunds > 0 || s.unclassified.count > 0);

// For a transaction's row: what it is, in a few words, and the lender it belongs to.
export function bnplTag(ledger: BnplLedger, txnId: string): { label: string; full: string; detail: string; confirmed: boolean } | null {
  const c = ledger.classes.get(txnId);
  if (!c) return null;
  const lender = c.loanId ? ledger.loans.get(c.loanId)?.lender : undefined;
  const parts = c.parts.filter((p) => p.role !== 'unclassified' && p.amount > 0);
  const split = parts.length > 1 ? parts.map((p) => `$${p.amount.toFixed(2)} ${p.role === 'principal-repayment' ? 'principal' : p.role === 'financing-fee' ? 'fee' : p.role}`).join(', ') : '';
  const full = c.basis === 'installment-link' ? 'Pay-Later Repayment' : BNPL_ROLE_LABEL[c.primary];
  // Short enough for a table cell; the full wording is in the row's details.
  const label = c.primary === 'unclassified' ? 'Maybe BNPL' : `BNPL ${c.basis === 'installment-link' ? 'Repayment' : c.primary === 'down-payment' ? 'Down Payment' : c.primary === 'financing-fee' ? 'Fee' : c.primary === 'purchase' ? 'Purchase' : c.primary === 'refund' ? 'Refund' : 'Adjustment'}`;
  return { label, full, detail: [c.confirmed ? '' : 'Not confirmed', lender, split].filter(Boolean).join(' · '), confirmed: c.confirmed };
}

