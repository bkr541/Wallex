import { useId, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Briefcase,
  Building2,
  CalendarClock,
  Car,
  Check,
  ChevronRight,
  Clapperboard,
  Hammer,
  HeartPulse,
  Home,
  Info,
  Landmark,
  Lightbulb,
  Plane,
  Repeat,
  Scissors,
  Shapes,
  ShoppingBag,
  TriangleAlert,
  Utensils,
  Wine,
  type LucideIcon,
} from 'lucide-react';
import MerchantLogo from '../components/MerchantLogo';
import { Bars, Ring, Sparkline } from '../components/overview/MiniVisuals';
import RangeTabs from '../components/overview/RangeTabs';
import { useMobile } from '../lib/viewMode';
import PlumpIcon, { type PlumpName } from '../components/PlumpIcon';
import SectionTitle from '../components/SectionTitle';
import { buildForecast, monthEndForecast, nextSeven, safeToSpend } from '../lib/forecast';
import {
  CATEGORY_PERIODS,
  dailyInsights,
  savingsIdeas,
  spendingPace,
  topCategories,
  type CategoryPeriod,
  type InsightIcon,
} from '../lib/insights';
import { cashPosition } from '../lib/overview';
import { epochDay } from '../lib/patterns';
import { money, moneyExact, percentText } from '../lib/patternFormat';
import { useRecurring } from '../lib/recurringOverrides';
import { useRules } from '../lib/rules';
import type { Load } from '../lib/useTransactions';
import type { TxFilter } from '../lib/txFilter';

type Navigate = (page: string, tab?: string, recurringFilter?: string, filter?: TxFilter) => void;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  FOOD_AND_DRINK: Utensils,
  GENERAL_MERCHANDISE: ShoppingBag,
  RENT_AND_UTILITIES: Home,
  TRANSPORTATION: Car,
  ENTERTAINMENT: Clapperboard,
  TRAVEL: Plane,
  PERSONAL_CARE: Scissors,
  MEDICAL: HeartPulse,
  LOAN_PAYMENTS: Landmark,
  BANK_FEES: Banknote,
  HOME_IMPROVEMENT: Hammer,
  GENERAL_SERVICES: Briefcase,
  GOVERNMENT_AND_NON_PROFIT: Building2,
  TRANSFER_OUT: Banknote,
};
const INSIGHT_ICONS: Record<InsightIcon, LucideIcon> = {
  down: ArrowDownRight,
  up: ArrowUpRight,
  calendar: CalendarClock,
  alert: TriangleAlert,
  lightbulb: Lightbulb,
  tag: Shapes,
  repeat: Repeat,
  banknote: Banknote,
};
const IDEA_ICONS: Record<string, LucideIcon> = { fees: Banknote, rideshare: Car, dining: Utensils, bars: Wine, shopping: ShoppingBag, entertainment: Clapperboard, subscriptions: Repeat };
const KIND_WORD: Record<string, string> = { bill: 'Bill', subscription: 'Subscription renewal', debt: 'Debt payment', installment: 'Installment', usage: 'Subscription + usage' };
const TONE = { good: 'text-accent bg-accent-soft', warn: 'text-amber-300 bg-amber-300/10', info: 'text-sky-300 bg-sky-300/10' } as const;

function Panel({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <section className={`min-w-0 rounded-2xl border border-line bg-card/60 p-4 @3xl:p-5 ${className}`}>{children}</section>;
}

function PanelTitle({ icon, children, aside }: { icon: PlumpName; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <SectionTitle as="h3" icon={icon} className="text-lg font-semibold">{children}</SectionTitle>
      {aside}
    </div>
  );
}

// A small "i" that explains a figure on hover, focus or tap.
function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="relative z-10 inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-label="What is this?" aria-describedby={open ? id : undefined} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:text-ink">
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span id={id} role="tooltip" className="absolute top-6 left-1/2 w-52 -translate-x-1/2 rounded-xl border border-line bg-card px-3 py-2 text-left font-support text-xs leading-snug text-ink/90 shadow-[0_12px_30px_rgba(0,0,0,0.45)]">
          {text}
        </span>
      )}
    </span>
  );
}

