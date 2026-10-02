import { epochDay, isIncome, isMoneyIn, isoDaysAgo, isoFromEpochDay, makeScope, DEFAULT_FILTERS, type PatternScope } from './patterns';
import { projectNext, stepSchedule, type Analysis, type Recurring } from './recurring';
import type { LinkedAccount, Txn } from './wallex';

// The numbers behind the Overview screen. Everything here is plain calculation (no wording or
// formatting) and works from the same rules as Patterns: the scope from makeScope decides which
// transactions count as spending, so credit card payments and moves between your own accounts are
// never counted a second time, and Overview and Patterns agree for the same period.

export type OverviewDays = 30 | 60 | 90;

// All linked accounts, over the last `days` days.
export const overviewScope = (txns: Txn[], accounts: LinkedAccount[], days: OverviewDays): PatternScope =>
  makeScope(txns, accounts, { ...DEFAULT_FILTERS, days, account: 'all' });

// ---------------------------------------------------------------------------------------------
// Current position
// ---------------------------------------------------------------------------------------------

export interface CashPosition {
  cash: number | null; // what is in checking and savings (available where the bank reports it)
  cashAccounts: LinkedAccount[];
  cardsOwed: number | null; // balances owed on credit cards, kept apart from cash on purpose
  cardAccounts: LinkedAccount[];
}

const isCash = (a: LinkedAccount) => a.type === 'depository' || (!a.type && (a.subtype === 'checking' || a.subtype === 'savings'));
const isCard = (a: LinkedAccount) => a.type === 'credit';

// Cash and card debt are different kinds of number, so they are never added together. Loans and
// investments are left out.
export function cashPosition(accounts: LinkedAccount[]): CashPosition {
  const cashAccounts = accounts.filter(isCash);
  const cardAccounts = accounts.filter(isCard);
  const amounts = cashAccounts.map((a) => a.available ?? a.current).filter((n): n is number => n !== null);
  const owed = cardAccounts.map((a) => a.current).filter((n): n is number => n !== null);
  return {
    cash: amounts.length ? amounts.reduce((s, n) => s + n, 0) : null,
    cashAccounts,
    cardsOwed: owed.length ? owed.reduce((s, n) => s + n, 0) : null,
    cardAccounts,
  };
}

// ---------------------------------------------------------------------------------------------
// Money in, money out
// ---------------------------------------------------------------------------------------------

export interface Flow {
  moneyIn: number;
  income: number; // the part of money in that is pay (what Patterns calls monthly income, before scaling to a month)
  moneyOut: number;
  net: number;
  savingsRate: number | null; // net / money in, null when nothing came in
  count: number;
  pending: number; // how many of the counted transactions have not posted yet
}

// Money in and money out come from one pass over one list, so they can never come from different data.
export function flowBetween(txns: Txn[], scope: PatternScope, from: string, to: string | null = null): Flow {
  let moneyIn = 0;
  let income = 0;
  let moneyOut = 0;
  let count = 0;
  let pending = 0;
  for (const t of txns) {
    if (t.date < from || (to !== null && t.date > to)) continue;
    if (isMoneyIn(t, scope)) {
      moneyIn += t.amount;
      if (isIncome(t, scope)) income += t.amount;
    } else if (scope.isSpending(t)) {
      moneyOut += -t.amount;
    } else {
      continue;
    }
    count += 1;
    if (t.pending) pending += 1;
  }
  const net = moneyIn - moneyOut;
  return { moneyIn, income, moneyOut, net, savingsRate: moneyIn > 0 ? net / moneyIn : null, count, pending };
}

export const periodFlow = (txns: Txn[], scope: PatternScope): Flow => flowBetween(txns, scope, scope.start);

// ---------------------------------------------------------------------------------------------
// Cash-flow history
// ---------------------------------------------------------------------------------------------

