import { useId, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { asset } from '../assets';
import CashFlowChart from '../components/overview/CashFlowChart';
import Collapsible from '../components/overview/Collapsible';
import SlotNumber from '../components/overview/SlotNumber';
import MerchantLogo from '../components/MerchantLogo';
import { useRecurring } from '../lib/recurringOverrides';
import {
  bankFees,
  cashBuffer,
  cashPosition,
  commitments,
  coveredByCardPayment,
  latestDate,
  monthEndBalances,
  monthlyBuckets,
  overviewScope,
  periodFlow,
  pressureWindow,
  rangeOptions,
  savingFor,
  savingsOver,
  scenarios,
  shortDate,
  spendingBreakdown,
  upcomingPayments,
  weeklyBuckets,
  OVERVIEW_PERIODS,
  type OverviewDays,
  type UpcomingPayment,
} from '../lib/overview';
import { money, moneyExact, percentText } from '../lib/patternFormat';
import { useMobile } from '../lib/viewMode';
import type { Load } from '../lib/useTransactions';
import type { TxFilter } from '../lib/txFilter';
import { syncUserSettings } from '../lib/cloud';

const WINDOW_DAYS = 30; // how far ahead "upcoming" looks
const LOW_BALANCE = 1000; // the line month-end balances are compared against
const PERCENTS = [10, 20, 30];
const WALLEX_LOGO = asset('logos/logo2.png');
// One colour per slice of the spending breakdown, biggest first. "Other" is hatched.
const SLICE_COLORS = ['var(--accent)', '#6cc4ff', '#b9a2ff', '#f5c542', '#ff8a9b'];
const STRIPES = 'repeating-linear-gradient(135deg, color-mix(in srgb, var(--muted) 45%, transparent) 0 3px, transparent 3px 6px)';

const signed = (n: number) => `${n >= 0 ? '+' : '-'}${money(Math.abs(n))}`;
const approx = (n: number) => `~${money(n)}`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const weekday = (iso: string) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(`${iso}T00:00:00Z`).getUTCDay()];

