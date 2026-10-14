import { DEFAULT_FILTERS, epochDay, isIncome, isoFromEpochDay, makeScope } from './patterns';
import { merchantOf, projectNext, stepSchedule, type Analysis, type ScheduledPayment } from './recurring';
import { cashPosition, isCommitment, monthEndBalances, upcomingPayments } from './overview';
import { getRules, type Rules } from './rules';
import type { LinkedAccount, Txn } from './wallex';

// The forecast: where the cash in checking and savings is heading over the next 90 days.
//
// It is built from three things, none of them guessed beyond what the history supports:
//   1. Paydays: deposits that repeat on a schedule (weekly, every two weeks, twice a month, monthly), found from
//      the same income the Rules tab defines, and projected forward on that schedule.
//   2. Bills: the recurring payments the Recurring tab already found (corrections included), on their due dates.
//   3. Everyday spending: what is left after the bills, as a per-day amount that knows which days of the week
//      are heavier, worked out from the last 90 days.
// Plain calculation: the wording and the drawing live in the Forecast tab.

export const HORIZON = 90;
export const PAST_DAYS = 18; // days of real balance drawn before today

export type PaydayCadence = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';

export interface Payday {
  key: string;
  name: string;
  logos: string[];
  cadence: PaydayCadence;
  typical: number; // the usual deposit
  approx: boolean; // the amount varies from deposit to deposit
  last: string; // the latest deposit seen
  next: string; // the next one expected
  count: number; // deposits the pattern is based on
  schedules: ScheduledPayment[];
}

export interface ForecastEvent {
  id: string;
  date: string; // the day it is expected
  day: number; // days from today it reaches the balance (1 is tomorrow; anything due today or late lands there)
  kind: 'income' | 'bill';
  name: string;
  logos: string[];
  amount: number; // always positive
  approx: boolean;
  billKind?: string; // for a bill, what the Recurring tab calls it (bill, subscription, debt...)
}

export interface ForecastPoint {
  day: number; // 0 is today; negative days are the real past
  date: string;
  balance: number;
  low: number; // the typical range around the projection (the same as balance for the past)
  high: number;
  actual: boolean;
}

export interface EverydayModel {
  perDay: number; // average everyday spending a day
  byWeekday: number[]; // Sunday first
  windowDays: number; // days of history it is based on
  confidence: 'low' | 'medium' | 'good';
}

export interface Forecast {
  today: string;
  cash: number;
  points: ForecastPoint[]; // from PAST_DAYS ago to HORIZON ahead
  events: ForecastEvent[];
  paydays: Payday[];
  everyday: EverydayModel;
  lastMonthEnd: number | null; // the balance at the end of last month, when the history reaches it
}

const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// 0 is Sunday. Day 0 of the epoch was a Thursday.
const weekdayOf = (day: number) => (((day + 4) % 7) + 7) % 7;
const domOf = (iso: string) => Number(iso.slice(8, 10));

// ---------------------------------------------------------------------------------------------
// Paydays
// ---------------------------------------------------------------------------------------------

const PERIOD: Record<PaydayCadence, number> = { weekly: 7, biweekly: 14, semimonthly: 15, monthly: 30 };

function cadenceOf(days: number[], doms: number[]): PaydayCadence | null {
  const gaps = days.slice(1).map((d, i) => d - days[i]);
  const med = median(gaps);
  const share = (lo: number, hi: number) => gaps.filter((g) => g >= lo && g <= hi).length / gaps.length;
  if (med >= 6 && med <= 8 && share(5, 9) >= 0.7) return 'weekly';
  if (med >= 12 && med <= 18 && share(11, 19) >= 0.7) {
    // Twice a month lands on the same two days each month; every two weeks drifts through the month.
    const ends = doms.map((d) => (d >= 28 ? 31 : d)).sort((a, b) => a - b);
    const clusters: number[][] = [];
    for (const d of ends) {
      const last = clusters[clusters.length - 1];
      if (last && d - last[last.length - 1] <= 3) last.push(d);
      else clusters.push([d]);
    }
    if (days.length >= 4 && clusters.length === 2 && clusters.every((c) => c[c.length - 1] - c[0] <= 3)) return 'semimonthly';
    if (med >= 13 && med <= 15) return 'biweekly';
    return null;
  }
  if (med >= 27 && med <= 34 && share(26, 35) >= 0.7) return 'monthly';
  return null;
}

