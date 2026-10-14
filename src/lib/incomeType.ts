import type { Txn } from './wallex';

// What kind of deposit a transaction is: pay, a cash advance, money from a person, a refund and so on. It comes from the bank's own category and from
// what the description names, so nothing is guessed from the amount. Only deposits have a type; spending returns null.

export type IncomeType = 'pay' | 'advance' | 'peer' | 'refund' | 'interest' | 'transfer' | 'other';

export const INCOME_TYPE_LABEL: Record<IncomeType, string> = {
  pay: 'Pay',
  advance: 'Cash Advance',
  peer: 'Person-to-Person',
  refund: 'Refund',
  interest: 'Interest',
  transfer: 'Transfer',
  other: 'Other',
};

// Pill colours: pay stands out, the rest are quieter.
export const INCOME_TYPE_TONE: Record<IncomeType, string> = {
  pay: 'bg-accent-soft text-accent',
  advance: 'bg-amber-300/10 text-amber-300',
  peer: 'bg-sky-300/10 text-sky-300',
  refund: 'bg-violet-300/10 text-violet-300',
  interest: 'bg-surface text-muted',
  transfer: 'bg-surface text-muted',
  other: 'bg-surface text-muted',
};

const ADVANCE = /EARNIN|EAMIN|\bDAVE\b|BRIGIT|ALBERT|MONEYLION|EMPOWER|CASH ADVANCE|KLOVER|FLOATME|\bCLIQ\b|ONE FINANCE|MYPAY|PAYCHECK ADVANCE|INSTANT ADVANCE/;
const PEER = /ZELLE|VENMO|CASH ?APP|SQUARE CASH|APPLE CASH|PAYPAL (INST XFER|TRANSFER)/;
const REFUND = /REFUND|RETURN|REVERSAL|CREDIT ADJ/;
const PAYROLL = /PAYROLL|DIRECT DEP|DIR DEP|SALARY|\bADP\b|GUSTO|PAYCHEX|WAGES/;

const cache = new WeakMap<Txn, IncomeType | null>();

export function incomeTypeOf(t: Txn): IncomeType | null {
  if (t.amount <= 0) return null;
  const hit = cache.get(t);
  if (hit !== undefined) return hit;
  const text = `${t.details.find((d) => d.label === 'Bank Description')?.value ?? ''} ${t.merchant}`.toUpperCase();
  const detail = t.categoryDetailKey;
  let type: IncomeType;
  if (detail === 'INCOME_TAX_REFUND' || REFUND.test(text)) type = 'refund';
  else if (detail === 'INCOME_INTEREST_EARNED' || detail === 'INCOME_DIVIDENDS') type = 'interest';
  else if (detail === 'TRANSFER_IN_CASH_ADVANCES_AND_LOANS' || t.categoryKey === 'LOAN_DISBURSEMENTS' || ADVANCE.test(text)) type = 'advance';
  else if (PEER.test(text)) type = 'peer';
  else if (t.categoryKey === 'INCOME' || PAYROLL.test(text)) type = 'pay';
  else if (detail.startsWith('TRANSFER_IN')) type = 'transfer';
  else type = 'other';
  cache.set(t, type);
  return type;
}

// Wages: pay from an employer, as opposed to every other kind of deposit.
export const isWages = (t: Txn) => incomeTypeOf(t) === 'pay';