export interface FlowBucket extends Flow {
  key: string;
  label: string; // "Sep" or "Oct 1"
  longLabel: string; // "September 2026" or "Week of Oct 1"
  start: string;
  end: string;
  partial: 'start' | 'current' | null; // history begins mid-bucket, or the bucket is still running
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const shortDate = (iso: string) => `${MONTH_SHORT[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;

const monthStart = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}-01`;
const monthEnd = (y: number, m: number) =>
  `${y}-${String(m).padStart(2, '0')}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`;

// Calendar months from the first transaction to today.
export function monthsOfHistory(scope: PatternScope): number {
  if (!scope.historyStart) return 0;
  const [y0, m0] = scope.historyStart.split('-').map(Number);
  const [y1, m1] = scope.today.split('-').map(Number);
  return (y1 - y0) * 12 + (m1 - m0) + 1;
}

// Which "3M / 6M / 12M" choices the history can honestly support.
export const rangeOptions = (scope: PatternScope): number[] => {
  const have = monthsOfHistory(scope);
  return [3, 6, 12].filter((n) => have >= n);
};

export function monthlyBuckets(txns: Txn[], scope: PatternScope, months: number): FlowBucket[] {
  const [ty, tm] = scope.today.split('-').map(Number);
  const out: FlowBucket[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const idx = ty * 12 + (tm - 1) - i;
    const y = Math.floor(idx / 12);
    const m = (idx % 12) + 1;
    const start = monthStart(y, m);
    const end = monthEnd(y, m);
    if (scope.historyStart && end < scope.historyStart) continue;
    const startsMidMonth = scope.historyStart !== null && epochDay(scope.historyStart) > epochDay(start) + 2;
    out.push({
      ...flowBetween(txns, scope, start, end),
      key: `${y}-${m}`,
      label: MONTH_SHORT[m - 1],
      longLabel: `${MONTH_LONG[m - 1]} ${y}`,
      start,
      end,
      partial: y === ty && m === tm ? 'current' : startsMidMonth ? 'start' : null,
    });
  }
  return out;
}

// With less than three months of history, weeks are the honest bucket.
export function weeklyBuckets(txns: Txn[], scope: PatternScope, weeks = 8): FlowBucket[] {
  const today = epochDay(scope.today);
  const out: FlowBucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const endDay = today - i * 7;
    const startDay = endDay - 6;
    const start = isoFromEpochDay(startDay);
    const end = isoFromEpochDay(endDay);
    if (scope.historyStart && end < scope.historyStart) continue;
    out.push({
      ...flowBetween(txns, scope, start, end),
      key: start,
      label: shortDate(start),
      longLabel: `Week of ${shortDate(start)}`,
      start,
      end,
      partial: scope.historyStart && start < scope.historyStart ? 'start' : null,
    });
  }
  return out;
}

// Savings rate across the buckets that cover a whole period (a month still running or cut short
// at the start would skew it).
export function savingsOver(buckets: FlowBucket[]): { rate: number | null; net: number; buckets: number } {
  const whole = buckets.filter((b) => b.partial === null);
  const moneyIn = whole.reduce((s, b) => s + b.moneyIn, 0);
  const net = whole.reduce((s, b) => s + b.net, 0);
  return { rate: moneyIn > 0 ? net / moneyIn : null, net, buckets: whole.length };
}

// ---------------------------------------------------------------------------------------------
// Month-end cash balances
// ---------------------------------------------------------------------------------------------

export interface MonthEnd {
  month: string; // YYYY-MM
  label: string;
  balance: number;
}