// Deposits that arrive on a schedule, found from the income the Rules define. One-off deposits and ones that have
// stopped arriving are not projected.
export function detectPaydays(txns: Txn[], scope: ReturnType<typeof makeScope>, today: string): Payday[] {
  const groups = new Map<string, { name: string; logos: string[]; rows: Map<string, number> }>();
  for (const t of txns) {
    if (!isIncome(t, scope) || t.date > today) continue;
    const m = merchantOf(t);
    const g = groups.get(m.key) ?? { name: m.name, logos: t.logos, rows: new Map() };
    g.rows.set(t.date, (g.rows.get(t.date) ?? 0) + t.amount);
    groups.set(m.key, g);
  }

  const out: Payday[] = [];
  for (const [key, g] of groups) {
    const rows = [...g.rows.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-12);
    if (rows.length < 3) continue;
    const days = rows.map(([d]) => epochDay(d));
    const doms = rows.map(([d]) => domOf(d));
    const cadence = cadenceOf(days, doms);
    if (!cadence) continue;

    const last = rows[rows.length - 1][0];
    const period = PERIOD[cadence];
    // Not arriving any more.
    if (epochDay(today) - days[days.length - 1] > period * 1.5 + 3) continue;

    const amounts = rows.map(([, a]) => a);
    const recent = amounts.slice(-4);
    const typical = median(recent);
    const spread = Math.max(...amounts.slice(-6)) - Math.min(...amounts.slice(-6));
    const approx = spread > 0.05 * typical;
    const base = { typical, min: Math.min(...amounts.slice(-6)), max: Math.max(...amounts.slice(-6)), fixed: !approx, spread: 1, count: rows.length };

    const schedules: ScheduledPayment[] = [];
    if (cadence === 'weekly' || cadence === 'biweekly') {
      schedules.push({ ...base, next: isoFromEpochDay(days[days.length - 1] + period), periodDays: period, day: null });
    } else if (cadence === 'monthly') {
      const day = Math.round(median(doms));
      schedules.push({ ...base, next: stepSchedule(last, { periodDays: 30, day }), periodDays: 30, day });
    } else {
      // Twice a month: two monthly schedules, one for each of the two days.
      const split = rows.map(([d]) => ({ d, dom: domOf(d) >= 28 ? 31 : domOf(d) }));
      const cut = (Math.min(...split.map((s) => s.dom)) + Math.max(...split.map((s) => s.dom))) / 2;
      for (const side of [split.filter((s) => s.dom <= cut), split.filter((s) => s.dom > cut)]) {
        if (!side.length) continue;
        const day = Math.round(median(side.map((s) => s.dom)));
        const latest = side[side.length - 1].d;
        schedules.push({ ...base, next: stepSchedule(latest, { periodDays: 30, day }), periodDays: 30, day });
      }
    }

    const next = schedules.map((s) => projectNext(s, today)).sort()[0];
    out.push({ key, name: g.name, logos: g.logos, cadence, typical, approx, last, next, count: rows.length, schedules });
  }
  return out.sort((a, b) => b.typical - a.typical);
}

// ---------------------------------------------------------------------------------------------
// Everyday spending
// ---------------------------------------------------------------------------------------------

interface EverydayFit extends EverydayModel {
  sdWeek: number | null; // how much a week's spending usually wanders, for the typical range
}

