import { faviconUrl } from './favicon';
import { analyze, merchantOf, type Analysis, type Recurring } from './recurring';
import type { LinkedAccount, Txn } from './wallex';

// Turns transactions into the circles on the Patterns page: bills, merchants and categories,
// each as a monthly amount compared against monthly income.

export type View = 'all' | 'bills' | 'merchants' | 'categories';

export interface PatternFilters {
  days: 30 | 60 | 90 | 180 | 365; // how far back to look; amounts are averaged to a month
  account: 'all' | 'checking' | 'credit';
  categories: string[]; // Plaid primary categories; empty means all
  minAmount: number; // monthly dollars
}

export const DEFAULT_FILTERS: PatternFilters = { days: 30, account: 'all', categories: [], minAmount: 0 };

export interface Bubble {
  key: string;
  name: string;
  amount: number; // per month
  total: number; // dollars over the analysed period
  count: number;
  rgb: string; // "r, g, b"
  logos: string[];
  iconKey?: string; // used instead of logos when set
  badge: string; // cadence, or the number of charges
  kind: 'bill' | 'merchant' | 'category';
  categoryKey: string;
  noun: 'visits' | 'purchases' | 'payments' | 'transactions'; // what one charge is called
  classLabel?: string; // "Subscription", "Recurring obligation"... only when Wallex really knows
  recurringMonthly?: number | null; // the Recurring tab's estimate for the same relationship, per month
}

export interface PatternData {
  income: number; // per month
  scope: PatternScope; // the period and filters every number above was worked out with
  hasCredit: boolean;
  bills: Bubble[];
  merchants: Bubble[];
  categories: Bubble[];
  categoryOptions: { key: string; label: string }[];
}

// One color per Plaid primary category, so a category keeps its color as amounts change.
export const CATEGORY_COLORS: Record<string, string> = {
  RENT_AND_UTILITIES: '74, 214, 130',
  LOAN_PAYMENTS: '79, 140, 255',
  FOOD_AND_DRINK: '255, 152, 67',
  GENERAL_MERCHANDISE: '250, 204, 21',
  TRANSPORTATION: '45, 212, 191',
  ENTERTAINMENT: '255, 110, 170',
  PERSONAL_CARE: '168, 130, 255',
  MEDICAL: '244, 114, 94',
  TRAVEL: '56, 189, 248',
  HOME_IMPROVEMENT: '163, 230, 53',
  GENERAL_SERVICES: '251, 146, 60',
  BANK_FEES: '239, 68, 68',
  GOVERNMENT_AND_NON_PROFIT: '129, 140, 248',
  TRANSFER_OUT: '148, 163, 184',
};
const FALLBACK_COLOR = '148, 163, 184';

// Merchants and bills get a stable color from their name.
const PALETTE = [
  '79, 140, 255',
  '74, 214, 130',
  '255, 152, 67',
  '168, 130, 255',
  '255, 110, 170',
  '45, 212, 191',
  '250, 204, 21',
  '56, 189, 248',
  '244, 114, 94',
  '163, 230, 53',
  '129, 140, 248',
  '251, 146, 60',
];

const colorFor = (key: string) => {
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return PALETTE[hash % PALETTE.length];
};

const SHORT_NAMES: Record<string, string> = {
  'General Merchandise': 'Shopping',
  'Rent & Utilities': 'Rent & Bills',
  'Government & Non Profit': 'Government',
  'General Services': 'Services',
  'Home Improvement': 'Home',
  'Loan Payments': 'Loans',
  'Transfer Out': 'Transfers',
};
export const categoryName = (label: string) => SHORT_NAMES[label] ?? label;

const BILL_CATEGORIES = new Set(['RENT_AND_UTILITIES', 'LOAN_PAYMENTS', 'GOVERNMENT_AND_NON_PROFIT']);

// Moving money between your own accounts is not spending. Zelle, cash and card payments are.
const OWN_MONEY = new Set([
  'TRANSFER_OUT_ACCOUNT_TRANSFER',
  'TRANSFER_OUT_SAVINGS',
  'TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS',
]);

const pad2 = (n: number) => String(n).padStart(2, '0');
const isoOf = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const isoDaysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return isoOf(d);
};

