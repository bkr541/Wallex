import { faviconUrl } from './favicon';
import type { Txn } from './wallex';

// Finds recurring financial relationships in a list of transactions.
//
// It does not trust the bank's "Recurring Card Purchase" label on its own. It groups spending by
// merchant, then looks for repeats in three signals: the same calendar position month after month,
// a consistent amount, and an explicit bank tag. Each relationship is given a confidence level
// instead of being presented as equally certain.

export type Kind = 'bill' | 'debt' | 'installment' | 'subscription' | 'usage' | 'aggregator' | 'habit';

// confirmed: bank-tagged, or 3+ cycles with steady date and amount
// likely:    repeated over several cycles with some drift in date or amount
// new:       only two cycles so far
// review:    clearly repetitive, but the real merchant is hidden behind PayPal, Apple and the like
// habit:     many visits with no fixed billing cadence (fuel, groceries, bars)
export type Confidence = 'confirmed' | 'likely' | 'new' | 'review' | 'habit';

export type CadenceName = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
export type RecurringCadence = CadenceName | 'mixed' | 'irregular';

// How the amount behaves: one steady figure, a narrow range, several fixed price points, a fixed base
// plus variable usage, or no usable pattern.
export type AmountKind = 'fixed' | 'range' | 'multiple' | 'usage' | 'variable';

export type RecurringStatus = 'active' | 'new' | 'possibly-ended' | 'review' | 'habit';

export interface PriceChange {
  previous: number;
  current: number;
  delta: number;
  pct: number;
  since: string; // first charge at the new price
}

export interface NextExpected {
  date: string;
  earliest: string;
  latest: string;
  approx: boolean; // the date wanders, so show a range
}

export interface Recurring {
  id: string;
  name: string;
  kind: Kind;
  confidence: Confidence;
  logos: string[];
  amountLabel: string;
  cadenceLabel: string;
  summary: string;
  monthly: number | null; // estimated monthly cost of the fixed charges, null for habits and unclear items
  active: boolean;
  notes: string[];
  recent: { date: string; amount: number }[];
  schedule: ScheduledPayment[]; // when the next charge of each pattern is expected

  cadence: RecurringCadence;
  amountKind: AmountKind;
  typical: number | null; // the usual charge, null when there is no single one
  annual: number | null; // dollars per year when that can be said honestly
  annualApprox: boolean; // the annual figure is an estimate (variable amounts)
  usage: { count: number; avg: number; perMonth: number; combinedMonthly: number | null } | null;
  status: RecurringStatus;
  charges: Txn[]; // every matching transaction, newest first
  lastCharge: { date: string; amount: number } | null;
  firstDate: string | null;
  nextExpected: NextExpected | null; // only when the timing is dependable
  priceChange: PriceChange | null;
  reason: string; // why Wallex recognised it
  uncertainty: string | null; // why it needs review, when it does
  settlement: 'card' | null; // pays a credit card, a cash-flow event rather than extra spending
  paidOnCard: boolean; // charged to a credit card, so a card payment settles it later
}

// One recurring pattern's next expected charge. Overview turns these into an upcoming-payments list.
export interface ScheduledPayment {
  next: string; // YYYY-MM-DD, the next expected charge after the latest one seen
  periodDays: number; // days between charges, so later ones can be projected
  day: number | null; // typical day of the month, for monthly patterns
  typical: number; // dollars
  min: number;
  max: number;
  fixed: boolean; // the amount is steady
  spread: number; // how many days the charge date wanders
  count: number; // charges the pattern is based on
}

export interface Analysis {
  hidden?: Recurring[]; // dismissed by the user, kept so they can be restored
  items: Recurring[];
  counts: Record<Confidence, number>;
  monthlyTotal: number;
  earliest: string | null;
  latest: string | null;
  monthsOfHistory: number;
}

// ---------------------------------------------------------------------------------------------
// Merchants
// ---------------------------------------------------------------------------------------------

interface Alias {
  test: RegExp;
  name: string;
  kind: Kind;
  aggregator?: boolean; // billing wrapper that can hide several different services
  domain?: string; // the company's website, for its logo
}

