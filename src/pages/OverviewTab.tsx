import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
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
  upcomingPayments,
  weeklyBuckets,
  type OverviewDays,
  type UpcomingPayment,
} from '../lib/overview';
import { money, percentText } from '../lib/patternFormat';
import { useMobile } from '../lib/viewMode';
import type { Load } from '../lib/useTransactions';

const WINDOW_DAYS = 30; // how far ahead "upcoming" looks
const LOW_BALANCE = 1000; // the line month-end balances are compared against
const PERCENTS = [10, 20, 30];

const signed = (n: number) => `${n >= 0 ? '+' : '-'}${money(Math.abs(n))}`;
const approx = (n: number) => `~${money(n)}`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const weekday = (iso: string) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(`${iso}T00:00:00Z`).getUTCDay()];

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <h2 className="font-support text-xs font-semibold tracking-[0.18em] text-muted uppercase">{children}</h2>
);

function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
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
  onNavigate: (page: string, tab?: string, recurringFilter?: string) => void;
}) {
  const mobile = useMobile();
  const live = load.state === 'live';
  const accounts = live ? load.allAccounts : [];
  const txns = live ? load.allTransactions : [];

  const [days, setDays] = useState<OverviewDays>(30);
  const [range, setRange] = useState<number | null>(null);
  const [percent, setPercent] = useState(20);
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
        return next;
      }),
  });
  // The Recurring tab's analysis, including any corrections the user made there.
  const recurring = useRecurring(live ? load.allTransactions : null, live ? load.allAccounts : undefined);

  // Everything below is derived once per data change from the same transactions and the same scope.
  const view = useMemo(() => {
    if (!live || !recurring) return null;
    const scopes = ([30, 60, 90] as OverviewDays[]).map((d) => ({ days: d, scope: overviewScope(txns, accounts, d) }));
    const periods = scopes.filter((s) => s.days === 30 || !s.scope.partial).map((s) => s.days);
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
          className="mt-6 cursor-pointer rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-canvas"
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
  const owed = commitments(analysis);
  const upcoming = upcomingPayments(analysis, scope.today, WINDOW_DAYS);
  const pressure = pressureWindow(upcoming);
  const buffer = cashBuffer(position.cash, upcoming, WINDOW_DAYS);
  const monthEnds = monthEndBalances(txns, accounts, scope);
  const ideas = scenarios(txns, scope);
  const latest = latestDate(txns);

  // Cash-flow history: months when there are at least three of them, weeks before that.
  const options = rangeOptions(scope);
  const chosen = range !== null && options.includes(range) ? range : options.includes(6) ? 6 : (options[options.length - 1] ?? null);
  const buckets = chosen ? monthlyBuckets(txns, scope, chosen) : weeklyBuckets(txns, scope);
  const savings = savingsOver(buckets);
  const anyFlow = buckets.some((b) => b.moneyIn > 0 || b.moneyOut > 0);

  const lowMonths = monthEnds.filter((m) => m.balance < LOW_BALANCE).length;
  const lowest = monthEnds.length ? monthEnds.reduce((lo, m) => (m.balance < lo.balance ? m : lo)) : null;
  const totalSaved = ideas.reduce((s, i) => s + savingFor(i, percent), 0);
  const periodLabel = scope.partial ? `${scope.effectiveDays} days` : `${scope.days} days`;

  return (
    <div className="flex flex-col gap-12 px-1 pb-10">
      {/* Context */}
      <div className="order-first flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-3">
        <p className="font-support text-sm text-muted">
          {shortDate(scope.partial && scope.historyStart ? scope.historyStart : scope.start)} – {shortDate(scope.today)}
          {' · '}
          {plural(accounts.length, 'account')} included
          {latest && ` · latest transaction ${shortDate(latest)}`}
        </p>
        {view.periods.length > 1 && (
          <Segmented
            label="Period"
            value={scope.days as OverviewDays}
            onChange={setDays}
            options={view.periods.map((d) => ({ value: d as OverviewDays, label: `${d} days` }))}
          />
        )}
      </div>

      {/* 1 · Financial position: money in and out first, then the cash on hand */}
      <section className="order-1 px-3">
        <div className="grid grid-cols-3 gap-4 @3xl:gap-10">
          <div className="min-w-0">
            <p className="font-support text-xs text-muted">Money in</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight @3xl:text-4xl">
              <SlotNumber text={money(flow.moneyIn)} />
            </p>
          </div>
          <div className="min-w-0">
            <p className="font-support text-xs text-muted">Money out</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight @3xl:text-4xl">
              <SlotNumber text={money(flow.moneyOut)} />
            </p>
          </div>
          <div className="min-w-0 border-l border-line pl-4 @3xl:pl-10">
            <p className="font-support text-xs text-muted">Net cash flow</p>
            <p
              className={`mt-2 text-2xl font-semibold tracking-tight @3xl:text-4xl ${
                flow.count === 0 ? '' : flow.net >= 0 ? 'text-accent' : 'text-red-300'
              }`}
            >
              <SlotNumber text={flow.count === 0 ? '—' : signed(flow.net)} />
            </p>
          </div>
        </div>
        <p className="mt-4 font-support text-sm text-muted">
          {flow.count === 0
            ? `No money in or out in the last ${periodLabel}.`
            : flow.savingsRate === null
              ? `No income detected in the last ${periodLabel}, so there is no savings rate.`
              : `${flow.savingsRate >= 0 ? '+' : '-'}${percentText(Math.abs(flow.savingsRate))} savings rate over the last ${periodLabel}`}
          {flow.pending > 0 && ` · includes ${plural(flow.pending, 'pending transaction')}`}
          {scope.partial && ` · only ${scope.effectiveDays} days of history so far`}
        </p>

        <div className="mt-8 border-t border-line pt-6">
          <Eyebrow>Cash available</Eyebrow>
          <p className="mt-3 text-5xl leading-none font-semibold tracking-tight @3xl:text-6xl">
            {position.cash === null ? '—' : money(position.cash)}
          </p>
          <p className="mt-3 font-support text-sm text-muted">
            {position.cash === null
              ? 'No checking or savings balance reported.'
              : `In ${plural(position.cashAccounts.length, 'checking or savings account')}`}
            {position.cardsOwed !== null && position.cardsOwed > 0 && ` · ${money(position.cardsOwed)} owed on cards`}
          </p>
        </div>
      </section>

      {/* 2 · Recurring commitments */}
      <Collapsible
        {...sectionProps('commitments')}
        className="order-3 @3xl:order-2"
        title="Commitments"
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
            lead={owed.bills.count ? `${owed.bills.count} active` : 'None found'}
            detail={owed.bills.count ? 'recurring bills' : 'No recurring bills yet'}
            onOpen={() => onNavigate('transactions', 'Recurring', 'bills')}
          />
          <Commitment
            label="Debt & installments"
            lead={owed.debt.count ? `${owed.debt.count} active` : 'None found'}
            detail={owed.debt.count ? 'repayments and installments' : 'No repayments found'}
            onOpen={() => onNavigate('transactions', 'Recurring', 'debt')}
          />
          <Commitment
            label="Subscriptions"
            lead={owed.subscriptions.count ? `${owed.subscriptions.count} active` : 'None found'}
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
            label="Bank fees"
            lead={fees.count ? money(fees.total) : 'None'}
            detail={fees.count ? `${plural(fees.count, 'charge')} · ${fees.types.join(', ')}` : `No fees in the last ${periodLabel}`}
          />
        </div>
      </Collapsible>

      {/* 3 · Cash-flow history */}
      <Collapsible
        {...sectionProps('cashflow')}
        className="order-4 @3xl:order-3"
        title="Cash flow"
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

      <div className="contents @3xl:order-4 @3xl:flex @3xl:flex-col @3xl:gap-12">
        {/* 4 · Upcoming pressure */}
        <Collapsible
          {...sectionProps('upcoming')}
          className="order-2 @3xl:order-none"
          title="Upcoming pressure"
          subtitle={`Recurring payments expected in the next ${WINDOW_DAYS} days.`}
        >

          {upcoming.length === 0 ? (
            <p className="mt-5 font-support text-sm text-muted">
              {analysis.items.some(isUpcomingSource)
                ? `Nothing recurring is expected in the next ${WINDOW_DAYS} days.`
                : 'No recurring payments found yet. They appear once Wallex has seen a payment repeat.'}
            </p>
          ) : (
            <div className="mt-5">
              {upcoming.slice(0, 10).map((p, i) => {
                const inside = pressure?.ids.has(p.id) ?? false;
                const startsGroup = inside && !pressure!.ids.has(upcoming[i - 1]?.id ?? '');
                return (
                  <div key={p.id}>
                    {startsGroup && (
                      <p className="mb-1 mt-2 font-support text-xs text-accent">
                        Highest concentration · {shortDate(pressure!.start)} – {shortDate(pressure!.end)} · {approx(pressure!.total)}
                      </p>
                    )}
                    <div
                      className={`grid grid-cols-[4.75rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-3 ${
                        inside ? 'border-l-2 border-l-accent bg-accent-soft/40 pl-3' : ''
                      }`}
                    >
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
                <span>Expected in the next {WINDOW_DAYS} days</span>
                <span className="text-base font-semibold text-ink tabular-nums">{approx(buffer?.obligations ?? upcoming.reduce((s, p) => s + p.amount, 0))}</span>
              </p>
            </div>
          )}
        </Collapsible>

        {/* 5 · Cash buffer */}
        <Collapsible
          {...sectionProps('buffer')}
          className="order-5 @3xl:order-none"
          title="Cash buffer"
          subtitle="What is left of your cash after the payments above."
        >

          {buffer === null ? (
            <p className="mt-5 font-support text-sm text-muted">No checking or savings balance is available to measure against.</p>
          ) : (
            <div className="mt-5">
              <dl className="space-y-3 font-support text-sm">
                <div className="flex items-baseline justify-between">
                  <dt className="text-muted">Cash available</dt>
                  <dd className="tabular-nums">{money(buffer.available)}</dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-muted">Expected recurring payments</dt>
                  <dd className="tabular-nums">-{money(buffer.obligations)}</dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-line pt-3">
                  <dt className="text-ink">Remaining buffer</dt>
                  <dd className={`text-2xl font-semibold tracking-tight tabular-nums ${buffer.remaining < 0 ? 'text-red-300' : ''}`}>
                    {signed(buffer.remaining).replace(/^\+/, '')}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-accent/80"
                  style={{ width: `${buffer.available > 0 ? Math.min(100, (buffer.obligations / buffer.available) * 100) : 100}%` }}
                />
              </div>
              <p className="mt-2 font-support text-xs text-muted">
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
      </div>

      {/* 6 · Opportunities */}
      <Collapsible
        {...sectionProps('opportunities')}
        className="order-6 @3xl:order-5"
        title="Opportunities"
        subtitle={`What-ifs based on your last ${periodLabel} of spending. They are estimates, not advice.`}
        aside={
          ideas.some((i) => i.fixedPercent === null) ? (
            <Segmented
              label="Reduction"
              value={percent}
              onChange={setPercent}
              options={PERCENTS.map((n) => ({ value: n, label: `${n}%` }))}
            />
          ) : undefined
        }
      >
        {ideas.length === 0 ? (
          <p className="mt-5 font-support text-sm text-muted">No spending in these areas yet, so there is nothing to model.</p>
        ) : (
          <div className="mt-5">
            {ideas.slice(0, 5).map((i) => {
              const monthly = savingFor(i, percent);
              return (
                <div key={i.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-line py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {i.fixedPercent ? `Eliminate ${i.label.toLowerCase()}` : `Reduce ${i.label.toLowerCase()} ${percent}%`}
                    </p>
                    <p className="mt-1 font-support text-xs text-muted">
                      {money(i.monthly)} / month now · {plural(i.count, 'charge')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold tabular-nums">{approx(monthly)} / month</p>
                    <p className="mt-1 font-support text-xs text-muted tabular-nums">{approx(monthly * 12)} / year</p>
                  </div>
                </div>
              );
            })}
            <p className="mt-4 flex items-baseline justify-between font-support text-sm text-muted">
              <span>All of the above together</span>
              <span className="text-base font-semibold text-ink tabular-nums">
                {approx(totalSaved)} / month · {approx(totalSaved * 12)} / year
              </span>
            </p>
          </div>
        )}
      </Collapsible>
    </div>
  );
}

// A recurring item that could ever show up in the upcoming list.
function isUpcomingSource(r: { active: boolean; confidence: string; kind: string }) {
  return r.active && ['confirmed', 'likely', 'new'].includes(r.confidence) && r.kind !== 'habit' && r.kind !== 'aggregator';
}
