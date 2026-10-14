import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import RangeTabs from '../components/overview/RangeTabs';
import ForecastBreakdown, { type ForecastDetail } from '../components/overview/ForecastBreakdown';
import { Bars, Sparkline } from '../components/overview/MiniVisuals';
import ForecastChart from '../components/overview/ForecastChart';
import PlumpIcon, { type PlumpName } from '../components/PlumpIcon';
import SectionTitle from '../components/SectionTitle';
import {
  forecastDays,
  buildForecast,
  monthEndForecast,
  nextSeven,
  safeToSpend,
  safeToSpendPath,
  savedPerDay,
  summarize,
  type Forecast,
  type ForecastDays,
  type Payday,
} from '../lib/forecast';
import { overviewScope, savingFor, scenarios } from '../lib/overview';
import { money, moneyExact } from '../lib/patternFormat';
import { useRecurring } from '../lib/recurringOverrides';
import { changedRules, useRules } from '../lib/rules';
import { useMobile } from '../lib/viewMode';
import type { Load } from '../lib/useTransactions';

// The Forecast tab: where the cash in checking and savings is heading, built by lib/forecast.ts from the paydays,
// bills and everyday spending found in the person's own history.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;
const WEEKDAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
const signed = (n: number) => `${n < 0 ? '-' : ''}${money(Math.abs(n))}`;
const plus = (n: number) => `${n < 0 ? '-' : '+'}${money(Math.abs(n))}`;
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const CADENCE: Record<Payday['cadence'], string> = { weekly: 'every week', biweekly: 'every two weeks', semimonthly: 'twice a month', monthly: 'every month' };

