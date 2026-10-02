import { epochDay, isoFromEpochDay, type Bubble, type PatternScope } from './patterns';
import { merchantOf } from './recurring';
import type { Txn } from './wallex';

// Everything the Patterns detail view says about one circle, worked out in a single pass over the
// transactions and kept free of wording and formatting (see patternFormat.ts for that).
// It reuses the scope the circles were built with, so the numbers always match the diagram and
// react to the same period, account and category filters.

export type TrendLabel = 'Increasing' | 'Decreasing' | 'Steady' | 'Spiky' | 'Intermittent';

export interface TrendBucket {
  start: string;
  end: string;
  amount: number | null; // null: there is no history for this stretch yet
}

export type PeriodChange =
  | { state: 'unavailable' } // history does not reach back far enough to compare
  | { state: 'available'; current: number; previous: number; delta: number; pct: number | null; isNew: boolean };

export interface PatternMetrics {
  total: number; // dollars over the analysed period
  monthly: number; // dollars per month, over the days actually analysed
  count: number;
  effectiveDays: number;
  partial: boolean; // the picked period is longer than the history, so these are partial-period figures
  avgTransaction: number | null; // null with fewer than two charges
  perMonth: number | null; // charges per month, null with fewer than two charges
  incomeShare: number | null; // 0..1, null when no income is known
  discretionaryShare: number | null; // 0..1, null until Wallex can tell required from discretionary
  change: PeriodChange;
  highestMonth: { month: string; label: string; amount: number } | null;
  trend: { buckets: TrendBucket[]; label: TrendLabel | null };
  credits: number; // refunds and other money back from this merchant, not subtracted from the total
  periodRows: Txn[]; // the transactions that make up the total, newest first
  historyRows: Txn[]; // everything for this circle in the chosen accounts, newest first
}

// ---------------------------------------------------------------------------------------------
// Required vs discretionary
// ---------------------------------------------------------------------------------------------

export type SpendNature = 'discretionary' | 'required' | 'unknown';

// Wallex has no reliable way to tell the two apart yet: a restaurant can be a treat or a business
// lunch, and rent sent by Zelle looks like any other payment. Rather than guess, everything is
// 'unknown', which keeps the share of discretionary spending hidden. Return 'discretionary' or
// 'required' here once there is a classification worth trusting, and the share lights up by itself.
export function spendNature(_t: Txn): SpendNature {
  return 'unknown';
}

// ---------------------------------------------------------------------------------------------
// Calculations
// ---------------------------------------------------------------------------------------------

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const TREND_BUCKETS: Record<number, number> = { 30: 6, 60: 8, 90: 9 };

// Which dollars are money back from the merchant rather than income or transfers.
const NOT_A_REFUND = new Set(['INCOME', 'TRANSFER_IN', 'LOAN_PAYMENTS']);

export function trendLabel(buckets: TrendBucket[], count: number): TrendLabel | null {
  const data = buckets.filter((b) => b.amount !== null).map((b) => b.amount as number);
  if (count < 3 || data.length < 3) return null;

  const nonZero = data.filter((v) => v > 0).length;
  if (nonZero / data.length < 0.5) return 'Intermittent';

  const mean = data.reduce((s, v) => s + v, 0) / data.length;
  const sd = Math.sqrt(data.reduce((s, v) => s + (v - mean) ** 2, 0) / data.length);
  if (mean > 0 && sd / mean > 1) return 'Spiky';

  // Direction from a least-squares line through the slices, so one odd slice or the beat of a weekly
  // habit does not read as a trend. "Total drift" is how far the line climbs across the whole period,
  // compared with the average slice.
  const n = data.length;
  const xMean = (n - 1) / 2;
  let num = 0;
  let den = 0;
  data.forEach((v, i) => {
    num += (i - xMean) * (v - mean);
    den += (i - xMean) ** 2;
  });
  const drift = mean > 0 ? ((num / den) * (n - 1)) / mean : 0;
  if (drift > 0.35) return 'Increasing';
  if (drift < -0.35) return 'Decreasing';
  return 'Steady';
}