function everydayModel(txns: Txn[], accounts: LinkedAccount[], analysis: Analysis, today: string, rules: Rules): EverydayFit {
  // Card payments are left out of the spending count here (the bills carry them), and so are the card purchases
  // themselves when a card payment is one of the bills: that payment is how they reach the cash.
  const scope = makeScope(txns, accounts, { ...DEFAULT_FILTERS, days: 90, account: 'all' }, { ...rules, countCardPayments: false });
  const commitments = analysis.items.filter((r) => isCommitment(r) && r.kind !== 'habit' && r.kind !== 'aggregator');
  const billCharges = new Set(commitments.flatMap((r) => r.charges.map((c) => c.id)));
  const cardCovered = commitments.some((r) => r.settlement === 'card');

  const todayDay = epochDay(today);
  const startDay = epochDay(scope.partial && scope.historyStart ? scope.historyStart : scope.start);
  const windowDays = Math.max(0, todayDay - startDay); // up to yesterday: today is not over yet

  const rows = txns.filter(
    (t) =>
      scope.accountOk(t) &&
      epochDay(t.date) >= startDay &&
      epochDay(t.date) < todayDay &&
      scope.isSpending(t) &&
      !billCharges.has(t.id) &&
      !(cardCovered && scope.creditIds.has(t.accountId)),
  );

  // One unusually large purchase should not set the daily rate for the next three months.
  const cap = Math.max(250, 6 * median(rows.length ? rows.map((t) => -t.amount) : [0]));
  const perDate = new Map<number, number>();
  for (const t of rows) perDate.set(epochDay(t.date), (perDate.get(epochDay(t.date)) ?? 0) + Math.min(-t.amount, cap));

  const total = [...perDate.values()].reduce((s, n) => s + n, 0);
  const overall = windowDays > 0 ? total / windowDays : 0;

  // Each weekday's own average, pulled toward the overall one while there are few of that weekday to learn from.
  const sums = Array(7).fill(0) as number[];
  const counts = Array(7).fill(0) as number[];
  for (let d = startDay; d < todayDay; d++) counts[weekdayOf(d)] += 1;
  for (const [d, v] of perDate) sums[weekdayOf(d)] += v;
  const byWeekday = sums.map((s, w) => (counts[w] ? ((s / counts[w]) * counts[w] + overall * 4) / (counts[w] + 4) : overall));

  // How much a whole week's spending wanders from week to week.
  const weeks: number[] = [];
  for (let end = todayDay - 1; end - 6 >= startDay; end -= 7) {
    let sum = 0;
    for (let d = end - 6; d <= end; d++) sum += perDate.get(d) ?? 0;
    weeks.push(sum);
  }
  let sdWeek: number | null = null;
  if (weeks.length >= 3) {
    const mean = weeks.reduce((s, n) => s + n, 0) / weeks.length;
    sdWeek = Math.sqrt(weeks.reduce((s, n) => s + (n - mean) ** 2, 0) / (weeks.length - 1));
  }

  return {
    perDay: overall,
    byWeekday,
    windowDays,
    confidence: windowDays < 21 ? 'low' : windowDays < 45 ? 'medium' : 'good',
    sdWeek,
  };
}

// ---------------------------------------------------------------------------------------------
// The forecast
// ---------------------------------------------------------------------------------------------

// null when there is no checking or savings balance to start from.
export function buildForecast(
  txns: Txn[],
  accounts: LinkedAccount[],
  analysis: Analysis,
  today: string,
  rules: Rules = getRules(),
): Forecast | null {
  const position = cashPosition(accounts);
  if (position.cash === null) return null;
  const cash = position.cash;
  const todayDay = epochDay(today);
  const end = isoFromEpochDay(todayDay + HORIZON);

  // Paydays use the income the Rules define; merchants the person ignores are not bills.
  const incomeScope = makeScope(txns, accounts, { ...DEFAULT_FILTERS, days: 90, account: 'all' }, rules);
  const paydays = detectPaydays(txns, incomeScope, today);
  const ignored = new Set(rules.ignoredMerchants);
  const bills = upcomingPayments({ ...analysis, items: analysis.items.filter((r) => !ignored.has(r.id)) }, today, HORIZON);

  const dayIndex = (date: string) => Math.min(HORIZON, Math.max(1, epochDay(date) - todayDay));
  const events: ForecastEvent[] = [];
  for (const b of bills) {
    events.push({ id: `bill-${b.id}`, date: b.date, day: dayIndex(b.date), kind: 'bill', name: b.name, logos: b.logos, amount: b.amount, approx: b.amountApprox, billKind: b.kind });
  }
  for (const p of paydays) {
    for (const [i, s] of p.schedules.entries()) {
      let date = projectNext(s, today);
      let guard = 0;
      while (date <= end && guard++ < 40) {
        events.push({ id: `income-${p.key}-${i}-${date}`, date, day: dayIndex(date), kind: 'income', name: p.name, logos: p.logos, amount: p.typical, approx: p.approx });
        date = stepSchedule(date, s);
      }
    }
  }
  events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.kind === 'income' ? -1 : 1));

  const everyday = everydayModel(txns, accounts, analysis, today, rules);

  // The real past: today's balance with each later transaction taken back out.
  const cashIds = new Set(position.cashAccounts.map((a) => a.id));
  const cashTxns = txns.filter((t) => cashIds.has(t.accountId));
  const points: ForecastPoint[] = [];
  for (let d = -PAST_DAYS; d <= 0; d++) {
    const date = isoFromEpochDay(todayDay + d);
    const balance = cash - cashTxns.reduce((s, t) => (t.date > date ? s + t.amount : s), 0);
    points.push({ day: d, date, balance, low: balance, high: balance, actual: d < 0 });
  }

  // Forward, day by day: the day's bills and paydays, then the day's everyday spending. The range around the line
  // grows with the square root of the days, since each day's spending is its own bit of luck.
  const dailySd = (everyday.sdWeek !== null ? everyday.sdWeek / Math.sqrt(7) : everyday.perDay * 0.6) || 0;
  let balance = cash;
  let variance = 0;
  for (let d = 1; d <= HORIZON; d++) {
    for (const e of events) {
      if (e.day !== d) continue;
      balance += e.kind === 'income' ? e.amount : -e.amount;
      if (e.approx) variance += (0.1 * e.amount) ** 2;
    }
    balance -= everyday.byWeekday[weekdayOf(todayDay + d)];
    variance += dailySd ** 2;
    const sd = Math.sqrt(variance);
    points.push({ day: d, date: isoFromEpochDay(todayDay + d), balance, low: balance - sd, high: balance + sd, actual: false });
  }

  const [ty, tm] = today.split('-').map(Number);
  const prev = monthEndBalances(txns, accounts, incomeScope).find((m) => m.month === (tm === 1 ? `${ty - 1}-12` : `${ty}-${String(tm - 1).padStart(2, '0')}`));

  return { today, cash, points, events, paydays, everyday, lastMonthEnd: prev?.balance ?? null };
}

