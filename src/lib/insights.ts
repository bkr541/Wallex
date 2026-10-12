import { CATEGORY_COLORS, categoryName, epochDay, isoFromEpochDay, type PatternScope } from './patterns';
import { nextSeven, type Forecast } from './forecast';
import { bankFees, overviewScope, savingFor, scenarios } from './overview';
import { money } from './patternFormat';
import type { Analysis } from './recurring';
import type { Rules } from './rules';
import type { LinkedAccount, Txn } from './wallex';

// The numbers and written notices behind the Insights tab: how this month's spending compares with a usual month,
// where the money went, the savings on offer, and plain-language things worth knowing. Every one is worked out from
// the person's own transactions; nothing is guessed.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const short = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;
const pad = (n: number) => String(n).padStart(2, '0');
const monthStart = (y: number, m: number) => `${y}-${pad(m)}-01`; // m is 1-12, and may run past either end of the year
const norm = (y: number, m: number): [number, number] => [y + Math.floor((m - 1) / 12), ((((m - 1) % 12) + 12) % 12) + 1];
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const word = (n: number) => WORDS[n] ?? String(n);

const spendingScope = (txns: Txn[], accounts: LinkedAccount[], rules: Rules) => overviewScope(txns, accounts, 365, rules);

function spentBetween(txns: Txn[], scope: PatternScope, from: string, to: string, key?: string) {
  let sum = 0;
  for (const t of txns) {
    if (t.date < from || t.date > to || !scope.accountOk(t) || !scope.isSpending(t)) continue;
    if (key !== undefined && t.categoryKey !== key) continue;
    sum -= t.amount;
  }
  return sum;
}

// ---------------------------------------------------------------------------------------------
// Spending pace
// ---------------------------------------------------------------------------------------------

export interface SpendingPace {
  spent: number; // so far this month
  usual: number; // what was spent by this day of the month, on average, in up to the last three months
  months: number; // how many earlier months the usual figure is built from
  diff: number; // spent - usual
  pct: number; // diff / usual
  day: number;
}

export function spendingPace(txns: Txn[], accounts: LinkedAccount[], rules: Rules, today: string): SpendingPace | null {
  const scope = spendingScope(txns, accounts, rules);
  const [y, m, d] = today.split('-').map(Number);
  const spent = spentBetween(txns, scope, monthStart(y, m), today);
  const usuals: number[] = [];
  for (let k = 1; k <= 3; k++) {
    const [py, pm] = norm(y, m - k);
    const start = monthStart(py, pm);
    // Only a month the history covers from its first day can say what was spent by this day.
    if (!scope.historyStart || epochDay(scope.historyStart) > epochDay(start) + 2) break;
    const end = `${py}-${pad(pm)}-${pad(Math.min(d, daysIn(py, pm)))}`;
    usuals.push(spentBetween(txns, scope, start, end));
  }
  if (!usuals.length) return null;
  const usual = usuals.reduce((s, n) => s + n, 0) / usuals.length;
  if (usual < 1) return null;
  return { spent, usual, months: usuals.length, diff: spent - usual, pct: (spent - usual) / usual, day: d };
}

// ---------------------------------------------------------------------------------------------
// Where the money went
// ---------------------------------------------------------------------------------------------

export type CategoryPeriod = 'month' | 'last-month' | '30' | '90';
export const CATEGORY_PERIODS: { id: CategoryPeriod; label: string }[] = [
  { id: 'month', label: 'This month' },
  { id: 'last-month', label: 'Last month' },
  { id: '30', label: 'Last 30 days' },
  { id: '90', label: 'Last 90 days' },
];

export interface CategoryRow {
  key: string;
  label: string;
  amount: number;
  rgb: string;
}

const periodRange = (period: CategoryPeriod, today: string): [string, string] => {
  const [y, m] = today.split('-').map(Number);
  if (period === 'month') return [monthStart(y, m), today];
  if (period === 'last-month') {
    const [py, pm] = norm(y, m - 1);
    return [monthStart(py, pm), `${py}-${pad(pm)}-${pad(daysIn(py, pm))}`];
  }
  const days = period === '30' ? 30 : 90;
  return [isoFromEpochDay(epochDay(today) - (days - 1)), today];
};

export function topCategories(txns: Txn[], accounts: LinkedAccount[], rules: Rules, today: string, period: CategoryPeriod, limit = 6) {
  const scope = spendingScope(txns, accounts, rules);
  const [from, to] = periodRange(period, today);
  const map = new Map<string, CategoryRow>();
  let total = 0;
  for (const t of txns) {
    if (t.date < from || t.date > to || !scope.accountOk(t) || !scope.isSpending(t)) continue;
    const key = t.categoryKey || 'UNCATEGORIZED';
    const row = map.get(key) ?? { key, label: categoryName(t.category.split(' › ')[0] || 'Uncategorized'), amount: 0, rgb: CATEGORY_COLORS[key] ?? '148, 163, 184' };
    row.amount -= t.amount;
    total -= t.amount;
    map.set(key, row);
  }
  const rows = [...map.values()].filter((r) => r.amount > 0).sort((a, b) => b.amount - a.amount);
  return { rows: rows.slice(0, limit), total, from, to, hidden: Math.max(0, rows.length - limit) };
}