// Plain YYYY-MM-DD dates as whole days, so periods are counted without time zones getting involved.
export const epochDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
};
export const isoFromEpochDay = (day: number) => new Date(day * 86_400_000).toISOString().slice(0, 10);

const bankText = (t: Txn) => (t.details.find((d) => d.label === 'Bank Description')?.value ?? t.merchant).toUpperCase();

// The period every Patterns number is worked out over. One place decides which transactions count,
// so the circles, the monthly figures and the detail view can never disagree.
export interface PatternScope {
  days: number; // the period the user picked
  today: string;
  start: string; // first day of the picked period
  effectiveDays: number; // days actually analysed: shorter than `days` when history is short
  partial: boolean; // true when there is not enough history to fill the picked period
  historyStart: string | null; // earliest transaction in the chosen accounts
  prevStart: string; // the equal-length period just before this one
  prevAvailable: boolean; // history reaches back far enough to compare against it
  toMonthly: number; // multiplier from period dollars to dollars per month
  creditIds: Set<string>;
  hasCredit: boolean;
  accountOk: (t: Txn) => boolean;
  inView: (t: Txn) => boolean; // in the chosen accounts and the picked period
  isSpending: (t: Txn) => boolean; // money out that is really spending
}

// Moves between your own accounts are not money coming in, just as they are not money going out.
const IN_OWN_MONEY = new Set([
  'TRANSFER_IN_ACCOUNT_TRANSFER',
  'TRANSFER_IN_SAVINGS',
  'TRANSFER_IN_INVESTMENT_AND_RETIREMENT_FUNDS',
]);

// Cash that arrived in a checking or savings account: pay, deposits, money sent to you, refunds and
// advances (their repayments are counted as money out, so both sides are in). Payments received by a
// credit card are not cash. Overview's "Money in" is this.
export const isMoneyIn = (t: Txn, scope: PatternScope) =>
  t.amount > 0 &&
  !scope.creditIds.has(t.accountId) &&
  !IN_OWN_MONEY.has(t.categoryDetailKey) &&
  t.categoryKey !== 'LOAN_PAYMENTS';

// The part of money in that the bank tags as income (pay). Patterns' "Monthly Income" is this, so the two
// screens are built from one definition: Overview shows the whole and how much of it is pay.
export const isIncome = (t: Txn, scope: PatternScope) => isMoneyIn(t, scope) && t.categoryKey === 'INCOME';