function Headline({ icon, label, tip, value, tone = '', sub, visual, onOpen }: { icon: PlumpName; label: string; tip: string; value: string; tone?: string; sub: React.ReactNode; visual: React.ReactNode; onOpen: () => void }) {
  const mobile = useMobile();
  return (
    <div className="group relative flex min-w-0 flex-col justify-between gap-3 rounded-2xl border border-line bg-card/60 p-4 transition-colors focus-within:border-muted hover:border-muted @3xl:p-5">
      <div className={`flex gap-2 ${mobile ? 'flex-row items-start justify-between gap-3' : 'flex-col @3xl:flex-row @3xl:items-start @3xl:justify-between @3xl:gap-3'}`}>
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-support text-xs text-muted">
            <PlumpIcon name={icon} className="h-4 w-4 shrink-0" />
            <span>{label}</span>
            <InfoTip text={tip} />
          </p>
          {/* The whole card is the link: this button stretches over it. */}
          <button type="button" onClick={onOpen} aria-label={`${label}: ${value}. Open`} className={`mt-1.5 cursor-pointer text-left text-2xl leading-none font-semibold tracking-tight tabular-nums after:absolute after:inset-0 after:rounded-2xl @3xl:text-3xl ${tone}`}>
            {value}
          </button>
        </div>
        <div className="shrink-0 @3xl:pt-1">{visual}</div>
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="font-support text-xs leading-snug text-muted">{sub}</p>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden="true" />
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 font-support text-sm text-muted">{children}</p>;
}

/* ============================================================================================ PAGE */

export default function InsightsTab({ load, onNavigate }: { load: Load; onNavigate: Navigate }) {
  const rules = useRules();
  const mobile = useMobile();
  const live = load.state === 'live';
  const today = localToday();
  const analysis = useRecurring(live ? load.allTransactions : null, live ? load.allAccounts : undefined);
  const [period, setPeriod] = useState<CategoryPeriod>('month');

  const data = useMemo(() => {
    if (!live || !analysis) return null;
    const { allTransactions: txns, allAccounts: accounts } = load;
    const forecast = buildForecast(txns, accounts, analysis, today, rules);
    const pace = spendingPace(txns, accounts, rules, today);
    const savings = savingsIdeas(txns, accounts, analysis, rules);
    return { forecast, pace, savings, insights: dailyInsights({ txns, accounts, analysis, forecast, rules, today, pace, savings }) };
  }, [live, load, analysis, rules, today]);

  const categories = useMemo(() => (live ? topCategories(load.allTransactions, load.allAccounts, rules, today, period) : null), [live, load, rules, today, period]);

  if (load.state === 'loading') return null;

  if (!live || !data) {
    return (
      <div className="flex flex-col gap-5 overflow-x-clip px-0 pb-10 @3xl:px-1">
        <Panel>
          <h3 className="text-lg font-semibold">Connect a bank for your insights</h3>
          <p className="mt-1 font-support text-sm text-muted">Spending pace, categories, savings ideas and daily notes are built from your own transactions. Connect a bank in Settings → Setup.</p>
        </Panel>
      </div>
    );
  }

  const { forecast, pace, savings, insights } = data;
  const position = cashPosition(load.allAccounts);
  const safe = forecast ? safeToSpend(forecast) : null;
  const month = forecast ? monthEndForecast(forecast) : null;
  const week = forecast ? nextSeven(forecast) : null;
  const weekRows = forecast ? forecast.events.filter((e) => epochDay(e.date) <= epochDay(forecast.today) + 6) : [];
  const monthSpark = forecast && month ? forecast.points.filter((p) => p.day >= 0 && p.day <= Math.max(1, month.daysLeft)).map((p) => p.balance) : [];
  const topAmount = Math.max(1, ...(categories?.rows.map((r) => r.amount) ?? [1]));
  const ideaCount = savings.ideas.length;

  return (
    <div className="flex flex-col gap-5 overflow-x-clip px-0 pb-10 @3xl:px-1">
      <div className={`grid gap-3 @3xl:gap-4 ${mobile ? 'grid-cols-[minmax(0,1fr)]' : 'grid-cols-2 @3xl:grid-cols-4'}`}>
        <Headline
          icon="wallet"
          label="Cash Available"
          tip="What is in your checking and savings accounts right now, as your bank reports it."
          value={position.cash === null ? '—' : money(position.cash)}
          tone={position.cash !== null && position.cash < 0 ? 'text-red-300' : ''}
          sub={`Across ${position.cashAccounts.length} ${position.cashAccounts.length === 1 ? 'account' : 'accounts'}`}
          visual={<Ring share={position.cash && safe ? Math.max(0, safe.amount) / position.cash : 0}><PlumpIcon name="wallet" className="h-5 w-5" /></Ring>}
          onOpen={() => onNavigate('transactions', 'Checking')}
        />
        <Headline
          icon="calendar-check"
          label="Projected Month-End"
          tip="Where your balance is expected to be on the last day of the month, from your pay, bills and everyday spending."
          value={month ? money(month.point.balance) : '—'}
          tone={month && month.point.balance < 0 ? 'text-red-300' : ''}
          sub={month ? (month.vsLast ? `${month.vsLast.amount >= 0 ? '+' : '-'}${money(Math.abs(month.vsLast.amount))} vs last month-end` : month.daysLeft === 0 ? 'Last day of the month' : `In ${month.daysLeft} days`) : 'Needs a cash balance'}
          visual={<Sparkline values={monthSpark} />}
          onOpen={() => onNavigate('overview', 'Forecast')}
        />
        <Headline
          icon="circle-clock"
          label="Expected Next 7 Days"
          tip="The bills expected over the next seven days, including any due today or running late."
          value={week ? money(week.total) : '—'}
          sub={week ? (week.count ? `${week.count} upcoming ${week.count === 1 ? 'payment' : 'payments'}` : 'No payments expected') : 'Needs a cash balance'}
          visual={<Bars bars={week?.bars ?? []} />}
          onOpen={() => onNavigate('schedule')}
        />
        <Headline
          icon="lightbulb"
          label="Potential Savings"
          tip={`What you could save a month by cutting ${savings.percent}% from each area of everyday spending. Cancelling subscriptions is your choice, so it is listed apart from this total.`}
          value={`${money(savings.monthly)}/mo`}
          sub={`${ideaCount} ${ideaCount === 1 ? 'opportunity' : 'opportunities'}`}
          visual={<Ring share={savings.spendingPerMonth > 0 ? savings.monthly / savings.spendingPerMonth : 0}><Lightbulb className="h-5 w-5" /></Ring>}
          onOpen={() => onNavigate('overview', 'Summary')}
        />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 @3xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel>
          <PanelTitle icon="lightbulb" aside={<button type="button" onClick={() => onNavigate('overview', 'Summary')} className="flex cursor-pointer items-center gap-1 rounded-lg border border-line px-3 py-1 font-support text-xs text-muted hover:text-ink">View all<ChevronRight className="h-3.5 w-3.5" /></button>}>Potential Savings</PanelTitle>
          <p className="mt-1 font-support text-xs text-muted">Based on your recent spending and subscriptions.</p>
          {ideaCount === 0 ? (
            <Empty>No spending in the areas Wallex can model yet, so there is nothing to suggest.</Empty>
          ) : (
            <>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-4xl leading-none font-semibold tracking-tight text-accent tabular-nums @3xl:text-5xl">{money(savings.monthly)}<span className="text-2xl text-accent/80"> /mo</span></p>
                  <p className="mt-2 font-support text-sm text-muted">That’s <span className="font-semibold text-ink">{money(savings.yearly)}</span> per year if achieved.</p>
                </div>
                <div className="flex h-14 items-end gap-1.5" aria-hidden="true">
                  {savings.ideas.slice(0, 7).map((i, n) => (
                    <motion.span key={i.id} className="w-2.5 origin-bottom rounded-sm bg-accent" style={{ height: `${Math.max(12, (i.monthly / Math.max(1, savings.ideas[0].monthly)) * 100)}%`, opacity: 1 - n * 0.09 }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.45, delay: n * 0.05 }} />
                  ))}
                </div>
              </div>
              <ul className="mt-4 space-y-2">
                {savings.ideas.slice(0, 5).map((i) => {
                  const Icon = IDEA_ICONS[i.id] ?? Lightbulb;
                  return (
                    <li key={i.id}>
                      <button type="button" onClick={() => onNavigate('overview', 'Summary')} className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface/50 px-3 py-2.5 text-left transition-colors hover:border-muted">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><Icon className="h-4 w-4" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{i.label}</span>
                          <span className="block truncate font-support text-xs text-muted">{i.basis}</span>
                        </span>
                        <span className="font-semibold text-accent tabular-nums">{i.kind === 'subscriptions' ? 'Up to ' : ''}{money(i.monthly)}/mo</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                      </button>
                    </li>
                  );
                })}
              </ul>
              {savings.ideas.some((i) => i.kind === 'subscriptions') && <p className="mt-3 font-support text-xs text-muted">The total above counts the spending cuts only, not subscriptions.</p>}
            </>
          )}
        </Panel>

        <Panel>
          <PanelTitle icon="calendar-check" aside={<button type="button" onClick={() => onNavigate('schedule')} className="flex cursor-pointer items-center gap-1 font-support text-xs text-accent hover:underline">View all<ChevronRight className="h-3.5 w-3.5" /></button>}>Next 7 Days</PanelTitle>
          {weekRows.length === 0 ? (
            <Empty>{forecast ? 'Nothing is expected in the next 7 days.' : 'Needs a checking or savings balance to forecast from.'}</Empty>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {weekRows.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex w-10 shrink-0 flex-col items-center rounded-lg bg-surface py-1 leading-none">
                    <span className="font-support text-[10px] tracking-wider text-muted uppercase">{MONTHS[Number(e.date.slice(5, 7)) - 1]}</span>
                    <span className="mt-0.5 text-base font-semibold tabular-nums">{Number(e.date.slice(8, 10))}</span>
                  </span>
                  <MerchantLogo name={e.name} sources={e.logos} className="h-8 w-8 shrink-0 text-[10px]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{e.name}</span>
                    <span className="block truncate font-support text-xs text-muted">{e.kind === 'income' ? 'Pay expected' : KIND_WORD[e.billKind ?? 'bill'] ?? 'Bill'}{e.approx ? ' · varies' : ''}</span>
                  </span>
                  <span className={`text-sm font-semibold tabular-nums ${e.kind === 'income' ? 'text-accent' : ''}`}>{e.kind === 'income' ? '+' : '-'}{moneyExact(e.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 @3xl:grid-cols-3">
        <Panel>
          <PanelTitle icon="graph-bar-increase">Spending Pace</PanelTitle>
          {pace ? (
            <>
              <p className="mt-3 text-3xl leading-none font-semibold tracking-tight tabular-nums">
                <span className={pace.pct > 0.02 ? 'text-red-300' : 'text-accent'}>{Math.abs(pace.pct) < 0.02 ? 'On' : `${Math.round(Math.abs(pace.pct) * 100)}%`}</span>
                <span className="text-xl font-medium">{Math.abs(pace.pct) < 0.02 ? ' your usual pace' : pace.pct < 0 ? ' under your usual pace' : ' over your usual pace'}</span>
              </p>
              <p className="mt-3 font-support text-sm leading-relaxed text-muted">
                You’ve spent <span className="text-ink">{money(pace.spent)}</span> so far this month, compared with <span className="text-ink">{money(pace.usual)}</span> by day {pace.day} of a usual month.
              </p>
              <div className="relative mt-5 h-2.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round((pace.spent / pace.usual) * 100))} aria-label="Spent so far against the usual pace">
                <motion.div className={`h-full rounded-full ${pace.pct > 0.02 ? 'bg-red-300' : 'bg-accent'}`} initial={{ width: 0 }} animate={{ width: `${Math.min(100, (pace.spent / pace.usual) * 100)}%` }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />
              </div>
              <div className="mt-2 flex justify-between font-support text-xs text-muted tabular-nums">
                <span><span className="block text-sm font-semibold text-ink">{money(pace.spent)}</span>Spent this month</span>
                <span className="text-right"><span className="block text-sm font-semibold text-ink">{money(pace.usual)}</span>Usual pace</span>
              </div>
              <p className="mt-3 font-support text-xs text-muted">Usual is the average of the last {pace.months} {pace.months === 1 ? 'month' : 'months'} up to this day.</p>
            </>
          ) : (
            <Empty>Wallex needs at least one full earlier month of history to say what is usual.</Empty>
          )}
        </Panel>

        <Panel>
          <PanelTitle icon="layers-1" aside={mobile ? undefined : <RangeTabs label="Period" value={period} onChange={setPeriod} options={CATEGORY_PERIODS.map((p) => ({ value: p.id, label: p.label }))} />}>Top Categories</PanelTitle>
          {mobile && <div className="mt-3"><RangeTabs full label="Period" value={period} onChange={setPeriod} options={CATEGORY_PERIODS.map((p) => ({ value: p.id, label: p.label }))} /></div>}
          {categories && categories.rows.length > 0 ? (
            <>
              <ul className="mt-4 space-y-3.5">
                {categories.rows.map((r) => {
                  const Icon = CATEGORY_ICONS[r.key] ?? Shapes;
                  return (
                    <li key={r.key} className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: `rgba(${r.rgb}, 0.18)`, color: `rgb(${r.rgb})` }}><Icon className="h-4 w-4" /></span>
                      <span className="w-[5.5rem] shrink-0 truncate text-sm">{r.label}</span>
                      <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-line">
                        <motion.span key={`${period}-${r.key}`} className="block h-full rounded-full" style={{ background: `rgb(${r.rgb})` }} initial={{ width: 0 }} animate={{ width: `${(r.amount / topAmount) * 100}%` }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} />
                      </span>
                      <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums">{money(r.amount)}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 border-t border-line pt-3 font-support text-xs text-muted">
                {money(categories.total)} spent in total{categories.hidden > 0 ? `, with ${categories.hidden} smaller ${categories.hidden === 1 ? 'category' : 'categories'} not shown` : ''}.
              </p>
            </>
          ) : (
            <Empty>No spending in this period yet.</Empty>
          )}
        </Panel>

        <Panel>
          <PanelTitle icon="notification-alert">Daily Insights</PanelTitle>
          {insights.length === 0 ? (
            <Empty>Nothing stands out today. Check back as more activity comes in.</Empty>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {insights.map((n) => {
                const Icon = INSIGHT_ICONS[n.icon];
                return (
                  <li key={n.id}>
                    <button type="button" onClick={() => onNavigate(n.to.page, n.to.tab)} className="flex w-full cursor-pointer items-center gap-3 py-2.5 text-left">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TONE[n.tone]}`}><Icon className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1 text-sm leading-snug">{n.text}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

    </div>
  );
}