// ---------------------------------------------------------------------------------------------
// Savings on offer
// ---------------------------------------------------------------------------------------------

export interface SavingsIdea {
  id: string;
  label: string;
  monthly: number; // what it would save a month
  area: string; // the spending area in lower case, for a sentence
  fixed: boolean; // cut out entirely rather than reduced
  basis: string; // the plain reason
  kind: 'cut' | 'subscriptions';
}

export interface Savings {
  monthly: number; // the sum of the spending cuts
  yearly: number;
  percent: number;
  ideas: SavingsIdea[]; // biggest first
  spendingPerMonth: number; // what is spent in the areas above, to size the headline against
}

// A cut of `percent` in each area Wallex can model, plus the subscriptions worth a look. The headline counts only the
// cuts: cancelling is the person's choice, so the subscriptions are listed beside it rather than added to it.
export function savingsIdeas(txns: Txn[], accounts: LinkedAccount[], analysis: Analysis, rules: Rules, percent = 20): Savings {
  const scope90 = overviewScope(txns, accounts, 90, rules);
  const cuts: SavingsIdea[] = scenarios(txns, scope90).map((s) => ({
    id: s.id,
    label: s.fixedPercent === 100 ? `Avoid ${s.label.toLowerCase()}` : `Reduce ${s.label.toLowerCase()}`,
    area: s.label.toLowerCase(),
    fixed: s.fixedPercent === 100,
    monthly: savingFor(s, percent),
    basis: s.fixedPercent === 100 ? `${money(s.monthly)}/mo in ${s.count} ${s.count === 1 ? 'charge' : 'charges'}` : `Based on a ${percent}% cut from ${money(s.monthly)}/mo`,
    kind: 'cut' as const,
  }));
  const subs = analysis.items.filter((r) => r.active && r.kind === 'subscription' && r.monthly && r.confidence !== 'review' && r.confidence !== 'habit');
  const ideas = [...cuts];
  if (subs.length) {
    const monthly = subs.reduce((s, r) => s + (r.monthly ?? 0), 0);
    ideas.push({ id: 'subscriptions', label: 'Review subscriptions', area: 'subscriptions', fixed: false, monthly, basis: `${subs.length} recurring ${subs.length === 1 ? 'service' : 'services'} worth a look`, kind: 'subscriptions' });
  }
  ideas.sort((a, b) => b.monthly - a.monthly);
  const monthly = cuts.reduce((s, i) => s + i.monthly, 0);
  const spendingPerMonth = scenarios(txns, scope90).reduce((s, x) => s + x.monthly, 0);
  return { monthly, yearly: monthly * 12, percent, ideas, spendingPerMonth };
}

// ---------------------------------------------------------------------------------------------
// Daily insights
// ---------------------------------------------------------------------------------------------

export type InsightIcon = 'down' | 'up' | 'calendar' | 'alert' | 'lightbulb' | 'tag' | 'repeat' | 'banknote';

export interface Insight {
  id: string;
  icon: InsightIcon;
  tone: 'good' | 'warn' | 'info';
  text: string;
  to: { page: string; tab?: string };
}

