import { faviconUrl } from './favicon';
import { analyze, merchantOf, type Recurring } from './recurring';
import type { LinkedAccount, Txn } from './wallex';

// Turns transactions into the circles on the Patterns page: bills, merchants and categories,
// each as a monthly amount compared against monthly income.

export type View = 'all' | 'bills' | 'merchants' | 'categories';

export interface PatternFilters {
  days: 30 | 60 | 90; // how far back to look; amounts are averaged to a month
  account: 'all' | 'checking' | 'credit';
  categories: string[]; // Plaid primary categories; empty means all
  minAmount: number; // monthly dollars
}

export const DEFAULT_FILTERS: PatternFilters = { days: 30, account: 'all', categories: [], minAmount: 0 };

export interface Bubble {
  key: string;
  name: string;
  amount: number; // per month
  count: number;
  rgb: string; // "r, g, b"
  logos: string[];
  iconKey?: string; // used instead of logos when set
  badge: string; // cadence, or the number of charges
  kind: 'bill' | 'merchant' | 'category';
  categoryKey: string;
}

export interface PatternData {
  income: number; // per month
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

const isoDaysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

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
  categories: Map<string, number>;
  labels: Map<string, string>;
}

const dominant = (g: Group) => [...g.categories.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';

export function buildPatterns(txns: Txn[], accounts: LinkedAccount[], filters: PatternFilters): PatternData {
  const creditIds = new Set(accounts.filter((a) => a.type === 'credit').map((a) => a.id));
  const hasCredit = creditIds.size > 0;
  const since = isoDaysAgo(filters.days);
  const toMonthly = 30 / filters.days;

  const inView = (t: Txn) =>
    t.date >= since &&
    (filters.account === 'all' || (filters.account === 'credit') === creditIds.has(t.accountId));

  // A card payment from checking only counts when the card's own purchases are not already in view.
  const cardPurchasesInView = hasCredit && filters.account !== 'checking';
  const isSpending = (t: Txn) =>
    t.amount < 0 &&
    !OWN_MONEY.has(t.categoryDetailKey) &&
    !(cardPurchasesInView && t.categoryDetailKey === 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT');

  const windowed = txns.filter(inView);
  const income =
    windowed
      .filter((t) => t.amount > 0 && t.categoryKey === 'INCOME' && !creditIds.has(t.accountId))
      .reduce((sum, t) => sum + t.amount, 0) * toMonthly;

  const merchants = new Map<string, Group>();
  const categories = new Map<string, Group>();
  const bump = (map: Map<string, Group>, key: string, name: string, t: Txn, domain?: string) => {
    const g: Group = map.get(key) ?? { key, name, amount: 0, count: 0, logos: [], categories: new Map(), labels: new Map() };
    g.amount += -t.amount;
    g.count += 1;
    if (!g.logos.length && t.logos.length) g.logos = t.logos;
    if (domain) g.domain = domain;
    g.categories.set(t.categoryKey, (g.categories.get(t.categoryKey) ?? 0) + 1);
    g.labels.set(t.categoryKey, t.category.split(' › ')[0]);
    map.set(key, g);
  };

  for (const t of windowed.filter(isSpending)) {
    const m = merchantOf(t);
    bump(merchants, m.key, m.name, t, m.domain);
    const label = t.category.split(' › ')[0];
    bump(categories, t.categoryKey || 'UNCATEGORIZED', categoryName(label), t);
  }

  // Which merchants are bills: found by the recurring detector, or in a billing category.
  const recurring = new Map(analyze(txns).items.map((r) => [r.id, r]));
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
      count: g.count,
      rgb: colorFor(g.key),
      // A recognised company shows its own logo first (a PayPal wrapper would show PayPal's).
      logos: g.domain ? [faviconUrl(g.domain), ...g.logos] : g.logos,
      badge: badgeFor(rec, g.count),
      kind: isBill ? 'bill' : 'merchant',
      categoryKey: cat,
    };
    (isBill ? bills : shops).push(bubble);
  }

  const cats: Bubble[] = [...categories.values()]
    .filter(passes)
    .map((g) => ({
      key: g.key,
      name: g.name,
      amount: g.amount * toMonthly,
      count: g.count,
      rgb: CATEGORY_COLORS[g.key] ?? FALLBACK_COLOR,
      logos: [],
      iconKey: g.key,
      badge: `${g.count} charge${g.count === 1 ? '' : 's'}`,
      kind: 'category' as const,
      categoryKey: g.key,
    }));

  const byAmount = (a: Bubble, b: Bubble) => b.amount - a.amount;
  return {
    income,
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
      count,
      rgb: FALLBACK_COLOR,
      logos: [],
      iconKey: 'OTHER',
      badge: `${rest.length} more`,
      kind: rest[0].kind,
      categoryKey: '',
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
  count,
  rgb,
  logos: domain ? [faviconUrl(domain)] : [],
  iconKey: domain ? undefined : iconKey,
  badge,
  kind,
  categoryKey: '',
});

export const SAMPLE_PATTERNS: PatternData = {
  income: 4800,
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

// The transactions behind a circle: a merchant's own charges, or everything in a category.
export function transactionsFor(bubble: Bubble, txns: Txn[]): Txn[] {
  return txns.filter((t) =>
    bubble.kind === 'category' ? (t.categoryKey || 'UNCATEGORIZED') === bubble.key : merchantOf(t).key === bubble.key,
  );
}

// Made-up charges for a sample circle, so the detail view has something to show before a bank is linked.
export function sampleTransactionsFor(bubble: Bubble): Txn[] {
  const n = Math.min(Math.max(bubble.count, 1), 8);
  const spacing = Math.max(3, Math.round(28 / n));
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