function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-2xl border border-line bg-card/60 p-4 @3xl:p-5 ${className}`}>{children}</div>;
}

function Stat({ icon, label, value, sub, tone = '', visual, active, onClick }: { icon: PlumpName; label: string; value: string; sub: React.ReactNode; tone?: string; visual?: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title="See how this is worked out"
      className={`flex min-w-0 cursor-pointer flex-col justify-between gap-3 rounded-2xl border p-4 text-left transition-colors @3xl:p-5 ${active ? 'border-accent bg-accent-soft' : 'border-line bg-card/60 hover:border-muted'}`}
    >
      <div className="flex flex-col gap-2 @3xl:flex-row @3xl:items-start @3xl:justify-between @3xl:gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-support text-xs text-muted">
            <PlumpIcon name={icon} className="h-4 w-4 shrink-0" />
            <span>{label}</span>
          </p>
          <p className={`mt-1.5 text-2xl leading-none font-semibold tracking-tight tabular-nums @3xl:text-3xl ${tone}`}>{value}</p>
        </div>
        {visual && <div className="shrink-0 @3xl:pt-1">{visual}</div>}
      </div>
      <p className="font-support text-xs leading-snug text-muted">{sub}</p>
    </button>
  );
}

function Row({ label, value, tone = '', hint }: { label: string; value: string; tone?: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="font-support text-sm text-muted">
        {label}
        {hint && <span className="mt-0.5 block text-xs text-muted/80">{hint}</span>}
      </dt>
      <dd className={`text-base font-semibold tabular-nums ${tone}`}>{value}</dd>
    </div>
  );
}

function WhatIf({ forecast, load, days }: { forecast: Forecast; load: Extract<Load, { state: 'live' }>; days: ForecastDays }) {
  const rules = useRules();
  const list = useMemo(
    () => scenarios(load.allTransactions, overviewScope(load.allTransactions, load.allAccounts, 90, rules)),
    [load, rules],
  );
  const [pick, setPick] = useState<string | null>(null);
  const [pct, setPct] = useState(20);
  const scenario = list.find((s) => s.id === pick) ?? list[0];

  if (!scenario) {
    return <p className="font-support text-sm text-muted">There is no spending in the areas Wallex can model yet.</p>;
  }
  const percent = scenario.fixedPercent ?? pct;
  const perDay = savedPerDay(forecast, savingFor(scenario, percent));
  const month = monthEndForecast(forecast);
  const monthNew = monthEndForecast(forecast, perDay);
  const end = summarize(forecast, days);
  const endNew = summarize(forecast, days, perDay);

  return (
    <div>
      <div role="radiogroup" aria-label="What to change" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] @3xl:mx-0 @3xl:flex-wrap @3xl:overflow-visible @3xl:px-0 [&::-webkit-scrollbar]:hidden">
        {list.slice(0, 6).map((s) => (
          <button key={s.id} type="button" role="radio" aria-checked={s.id === scenario.id} onClick={() => setPick(s.id)} className={`shrink-0 cursor-pointer rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${s.id === scenario.id ? 'bg-accent text-canvas' : 'bg-surface text-muted hover:text-ink'}`}>
            {s.label}
          </button>
        ))}
      </div>
      <p className="mt-3 font-support text-xs text-muted">
        You spend {money(scenario.monthly)} a month here now.
      </p>

      {scenario.fixedPercent === null ? (
        <div className="mt-4">
          <div className="flex items-baseline justify-between font-support text-sm">
            <span className="text-muted">Spend less by</span>
            <span className="font-semibold tabular-nums text-ink">{pct}%</span>
          </div>
          <input type="range" min={0} max={100} step={5} value={pct} onChange={(e) => setPct(Number(e.target.value))} aria-label="Spend less by" className="wx-range mt-2" style={{ ['--pct' as string]: `${pct}%` }} />
        </div>
      ) : (
        <p className="mt-4 font-support text-sm text-muted">Cut out completely.</p>
      )}

      <div className="mt-5 rounded-xl border border-line bg-surface/60 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-support text-sm text-muted">New balance at month end</span>
          <span className="text-xl font-semibold tabular-nums">{signed(monthNew.point.balance)}</span>
        </div>
        <p className="mt-0.5 text-right font-support text-xs tabular-nums text-accent">
          {month.daysLeft === 0 ? 'Month ends today, so nothing changes yet' : `${plus(monthNew.point.balance - month.point.balance)} from ${signed(month.point.balance)}`}
        </p>
        <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-line pt-3">
          <span className="font-support text-sm text-muted">New balance in {days} days</span>
          <span className="text-base font-semibold tabular-nums">{signed(endNew.end.balance)}</span>
        </div>
        <p className="mt-0.5 text-right font-support text-xs tabular-nums text-accent">{plus(endNew.end.balance - end.end.balance)} from {signed(end.end.balance)}</p>
      </div>
      {savingFor(scenario, percent) / 30.4375 > forecast.everyday.perDay + 0.005 && (
        <p className="mt-2 font-support text-xs text-muted">Capped at the everyday spending Wallex expects, so the saving is not overstated.</p>
      )}
    </div>
  );
}

export default function ForecastTab({ load }: { load: Load }) {
  const mobile = useMobile();
  const rules = useRules();
  const live = load.state === 'live';
  const analysis = useRecurring(live ? load.allTransactions : null, live ? load.allAccounts : undefined);
  const [days, setDays] = useState<ForecastDays>(30);
  // Which card's working is showing; null shows the usual forecast.
  const [detail, setDetail] = useState<ForecastDetail | null>(null);
  const pick = (d: ForecastDetail) => setDetail((cur) => (cur === d ? null : d));

  const forecast = useMemo(
    () => (live && analysis ? buildForecast(load.allTransactions, load.allAccounts, analysis, localToday(), rules) : null),
    [live, load, analysis, rules],
  );

  if (load.state === 'loading') return null;
  if (!live) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Connect a bank to see your forecast</h2>
        <p className="mt-3 font-support text-sm text-muted">The forecast is built from your own paydays, bills and spending, so it stays empty until a bank is linked. Connect one in Settings → Setup.</p>
      </div>
    );
  }
  if (!forecast) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">No cash balance to start from</h2>
        <p className="mt-3 font-support text-sm text-muted">Your bank has not reported a checking or savings balance, and the forecast needs one.</p>
      </div>
    );
  }

  const f = forecast;
  const range = summarize(f, days);
  const safe = safeToSpend(f);
  const month = monthEndForecast(f);
  const week = nextSeven(f);
  const safePath = safeToSpendPath(f);
  const lowPoints = f.points.filter((p) => p.day >= 0 && p.day <= days);
  const lowPath = lowPoints.map((p) => p.balance);
  const lowMark = Math.max(0, lowPoints.findIndex((p) => p.day === range.lowest.day));
  const monthSpark = f.points.filter((p) => p.day >= 0 && p.day <= Math.max(1, month.daysLeft)).map((p) => p.balance);
  const custom = changedRules(rules).length;
  const heaviest = f.everyday.byWeekday.indexOf(Math.max(...f.everyday.byWeekday));
  const lowTone = range.lowest.balance < 0 ? 'text-red-300' : '';

  return (
    <div className="flex flex-col gap-5 overflow-x-clip px-0 pb-10 @3xl:px-1">
      {(f.everyday.confidence === 'low' || f.paydays.length === 0) && (
        <div className="rounded-2xl border border-amber-300/30 bg-amber-300/5 px-4 py-3 font-support text-sm text-amber-100/90">
          {f.paydays.length === 0 && 'Wallex has not found pay that repeats on a schedule, so no income is projected. '}
          {f.everyday.confidence === 'low' && `Only ${f.everyday.windowDays} days of history so far, so the everyday spending estimate is rough. `}
          It sharpens as more history arrives.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-4 @3xl:gap-4">
        <Stat
          icon="wallet"
          label="Safe to Spend"
          active={detail === 'safe'}
          onClick={() => pick('safe')}
          value={signed(safe.amount)}
          tone={safe.amount < 0 ? 'text-red-300' : ''}
          visual={<Sparkline values={safePath} color={safe.amount < 0 ? '#ff8a8a' : undefined} zero />}
          sub={
            safe.count || safe.incomeCount
              ? `${money(safe.income)} in pay, less ${money(safe.bills)} in ${safe.count} ${safe.count === 1 ? 'bill' : 'bills'}, over 30 days`
              : 'No pay or bills expected in the next 30 days'
          }
        />
        <Stat
          icon="calendar-check"
          label="Projected Month-End"
          active={detail === 'monthend'}
          onClick={() => pick('monthend')}
          value={signed(month.point.balance)}
          tone={month.point.balance < 0 ? 'text-red-300' : ''}
          visual={<Sparkline values={monthSpark} />}
          sub={
            month.daysLeft === 0
              ? 'Today is the last day of the month'
              : month.vsLast
                ? <><span className={month.vsLast.amount >= 0 ? 'text-accent' : 'text-red-300'}>{month.vsLast.pct !== null ? `${month.vsLast.amount >= 0 ? '+' : '-'}${Math.abs(Math.round(month.vsLast.pct * 100))}%` : plus(month.vsLast.amount)}</span> vs last month-end</>
                : `In ${month.daysLeft} ${month.daysLeft === 1 ? 'day' : 'days'}`
          }
        />
        <Stat icon="circle-clock" label="Expected Next 7 Days" active={detail === 'week'} onClick={() => pick('week')} value={money(week.total)} visual={<Bars bars={week.bars} />} sub={week.count ? `${week.count} upcoming ${week.count === 1 ? 'payment' : 'payments'}` : 'No payments expected'} />
        <Stat
          icon="graph-bar-increase"
          label="Lowest Balance"
          active={detail === 'lowest'}
          onClick={() => pick('lowest')}
          value={signed(range.lowest.balance)}
          tone={lowTone}
          visual={<Sparkline values={lowPath} color={range.lowest.balance < 0 ? '#ff8a8a' : undefined} mark={lowMark} zero />}
          sub={range.lowest.day === 0 ? `Today, within ${days} days` : `Around ${shortDate(range.lowest.date)}`}
        />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {detail ? (
          <motion.div key={detail} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
            <ForecastBreakdown detail={detail} forecast={f} days={days} onBack={() => setDetail(null)} />
          </motion.div>
        ) : (
          <motion.div key="forecast" className="flex flex-col gap-5" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className={mobile ? "w-full" : ""}>
            <SectionTitle as="h3" icon="graph-bar-increase" className="text-lg font-semibold">Projected Cash Flow</SectionTitle>
            <p className="mt-1 font-support text-xs text-muted">Your estimated balance from the pay, bills and everyday spending Wallex expects.</p>
          </div>
          <RangeTabs label="Forecast range" full={mobile} value={days} onChange={setDays} options={forecastDays.map((d) => ({ value: d, label: `${d}D` }))} />
        </div>
        <div className="mt-4">
          <ForecastChart forecast={f} days={days} mobile={mobile} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 font-support text-xs text-muted">
          <span className="flex items-center gap-2"><span className="h-0.5 w-5 rounded bg-accent" />Actual</span>
          <span className="flex items-center gap-2"><span className="h-0 w-5 border-t-2 border-dashed border-accent" />Projected balance</span>
          <span className="flex items-center gap-2"><span className="h-3 w-5 rounded-sm bg-accent/20" />Typical range</span>
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: '#5fd38d' }} />Money in</span>
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: '#ff6b6b' }} />Bill due</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 @3xl:grid-cols-2">
        <Card>
          <SectionTitle as="h3" icon="dollar-coin" className="text-lg font-semibold">Cash Flow Summary</SectionTitle>
          <p className="mt-1 font-support text-xs text-muted">The next {days} days.</p>
          <dl className="mt-2 divide-y divide-line">
            <Row label="Expected Income" value={money(range.income)} tone="text-accent" hint={range.incomeCount ? `${range.incomeCount} ${range.incomeCount === 1 ? 'payday' : 'paydays'}` : 'No scheduled pay found'} />
            <Row label="Projected Spending" value={money(range.spending)} hint={`${money(range.bills)} in bills · ${money(range.everyday)} everyday`} />
            <Row label="Estimated Net" value={signed(range.net)} tone={range.net < 0 ? 'text-red-300' : ''} />
            <Row label="Lowest Projected Balance" value={signed(range.lowest.balance)} tone={lowTone} hint={range.lowest.day === 0 ? 'Today' : `Around ${shortDate(range.lowest.date)}`} />
          </dl>
        </Card>

        <Card>
          <SectionTitle as="h3" icon="magic-wand-1" className="text-lg font-semibold">What If?</SectionTitle>
          <p className="mt-1 mb-4 font-support text-xs text-muted">See how spending less in one area changes your balance.</p>
          <WhatIf forecast={f} load={load} days={days} />
        </Card>
      </div>

      <Card>
        <SectionTitle as="h3" icon="lightbulb" className="text-lg font-semibold">How This Is Worked Out</SectionTitle>
        <ul className="mt-3 space-y-3 font-support text-sm text-muted">
          <li>
            <span className="text-ink">Pay.</span>{' '}
            {f.paydays.length === 0
              ? 'No deposits that repeat on a schedule were found.'
              : f.paydays.map((p) => `${p.name}, about ${moneyExact(p.typical)} ${CADENCE[p.cadence]}${p.approx ? ' (varies)' : ''}, next ${shortDate(p.next)}`).join('; ') + '.'}{' '}
            What counts as income follows your Rules.
          </li>
          <li>
            <span className="text-ink">Bills.</span> The {f.events.filter((e) => e.kind === 'bill').length > 0 ? 'recurring payments on the Recurring tab' : 'recurring payments Wallex finds'}, on their usual dates. A bill due today or running late lands tomorrow.
          </li>
          <li>
            <span className="text-ink">Everyday spending.</span> About {money(f.everyday.perDay)} a day, from the last {f.everyday.windowDays} days of spending that is not a bill{f.everyday.windowDays >= 28 ? `, heaviest on ${WEEKDAYS[heaviest]}` : ''}. Purchases on a card are counted when the card payment is paid, not twice.
          </li>
          <li>
            <span className="text-ink">Typical range.</span> The shaded band is how far a typical week’s spending drifts, and it widens the further out it looks. Treat anything past a few weeks as a guide, not a promise.
          </li>
          {custom > 0 && <li>{custom} custom {custom === 1 ? 'rule is' : 'rules are'} changing these figures. See Settings → Rules.</li>}
        </ul>
      </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