// ---------------------------------------------------------------------------------------------
// Reading the forecast
// ---------------------------------------------------------------------------------------------

export const forecastDays = [7, 30, 60, 90] as const;
export type ForecastDays = (typeof forecastDays)[number];

export interface ForecastSummary {
  days: number;
  end: ForecastPoint;
  income: number;
  bills: number;
  everyday: number;
  spending: number; // bills plus everyday spending
  net: number;
  lowest: ForecastPoint;
  incomeCount: number;
  billCount: number;
}

// What happens over the next `days` days. `savedPerDay` is a what-if: everyday spending cut by that much a day.
export function summarize(f: Forecast, days: number, savedPerDay = 0): ForecastSummary {
  const todayDay = epochDay(f.today);
  const within = f.events.filter((e) => e.day <= days);
  const income = within.filter((e) => e.kind === 'income').reduce((s, e) => s + e.amount, 0);
  const bills = within.filter((e) => e.kind === 'bill').reduce((s, e) => s + e.amount, 0);
  let everyday = 0;
  for (let d = 1; d <= days; d++) everyday += Math.max(0, f.everyday.byWeekday[weekdayOf(todayDay + d)] - savedPerDay);
  const future = f.points.filter((p) => p.day >= 0 && p.day <= days).map((p) => ({ ...p, balance: p.balance + savedPerDay * p.day, low: p.low + savedPerDay * p.day, high: p.high + savedPerDay * p.day }));
  const lowest = future.reduce((m, p) => (p.balance < m.balance ? p : m), future[0]);
  return {
    days,
    end: future[future.length - 1],
    income,
    bills,
    everyday,
    spending: bills + everyday,
    net: income - bills - everyday,
    lowest,
    incomeCount: within.filter((e) => e.kind === 'income').length,
    billCount: within.filter((e) => e.kind === 'bill').length,
  };
}

export interface MonthEndForecast {
  point: ForecastPoint; // the balance on the last day of this month
  daysLeft: number;
  vsLast: { amount: number; pct: number | null } | null;
}

export function monthEndForecast(f: Forecast, savedPerDay = 0): MonthEndForecast {
  const [y, m] = f.today.split('-').map(Number);
  const lastDate = `${y}-${String(m).padStart(2, '0')}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`;
  const daysLeft = Math.max(0, epochDay(lastDate) - epochDay(f.today));
  const base = f.points.find((p) => p.day === daysLeft)!;
  const point = { ...base, balance: base.balance + savedPerDay * daysLeft, low: base.low + savedPerDay * daysLeft, high: base.high + savedPerDay * daysLeft };
  const vsLast = f.lastMonthEnd === null ? null : { amount: point.balance - f.lastMonthEnd, pct: f.lastMonthEnd !== 0 ? (point.balance - f.lastMonthEnd) / Math.abs(f.lastMonthEnd) : null };
  return { point, daysLeft, vsLast };
}