// Plaid only reports today's balance. Walking back from it is exact, because each posted transaction
// moved the balance by its amount: the balance on a past day is today's balance minus everything that
// posted after that day. Pending transactions are not in the ledger balance, so they are left out, and
// only months the history covers completely are used.
export function monthEndBalances(txns: Txn[], accounts: LinkedAccount[], scope: PatternScope): MonthEnd[] {
  const cash = accounts.filter(isCash);
  if (!cash.length || cash.some((a) => a.current === null) || !scope.historyStart) return [];
  const ids = new Set(cash.map((a) => a.id));
  const todayBalance = cash.reduce((s, a) => s + (a.current as number), 0);
  const posted = txns.filter((t) => ids.has(t.accountId) && !t.pending);

  const [ty, tm] = scope.today.split('-').map(Number);
  const out: MonthEnd[] = [];
  for (let i = 1; i <= 12; i++) {
    const idx = ty * 12 + (tm - 1) - i;
    const y = Math.floor(idx / 12);
    const m = (idx % 12) + 1;
    if (epochDay(scope.historyStart) > epochDay(monthStart(y, m)) + 2) break;
    const end = monthEnd(y, m);
    const after = posted.reduce((s, t) => (t.date > end ? s + t.amount : s), 0);
    out.unshift({ month: `${y}-${String(m).padStart(2, '0')}`, label: MONTH_SHORT[m - 1], balance: todayBalance - after });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Bank fees
// ---------------------------------------------------------------------------------------------

const FEE_TYPE: Record<string, string> = {
  BANK_FEES_OVERDRAFT_FEES: 'Overdraft',
  BANK_FEES_ATM_FEES: 'ATM',
  BANK_FEES_INSUFFICIENT_FUNDS: 'Insufficient funds',
  BANK_FEES_FOREIGN_TRANSACTION_FEES: 'Foreign transaction',
  BANK_FEES_OTHER_BANK_FEES: 'Other',
};

// Only what the bank's own category says is a fee. Nothing is matched on merchant names, so an
// ordinary purchase cannot be mistaken for one. Interest is a cost of borrowing, not a fee.
export const isBankFee = (t: Txn) => t.categoryKey === 'BANK_FEES' && t.categoryDetailKey !== 'BANK_FEES_INTEREST_CHARGE';

export interface BankFees {
  total: number;
  count: number;
  types: string[];
}

export function bankFees(txns: Txn[], scope: PatternScope): BankFees {
  let total = 0;
  let count = 0;
  const types = new Set<string>();
  for (const t of txns) {
    if (!scope.inView(t) || !scope.isSpending(t) || !isBankFee(t)) continue;
    total += -t.amount;
    count += 1;
    types.add(FEE_TYPE[t.categoryDetailKey] ?? 'Fee');
  }
  return { total, count, types: [...types] };
}

// ---------------------------------------------------------------------------------------------
// Recurring commitments
// ---------------------------------------------------------------------------------------------

export interface CommitmentGroup {
  count: number;
  monthly: number; // estimated dollars per month
}

// How many active charges are left out of the upcoming list because your card payment covers them.
export const coveredByCardPayment = (analysis: Analysis): number => {
  const cardIsPaid = analysis.items.some((r) => isCommitment(r) && r.settlement === 'card');
  return cardIsPaid ? analysis.items.filter((r) => isCommitment(r) && r.paidOnCard && r.kind !== 'habit' && r.kind !== 'aggregator').length : 0;
};

export interface Commitments {
  bills: CommitmentGroup;
  debt: CommitmentGroup; // debt repayments and instalments
  subscriptions: CommitmentGroup;
  unidentified: number; // recurring-looking charges hidden behind PayPal, Apple and the like
}

// Counted when the detector is reasonably sure the relationship is real and still running.
const SOLID = new Set(['confirmed', 'likely', 'new']);
export const isCommitment = (r: Recurring) => r.active && SOLID.has(r.confidence);

export function commitments(analysis: Analysis): Commitments {
  const group = (kinds: Recurring['kind'][]): CommitmentGroup => {
    const items = analysis.items.filter((r) => isCommitment(r) && kinds.includes(r.kind));
    return { count: items.length, monthly: items.reduce((s, r) => s + (r.monthly ?? 0), 0) };
  };
  return {
    bills: group(['bill']),
    debt: group(['debt', 'installment']),
    subscriptions: group(['subscription', 'usage']),
    unidentified: analysis.items.filter((r) => r.confidence === 'review' && r.active).length,
  };
}

// ---------------------------------------------------------------------------------------------
// Upcoming payments
// ---------------------------------------------------------------------------------------------

export interface UpcomingPayment {
  id: string;
  name: string;
  logos: string[];
  kind: Recurring['kind'];
  date: string; // most likely day
  earliest: string;
  latest: string;
  amount: number;
  amountApprox: boolean; // the amount varies from charge to charge
  dateApprox: boolean; // the day varies from month to month
}

// The recurring payments expected in the next `windowDays`, soonest first. A weekly payment can
// appear several times. Charges that are due but have not appeared yet are shown as due today.
export function upcomingPayments(analysis: Analysis, today: string, windowDays = 30): UpcomingPayment[] {
  const end = isoFromEpochDay(epochDay(today) + windowDays);
  const out: UpcomingPayment[] = [];
  const cardIsPaid = analysis.items.some((r) => isCommitment(r) && r.settlement === 'card');
  for (const r of analysis.items) {
    if (!isCommitment(r) || r.kind === 'habit' || r.kind === 'aggregator') continue;
    // A charge on a credit card reaches your cash through the card payment, which is already in the list.
    if (r.paidOnCard && cardIsPaid) continue;
    for (const s of r.schedule) {
      // A charge whose date wanders by more than ~10 days has no dependable due date to show.
      if (s.spread > 10) continue;
      let date = projectNext(s, today);
      let guard = 0;
      while (date <= end && guard++ < 10) {
        const half = Math.floor(s.spread / 2);
        out.push({
          id: `${r.id}-${date}`,
          name: r.name,
          logos: r.logos,
          kind: r.kind,
          date,
          earliest: isoFromEpochDay(Math.max(epochDay(today), epochDay(date) - half)),
          latest: isoFromEpochDay(epochDay(date) + half),
          amount: s.typical,
          amountApprox: !s.fixed,
          dateApprox: s.spread >= 2,
        });
        date = stepSchedule(date, s);
      }
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : b.amount - a.amount));
}

export interface PressureWindow {
  start: string;
  end: string;
  total: number;
  ids: Set<string>;
}

// Where payments bunch up: the 9-day stretch with the most money due, when it holds at least two
// payments and a real share of everything coming up.
export function pressureWindow(payments: UpcomingPayment[], spanDays = 9): PressureWindow | null {
  const total = payments.reduce((s, p) => s + p.amount, 0);
  let best: PressureWindow | null = null;
  for (const first of payments) {
    const last = isoFromEpochDay(epochDay(first.date) + spanDays - 1);
    const inside = payments.filter((p) => p.date >= first.date && p.date <= last);
    const sum = inside.reduce((s, p) => s + p.amount, 0);
    if (inside.length >= 2 && (!best || sum > best.total)) {
      const lastDate = inside[inside.length - 1].date;
      best = { start: first.date, end: lastDate, total: sum, ids: new Set(inside.map((p) => p.id)) };
    }
  }
  return best && best.total >= total * 0.4 ? best : null;
}

// ---------------------------------------------------------------------------------------------
// Cash buffer
// ---------------------------------------------------------------------------------------------

export interface CashBuffer {
  available: number;
  obligations: number; // known recurring payments due in the window
  remaining: number;
  windowDays: number;
  // Room for later: these need a forecast of everyday spending and deposits, which Wallex does not
  // make yet, so they stay empty rather than being guessed.
  safeToSpend: number | null;
  projectedLowest: number | null;
  coverageDays: number | null;
}

export function cashBuffer(cash: number | null, upcoming: UpcomingPayment[], windowDays: number): CashBuffer | null {
  if (cash === null) return null;
  const obligations = upcoming.reduce((s, p) => s + p.amount, 0);
  return {
    available: cash,
    obligations,
    remaining: cash - obligations,
    windowDays,
    safeToSpend: null,
    projectedLowest: null,
    coverageDays: null,
  };
}

// ---------------------------------------------------------------------------------------------
// Savings scenarios
// ---------------------------------------------------------------------------------------------

export interface Scenario {
  id: string;
  label: string;
  monthly: number; // what is spent here per month now
  count: number; // charges over the period
  fixedPercent: number | null; // 100 for "eliminate"; null when the reduction is the user's pick
}

interface Group {
  id: string;
  label: string;
  fixedPercent: number | null;
  test: (t: Txn) => boolean;
}

// Spending groups worth a what-if, defined by the bank's categories. Which ones show depends entirely
// on what the user actually spent.
const GROUPS: Group[] = [
  { id: 'fees', label: 'Bank fees', fixedPercent: 100, test: isBankFee },
  { id: 'rideshare', label: 'Rideshare', fixedPercent: null, test: (t) => t.categoryDetailKey === 'TRANSPORTATION_TAXIS_AND_RIDE_SHARES' },
  {
    id: 'dining',
    label: 'Restaurants, fast food & coffee',
    fixedPercent: null,
    test: (t) => ['FOOD_AND_DRINK_RESTAURANT', 'FOOD_AND_DRINK_FAST_FOOD', 'FOOD_AND_DRINK_COFFEE'].includes(t.categoryDetailKey),
  },
  { id: 'bars', label: 'Bars & liquor', fixedPercent: null, test: (t) => t.categoryDetailKey === 'FOOD_AND_DRINK_BEER_WINE_AND_LIQUOR' },
  { id: 'shopping', label: 'Shopping', fixedPercent: null, test: (t) => t.categoryKey === 'GENERAL_MERCHANDISE' },
  { id: 'entertainment', label: 'Entertainment', fixedPercent: null, test: (t) => t.categoryKey === 'ENTERTAINMENT' },
];

export function scenarios(txns: Txn[], scope: PatternScope): Scenario[] {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const t of txns) {
    if (!scope.inView(t) || !scope.isSpending(t)) continue;
    const g = GROUPS.find((x) => x.test(t));
    if (!g) continue;
    const cur = totals.get(g.id) ?? { sum: 0, count: 0 };
    cur.sum += -t.amount;
    cur.count += 1;
    totals.set(g.id, cur);
  }
  return GROUPS.filter((g) => (totals.get(g.id)?.sum ?? 0) > 0)
    .map((g) => ({
      id: g.id,
      label: g.label,
      monthly: (totals.get(g.id)!.sum) * scope.toMonthly,
      count: totals.get(g.id)!.count,
      fixedPercent: g.fixedPercent,
    }))
    .sort((a, b) => b.monthly - a.monthly);
}

export const savingFor = (s: Scenario, percent: number) => s.monthly * ((s.fixedPercent ?? percent) / 100);

// Used for the header line.
export const latestDate = (txns: Txn[]): string | null =>
  txns.reduce<string | null>((latest, t) => (latest === null || t.date > latest ? t.date : latest), null);

export { isoDaysAgo };