// Known merchants and their variants, matched against the bank's description text.
const ALIASES: Alias[] = [
  { test: /OPENAI|CHATGPT/, name: 'OpenAI / ChatGPT', domain: 'openai.com', kind: 'subscription' },
  { test: /ANTHROPIC|CLAUDE\.AI|CLAUDE SU/, name: 'Anthropic / Claude', domain: 'anthropic.com', kind: 'usage' },
  { test: /MIDJOURNEY/, name: 'Midjourney', domain: 'midjourney.com', kind: 'usage' },
  { test: /\bSUNO\b|SUNO\.COM/, name: 'Suno', domain: 'suno.com', kind: 'usage' },
  { test: /\bOUTPUT\b/, name: 'Output', domain: 'output.com', kind: 'subscription' },
  { test: /GOWILDER/, name: 'GoWilder', kind: 'subscription' },
  { test: /HYPEDDIT/, name: 'Hypeddit', domain: 'hypeddit.com', kind: 'subscription' },
  { test: /GLIBATREE/, name: 'Glibatree', domain: 'glibatree.com', kind: 'subscription' },
  { test: /OPENART/, name: 'OpenArt', domain: 'openart.ai', kind: 'subscription' },
  { test: /WISPR/, name: 'Wispr Flow', domain: 'wisprflow.ai', kind: 'subscription' },
  { test: /SPOTIFY/, name: 'Spotify', domain: 'spotify.com', kind: 'subscription' },
  { test: /NETFLIX/, name: 'Netflix', domain: 'netflix.com', kind: 'subscription' },
  { test: /SOUNDTRAP/, name: 'Soundtrap', domain: 'soundtrap.com', kind: 'subscription' },
  { test: /WAVES INC/, name: 'Waves', domain: 'waves.com', kind: 'subscription' },
  { test: /AUDIMEE/, name: 'Audimee', domain: 'audimee.com', kind: 'subscription' },
  { test: /BEACONSAI/, name: 'BeaconsAI', domain: 'beacons.ai', kind: 'subscription' },
  { test: /GODADDY/, name: 'GoDaddy', domain: 'godaddy.com', kind: 'subscription' },
  { test: /WALMARTPLUS|WALMART\+/, name: 'Walmart+', domain: 'walmart.com', kind: 'subscription' },
  { test: /PLANET FITNESS/, name: 'Planet Fitness', domain: 'planetfitness.com', kind: 'subscription' },
  { test: /PATREON/, name: 'Patreon', domain: 'patreon.com', kind: 'aggregator', aggregator: true },
  { test: /APPLE\.COM BILL/, name: 'Apple.com Bill', domain: 'apple.com', kind: 'aggregator', aggregator: true },
  { test: /GOOGLE GOOGLE/, name: 'Google services', domain: 'google.com', kind: 'aggregator', aggregator: true },
  { test: /FASTSPRING/, name: 'Fastspring', domain: 'fastspring.com', kind: 'aggregator', aggregator: true },
  { test: /VERIZON WIRELESS/, name: 'Verizon Wireless', domain: 'verizon.com', kind: 'bill' },
  { test: /PROG PREMIER|PROGRESSIVE/, name: 'Progressive', domain: 'progressive.com', kind: 'bill' },
  { test: /USATAXPYMT|\bIRS\b/, name: 'IRS', domain: 'irs.gov', kind: 'bill' },
  { test: /J MAX DAVIS/, name: 'J Max Davis Attorneys', kind: 'bill' },
  { test: /(EARNIN|EAMIN)\s+REPAYMENT/, name: 'EarnIn repayments', domain: 'earnin.com', kind: 'debt' },
  { test: /MASTERCARD\s+PAYMENT/, name: 'Mastercard payment', domain: 'mastercard.com', kind: 'debt' },
  { test: /AFFIRM/, name: 'Affirm', domain: 'affirm.com', kind: 'installment' },
  { test: /LOST LANDS TIX/, name: 'Lost Lands installments', kind: 'installment' },
];

// Everyday brands, so their logo can be found even when the bank's text is just a store number.
const BRANDS: { test: RegExp; domain: string }[] = [
  { test: /\bSHELL\b/, domain: 'shell.com' },
  { test: /WAL-?MART|\bWM SUPERCENTER/, domain: 'walmart.com' },
  { test: /STARBUCKS/, domain: 'starbucks.com' },
  { test: /AMAZON|AMZN/, domain: 'amazon.com' },
  { test: /\bUBER\b|\bUBR\b/, domain: 'uber.com' },
  { test: /\bLYFT\b/, domain: 'lyft.com' },
  { test: /CHEVRON/, domain: 'chevron.com' },
  { test: /KROGER/, domain: 'kroger.com' },
  { test: /MCDONALD/, domain: 'mcdonalds.com' },
  { test: /DUNKIN/, domain: 'dunkindonuts.com' },
  { test: /WENDY/, domain: 'wendys.com' },
  { test: /\bCVS\b/, domain: 'cvs.com' },
  { test: /WALGREEN/, domain: 'walgreens.com' },
  { test: /\bTARGET\b/, domain: 'target.com' },
  { test: /PUBLIX/, domain: 'publix.com' },
  { test: /CHICK-FIL-A/, domain: 'chick-fil-a.com' },
  { test: /TACO BELL/, domain: 'tacobell.com' },
  { test: /DOORDASH/, domain: 'doordash.com' },
  { test: /\bDAVE\b/, domain: 'dave.com' },
  { test: /FRONTIER/, domain: 'flyfrontier.com' },
  { test: /7-ELEVEN/, domain: '7-eleven.com' },
  { test: /PLANET FITNESS/, domain: 'planetfitness.com' },
];

const brandDomain = (text: string) => BRANDS.find((b) => b.test.test(text))?.domain;

// Money moving to people, cash and the bank itself: repeated, but not a billing relationship.
const NOT_A_RELATIONSHIP =
  /ZELLE|ATM WITHDRAW|ATM FEE|ATM CASH|OVERDRAFT|^CHECK\b|APPLE CASH|PAYMENT SENT|PAYMENT RECEIVED|REFUND|RETURN/;

const BILL_CATEGORIES = new Set(['RENT_AND_UTILITIES', 'LOAN_PAYMENTS', 'GOVERNMENT_AND_NON_PROFIT', 'GENERAL_SERVICES']);