// The cash now, plus the pay expected in the next 30 days, less the bills due in that time. Everyday spending is not
// taken out, so this is what is left for it once the known money in and out is settled.
export function safeToSpend(f: Forecast) {
  const bills = f.events.filter((e) => e.kind === 'bill' && e.day <= 30);
  const pay = f.events.filter((e) => e.kind === 'income' && e.day <= 30);
  const billTotal = bills.reduce((s, e) => s + e.amount, 0);
  const incomeTotal = pay.reduce((s, e) => s + e.amount, 0);
  return { amount: f.cash + incomeTotal - billTotal, bills: billTotal, count: bills.length, income: incomeTotal, incomeCount: pay.length };
}

// The balance each day for the next 30 days counting only the pay and bills Safe to Spend counts, ending at the Safe to Spend figure.
export function safeToSpendPath(f: Forecast): number[] {
  const out: number[] = [];
  let balance = f.cash;
  for (let d = 0; d <= 30; d++) {
    for (const e of f.events) if (e.day === d && d > 0) balance += e.kind === 'income' ? e.amount : -e.amount;
    out.push(balance);
  }
  return out;
}

// The bills in the next 7 days, one bar a day starting today.
export function nextSeven(f: Forecast) {
  const todayDay = epochDay(f.today);
  const bars = Array.from({ length: 7 }, (_, i) => ({ date: isoFromEpochDay(todayDay + i), amount: 0 }));
  const due = f.events.filter((e) => e.kind === 'bill' && epochDay(e.date) <= todayDay + 6);
  for (const e of due) bars[Math.max(0, epochDay(e.date) - todayDay)].amount += e.amount;
  return { bars, total: due.reduce((s, e) => s + e.amount, 0), count: due.length };
}

// How much a day a what-if saves: a monthly saving spread over the days, never more than is spent on everyday things.
export const savedPerDay = (f: Forecast, monthlySaving: number) => Math.min(Math.max(0, monthlySaving) / 30.4375, f.everyday.perDay);

// ---------------------------------------------------------------------------------------------
// The working behind a balance
// ---------------------------------------------------------------------------------------------

export interface LedgerRow {
  id: string;
  kind: 'start' | 'income' | 'bill' | 'everyday';
  date: string; // the day, or the first day of a stretch of everyday spending
  endDate?: string; // the last day of that stretch
  span?: number; // days in that stretch
  label: string;
  logos?: string[];
  approx?: boolean;
  amount: number; // signed: money in is positive, money out negative; the start row holds the cash itself
  balance: number; // the balance after this line
  lowest?: boolean; // the lowest point of the range
}

// Every line that takes the balance from today's cash to the balance at the end of `days`, in date order, with the
// running balance after each. Everyday spending is shown as one line for each stretch between two events, so the
// rows add up exactly to the figure the forecast shows. With `stopAtLowest`, it ends at the lowest point.
export function ledger(f: Forecast, days: number, stopAtLowest = false): LedgerRow[] {
  const todayDay = epochDay(f.today);
  const last = Math.max(0, Math.min(HORIZON, days));
  const lowDay = f.points.filter((p) => p.day >= 0 && p.day <= last).reduce((m, p) => (p.balance < m.balance ? p : m)).day;
  const end = stopAtLowest ? lowDay : last;

  let balance = f.cash;
  const rows: LedgerRow[] = [{ id: 'start', kind: 'start', date: f.today, label: 'Cash available today', amount: f.cash, balance, lowest: stopAtLowest && lowDay === 0 }];
  type Span = { from: number; to: number; sum: number };
  let span = null as Span | null;
  const flush = (lowest = false) => {
    if (!span) return;
    balance -= span.sum;
    rows.push({
      id: `everyday-${span.from}`,
      kind: 'everyday',
      date: isoFromEpochDay(todayDay + span.from),
      endDate: isoFromEpochDay(todayDay + span.to),
      span: span.to - span.from + 1,
      label: 'Everyday spending',
      amount: -span.sum,
      balance,
      lowest,
    });
    span = null;
  };

  for (let d = 1; d <= end; d++) {
    const today = f.events.filter((e) => e.day === d).sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'income' ? -1 : 1));
    if (today.length) flush();
    for (const e of today) {
      balance += e.kind === 'income' ? e.amount : -e.amount;
      rows.push({ id: e.id, kind: e.kind, date: e.date, label: e.name, logos: e.logos, approx: e.approx, amount: e.kind === 'income' ? e.amount : -e.amount, balance });
    }
    const spend = f.everyday.byWeekday[weekdayOf(todayDay + d)];
    const cur = span as Span | null;
    span = cur ? { ...cur, to: d, sum: cur.sum + spend } : { from: d, to: d, sum: spend };
    if (stopAtLowest && d === lowDay) flush(true);
  }
  flush();
  return rows;
}