// Moving money between your own accounts is not spending, and neither is paying a card whose own
// purchases are already counted.
export function makeScope(txns: Txn[], accounts: LinkedAccount[], filters: PatternFilters): PatternScope {
  const days = filters.days;
  const credit = accounts.filter((a) => a.type === 'credit');
  const creditIds = new Set(credit.map((a) => a.id));
  const creditMasks = new Set(credit.map((a) => a.mask).filter((m): m is string => !!m));
  const hasCredit = creditIds.size > 0;

  const accountOk = (t: Txn) =>
    filters.account === 'all' || (filters.account === 'credit') === creditIds.has(t.accountId);

  let historyStart: string | null = null;
  for (const t of txns) if (accountOk(t) && (historyStart === null || t.date < historyStart)) historyStart = t.date;

  const today = isoOf(new Date());
  const start = isoDaysAgo(days - 1); // the last `days` days, today included
  const prevStart = isoDaysAgo(2 * days - 1);

  // A little slack: the oldest transaction is rarely dated on exactly the first day of the period.
  const slack = Math.ceil(days * 0.1);
  const covered = historyStart !== null && epochDay(historyStart) <= epochDay(start) + slack;
  const partial = historyStart === null ? false : !covered;
  const effectiveDays = partial && historyStart ? Math.max(1, epochDay(today) - epochDay(historyStart) + 1) : days;
  const prevAvailable = historyStart !== null && epochDay(historyStart) <= epochDay(prevStart) + slack;

  // Card payments name the card ("...Xxxxx4944") when they can. A payment to a card that is not linked
  // is real spending, because that card's purchases are not in the list.
  const paysLinkedCard = (t: Txn) => {
    const text = bankText(t);
    const named = [...text.matchAll(/(?:X{2,}|\*{2,}|•{2,})\s*(\d{4})\b/g)].map((m) => m[1]);
    return named.length ? named.some((m) => creditMasks.has(m)) : hasCredit;
  };
  const cardPurchasesInView = hasCredit && filters.account !== 'checking';

  return {
    days,
    today,
    start,
    effectiveDays,
    partial,
    historyStart,
    prevStart,
    prevAvailable,
    toMonthly: 30 / effectiveDays,
    creditIds,
    hasCredit,
    accountOk,
    inView: (t) => accountOk(t) && t.date >= start,
    isSpending: (t) =>
      t.amount < 0 &&
      !OWN_MONEY.has(t.categoryDetailKey) &&
      !(cardPurchasesInView && t.categoryDetailKey === 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT' && paysLinkedCard(t)),
  };
}

// "~15th" -> "15th", "monthly" -> "Monthly", "2 patterns · ~6th, ~19th" -> "2 patterns"
function badgeFor(rec: Recurring | undefined, count: number): string {
  if (rec && rec.confidence !== 'habit' && rec.confidence !== 'review') {
    const label = rec.cadenceLabel.split(' · ')[0].replace('~', '');
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  return `${count} charge${count === 1 ? '' : 's'}`;
}

interface Group {
  key: string;
  name: string;
  amount: number;
  count: number;
  logos: string[];
  domain?: string;
  inStore: number; // charges made in person
  categories: Map<string, number>;
  labels: Map<string, string>;
}

const dominant = (g: Group) => [...g.categories.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';

// Only a relationship Wallex is fairly sure of has an estimate worth showing next to what was spent.
const isCommitmentLike = (r: Recurring) => r.active && ['confirmed', 'likely', 'new'].includes(r.confidence);

// What one charge at this merchant is called: you visit a shop, but you make a payment to a person.
function nounFor(g: Group): Bubble['noun'] {
  if (/^(ZELLE|ATM|OVERDRAFT|CHECKS|APPLE CASH)/.test(g.key)) return 'payments';
  return g.inStore * 2 > g.count ? 'visits' : 'purchases';
}

// A label only when Wallex already knows what the thing is, from the recurring detector or from the
// category the bank gave it. Nothing is guessed.
function classLabelFor(rec: Recurring | undefined, isBill: boolean, category: string, key: string): string | undefined {
  if (key.startsWith('ZELLE')) return 'Person-to-person';
  if (rec && rec.confidence !== 'review') {
    if (rec.kind === 'habit') return 'Recurring habit';
    if (rec.kind === 'bill') return 'Recurring obligation';
    if (rec.kind === 'debt') return 'Debt payment';
    if (rec.kind === 'installment') return 'Installment';
    if (rec.kind === 'subscription') return 'Subscription';
    if (rec.kind === 'usage') return 'Subscription + usage';
  }
  if (category === 'LOAN_PAYMENTS') return 'Debt payment';
  return isBill ? 'Bill' : undefined;
}

export function buildPatterns(
  txns: Txn[],
  accounts: LinkedAccount[],
  filters: PatternFilters,
  analysis?: Analysis, // the Recurring tab's analysis, so both screens agree on what is a bill
): PatternData {
  const scope = makeScope(txns, accounts, filters);
  const { creditIds, hasCredit, toMonthly, inView, isSpending } = scope;

  const windowed = txns.filter(inView);
  const income = windowed.filter((t) => isIncome(t, scope)).reduce((sum, t) => sum + t.amount, 0) * toMonthly;

  const merchants = new Map<string, Group>();
  const categories = new Map<string, Group>();
  const bump = (map: Map<string, Group>, key: string, name: string, t: Txn, domain?: string) => {
    const g: Group = map.get(key) ?? { key, name, amount: 0, count: 0, logos: [], inStore: 0, categories: new Map(), labels: new Map() };
    g.amount += -t.amount;
    if (t.channel === 'In Store') g.inStore += 1;
    g.count += 1;
    if (!g.logos.length && t.logos.length) g.logos = t.logos;
    if (domain) g.domain = domain;
    g.categories.set(t.categoryKey, (g.categories.get(t.categoryKey) ?? 0) + 1);
    g.labels.set(t.categoryKey, t.category.split(' › ')[0] || 'Uncategorized');
    map.set(key, g);
  };

  for (const t of windowed.filter(isSpending)) {
    const m = merchantOf(t);
    bump(merchants, m.key, m.name, t, m.domain);
    const label = t.category.split(' › ')[0] || 'Uncategorized';
    bump(categories, t.categoryKey || 'UNCATEGORIZED', categoryName(label), t);
  }

  // Which merchants are bills: found by the recurring detector, or in a billing category.
  const recurring = new Map((analysis ?? analyze(txns)).items.map((r) => [r.id, r]));
  const labels = new Map<string, string>();
  for (const g of categories.values()) for (const [k, l] of g.labels) labels.set(k, categoryName(l));

  const passes = (g: Group) => {
    const monthly = g.amount * toMonthly;
    const cat = dominant(g);
    return monthly >= filters.minAmount && (filters.categories.length === 0 || filters.categories.includes(cat));
  };

  const bills: Bubble[] = [];
  const shops: Bubble[] = [];
  for (const g of merchants.values()) {
    if (!passes(g)) continue;
    const rec = recurring.get(g.key);
    const cat = dominant(g);
    const recurringBill =
      rec && (rec.kind === 'bill' || rec.kind === 'debt' || rec.kind === 'installment') && rec.confidence !== 'habit';
    const isBill = recurringBill || BILL_CATEGORIES.has(cat) || /INSURANCE/.test([...g.categories.keys()].join(' '));
    const bubble: Bubble = {
      key: g.key,
      name: g.name,
      amount: g.amount * toMonthly,
      total: g.amount,
      count: g.count,
      rgb: colorFor(g.key),
      // A recognised company shows its own logo first (a PayPal wrapper would show PayPal's).
      logos: g.domain ? [faviconUrl(g.domain), ...g.logos] : g.logos,
      badge: badgeFor(rec, g.count),
      kind: isBill ? 'bill' : 'merchant',
      categoryKey: cat,
      noun: isBill ? 'payments' : nounFor(g),
      classLabel: classLabelFor(rec, isBill, cat, g.key),
      recurringMonthly: rec && isCommitmentLike(rec) ? rec.monthly : undefined,
    };
    (isBill ? bills : shops).push(bubble);
  }

  const cats: Bubble[] = [...categories.values()]
    .filter(passes)
    .map((g) => ({
      key: g.key,
      name: g.name,
      amount: g.amount * toMonthly,
      total: g.amount,
      count: g.count,
      rgb: CATEGORY_COLORS[g.key] ?? FALLBACK_COLOR,
      logos: [],
      iconKey: g.key,
      badge: `${g.count} charge${g.count === 1 ? '' : 's'}`,
      kind: 'category' as const,
      categoryKey: g.key,
      noun: 'transactions' as const,
      classLabel: g.key === 'TRANSFER_OUT' ? 'Transfer' : g.key === 'LOAN_PAYMENTS' ? 'Debt payment' : undefined,
    }));

  const byAmount = (a: Bubble, b: Bubble) => b.amount - a.amount;
  return {
    income,
    scope,
    hasCredit,
    bills: bills.sort(byAmount),
    merchants: shops.sort(byAmount),
    categories: cats.sort(byAmount),
    categoryOptions: [...labels.entries()].map(([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label)),
  };
}

// Keeps the biggest circles and folds the rest into one, so the diagram stays readable.
export function capBubbles(bubbles: Bubble[], max: number, otherName: string): Bubble[] {
  if (bubbles.length <= max) return bubbles;
  const keep = bubbles.slice(0, max - 1);
  const rest = bubbles.slice(max - 1);
  const count = rest.reduce((s, b) => s + b.count, 0);
  return [
    ...keep,
    {
      key: 'OTHER',
      name: otherName,
      amount: rest.reduce((s, b) => s + b.amount, 0),
      total: rest.reduce((s, b) => s + b.total, 0),
      count,
      rgb: FALLBACK_COLOR,
      logos: [],
      iconKey: 'OTHER',
      badge: `${rest.length} more`,
      kind: rest[0].kind,
      categoryKey: '',
      noun: 'transactions',
    },
  ];
}

// Shown until a bank is connected: the examples from the design.
const sample = (
  kind: Bubble['kind'],
  key: string,
  name: string,
  amount: number,
  badge: string,
  rgb: string,
  iconKey: string,
  count = 1,
  domain?: string, // when set, the company's logo is shown instead of the generic icon
): Bubble => ({
  key,
  name,
  amount,
  total: amount,
  count,
  rgb,
  logos: domain ? [faviconUrl(domain)] : [],
  iconKey: domain ? undefined : iconKey,
  badge,
  kind,
  categoryKey: '',
  noun: kind === 'bill' ? 'payments' : kind === 'category' ? 'transactions' : 'visits',
});

// The sample circles stand in for a full 30 days of history, whatever dates the made-up charges have.
export const sampleScope = (txns: Txn[]): PatternScope => ({
  ...makeScope(txns, [], DEFAULT_FILTERS),
  historyStart: isoDaysAgo(29),
  partial: false,
  effectiveDays: 30,
  toMonthly: 1,
});

export const SAMPLE_PATTERNS: PatternData = {
  income: 4800,
  scope: sampleScope([]),
  hasCredit: false,
  bills: [
    sample('bill', 'RENT', 'Rent', 1250, '1st', '74, 214, 130', 'RENT'),
    sample('bill', 'CHASE', 'Chase Loan', 500, '15th', '79, 140, 255', 'CHASE'),
    sample('bill', 'POWER', 'Georgia Power', 182, 'Monthly', '129, 140, 248', 'ELECTRIC', 1, 'georgiapower.com'),
    sample('bill', 'VERIZON', 'Verizon', 30, 'Monthly', '244, 114, 94', 'VERIZON', 1, 'verizon.com'),
  ],
  merchants: [
    sample('merchant', 'PUBLIX', 'Publix', 260, 'Weekly', '250, 204, 21', 'PUBLIX', 4, 'publix.com'),
    sample('merchant', 'WOOFS', 'Woofs Sports Bar', 140, 'Weekly', '168, 130, 255', 'WOOFS', 5, 'woofsatlanta.com'),
    sample('merchant', 'STARBUCKS', 'Starbucks', 84, 'Weekly', '45, 212, 191', 'STARBUCKS', 8, 'starbucks.com'),
    sample('merchant', 'SPOTIFY', 'Spotify', 11.99, 'Monthly', '74, 214, 130', 'SPOTIFY', 1, 'spotify.com'),
  ],
  categories: [
    sample('category', 'RENT_AND_UTILITIES', 'Rent & Bills', 1962, '4 charges', '74, 214, 130', 'RENT_AND_UTILITIES', 4),
    sample('category', 'LOAN_PAYMENTS', 'Loans', 500, '1 charge', '79, 140, 255', 'LOAN_PAYMENTS'),
    sample('category', 'FOOD_AND_DRINK', 'Food & Drink', 484, '17 charges', '255, 152, 67', 'FOOD_AND_DRINK', 17),
    sample('category', 'GENERAL_MERCHANDISE', 'Shopping', 260, '9 charges', '250, 204, 21', 'GENERAL_MERCHANDISE', 9),
    sample('category', 'ENTERTAINMENT', 'Entertainment', 152, '6 charges', '255, 110, 170', 'ENTERTAINMENT', 6),
  ],
  categoryOptions: [],
};

// Made-up charges for a sample circle, so the detail view has something to show before a bank is linked.
export function sampleTransactionsFor(bubble: Bubble): Txn[] {
  const n = Math.min(Math.max(bubble.count, 1), 8);
  const spacing = n > 1 ? Math.floor(28 / (n - 1)) : 1;
  return Array.from({ length: n }, (_, i) => {
    const date = isoDaysAgo(i * spacing + 1);
    return {
      id: `sample-${bubble.key}-${i}`,
      accountId: 'sample',
      date,
      authorizedDate: isoDaysAgo(i * spacing + 2),
      merchant: bubble.name,
      logos: bubble.logos,
      category: bubble.kind === 'category' ? bubble.name : bubble.kind === 'bill' ? 'Rent & Utilities' : 'Food & Drink',
      categoryKey: '',
      categoryDetailKey: '',
      channel: 'Online',
      pending: false,
      amount: -Math.round((bubble.amount / n) * 100) / 100,
      details: [
        { label: 'Bank Description', value: `${bubble.name.toUpperCase()} #${String(100 + i * 7).padStart(4, '0')}` },
        { label: 'Account', value: 'TOTAL CHECKING ••6201' },
        { label: 'Currency', value: 'USD' },
      ],
    };
  });
}