export function dailyInsights(args: {
  txns: Txn[];
  accounts: LinkedAccount[];
  analysis: Analysis;
  forecast: Forecast | null;
  rules: Rules;
  today: string;
  pace: SpendingPace | null;
  savings: Savings;
}): Insight[] {
  const { txns, accounts, analysis, forecast, rules, today, pace, savings } = args;
  const scope = spendingScope(txns, accounts, rules);
  const out: Insight[] = [];
  const todayDay = epochDay(today);

  // Overall pace.
  if (pace && Math.abs(pace.pct) >= 0.05) {
    const p = Math.round(Math.abs(pace.pct) * 100);
    out.push(
      pace.pct < 0
        ? { id: 'pace', icon: 'down', tone: 'good', text: `You’re ${p}% under your usual spending pace this month.`, to: { page: 'patterns' } }
        : { id: 'pace', icon: 'up', tone: 'warn', text: `You’re ${p}% over your usual spending pace this month.`, to: { page: 'patterns' } },
    );
  }

  // Categories that moved against the same days last month.
  if (pace) {
    const [y, m, d] = today.split('-').map(Number);
    const [py, pm] = norm(y, m - 1);
    const lastStart = monthStart(py, pm);
    const lastEnd = `${py}-${pad(pm)}-${pad(Math.min(d, daysIn(py, pm)))}`;
    const covered = scope.historyStart && epochDay(scope.historyStart) <= epochDay(lastStart) + 2;
    if (covered) {
      const keys = new Map<string, string>();
      for (const t of txns) if (t.date >= monthStart(y, m) && scope.accountOk(t) && scope.isSpending(t)) keys.set(t.categoryKey, categoryName(t.category.split(' › ')[0] || 'Uncategorized'));
      const moves = [...keys.entries()]
        .map(([key, label]) => {
          const now = spentBetween(txns, scope, monthStart(y, m), today, key);
          const before = spentBetween(txns, scope, lastStart, lastEnd, key);
          return { key, label, now, before, pct: before > 0 ? (now - before) / before : 0 };
        })
        .filter((c) => c.before >= 25 && c.now >= 25 && Math.abs(c.pct) >= 0.2 && Math.abs(c.now - c.before) >= 25 && c.key !== 'RENT_AND_UTILITIES' && c.key !== 'LOAN_PAYMENTS')
        .sort((a, b) => Math.abs(b.now - b.before) - Math.abs(a.now - a.before))
        .slice(0, 2);
      for (const c of moves) {
        const p = Math.round(Math.abs(c.pct) * 100);
        out.push({ id: `cat-${c.key}`, icon: c.pct > 0 ? 'up' : 'down', tone: c.pct > 0 ? 'warn' : 'good', text: `${c.label} spending is ${c.pct > 0 ? 'up' : 'down'} ${p}% compared to last month.`, to: { page: 'patterns' } });
      }
    }
  }

  // Payments due this week, and the balance ahead, from the forecast.
  if (forecast) {
    const week = nextSeven(forecast);
    const due = forecast.events.filter((e) => e.kind === 'bill' && epochDay(e.date) <= todayDay + 6);
    if (week.count >= 2) {
      out.push({ id: 'week', icon: 'calendar', tone: 'info', text: `${word(week.count)} recurring payments are due this week totaling ${money(week.total)}.`, to: { page: 'schedule' } });
    } else if (due.length === 1) {
      out.push({ id: 'week', icon: 'calendar', tone: 'info', text: `${due[0].name} (${money(due[0].amount)}) is due ${short(due[0].date)}.`, to: { page: 'schedule' } });
    }

    const f30 = forecast.points.filter((p) => p.day >= 0 && p.day <= 30);
    const low = f30.reduce((m, p) => (p.balance < m.balance ? p : m), f30[0]);
    if (low.day > 0 && low.balance < 0) {
      out.push({ id: 'dip', icon: 'alert', tone: 'warn', text: `Your balance may go below zero around ${short(low.date)}, to about -${money(Math.abs(low.balance))}.`, to: { page: 'overview', tab: 'Forecast' } });
    } else if (low.day > 0 && low.balance < 1000) {
      out.push({ id: 'dip', icon: 'alert', tone: 'warn', text: `Your balance may drop to about ${money(low.balance)} around ${short(low.date)}.`, to: { page: 'overview', tab: 'Forecast' } });
    }

    const pay = forecast.events.find((e) => e.kind === 'income' && epochDay(e.date) <= todayDay + 7);
    if (pay) out.push({ id: 'pay', icon: 'banknote', tone: 'good', text: `${money(pay.amount)} from ${pay.name} is expected ${short(pay.date)}.`, to: { page: 'overview', tab: 'Forecast' } });
  }

  // Price changes the Recurring tab has seen lately.
  for (const r of analysis.items.filter((x) => x.active && x.priceChange && epochDay(x.priceChange.since) >= todayDay - 60).slice(0, 2)) {
    const c = r.priceChange!;
    out.push({ id: `price-${r.id}`, icon: c.delta > 0 ? 'up' : 'down', tone: c.delta > 0 ? 'warn' : 'good', text: `${r.name} ${c.delta > 0 ? 'went up' : 'dropped'} ${money(Math.abs(c.delta))}, now ${money(c.current)}.`, to: { page: 'transactions', tab: 'Recurring' } });
  }

  // Subscriptions in total.
  const subs = analysis.items.filter((r) => r.active && r.kind === 'subscription' && r.monthly && r.confidence !== 'review' && r.confidence !== 'habit');
  if (subs.length >= 2) {
    out.push({ id: 'subs', icon: 'repeat', tone: 'info', text: `You pay about ${money(subs.reduce((s, r) => s + (r.monthly ?? 0), 0))} a month across ${subs.length} subscriptions.`, to: { page: 'transactions', tab: 'Recurring' } });
  }

  // Bank fees in the last 30 days.
  const fees = bankFees(txns, overviewScope(txns, accounts, 30, rules));
  if (fees.total > 0) out.push({ id: 'fees', icon: 'banknote', tone: 'warn', text: `You paid ${money(fees.total)} in bank fees over the last 30 days.`, to: { page: 'transactions', tab: 'Checking' } });

  // The biggest cut on offer.
  const best = savings.ideas.find((i) => i.kind === 'cut');
  if (best && best.monthly >= 10) {
    out.push({ id: 'save', icon: 'lightbulb', tone: 'info', text: best.fixed ? `Avoiding ${best.area} would save about ${money(best.monthly)} a month.` : `Cutting ${best.area} by ${savings.percent}% could save about ${money(best.monthly)} a month.`, to: { page: 'overview', tab: 'Summary' } });
  }

  // Warnings first, then good news, then the rest.
  const rank = { warn: 0, good: 1, info: 2 } as const;
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]).slice(0, 7);
}