interface Resolved {
  key: string;
  name: string;
  kind: Kind | null; // null until the pattern is known
  aggregator: boolean;
  known: boolean; // matched an alias
  domain?: string;
}

const bankText = (t: Txn) => (t.details.find((d) => d.label === 'Bank Description')?.value ?? t.merchant).toUpperCase();

const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

function genericKey(t: Txn): string {
  const words = (t.merchant || '')
    .toUpperCase()
    .replace(/^(RECURRING CARD PURCHASE|CARD PURCHASE( WITH PIN| RETURN)?)\s+/, '')
    .replace(/\b\d{1,2}\/\d{1,2}\b/g, ' ')
    .replace(/[#*]\S*/g, ' ')
    .replace(/\d[\d-]{3,}/g, ' ')
    .replace(/[^A-Z0-9&.' ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return words.slice(0, 2).join(' ') || 'UNKNOWN';
}

function resolve(t: Txn): Resolved | null {
  const raw = bankText(t);

  const alias = ALIASES.find((a) => a.test.test(raw) || a.test.test(t.merchant.toUpperCase()));
  if (alias) {
    return {
      key: alias.name.toUpperCase(),
      name: alias.name,
      kind: alias.kind,
      aggregator: !!alias.aggregator,
      known: true,
      domain: alias.domain,
    };
  }

  if (NOT_A_RELATIONSHIP.test(raw) || t.categoryKey === 'TRANSFER_OUT' || t.categoryKey === 'BANK_FEES') return null;

  // A PayPal transfer that never names who was paid.
  if (/^PAYPAL\b/.test(raw)) {
    const underlying = raw.match(/PAYPAL\s+(?:INST XFER|PURCHASE|RETRY PYMT)\s*(.*?)\s*(?:WEB ID|$)/)?.[1]?.trim();
    if (!underlying) {
      return { key: 'PAYPAL?', name: 'Unidentified PayPal payment', kind: 'aggregator', aggregator: true, known: true };
    }
  }

  const key = genericKey(t);
  return { key, name: titleCase(key), kind: null, aggregator: false, known: false, domain: brandDomain(raw) };
}

// Names the merchant for ANY spending, including the things the recurring detector skips:
// person-to-person payments, cash, fees and checks. Used for the spending view.
export function merchantOf(t: Txn): { key: string; name: string; domain?: string } {
  const resolved = resolve(t);
  if (resolved) return { key: resolved.key, name: resolved.name, domain: resolved.domain };

  const raw = bankText(t);
  const zelle = raw.match(/ZELLE PAYMENT (?:TO|FROM)\s+(.+)/);
  if (zelle) {
    const who: string[] = [];
    for (const word of zelle[1].split(/\s+/)) {
      if (/\d/.test(word) || word.startsWith('JPM')) break;
      who.push(word);
    }
    const name = titleCase(who.slice(0, 2).join(' ')) || 'Someone';
    return { key: `ZELLE ${name.toUpperCase()}`, name: `Zelle · ${name}`, domain: 'zellepay.com' };
  }
  if (/ATM/.test(raw)) return { key: 'ATM', name: 'ATM & cash' };
  if (/OVERDRAFT/.test(raw)) return { key: 'OVERDRAFT', name: 'Overdraft fees' };
  if (/^CHECK\b/.test(raw)) return { key: 'CHECKS', name: 'Checks' };
  if (/APPLE CASH/.test(raw)) return { key: 'APPLE CASH', name: 'Apple Cash' };

  const key = genericKey(t);
  return { key, name: titleCase(key), domain: brandDomain(raw) };
}

// ---------------------------------------------------------------------------------------------
// Dates and patterns
// ---------------------------------------------------------------------------------------------

interface Occ {
  t: Txn;
  day: number; // days since epoch
  dom: number; // day of month
  month: string; // YYYY-MM
  amount: number; // always positive
}

const epochDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
};

const isoFromDay = (day: number) => new Date(day * 86_400_000).toISOString().slice(0, 10);

const median = (nums: number[]) => {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const CADENCES = [
  { name: 'weekly', lo: 5, hi: 9, days: 7, perMonth: 52 / 12 },
  { name: 'biweekly', lo: 12, hi: 17, days: 14, perMonth: 26 / 12 },
  { name: 'monthly', lo: 24, hi: 38, days: 30.4, perMonth: 1 },
  { name: 'quarterly', lo: 80, hi: 100, days: 91, perMonth: 1 / 3 },
  { name: 'annual', lo: 340, hi: 390, days: 365, perMonth: 1 / 12 },
] as const;

interface Pattern {
  cadence: (typeof CADENCES)[number]['name'];
  count: number;
  day: number | null; // typical day of month, for monthly patterns
  spread: number; // how many days the day of month wanders
  amountMin: number;
  amountMax: number;
  typical: number;
  fixed: boolean;
  lastDay: number;
  nextDay: number;
  perMonth: number;
  periodDays: number;
  occ: Occ[]; // the charges the pattern is made of, oldest first
}

// How far the day of month wanders, treating the 31st and the 1st as neighbors.
function daySpread(doms: number[]): { spread: number; typical: number } {
  const d = [...doms].sort((a, b) => a - b);
  let maxGap = d[0] + 31 - d[d.length - 1];
  let start = 0;
  for (let i = 1; i < d.length; i++) {
    if (d[i] - d[i - 1] > maxGap) {
      maxGap = d[i] - d[i - 1];
      start = i;
    }
  }
  const rotated = [...d.slice(start), ...d.slice(0, start).map((x) => x + 31)];
  const typical = ((median(rotated) - 1) % 31) + 1;
  return { spread: 31 - maxGap, typical: Math.round(typical) };
}

function evalPattern(occ: Occ[], opts: { minCount: number; allowVariable: boolean }): Pattern | null {
  if (occ.length < opts.minCount) return null;
  const sorted = [...occ].sort((a, b) => a.day - b.day);
  const intervals = sorted.slice(1).map((o, i) => o.day - sorted[i].day);
  if (intervals.length === 0) return null;

  const mid = median(intervals.filter((i) => i <= 400));
  const cadence = CADENCES.find((c) => mid >= c.lo && mid <= c.hi);
  if (!cadence) return null;

  // Intervals in the band are hits; a gap of two or more cycles is a skipped cycle, not a miss.
  let hits = 0;
  let misses = 0;
  for (const i of intervals) {
    if (i >= cadence.lo && i <= cadence.hi) hits++;
    else if (i > cadence.hi * 1.6) continue;
    else misses++;
  }
  if (hits === 0 || hits / (hits + misses) < 0.7) return null;

  const amounts = sorted.map((o) => o.amount);
  const typical = median(amounts);
  const amountMin = Math.min(...amounts);
  const amountMax = Math.max(...amounts);
  const fixed = amountMax - amountMin <= Math.max(0.75, 0.05 * typical);

  // Weekly and biweekly patterns are common by coincidence, so they must have a steady amount.
  if (!fixed && (!opts.allowVariable || cadence.name === 'weekly' || cadence.name === 'biweekly')) return null;
  // Two data points are only convincing when the amount is identical.
  if (sorted.length === 2 && !fixed) return null;

  let day: number | null = null;
  let spread = 0;
  if (cadence.name === 'monthly') {
    const months = new Set(sorted.map((o) => o.month)).size;
    if (sorted.length / months > 1.35) return null; // several a month is not a monthly bill
    ({ spread, typical: day } = daySpread(sorted.map((o) => o.dom)));
  }

  const lastDay = sorted[sorted.length - 1].day;
  return {
    cadence: cadence.name,
    count: sorted.length,
    day,
    spread,
    amountMin,
    amountMax,
    typical,
    fixed,
    lastDay,
    nextDay: Math.round(lastDay + cadence.days),
    perMonth: cadence.perMonth,
    periodDays: cadence.days,
    occ: sorted,
  };
}

// Collapses 3+ charges that land on the same day into one event with their combined amount.
// Charges that merely share a day (two installments) are left alone.
function mergeSameDay(occ: Occ[], eventOf: Map<Occ, Occ>): Occ[] {
  const byDay = new Map<number, Occ[]>();
  for (const o of occ) byDay.set(o.day, [...(byDay.get(o.day) ?? []), o]);

  const events: Occ[] = [];
  for (const group of byDay.values()) {
    if (group.length < 3) {
      group.forEach((o) => {
        eventOf.set(o, o);
        events.push(o);
      });
      continue;
    }
    const merged: Occ = { ...group[0], amount: group.reduce((sum, o) => sum + o.amount, 0) };
    group.forEach((o) => eventOf.set(o, merged));
    events.push(merged);
  }
  return events;
}

// Greedy grouping of similar amounts, anchored on the smallest in each group.
function clusterAmounts(occ: Occ[]): Occ[][] {
  const sorted = [...occ].sort((a, b) => a.amount - b.amount);
  const clusters: Occ[][] = [];
  for (const o of sorted) {
    const last = clusters[clusters.length - 1];
    if (last && o.amount <= last[0].amount * 1.05 + 0.75) last.push(o);
    else clusters.push([o]);
  }
  return clusters;
}

// Splits on the day of month, so one merchant billing on the 6th and again on the 20th
// comes out as two patterns.
function clusterDays(occ: Occ[]): Occ[][] {
  const sorted = [...occ].sort((a, b) => a.dom - b.dom);
  const clusters: Occ[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].dom - sorted[i - 1].dom > 5) clusters.push([sorted[i]]);
    else clusters[clusters.length - 1].push(sorted[i]);
  }
  // The last days of the month and the first days of the next belong together.
  if (clusters.length > 1) {
    const first = clusters[0];
    const last = clusters[clusters.length - 1];
    if (first[0].dom + 31 - last[last.length - 1].dom <= 5) {
      clusters.splice(clusters.length - 1, 1);
      clusters[0] = [...last, ...first];
    }
  }
  return clusters;
}

// ---------------------------------------------------------------------------------------------
// Putting it together
// ---------------------------------------------------------------------------------------------

// A monthly charge lands on the same day of the next month (clamped to that month's length); anything
// else is the last charge plus its usual gap.
function nextChargeDate(p: Pattern): string {
  const last = isoFromDay(p.lastDay);
  if (p.cadence === 'monthly' && p.day) {
    const [y, m] = last.split('-').map(Number);
    const ny = m === 12 ? y + 1 : y;
    const nm = m === 12 ? 1 : m + 1;
    const length = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
    return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(p.day, length)).padStart(2, '0')}`;
  }
  return isoFromDay(p.nextDay);
}

const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
const range = (a: number, b: number) => (Math.abs(a - b) < 0.005 ? money(a) : `${money(Math.round(a))}–${money(Math.round(b)).slice(1)}`);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = (day: number) => {
  const [, m, d] = isoFromDay(day).split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
};

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

const cadenceText = (p: Pattern) => (p.cadence === 'monthly' && p.day ? `~${ordinal(p.day)}` : p.cadence);

const KIND_SUMMARY: Record<Kind, string> = {
  bill: 'Bill',
  debt: 'Debt / repayment',
  installment: 'Installment',
  subscription: 'Subscription',
  usage: 'Subscription + usage',
  aggregator: 'Billing aggregator',
  habit: 'Recurring habit',
};

const CONFIDENCE_ORDER: Confidence[] = ['confirmed', 'likely', 'new', 'review', 'habit'];

// ---------------------------------------------------------------------------------------------
// Dates, schedule and price changes
// ---------------------------------------------------------------------------------------------

const CADENCE_WORD: Record<RecurringCadence, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
  mixed: 'Several schedules',
  irregular: 'Irregular',
};
export const cadenceWord = (c: RecurringCadence) => CADENCE_WORD[c];

// The date after `date` in a pattern: the same day next month for monthly charges, otherwise the usual gap.
export function stepSchedule(date: string, s: { periodDays: number; day: number | null }): string {
  const monthly = s.periodDays > 25 && s.periodDays < 40;
  if (monthly) {
    const [y, m, d] = date.split('-').map(Number);
    const ny = m === 12 ? y + 1 : y;
    const nm = m === 12 ? 1 : m + 1;
    const length = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
    return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(s.day ?? d, length)).padStart(2, '0')}`;
  }
  return isoFromDay(epochDay(date) + Math.round(s.periodDays));
}

