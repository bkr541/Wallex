import { cadenceWord, type Confidence, type Kind, type Recurring } from './recurring';

// Wording for the Recurring screen. No calculation happens here.

export const fmt = (n: number) =>
  Number.isInteger(n) || Math.abs(n) >= 1000
    ? `$${Math.round(n).toLocaleString('en-US')}`
    : `$${n.toFixed(2)}`;

export const KIND_LABEL: Record<Kind, string> = {
  bill: 'Bill',
  debt: 'Debt Payment',
  installment: 'Installment',
  subscription: 'Subscription',
  usage: 'Subscription + Usage',
  aggregator: 'Billing Aggregator',
  habit: 'Habit',
};

// Installments are temporary and card payments settle spending that is counted elsewhere, so the list says so.
export function kindText(r: Recurring): string {
  if (r.settlement === 'card') return 'Card Payment';
  if (r.kind === 'installment') return 'Installment · Temporary';
  return KIND_LABEL[r.kind];
}

export const STATUS_LABEL: Record<Recurring['status'], string> = {
  active: 'Active',
  new: 'New',
  'possibly-ended': 'Possibly Ended',
  review: 'Needs Review',
  habit: 'Habit',
};

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  confirmed: 'High Confidence',
  likely: 'Likely Recurring',
  new: 'New Relationship',
  review: 'Needs Review',
  habit: 'Recurring Habit',
};

const UNIT: Partial<Record<Recurring['cadence'], string>> = {
  weekly: '/week',
  biweekly: ' every 2 weeks',
  quarterly: '/quarter',
  annual: '/year',
};

// The usual charge, in the form that is true for it: a figure, a range, several price points, base plus
// usage, or "Variable". A weekly or annual charge says so, so it is never mistaken for a monthly one.
export function amountText(r: Recurring): string {
  if (r.amountKind === 'variable') return r.kind === 'habit' ? r.amountLabel : 'Variable';
  const unit = r.amountKind === 'fixed' || r.amountKind === 'range' ? (UNIT[r.cadence] ?? '') : '';
  return `${r.amountLabel}${unit}`;
}

// "~$233/mo", or nothing when no honest monthly figure exists.
export const monthlyText = (r: Recurring): string | null =>
  r.monthly === null ? null : `${r.amountKind === 'fixed' && r.cadence === 'monthly' ? '' : '~'}${fmt(r.monthly)}/mo`;

// The cadence in words, with the day it usually lands on when that is known.
export function cadenceText(r: Recurring): string {
  const word = cadenceWord(r.cadence);
  if (r.cadence === 'mixed') return r.cadenceLabel.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
  return r.cadence === 'monthly' && r.cadenceLabel.startsWith('~') ? `${word} · ${r.cadenceLabel}` : word;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const dateShort = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;
export const dateLong = (iso: string) => `${dateShort(iso)}, ${iso.slice(0, 4)}`;
export const monthYear = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

// A date in another year says which year, so "Aug 23" is never mistaken for one that has passed.
const thisYear = String(new Date().getFullYear());
const withYear = (iso: string) => (iso.slice(0, 4) === thisYear ? dateShort(iso) : dateLong(iso));

export function nextText(r: Recurring): string | null {
  const n = r.nextExpected;
  if (!n) return null;
  if (!n.approx) return withYear(n.date);
  if (n.earliest === n.latest) return `Around ${withYear(n.date)}`;
  const sameMonth = n.earliest.slice(5, 7) === n.latest.slice(5, 7);
  return `Around ${withYear(n.earliest)}–${sameMonth ? Number(n.latest.slice(8, 10)) : dateShort(n.latest)}`;
}