function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  label,
  large = false,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
  large?: boolean;
}) {
  const thumb = useId();

  // The large one is a row of tabs along a line, with an accent bar that slides to the chosen option.
  if (large) {
    return (
      <div role="tablist" aria-label={label} className="flex w-full border-b border-line @3xl:w-auto">
        {options.map((o) => {
          const on = value === o.value;
          return (
            <button
              key={String(o.value)}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onChange(o.value)}
              className={`relative flex-1 cursor-pointer px-1 pb-2.5 text-[13px] whitespace-nowrap transition-colors @3xl:min-w-[5.75rem] @3xl:flex-none @3xl:px-5 @3xl:text-sm ${
                on ? 'font-semibold text-ink' : 'text-muted hover:text-ink'
              }`}
            >
              {o.label}
              {on && (
                <motion.span
                  layoutId={thumb}
                  className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-accent"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div role="tablist" aria-label={label} className="flex gap-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm transition-colors ${
            value === o.value ? 'bg-accent text-canvas' : 'bg-surface text-muted hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Money in against money out as one bar: the teal part is what came in, the coral part what went out, and
// the marker sits where they meet.
function FlowBar({ moneyIn, moneyOut }: { moneyIn: number; moneyOut: number }) {
  const total = moneyIn + moneyOut;
  // Where the marker sits is exactly money in's share of the total: all the way left when everything went out,
  // all the way right when everything came in, and just left of the middle when out is 51%.
  const share = total > 0 ? moneyIn / total : 0.5;
  const at = `${share * 100}%`;
  const grow = 'width 0.7s cubic-bezier(0.22, 1, 0.36, 1), left 0.7s cubic-bezier(0.22, 1, 0.36, 1)';
  return (
    <div className="mt-5 @3xl:mt-6">
      <div className="relative h-2.5 rounded-full bg-line @3xl:h-3.5">
        <span
          className="absolute inset-y-0 left-0 rounded-full shadow-[0_0_16px_color-mix(in_srgb,var(--accent)_45%,transparent)]"
          style={{ width: at, background: 'linear-gradient(90deg, color-mix(in srgb, var(--accent) 55%, transparent), var(--accent))', transition: grow }}
        />
        <span
          className="absolute inset-y-0 right-0 rounded-full"
          style={{ left: at, background: 'linear-gradient(90deg, #f87171, color-mix(in srgb, #f87171 12%, transparent))', transition: grow }}
        />
        <span
          aria-hidden="true"
          className="absolute top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-accent/50 bg-card p-1.5 @3xl:h-12 @3xl:w-12 @3xl:p-2"
          style={{
            left: at,
            transition: grow,
            boxShadow: '0 0 0 4px color-mix(in srgb, var(--card) 82%, transparent), 0 0 24px color-mix(in srgb, var(--accent) 55%, transparent)',
          }}
        >
          <img src={WALLEX_LOGO} alt="" draggable={false} className="h-full w-full object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.45)]" />
        </span>
      </div>
      <div className="mt-2 flex justify-between font-support text-sm text-muted tabular-nums">
        <span className="text-accent">{money(moneyIn)}</span>
        <span className="text-red-300">{money(moneyOut)}</span>
      </div>
    </div>
  );
}

function Commitment({
  label,
  lead,
  detail,
  onOpen,
}: {
  label: string;
  lead: string;
  detail: string;
  onOpen?: () => void;
}) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-2 font-support text-xs text-muted">
        {label}
        {onOpen && <ChevronRight className="h-4 w-4 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />}
      </span>
      <span className="mt-2 block text-2xl leading-none font-semibold tracking-tight">{lead}</span>
      <span className="mt-1.5 block font-support text-sm text-muted">{detail}</span>
    </>
  );
  return onOpen ? (
    <button type="button" onClick={onOpen} className="group min-w-0 cursor-pointer text-left">
      {body}
    </button>
  ) : (
    <div className="min-w-0">{body}</div>
  );
}

// "Around Oct 26" or "Expected Oct 25–27", so an inferred date is never presented as certain.
function dateText(p: UpcomingPayment) {
  if (p.earliest === p.latest) return `Around ${shortDate(p.date)}`;
  const sameMonth = p.earliest.slice(5, 7) === p.latest.slice(5, 7);
  return sameMonth
    ? `Expected ${shortDate(p.earliest)}–${Number(p.latest.slice(8, 10))}`
    : `Expected ${shortDate(p.earliest)} – ${shortDate(p.latest)}`;
}

export default function OverviewTab({
  load,
  onNavigate,
}: {
  load: Load;
  onNavigate: (page: string, tab?: string, recurringFilter?: string, filter?: TxFilter) => void;
}) {
  const mobile = useMobile();
  const live = load.state === 'live';
  const accounts = live ? load.allAccounts : [];
  const txns = live ? load.allTransactions : [];

  const [days, setDays] = useState<OverviewDays>(30);
  const [range, setRange] = useState<number | null>(null);
  // Each opportunity has its own reduction, picked on its card.
  const [percents, setPercents] = useState<Record<string, number>>({});
  const percentFor = (id: string) => percents[id] ?? 20;
  // Subscriptions the person has ticked as ones they would cancel.
  const [cancelled, setCancelled] = useState<Record<string, boolean>>({});
  // Which sections are folded away, remembered between visits.
  const [closed, setClosed] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('wallex-overview-closed') ?? '{}');
    } catch {
      return {};
    }
  });
  const sectionProps = (id: string) => ({
    open: !closed[id],
    onToggle: () =>
      setClosed((prev) => {
        const next = { ...prev, [id]: !prev[id] };
        try {
          localStorage.setItem('wallex-overview-closed', JSON.stringify(next));
        } catch {
          // Not remembering is fine.
        }
        void syncUserSettings({ overview_closed: next });
        return next;
      }),
  });
  // The Recurring tab's analysis, including any corrections the user made there.
  const recurring = useRecurring(live ? load.allTransactions : null, live ? load.allAccounts : undefined);

  // Everything below is derived once per data change from the same transactions and the same scope.
  const view = useMemo(() => {
    if (!live || !recurring) return null;
    // Every period is offered. When the history is shorter than the one chosen, the page says how much it has.
    const scopes = OVERVIEW_PERIODS.map((p) => ({ days: p.days, scope: overviewScope(txns, accounts, p.days) }));
    const periods = scopes.map((s) => s.days);
    return { scopes, periods, analysis: recurring! };
  }, [live, load, recurring]);

  // While loading, the app shows its floating loader instead of text.
  if (load.state === 'loading') return null;
  if (!live || !view) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Connect a bank to see your overview</h2>
        <p className="mt-3 font-support text-sm text-muted">
          {load.state === 'sample' && load.isError
            ? load.note
            : 'Wallex builds this screen from your own accounts and transactions, so it stays empty until a bank is linked.'}
        </p>
        <button
          type="button"
          onClick={() => onNavigate('settings', 'Setup')}
          className="mt-6 cursor-pointer rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-canvas capitalize"
        >
          Open Setup
        </button>
      </div>
    );
  }

  const active = view.scopes.find((s) => s.days === (view.periods.includes(days) ? days : 30))!;
  const scope = active.scope;
  const analysis = view.analysis;

  const position = cashPosition(accounts);
  const flow = periodFlow(txns, scope);
  const fees = bankFees(txns, scope);
  const breakdown = spendingBreakdown(txns, scope);
  const topShare = Math.max(0.0001, ...breakdown.slices.map((sl) => sl.share));
  const owed = commitments(analysis);
  const upcoming = upcomingPayments(analysis, scope.today, WINDOW_DAYS);
  const pressure = pressureWindow(upcoming);
  const buffer = cashBuffer(position.cash, upcoming, WINDOW_DAYS);
  const keepShare = buffer && buffer.available > 0 ? Math.min(1, Math.max(0, buffer.remaining / buffer.available)) : 0;
  const monthEnds = monthEndBalances(txns, accounts, scope);
  const ideas = scenarios(txns, scope);
  const latest = latestDate(txns);

  // Cash-flow history: months when there are at least three of them, weeks before that.
  const options = rangeOptions(scope);
  const chosen = range !== null && options.includes(range) ? range : options.includes(6) ? 6 : (options[options.length - 1] ?? null);
  const buckets = chosen ? monthlyBuckets(txns, scope, chosen) : weeklyBuckets(txns, scope);
  const savings = savingsOver(buckets);
  const anyFlow = buckets.some((b) => b.moneyIn > 0 || b.moneyOut > 0);

  // The last twelve months, ending with this one, for the "paid this month" badges.
  const [thisYear, thisMonth] = scope.today.slice(0, 7).split('-').map(Number);
  const monthSlots = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(thisYear, thisMonth - 1 - (11 - i), 1));
    return { key: d.toISOString().slice(0, 7), label: MONTH_NAMES[d.getUTCMonth()], year: d.getUTCFullYear() };
  });

  const lowMonths = monthEnds.filter((m) => m.balance < LOW_BALANCE).length;
  const lowest = monthEnds.length ? monthEnds.reduce((lo, m) => (m.balance < lo.balance ? m : lo)) : null;
  // A cancel-a-subscription opportunity for each steady subscription, biggest first.
  const subs = analysis.items
    .filter((r) => r.active && r.kind === 'subscription' && ['confirmed', 'likely', 'new'].includes(r.confidence) && (r.monthly ?? 0) > 0)
    .sort((a, b) => (b.monthly ?? 0) - (a.monthly ?? 0))
    .slice(0, 4);
  const subsTotal = subs.reduce((sum, r) => sum + (r.monthly ?? 0), 0);
  const cancelSaved = subs.reduce((sum, r) => sum + (cancelled[r.id] ? (r.monthly ?? 0) : 0), 0);
  const totalSaved = ideas.reduce((s, i) => s + savingFor(i, percentFor(i.id)), 0) + cancelSaved;
  const periodLabel = scope.partial ? `${scope.effectiveDays} days` : (OVERVIEW_PERIODS.find((p) => p.days === scope.days)?.phrase ?? `${scope.days} days`);

  const netTone = flow.count === 0 ? '' : flow.net >= 0 ? 'text-accent' : 'text-red-300';
  // Things worth knowing about the figures above, as badges at the bottom of the card. Only the number is styled.
  const savingsGood = flow.savingsRate !== null && flow.savingsRate >= 0;
  const badges: { value?: string; label: string; tone: 'good' | 'bad' | 'warn' | 'info' | 'meta' | 'quiet'; title?: string }[] = [
    {
      value: `${shortDate(scope.partial && scope.historyStart ? scope.historyStart : scope.start)} – ${shortDate(scope.today)}`,
      label: 'Range',
      tone: 'good',
    },
    { value: String(accounts.length), label: 'Account', tone: 'meta' },
    { value: latest ? shortDate(latest) : '—', label: 'Latest', tone: 'info' },
  ];
  if (flow.count === 0) badges.push({ label: 'No Activity', tone: 'quiet', title: `No money in or out in the last ${periodLabel}.` });
  else if (flow.savingsRate === null)
    badges.push({ label: 'No Income Found', tone: 'quiet', title: `No income detected in the last ${periodLabel}, so there is no savings rate.` });
  else
    badges.push({
      value: `${savingsGood ? '+' : '-'}${percentText(Math.abs(flow.savingsRate))}`,
      label: 'Savings Rate',
      tone: savingsGood ? 'good' : 'bad',
      title: `Savings rate over the last ${periodLabel}`,
    });
  if (flow.pending > 0) badges.push({ value: String(flow.pending), label: `Pending ${flow.pending === 1 ? 'Transaction' : 'Transactions'}`, tone: 'warn', title: 'Included in the figures above' });
  if (scope.partial) badges.push({ value: String(scope.effectiveDays), label: 'Days Of History', tone: 'quiet', title: 'There is not a full period of history yet' });
  const VALUE_TONE = {
    good: 'text-accent',
    bad: 'text-red-300',
    warn: 'text-amber-300',
    info: 'text-sky-300',
    meta: 'text-violet-300',
    quiet: 'text-ink',
  };


  return (
    <div className="flex flex-col gap-5 px-1 pb-10">
      {/* Period switch; its selected range and account context appear as badges in the position card. */}
      {view.periods.length > 1 && (
        <div className="flex justify-end px-3">
          <Segmented
            large
            label="Period"
            value={scope.days as OverviewDays}
            onChange={setDays}
            options={OVERVIEW_PERIODS.map((p) => ({ value: p.days, label: p.button }))}
          />
        </div>
      )}

      {/* Financial position: money in against money out, then the cash on hand */}
      <section
        className="mx-3 -mt-2 rounded-[28px] border p-4 @3xl:p-6"
        style={{
          borderColor: 'color-mix(in srgb, var(--accent) 22%, var(--line))',
          background: 'linear-gradient(140deg, color-mix(in srgb, var(--accent) 9%, var(--card)), var(--card) 70%)',
        }}
      >
        <div className="grid grid-cols-3">
          <div className="min-w-0 pr-3 @3xl:pr-8">
            <p className="font-support text-xs text-ink/80 @3xl:text-sm">Money In</p>
            <p className="mt-0.5 text-[1.55rem] leading-none font-semibold tracking-tight @3xl:text-4xl">
              <SlotNumber text={money(flow.moneyIn)} />
            </p>
          </div>
          <div className="min-w-0 border-l border-line px-3 text-center @3xl:px-8">
            <p className="font-support text-xs whitespace-nowrap text-ink/80 @3xl:text-sm">Cash Flow</p>
            <p className={`mt-0.5 text-[1.55rem] leading-none font-semibold tracking-tight @3xl:text-4xl ${netTone}`}>
              <SlotNumber text={flow.count === 0 ? '—' : signed(flow.net)} />
            </p>
          </div>
          <div className="min-w-0 border-l border-line pl-3 text-right @3xl:pl-8">
            <p className="font-support text-xs text-ink/80 @3xl:text-sm">Money Out</p>
            <p className="mt-0.5 text-[1.55rem] leading-none font-semibold tracking-tight @3xl:text-4xl">
              <SlotNumber text={money(flow.moneyOut)} />
            </p>
          </div>
        </div>

        <FlowBar moneyIn={flow.moneyIn} moneyOut={flow.moneyOut} />

        <div className="mt-3 text-center">
          <p className="font-support text-xs font-semibold tracking-[0.2em] text-ink/80 uppercase">Cash Available</p>
          <p data-cash-balance className="mx-auto mt-0.5 w-fit text-4xl leading-none font-semibold tracking-tight @3xl:text-5xl">
            {position.cash === null ? (
              '—'
            ) : (
              <>
                {position.cash < 0 && '-'}
                <span className="text-accent">$</span>
                {moneyExact(Math.abs(position.cash)).slice(1)}
              </>
            )}
          </p>
          <p className="mt-2 font-support text-sm text-ink/80">
            {position.cash === null
              ? 'No checking or savings balance reported.'
              : `In ${load.bank}`}
            {position.cardsOwed !== null && position.cardsOwed > 0 && ` · ${money(position.cardsOwed)} owed on cards`}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 @3xl:mt-4 @3xl:gap-3">
          {badges.map((b) => (
            <span
              key={b.label}
              title={b.title}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 font-support text-[11px] whitespace-nowrap text-ink/80 @3xl:px-3 @3xl:py-1 @3xl:text-sm"
            >
              {b.value && <span className={`font-semibold ${VALUE_TONE[b.tone]}`}>{b.value}</span>}
              {b.label}
            </span>
          ))}
        </div>
      </section>

      <div className="mx-3 mt-1">
      {/* 2 · Recurring commitments */}
      <Collapsible
        {...sectionProps('commitments')}
        title="Commitments"
        icon="calendar-check"
        aside={
          <button
            type="button"
            onClick={() => onNavigate('transactions', 'Recurring', 'all')}
            className="cursor-pointer font-support text-xs text-muted transition-colors hover:text-ink"
          >
            Amounts and details are in Recurring →
          </button>
        }
      >
        <div className="grid grid-cols-2 gap-x-8 gap-y-7 @3xl:grid-cols-4">
          <Commitment
            label="Bills"
            lead={owed.bills.count ? `${owed.bills.count} Active` : 'None Found'}
            detail={owed.bills.count ? 'recurring bills' : 'No recurring bills yet'}
            onOpen={() => onNavigate('transactions', 'Recurring', 'bills')}
          />
          <Commitment
            label="Debt & Installments"
            lead={owed.debt.count ? `${owed.debt.count} Active` : 'None Found'}
            detail={owed.debt.count ? 'repayments and installments' : 'No repayments found'}
            onOpen={() => onNavigate('transactions', 'Recurring', 'debt')}
          />
          <Commitment
            label="Subscriptions"
            lead={owed.subscriptions.count ? `${owed.subscriptions.count} Active` : 'None Found'}
            detail={
              owed.subscriptions.count
                ? owed.unidentified
                  ? `${owed.unidentified} more unidentified`
                  : 'recurring subscriptions'
                : 'No subscriptions found'
            }
            onOpen={() => onNavigate('transactions', 'Recurring', 'subs')}
          />
          <Commitment
            label="Bank Fees"
            lead={fees.count ? money(fees.total) : 'None'}
            detail={fees.count ? `${plural(fees.count, 'charge')} · ${fees.types.join(', ')}` : `No fees in the last ${periodLabel}`}
          />
        </div>
      </Collapsible>

      {/* 3 · Cash-flow history */}
      <Collapsible
        {...sectionProps('cashflow')}
        title="Cash flow"
        icon="graph-bar-increase"
        subtitle={chosen ? `Month by month, last ${chosen} months.` : 'Week by week. Monthly bars appear once there are three months of history.'}
        aside={
          <>
            {savings.rate !== null && (
              <p className="font-support text-sm text-muted">
                <span className={`font-semibold ${savings.rate >= 0 ? 'text-ink' : 'text-red-300'}`}>
                  {savings.rate >= 0 ? '+' : '-'}
                  {percentText(Math.abs(savings.rate))}
                </span>{' '}
                savings rate
              </p>
            )}
            {options.length > 1 && (
              <Segmented label="Range" value={chosen ?? 0} onChange={setRange} options={options.map((n) => ({ value: n, label: `${n}M` }))} />
            )}
          </>
        }
      >
        <div>
          {anyFlow ? (
            <CashFlowChart key={`${chosen}-${buckets.length}`} buckets={buckets} />
          ) : (
            <p className="font-support text-sm text-muted">No money in or out to chart yet.</p>
          )}
        </div>
        {anyFlow && savings.buckets > 0 && (
          <p className="mt-4 font-support text-xs text-muted">
            Savings rate covers {plural(savings.buckets, chosen ? 'full month' : 'full week')}; a period still running or cut short is left out.
          </p>
        )}
      </Collapsible>

        {/* Where the money out went */}
      <Collapsible
        {...sectionProps('breakdown')}
        title="Spending breakdown"
        icon="dollar-coin"
        subtitle={`Where your money out went in the last ${periodLabel}, by category.`}
        aside={
          <button
            type="button"
            onClick={() => onNavigate('patterns')}
            className="cursor-pointer font-support text-xs text-muted transition-colors hover:text-ink"
          >
            See every category in Patterns →
          </button>
        }
      >
        {breakdown.slices.length === 0 ? (
          <p className="font-support text-sm text-muted">No spending in this period.</p>
        ) : (
          <div className="rounded-3xl border border-line bg-card/60 p-5 @3xl:p-6">
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-support text-sm text-ink/80">Total Spending</span>
              <span className="text-lg font-semibold tracking-tight tabular-nums">{money(breakdown.total)}</span>
            </div>

            {/* One bar per category, each as long as its share compared with the biggest one. */}
            <ul className="mt-5 space-y-4">
              {breakdown.slices.map((sl, i) => (
                <li key={sl.key}>
                  <div className="mb-1.5 flex items-baseline gap-3 font-support text-sm">
                    <span className="min-w-0 flex-1 truncate text-ink/90">{sl.name}</span>
                    <span className="hidden text-xs text-muted tabular-nums @xl:inline">{money(sl.amount)}</span>
                    <span className="w-11 text-right font-semibold text-ink tabular-nums">
                      {sl.share > 0 && sl.share < 0.005 ? '<1%' : `${Math.round(sl.share * 100)}%`}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-sm bg-line">
                    <motion.div
                      className="h-full min-w-[3px] rounded-sm"
                      style={{ background: sl.other ? STRIPES : SLICE_COLORS[i % SLICE_COLORS.length] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(sl.share / topShare) * 100}%` }}
                      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Collapsible>

      {/* 4 · Upcoming payments */}
        <Collapsible
          {...sectionProps('upcoming')}
          title="Upcoming payments"
        icon="notification-alert"
          subtitle={`Recurring payments expected in the next ${WINDOW_DAYS} days.`}
        >

          {upcoming.length === 0 ? (
            <p className="font-support text-sm text-muted">
              {analysis.items.some(isUpcomingSource)
                ? `Nothing recurring is expected in the next ${WINDOW_DAYS} days.`
                : 'No recurring payments found yet. They appear once Wallex has seen a payment repeat.'}
            </p>
          ) : (
            <div>
              {upcoming.slice(0, 10).map((p, i) => {
                const inside = pressure?.ids.has(p.id) ?? false;
                const startsGroup = inside && !pressure!.ids.has(upcoming[i - 1]?.id ?? '');
                return (
                  <div key={p.id}>
                    {startsGroup && (
                      <p className="mb-1 mt-2 font-support text-xs text-accent">
                        Highest Concentration · {shortDate(pressure!.start)} – {shortDate(pressure!.end)} · {approx(pressure!.total)}
                      </p>
                    )}
                    <div
                      role="button"
                      tabIndex={0}
                      title={`Show every transaction for ${p.name}`}
                      onClick={() => onNavigate('transactions', 'Checking', undefined, { name: p.name, ids: p.chargeIds })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onNavigate('transactions', 'Checking', undefined, { name: p.name, ids: p.chargeIds });
                        }
                      }}
                      className={`cursor-pointer border-b border-line py-3 transition-colors hover:bg-line focus-visible:bg-line focus-visible:outline-none ${inside ? 'border-l-2 border-l-accent bg-accent-soft/40 pl-3' : ''}`}
                    >
                      <div className="grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-3">
                        <span className="font-support text-sm text-muted tabular-nums">{shortDate(p.date)}</span>
                        <span className="flex min-w-0 items-center gap-2.5">
                          <MerchantLogo name={p.name} sources={p.logos} />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{p.name}</span>
                            {p.dateApprox && <span className="block truncate font-support text-xs text-muted">{dateText(p)}</span>}
                          </span>
                        </span>
                        <span className="text-sm font-medium tabular-nums">{p.amountApprox ? approx(p.amount) : money(p.amount)}</span>
                      </div>
                      {/* The last twelve months, spread across the full width: green for every month a payment was made */}
                      <div className="mt-3 flex justify-between" role="group" aria-label={`Months ${p.name} was paid`}>
                        {monthSlots.map((m) => {
                          const paid = p.paidMonths.includes(m.key);
                          return (
                            <span
                              key={m.key}
                              title={`${m.label} ${m.year} · ${paid ? 'paid' : 'no payment found'}`}
                              className={`font-support text-[11px] @3xl:text-xs ${paid ? 'font-semibold text-accent' : 'text-muted'}`}
                            >
                              {m.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
              {upcoming.length > 10 && (
                <p className="pt-3 font-support text-xs text-muted">+{upcoming.length - 10} more in this window</p>
              )}
              {coveredByCardPayment(analysis) > 0 && (
                <p className="pt-3 font-support text-xs text-muted">
                  {plural(coveredByCardPayment(analysis), 'recurring charge')} on your credit card {coveredByCardPayment(analysis) === 1 ? 'is' : 'are'} not
                  listed separately, because your card payment covers {coveredByCardPayment(analysis) === 1 ? 'it' : 'them'}.
                </p>
              )}
              <p className="mt-4 flex items-baseline justify-between font-support text-sm text-muted">
                <span>Expected In The Next {WINDOW_DAYS} Days</span>
                <span className="text-base font-semibold text-ink tabular-nums">{approx(buffer?.obligations ?? upcoming.reduce((s, p) => s + p.amount, 0))}</span>
              </p>
            </div>
          )}
        </Collapsible>

        {/* 5 · Cash buffer */}
        <Collapsible
          {...sectionProps('buffer')}
          title="Cash buffer"
        icon="piggy-bank"
          subtitle="What is left of your cash after the payments above."
        >

          {buffer === null ? (
            <p className="font-support text-sm text-muted">No checking or savings balance is available to measure against.</p>
          ) : (
            <div>
              <div className="w-full">
                <p className="font-support text-xs text-muted">Left After The Next {WINDOW_DAYS} Days</p>
                <p className={`text-3xl font-semibold tracking-tight tabular-nums ${buffer.remaining < 0 ? 'text-red-300' : ''}`}>{signed(buffer.remaining).replace(/^\+/, '')}</p>
                {/* One bar: the part of the cash that stays, then the part the known payments take. */}
                <div className="mt-2 flex h-5 overflow-hidden rounded-md bg-line" role="img" aria-label={`${money(buffer.obligations)} of ${money(buffer.available)} is already spoken for`}>
                  <motion.span
                    className="flex items-center overflow-hidden bg-accent pl-2 font-support text-[10px] font-bold tracking-wide text-canvas uppercase"
                    initial={{ width: 0 }}
                    animate={{ width: `${keepShare * 100}%` }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {keepShare > 0.12 && 'Keep'}
                  </motion.span>
                  <motion.span
                    className="flex flex-1 items-center justify-center overflow-hidden bg-[#f87171]/80 font-support text-[10px] font-bold tracking-wide text-canvas uppercase"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    {keepShare < 0.88 && 'Due'}
                  </motion.span>
                </div>
                <p className="mt-1.5 font-support text-[11px] text-muted">
                  {money(buffer.obligations)} of {moneyExact(buffer.available)} is already spoken for
                </p>
              </div>
              <p className="mt-5 font-support text-xs text-muted">
                {buffer.available > 0
                  ? `Known payments take ${percentText(Math.min(1, buffer.obligations / buffer.available))} of your cash.`
                  : 'There is no cash to cover them.'}{' '}
                Everyday spending and incoming pay are not included.
              </p>

              {monthEnds.length >= 3 && lowest && (
                <p className="mt-5 border-t border-line pt-4 font-support text-sm text-muted">
                  {lowMonths} of the last {monthEnds.length} months ended under {money(LOW_BALANCE)}. Lowest month-end was{' '}
                  <span className="text-ink">{money(lowest.balance)}</span> in {lowest.label}.
                </p>
              )}
            </div>
          )}
        </Collapsible>

      {/* 6 · Opportunities */}
      <Collapsible
        {...sectionProps('opportunities')}
        title="Opportunities"
        icon="lightbulb"
        subtitle={`What-ifs based on your last ${periodLabel} of spending. They are estimates, not advice.`}
      >
        {ideas.length === 0 && subs.length === 0 ? (
          <p className="font-support text-sm text-muted">No spending in these areas yet, so there is nothing to model.</p>
        ) : (
          <div>
            <div className="space-y-3">
              {subs.map((r) => {
                const on = !!cancelled[r.id];
                const monthly = r.monthly ?? 0;
                return (
                  <button
                    key={r.id}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => setCancelled((c) => ({ ...c, [r.id]: !c[r.id] }))}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-surface px-3 py-3 text-left"
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${on ? 'border-accent bg-accent text-canvas' : 'border-line'}`}>
                      {on && <span className="text-[11px] font-bold">✓</span>}
                    </span>
                    <MerchantLogo name={r.name} sources={r.logos} className="h-8 w-8 text-[10px]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">Cancel {r.name}</span>
                      <span className="mt-1.5 block h-1.5 rounded-full bg-line">
                        <span className="block h-full rounded-full bg-accent" style={{ width: on && subsTotal > 0 ? `${(monthly / subsTotal) * 100}%` : '0%', transition: 'width 0.4s' }} />
                      </span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{money(monthly)}/mo</span>
                  </button>
                );
              })}
              {ideas.slice(0, 5).map((i) => {
                const pct = percentFor(i.id);
                const monthly = savingFor(i, pct);
                return (
                  <div key={i.id} className="rounded-2xl border border-line bg-card p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{i.label}</p>
                        <p className="mt-1 font-support text-xs text-muted">
                          {money(i.monthly)} / month now · {plural(i.count, 'charge')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-accent tabular-nums">+{money(monthly)}/mo</p>
                        <p className="mt-0.5 font-support text-xs text-muted tabular-nums">{approx(monthly * 12)} / year</p>
                      </div>
                    </div>
                    {i.fixedPercent === null ? (
                      <div role="group" aria-label={`How much to cut ${i.label.toLowerCase()}`} className="mt-3 flex gap-1.5">
                        {PERCENTS.map((n) => (
                          <button
                            key={n}
                            type="button"
                            aria-pressed={pct === n}
                            onClick={() => setPercents((p) => ({ ...p, [i.id]: n }))}
                            className={`flex-1 cursor-pointer rounded-lg py-1.5 text-xs transition-colors ${
                              pct === n ? 'bg-accent font-semibold text-canvas' : 'bg-surface text-muted hover:text-ink'
                            }`}
                          >
                            Cut {n}%
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 font-support text-xs text-muted">Counts removing it entirely.</p>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-4 flex items-baseline justify-between font-support text-sm text-muted">
              <span>All Of The Above Together</span>
              <span className="text-base font-semibold text-ink tabular-nums">
                {approx(totalSaved)} / month · {approx(totalSaved * 12)} / year
              </span>
            </p>
          </div>
        )}
      </Collapsible>
      </div>
    </div>
  );
}

// A recurring item that could ever show up in the upcoming list.
function isUpcomingSource(r: { active: boolean; confidence: string; kind: string }) {
  return r.active && ['confirmed', 'likely', 'new'].includes(r.confidence) && r.kind !== 'habit' && r.kind !== 'aggregator';
}