// The next charge on or after today. A charge that is only a few days late counts as due today.
export function projectNext(s: ScheduledPayment, today: string): string {
  let date = s.next;
  let guard = 0;
  while (date < today && epochDay(today) - epochDay(date) > 3 && guard++ < 400) date = stepSchedule(date, s);
  return date < today ? today : date;
}

// A date is only worth showing when the pattern is well established and the day does not wander far.
const dependable = (s: ScheduledPayment, confidence: Confidence) =>
  confidence !== 'review' && confidence !== 'habit' && s.spread <= 10 && (s.count >= 3 || (s.count >= 2 && s.fixed));

function nextExpectedFor(schedule: ScheduledPayment[], confidence: Confidence, active: boolean, today: string): NextExpected | null {
  if (!active) return null;
  const dates = schedule.filter((s) => dependable(s, confidence)).map((s) => ({ s, date: projectNext(s, today) }));
  if (!dates.length) return null;
  const { s, date } = dates.sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  const half = Math.floor(s.spread / 2);
  return {
    date,
    earliest: isoFromDay(Math.max(epochDay(today), epochDay(date) - half)),
    latest: isoFromDay(epochDay(date) + half),
    approx: s.spread >= 2,
  };
}

// A real price change is a steady price that stays at a new steady price. A one-off higher charge, a tip,
// tax or a utility bill that always moves around is not one.
function detectPriceChange(occ: Occ[]): PriceChange | null {
  const sorted = [...occ].sort((a, b) => a.day - b.day);
  const amounts = sorted.map((o) => o.amount);
  const n = amounts.length;
  if (n < 4) return null;
  const same = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.5, 0.02 * Math.max(a, b));

  const current = amounts[n - 1];
  let newRun = 1;
  while (newRun < n && same(amounts[n - 1 - newRun], current)) newRun++;
  if (newRun >= n) return null;

  const previous = amounts[n - 1 - newRun];
  let oldRun = 1;
  while (n - 1 - newRun - oldRun >= 0 && same(amounts[n - 1 - newRun - oldRun], previous)) oldRun++;

  // The old price held for at least two charges, and the new one has held for two (or, if it is
  // brand new, the old price held for three).
  if (oldRun < 2 || (newRun < 2 && oldRun < 3)) return null;
  const delta = current - previous;
  const pct = delta / previous;
  if (Math.abs(delta) < Math.max(0.5, 0.03 * previous) || Math.abs(pct) > 1) return null;
  return { previous, current, delta, pct, since: sorted[n - newRun].t.date };
}

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function analyze(transactions: Txn[], today = localToday(), creditIds: Set<string> = new Set()): Analysis {
  const spend = transactions.filter((t) => t.amount < 0 && !t.pending);
  const dates = transactions.map((t) => t.date).sort();
  const latestDay = dates.length ? epochDay(dates[dates.length - 1]) : 0;

  const groups = new Map<string, { resolved: Resolved; occ: Occ[] }>();
  for (const t of spend) {
    const resolved = resolve(t);
    if (!resolved) continue;
    const day = epochDay(t.date);
    const occ: Occ = { t, day, dom: Number(t.date.slice(8, 10)), month: t.date.slice(0, 7), amount: -t.amount };
    const group = groups.get(resolved.key) ?? { resolved, occ: [] };
    group.occ.push(occ);
    groups.set(resolved.key, group);
  }

  const items: Recurring[] = [];

  for (const [key, { resolved, occ }] of groups) {
    const raws = occ.map((o) => bankText(o.t));
    const explicit = raws.some((r) => r.includes('RECURRING CARD PURCHASE'));
    const category = occ[0].t.categoryKey;
    const achStyle = raws.some((r) => /(PPD|WEB) ID/.test(r)) && !resolved.aggregator;
    const allowVariable = resolved.known || explicit || achStyle || BILL_CATEGORIES.has(category);
    const trusted = resolved.known || explicit || achStyle;

    // A batch of payments on one day (EarnIn repays several advances at once) is one event.
    const eventOf = new Map<Occ, Occ>();
    const events = mergeSameDay(occ, eventOf);

    const patterns: Pattern[] = [];
    const used = new Set<Occ>();
    const take = (p: Pattern, from: Occ[]) => {
      patterns.push(p);
      from.forEach((o) => used.add(o));
    };

    // Several clean monthly patterns beat one weekly/biweekly guess: a charge on the 6th and
    // again on the 20th is two relationships, not one every two weeks.
    const monthlySplit = (from: Occ[], minCount: number): Pattern[] | null => {
      const clusters = clusterDays(from).filter((c) => c.length >= 2);
      if (clusters.length < 2) return null;
      const found = clusters.map((c) => evalPattern(c, { minCount, allowVariable }));
      return found.every((p) => p && p.cadence === 'monthly') ? (found as Pattern[]) : null;
    };

    const minWhole = trusted ? 2 : 3;
    const whole = evalPattern(events, { minCount: minWhole, allowVariable });
    const wholeSplit = whole && whole.cadence !== 'monthly' ? monthlySplit(events, minWhole) : null;

    if (wholeSplit) {
      wholeSplit.forEach((p) => patterns.push(p));
      events.forEach((o) => used.add(o));
    } else if (whole) {
      take(whole, events);
    } else {
      // Otherwise split by amount, then by day of month, and look for steady patterns in each.
      const minCount = trusted ? 2 : 3;
      for (const byAmount of clusterAmounts(events)) {
        if (byAmount.length < 2) continue;
        const all = evalPattern(byAmount, { minCount, allowVariable: false });
        const split = !all || all.cadence !== 'monthly' ? monthlySplit(byAmount, minCount) : null;
        if (split) {
          split.forEach((p) => patterns.push(p));
          byAmount.forEach((o) => used.add(o));
        } else if (all) {
          take(all, byAmount);
        } else {
          for (const byDay of clusterDays(byAmount)) {
            const p = evalPattern(byDay, { minCount, allowVariable: false });
            if (p) take(p, byDay);
          }
        }
      }
    }

    const months = new Set(occ.map((o) => o.month)).size;
    const newest = [...occ].sort((a, b) => b.day - a.day);
    const recent = newest.slice(0, 6).map((o) => ({ date: o.t.date, amount: o.amount }));
    const txnLogos = newest.find((o) => o.t.logos.length)?.t.logos ?? [];
    // A company we recognise gets its own logo first, since a PayPal or Apple wrapper would
    // otherwise show the wrapper's logo instead.
    const logos = resolved.domain ? [faviconUrl(resolved.domain), ...txnLogos] : txnLogos;

    // Charges that belong to no pattern, but keep coming back (usage, extras).
    const leftover = occ.filter((o) => !used.has(o) && !used.has(eventOf.get(o)!));
    const leftoverMonths = new Set(leftover.map((o) => o.month)).size;
    const variable =
      patterns.length > 0 && leftover.length >= 3 && leftoverMonths >= 2
        ? {
            count: leftover.length,
            avg: leftover.reduce((s, o) => s + o.amount, 0) / leftover.length,
            perMonth: leftover.reduce((s, o) => s + o.amount, 0) / Math.max(1, leftoverMonths),
          }
        : null;

    const charges = [...occ].sort((a, b) => b.day - a.day).map((o) => o.t);
    const firstDate = charges.length ? charges[charges.length - 1].date : null;
    const settlement: 'card' | null =
      occ.filter((o) => o.t.categoryDetailKey === 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT').length * 2 > occ.length ? 'card' : null;
    const lastCharge = { date: newest[0].t.date, amount: newest[0].amount };

    // What every relationship carries, whatever its kind.
    const common = { logos, recent, charges, firstDate, lastCharge, settlement, paidOnCard: false };

    // Nothing steady: either a habit, an unclear billing wrapper, or not worth showing.
    if (patterns.length === 0) {
      const base = {
        ...common,
        id: key,
        name: resolved.name,
        monthly: null as number | null,
        schedule: [] as ScheduledPayment[],
        cadence: 'irregular' as RecurringCadence,
        typical: null,
        annual: null,
        annualApprox: false,
        usage: null,
        nextExpected: null,
        priceChange: null,
        active: true,
      };
      const total = occ.reduce((s, o) => s + o.amount, 0);
      if (resolved.aggregator && occ.length >= 3) {
        const amounts = [...new Set(occ.map((o) => o.amount.toFixed(2)))];
        items.push({
          ...base,
          kind: 'aggregator',
          confidence: 'review',
          status: 'review',
          amountKind: 'variable',
          amountLabel: 'Multiple',
          cadenceLabel: 'irregular',
          summary: KIND_SUMMARY.aggregator,
          reason: `${occ.length} charges through ${resolved.name} repeat, but without a steady schedule.`,
          uncertainty: `${resolved.name} is a billing wrapper that can sit in front of several different services. ${
            amounts.length > 1 ? `The charges come in ${amounts.length} different amounts` : 'The charges'
          } with no steady schedule, so Wallex cannot tell what they are for.`,
          notes: [
            `${occ.length} charges through a billing wrapper with no steady cadence.`,
            'The wrapper can hide several different services. Label them to separate the real subscriptions.',
          ],
        });
      } else if (occ.length >= 8 && months >= 3) {
        items.push({
          ...base,
          kind: 'habit',
          confidence: 'habit',
          status: 'habit',
          amountKind: 'variable',
          amountLabel: `${money(Math.round(total / occ.length))} avg`,
          cadenceLabel: `${occ.length} charges`,
          summary: `${KIND_SUMMARY.habit} · ${money(Math.round(total))} total`,
          reason: `${occ.length} charges across ${months} months, but with no fixed billing schedule.`,
          uncertainty: null,
          notes: [
            `${occ.length} charges across ${months} months, ${money(Math.round(total))} in total.`,
            'Frequent, but with no fixed billing cadence, so this is a spending habit and not a bill.',
          ],
        });
      }
      continue;
    }

    // Builds one relationship from a set of patterns. A billing wrapper with several price points is built
    // once per price point, so different services behind one descriptor are not lumped together.
    const build = (id: string, name: string, pats: Pattern[], from: Occ[], extra: typeof variable): Recurring => {
      const best = [...pats].sort((a, b) => b.count - a.count)[0];
      const sortedPatterns = [...pats].sort((a, b) => b.count - a.count);
      let confidence: Confidence;
      if (resolved.aggregator) confidence = 'review';
      else if ((explicit && best.count >= 2) || (best.count >= 3 && best.fixed && best.spread <= 6)) confidence = 'confirmed';
      else if (best.count >= 3) confidence = 'likely';
      else confidence = 'new';

      let kind: Kind = resolved.kind ?? (category === 'LOAN_PAYMENTS' ? 'debt' : BILL_CATEGORIES.has(category) || !best.fixed ? 'bill' : 'subscription');
      if (extra && kind === 'subscription') kind = 'usage';
      const finalKind: Kind = resolved.aggregator ? 'aggregator' : kind;

      const amountLabel =
        pats.length === 1
          ? range(best.amountMin, best.amountMax) + (extra ? ' + usage' : '')
          : [...new Set(sortedPatterns.map((p) => range(p.amountMin, p.amountMax)))].join(' · ');
      const cadences = new Set(sortedPatterns.map((p) => p.cadence));
      const cadence: RecurringCadence = cadences.size === 1 ? best.cadence : 'mixed';
      const cadenceLabel =
        pats.length === 1 ? cadenceText(best) : `${pats.length} patterns · ${[...new Set(sortedPatterns.map(cadenceText))].join(', ')}`;

      const lastSeen = Math.max(...from.map((o) => o.day));
      const expectedGap = Math.min(...pats.map((p) => p.nextDay - p.lastDay));
      const active = latestDay - lastSeen <= expectedGap * 1.6;

      const notes: string[] = [];
      if (explicit) notes.push('The bank tags these charges as recurring card purchases.');
      for (const p of sortedPatterns) {
        const when = p.cadence === 'monthly' && p.day ? `around the ${ordinal(p.day)} of the month` : p.cadence;
        const how = p.fixed ? `a steady ${money(p.typical)}` : `${range(p.amountMin, p.amountMax)}`;
        notes.push(`${p.count} charges ${when}, ${how}.`);
      }
      if (pats.length > 1) notes.unshift(`${pats.length} separate recurring patterns detected. These could be two plans, an add-on, or two billing relationships.`);
      if (extra) {
        notes.push(
          `Also ${extra.count} extra charges averaging ${money(Math.round(extra.avg * 100) / 100)} (about ${money(Math.round(extra.perMonth))}/month). Treated as variable usage, not part of the fixed charge.`,
        );
      }
      if (!active) notes.push(`No charge since ${shortDate(lastSeen)}. It may have ended, but that is only a guess from the missing charge.`);

      // A price that changed and stayed changed is what you pay now, so it drives the estimates and forecast.
      const priceChange =
        pats.length === 1 && !resolved.aggregator && ['bill', 'subscription', 'usage'].includes(finalKind) ? detectPriceChange(best.occ) : null;
      const current = (p: Pattern) => (priceChange && p === best ? priceChange.current : p.typical);

      const monthly = resolved.aggregator || !active ? null : sortedPatterns.reduce((s, p) => s + current(p) * p.perMonth, 0);
      const allFixed = sortedPatterns.every((p) => p.fixed) || !!priceChange;
      const annual =
        monthly === null ? null : cadence === 'annual' && pats.length === 1 ? current(best) : monthly * 12;
      const amountKind: AmountKind = extra
        ? 'usage'
        : pats.length > 1
          ? new Set(sortedPatterns.map((p) => range(p.amountMin, p.amountMax))).size > 1
            ? 'multiple'
            : 'fixed'
          : best.fixed
            ? 'fixed'
            : 'range';

      const schedule: ScheduledPayment[] = sortedPatterns.map((p) => ({
        next: nextChargeDate(p),
        periodDays: p.periodDays,
        day: p.cadence === 'monthly' ? p.day : null,
        typical: current(p),
        min: p.amountMin,
        max: p.amountMax,
        fixed: p.fixed,
        spread: p.spread,
        count: p.count,
      }));

      // Why Wallex recognised it, written from the evidence it actually has.
      const cycles = best.cadence === 'monthly' ? 'months' : best.cadence === 'annual' ? 'years' : `${best.cadence} cycles`;
      const reasonParts = [
        `Seen ${best.count} times at a ${best.cadence === 'biweekly' ? 'two-week' : best.cadence} rhythm${
          best.cadence === 'monthly' && best.day ? `, around the ${ordinal(best.day)}` : ''
        }`,
        best.fixed ? `a steady ${money(best.typical)} each time` : `amounts between ${range(best.amountMin, best.amountMax)}`,
      ];
      let reason = `${reasonParts.join(', ')}.`;
      if (explicit) reason += ' The bank also tags these as recurring card purchases.';
      if (best.count >= 3 && best.fixed && best.spread <= 6) reason += ` The date and amount held steady across ${best.count} ${cycles}.`;
      if (confidence === 'new') reason += ' Only two charges so far, so this could still be a coincidence.';

      const uncertainty = resolved.aggregator
        ? `${resolved.name} is a billing wrapper that can sit in front of several different services, so Wallex cannot tell what this one is. A charge of ${amountLabel} repeats ${CADENCE_WORD[cadence].toLowerCase()}.`
        : null;

      return {
        ...common,
        paidOnCard: from.length > 0 && from.filter((o) => creditIds.has(o.t.accountId)).length * 2 > from.length,
        charges: from === occ ? charges : [...from].sort((a, b) => b.day - a.day).map((o) => o.t),
        firstDate: [...from].sort((a, b) => a.day - b.day)[0].t.date,
        lastCharge: (() => {
          const latest = [...from].sort((a, b) => b.day - a.day)[0];
          return { date: latest.t.date, amount: latest.amount };
        })(),
        id,
        name,
        schedule,
        kind: finalKind,
        confidence,
        amountLabel: priceChange ? money(priceChange.current) : amountLabel,
        cadenceLabel,
        summary: `${KIND_SUMMARY[finalKind]} · ${from.length} charges`,
        monthly,
        active,
        notes,
        cadence,
        amountKind: priceChange && amountKind === 'range' ? 'fixed' : amountKind,
        typical: pats.length === 1 ? current(best) : null,
        annual,
        annualApprox: annual !== null && (!allFixed || !!extra || pats.length > 1),
        usage: extra
          ? { count: extra.count, avg: extra.avg, perMonth: extra.perMonth, combinedMonthly: monthly === null ? null : monthly + extra.perMonth }
          : null,
        status: !active ? 'possibly-ended' : confidence === 'review' ? 'review' : confidence === 'new' ? 'new' : 'active',
        nextExpected: nextExpectedFor(schedule, confidence, active, today),
        priceChange,
        reason,
        uncertainty,
      };
    };

    if (resolved.aggregator && patterns.length > 1) {
      const sortedPatterns = [...patterns].sort((a, b) => b.typical - a.typical);
      for (const p of sortedPatterns) {
        const label = range(p.amountMin, p.amountMax);
        items.push(build(`${key}#${Math.round(p.typical * 100)}`, `${resolved.name} · ${label}`, [p], p.occ, null));
      }
    } else {
      items.push(build(key, resolved.name, patterns, occ, variable));
    }
  }

  items.sort((a, b) => {
    const c = CONFIDENCE_ORDER.indexOf(a.confidence) - CONFIDENCE_ORDER.indexOf(b.confidence);
    return c !== 0 ? c : (b.monthly ?? 0) - (a.monthly ?? 0) || a.name.localeCompare(b.name);
  });

  const counts: Record<Confidence, number> = { confirmed: 0, likely: 0, new: 0, review: 0, habit: 0 };
  for (const i of items) counts[i.confidence]++;

  const counted = items.filter((i) => i.active && i.monthly && i.confidence !== 'review' && i.confidence !== 'habit');
  return {
    items,
    counts,
    monthlyTotal: counted.reduce((s, i) => s + (i.monthly ?? 0), 0),
    earliest: dates[0] ?? null,
    latest: dates[dates.length - 1] ?? null,
    monthsOfHistory: dates.length ? (latestDay - epochDay(dates[0])) / 30.4 : 0,
  };
}