export function computePatternMetrics(
  bubble: Bubble,
  txns: Txn[],
  scope: PatternScope,
  income: number, // per month, the same figure the centre of the diagram shows
): PatternMetrics {
  const { days, start, today, effectiveDays, historyStart, prevStart, prevAvailable, toMonthly } = scope;
  const startDay = epochDay(start);
  const bucketCount = TREND_BUCKETS[days] ?? 6;
  const sums = new Array<number>(bucketCount).fill(0);

  const matches = (t: Txn) =>
    bubble.kind === 'category' ? (t.categoryKey || 'UNCATEGORIZED') === bubble.key : merchantOf(t).key === bubble.key;

  let total = 0;
  let count = 0;
  let prevTotal = 0;
  let credits = 0;
  let discretionaryAll = 0;
  let discretionaryHere = 0;
  let anyNature = false;
  const months = new Map<string, number>();
  const periodRows: Txn[] = [];
  const historyRows: Txn[] = [];

  for (const t of txns) {
    if (!scope.accountOk(t)) continue;

    // Whole-period spending, for the discretionary share's denominator.
    if (t.date >= start && scope.isSpending(t)) {
      const nature = spendNature(t);
      if (nature !== 'unknown') {
        anyNature = true;
        if (nature === 'discretionary') discretionaryAll += -t.amount;
      }
    }

    if (!matches(t)) continue;
    historyRows.push(t);

    if (scope.isSpending(t)) {
      const spent = -t.amount;
      const month = t.date.slice(0, 7);
      months.set(month, (months.get(month) ?? 0) + spent);

      if (t.date >= start) {
        total += spent;
        count += 1;
        periodRows.push(t);
        const idx = Math.min(bucketCount - 1, Math.floor(((epochDay(t.date) - startDay) * bucketCount) / days));
        sums[idx] += spent;
        if (spendNature(t) === 'discretionary') discretionaryHere += spent;
      } else if (t.date >= prevStart) {
        prevTotal += spent;
      }
    } else if (t.amount > 0 && t.date >= start && !NOT_A_REFUND.has(t.categoryKey)) {
      credits += t.amount;
    }
  }

  const newestFirst = (a: Txn, b: Txn) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
  periodRows.sort(newestFirst);
  historyRows.sort(newestFirst);

  // Averages use the days that were really analysed, never a blind divide by 1, 2 or 3 months.
  const monthly = total * toMonthly;

  const perMonth = count >= 2 ? (count * 30) / effectiveDays : null;
  const avgTransaction = count >= 2 ? total / count : null;
  const incomeShare = income > 0 && total > 0 ? monthly / income : null;
  const discretionaryShare =
    anyNature && discretionaryAll > 0 && total > 0 && discretionaryHere === total ? total / discretionaryAll : null;

  // The period just before this one, only when history covers it.
  let change: PeriodChange = { state: 'unavailable' };
  if (prevAvailable && total + prevTotal > 0) {
    const delta = total - prevTotal;
    change = {
      state: 'available',
      current: total,
      previous: prevTotal,
      delta,
      pct: prevTotal > 0 ? delta / prevTotal : null,
      isNew: prevTotal === 0,
    };
  }

  // Highest calendar month, among months the history covers completely. A month cut short at either
  // end would look smaller than it really was.
  const thisMonth = today.slice(0, 7);
  const complete = [...months.entries()].filter(([month]) => {
    if (month >= thisMonth || historyStart === null) return false;
    return epochDay(historyStart) <= epochDay(`${month}-01`) + 2;
  });
  let highestMonth: PatternMetrics['highestMonth'] = null;
  if (complete.length >= 2) {
    const [month, amount] = complete.reduce((best, cur) => (cur[1] > best[1] ? cur : best));
    const years = new Set(complete.map(([m]) => m.slice(0, 4)));
    const name = MONTH_NAMES[Number(month.slice(5, 7)) - 1];
    highestMonth = { month, amount, label: years.size > 1 ? `${name} ${month.slice(0, 4)}` : name };
  }

  // Trend: equal slices of the picked period, oldest first. Slices before the first transaction
  // we have are "no data", not zero.
  const buckets: TrendBucket[] = sums.map((amount, i) => {
    const from = startDay + Math.floor((i * days) / bucketCount);
    const to = startDay + Math.floor(((i + 1) * days) / bucketCount) - 1;
    const hasHistory = historyStart !== null && epochDay(historyStart) <= to;
    return { start: isoFromEpochDay(from), end: isoFromEpochDay(to), amount: hasHistory ? amount : null };
  });

  return {
    total,
    monthly,
    count,
    effectiveDays,
    partial: scope.partial,
    avgTransaction,
    perMonth,
    incomeShare,
    discretionaryShare,
    change,
    highestMonth,
    trend: { buckets, label: trendLabel(buckets, count) },
    credits,
    periodRows,
    historyRows,
  };
}
