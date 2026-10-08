import { useMemo, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import MerchantLogo from '../components/MerchantLogo';
import PlumpIcon, { type PlumpName } from '../components/PlumpIcon';
import SectionTitle from '../components/SectionTitle';
import { money } from '../lib/patternFormat';
import { useRecurring } from '../lib/recurringOverrides';
import {
  BILL_CATEGORY_OPTIONS,
  DAY_OPTIONS,
  DEFAULT_RULES,
  MAX_CIRCLES_RANGE,
  MIN_AMOUNTS,
  changedRules,
  resetRules,
  setRules,
  useRules,
  type Rules,
} from '../lib/rules';
import { computeImpacts, type RuleImpacts } from '../lib/rulesImpact';
import type { Load } from '../lib/useTransactions';

// The Rules tab: the choices behind the numbers. Each one is written in plain words, says what it is doing to the
// person's own figures right now, and shows when it differs from the standard setting.

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
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-sm transition-colors ${value === o.value ? 'bg-accent text-canvas' : 'bg-surface text-muted hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${on ? 'bg-accent' : 'bg-line'}`}
    >
      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  );
}

function Rule({
  icon,
  title,
  description,
  changed,
  onReset,
  impact,
  aside,
  children,
}: {
  icon: PlumpName;
  title: string;
  description: string;
  changed: boolean;
  onReset: () => void;
  impact?: React.ReactNode;
  aside?: React.ReactNode; // sits at the right of the heading, for a switch
  children?: React.ReactNode;
}) {
  return (
    <div className="py-5 first:pt-1 last:pb-1">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-start gap-2.5 text-sm font-medium">
            <PlumpIcon name={icon} className="mt-px h-5 w-5 shrink-0 text-muted" />
            <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              {title}
              {changed && (
                <span className="flex items-center gap-1.5 rounded-full bg-accent-soft px-2 py-0.5 font-support text-[11px] font-semibold text-accent">
                  Changed
                  <button type="button" onClick={onReset} className="cursor-pointer font-normal underline-offset-2 hover:underline">
                    Reset
                  </button>
                </span>
              )}
            </span>
          </div>
          <p className="mt-1.5 font-support text-xs leading-relaxed text-muted">{description}</p>
        </div>
        {aside}
      </div>
      {children && <div className="mt-3.5">{children}</div>}
      {impact && <p className="mt-3 font-support text-xs leading-relaxed text-ink/80">{impact}</p>}
    </div>
  );
}

function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-surface p-1">
      <button type="button" aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-card text-ink transition-transform active:scale-90 disabled:cursor-default disabled:opacity-40">
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-12 text-center text-base font-semibold tabular-nums" aria-live="polite">{value}</span>
      <button type="button" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-accent text-canvas transition-transform active:scale-90 disabled:cursor-default disabled:opacity-40">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

const titleCase = (key: string) => key.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

function IgnoredMerchants({ rules, impacts }: { rules: Rules; impacts: RuleImpacts | null }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const known = useMemo(() => new Map((impacts?.candidates ?? []).map((b) => [b.key, b])), [impacts]);
  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
      (impacts?.candidates ?? [])
        .filter((b) => !rules.ignoredMerchants.includes(b.key) && (!q || b.name.toLowerCase().includes(q)))
        .slice(0, 6),
    [impacts, rules.ignoredMerchants, q],
  );
  const add = (key: string) => {
    setRules({ ignoredMerchants: [...rules.ignoredMerchants, key] });
    setQuery('');
  };

  return (
    <div className="space-y-3">
      {rules.ignoredMerchants.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {rules.ignoredMerchants.map((key) => {
            const b = known.get(key);
            return (
              <li key={key} className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pr-1.5 pl-1.5 text-sm">
                {b ? <MerchantLogo name={b.name} sources={b.logos} className="h-6 w-6 text-[9px]" /> : null}
                <span className={b ? '' : 'pl-1.5'}>{b?.name ?? titleCase(key)}</span>
                <button type="button" aria-label={`Stop ignoring ${b?.name ?? titleCase(key)}`} onClick={() => setRules({ ignoredMerchants: rules.ignoredMerchants.filter((k) => k !== key) })} className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-line hover:text-ink">
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {impacts ? (
        <div className="relative max-w-sm" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Find a merchant to ignore…"
            aria-label="Find a merchant to ignore"
            className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-muted/60 focus:border-accent"
          />
          {open && matches.length > 0 && (
            <ul className="absolute top-full z-20 mt-2 w-full rounded-xl border border-line bg-card p-1.5 shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
              {matches.map((b) => (
                <li key={b.key}>
                  <button type="button" onClick={() => add(b.key)} className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-surface">
                    <MerchantLogo name={b.name} sources={b.logos} className="h-7 w-7 text-[10px]" />
                    <span className="min-w-0 flex-1 truncate">{b.name}</span>
                    <span className="font-support text-xs text-muted tabular-nums">{money(b.amount)}/mo</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="font-support text-xs text-muted">Connect a bank to pick from your own merchants.</p>
      )}
    </div>
  );
}

function Group({ title, icon, children }: { title: string; icon: PlumpName; children: React.ReactNode }) {
  return (
    <section>
      <SectionTitle icon={icon} as="h3" className="mb-3 px-1 text-lg font-semibold">
        {title}
      </SectionTitle>
      <div className="divide-y divide-line rounded-2xl border border-line bg-card/40 px-5 py-4 @3xl:px-6">{children}</div>
    </section>
  );
}

export default function RulesTab({ load }: { load: Load }) {
  const rules = useRules();
  const live = load.state === 'live';
  const analysis = useRecurring(live ? load.allTransactions : null, live ? load.allAccounts : undefined);
  const impacts = useMemo(
    () => (live && analysis ? computeImpacts(load.allTransactions, load.allAccounts, analysis, rules) : null),
    [live, load, analysis, rules],
  );

  const changed = changedRules(rules);
  const isChanged = (k: keyof Rules) => changed.includes(k);
  const reset = (k: keyof Rules) => () => resetRules([k]);
  const connect = <span className="text-muted">Connect a bank to see what this does to your numbers.</span>;
  const perMonth = (n: number) => <b className="font-semibold text-ink">{money(n)}/mo</b>;

  // Card payments
  const cardImpact = !impacts
    ? connect
    : !impacts.hasCredit
      ? 'No credit card is linked, so this changes nothing yet.'
      : impacts.cardPaymentsPerMonth < 1
        ? 'You have no payments to your linked cards in this period, so it changes nothing right now.'
        : rules.countCardPayments
          ? <>Counting them is adding {perMonth(impacts.cardPaymentsPerMonth)} to your spending. Those same purchases are already counted, so this can double count.</>
          : <>Counting them would add {perMonth(impacts.cardPaymentsPerMonth)} to your spending.</>;

  return (
    <div className="space-y-8 px-1 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div>
          <SectionTitle icon="task-list-edit">Rules</SectionTitle>
          <p className="mt-1 font-support text-sm text-muted">
            How Wallex counts your money. Changes apply to Patterns and Overview straight away and are remembered.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-support text-xs text-muted">
            {changed.length === 0 ? 'All rules are standard' : `${changed.length} ${changed.length === 1 ? 'rule' : 'rules'} changed`}
          </span>
          <button
            type="button"
            onClick={() => resetRules()}
            disabled={changed.length === 0}
            className="cursor-pointer rounded-xl border border-line px-4 py-2 text-sm font-medium transition-colors hover:border-muted disabled:cursor-default disabled:opacity-40 disabled:hover:border-line"
          >
            Reset to defaults
          </button>
        </div>
      </div>

      <Group title="What counts" icon="wallet">
        <Rule
          icon="wallet"
          title="Count card payments as spending"
          description="Paying off a credit card moves money you have already spent, so Wallex leaves it out when it counts the card’s own purchases. Turn this on to count the payments too."
          changed={isChanged('countCardPayments')}
          onReset={reset('countCardPayments')}
          impact={cardImpact}
          aside={<Switch on={rules.countCardPayments} onChange={(countCardPayments) => setRules({ countCardPayments })} label="Count card payments as spending" />}
        />

        <Rule
          icon="piggy-bank"
          title="What counts as income"
          description="Pay only uses deposits your bank tags as income. All deposits also counts money sent to you, refunds and other deposits, but never moves between your own accounts."
          changed={isChanged('incomeFrom')}
          onReset={reset('incomeFrom')}
          impact={
            impacts ? (
              <>
                Pay only: {perMonth(impacts.incomePay)} · All deposits: {perMonth(impacts.incomeAll)}
              </>
            ) : (
              connect
            )
          }
        >
          <Segmented
            label="What counts as income"
            value={rules.incomeFrom}
            onChange={(incomeFrom) => setRules({ incomeFrom })}
            options={[
              { value: 'pay', label: 'Pay only' },
              { value: 'all', label: 'All deposits' },
            ]}
          />
        </Rule>

        <Rule
          icon="eye-optic"
          title="Ignore these merchants"
          description="Left out of spending everywhere: Patterns, Overview and the totals. Good for things that are not really spending, like paying back a friend."
          changed={isChanged('ignoredMerchants')}
          onReset={reset('ignoredMerchants')}
          impact={
            rules.ignoredMerchants.length === 0
              ? undefined
              : impacts
                ? <>{rules.ignoredMerchants.length} ignored · {impacts.ignoredPerMonth >= 1 ? <>{perMonth(impacts.ignoredPerMonth)} left out of your spending.</> : 'nothing from them in this period.'}</>
                : undefined
          }
        >
          <IgnoredMerchants rules={rules} impacts={impacts} />
        </Rule>
      </Group>

      <Group title="Patterns" icon="layers-1">
        <Rule
          icon="circle-clock"
          title="Starting period"
          description="How far back Patterns looks when it opens. You can still change it from the filter on the Patterns page."
          changed={isChanged('defaultDays')}
          onReset={reset('defaultDays')}
          impact={
            impacts
              ? impacts.partial
                ? `You only have ${impacts.effectiveDays} days of history, so the figures are averaged over those.`
                : `Patterns opens on the last ${impacts.days} days.`
              : connect
          }
        >
          <Segmented
            label="Starting period"
            value={rules.defaultDays}
            onChange={(defaultDays) => setRules({ defaultDays })}
            options={DAY_OPTIONS.map((d) => ({ value: d, label: `${d} days` }))}
          />
        </Rule>

        <Rule
          icon="filter-1"
          title="Smallest amount to show"
          description="Merchants and bills that come to less than this each month get no circle. It keeps small stuff from crowding the picture."
          changed={isChanged('minMonthly')}
          onReset={reset('minMonthly')}
          impact={
            impacts
              ? impacts.hiddenByMinimum > 0
                ? <>Hides {impacts.hiddenByMinimum} of {impacts.hiddenByMinimum + impacts.bills + impacts.merchants} circles.</>
                : 'Nothing is hidden at this setting.'
              : connect
          }
        >
          <Segmented
            label="Smallest amount to show"
            value={rules.minMonthly}
            onChange={(minMonthly) => setRules({ minMonthly })}
            options={MIN_AMOUNTS.map((m) => ({ value: m, label: m === 0 ? 'Any' : `$${m}` }))}
          />
        </Rule>

        <Rule
          icon="layers-1"
          title="Most circles to draw"
          description="The biggest ones are drawn and the rest are summed up in a line of text. The phone view never draws more than 12, and fewer are drawn if they do not fit."
          changed={isChanged('maxCircles')}
          onReset={reset('maxCircles')}
          impact={
            impacts
              ? <>You have {impacts.bills + impacts.merchants} bills and merchants{impacts.bills + impacts.merchants > rules.maxCircles ? <>, so the biggest {rules.maxCircles} are drawn.</> : ', so all of them can be drawn.'}</>
              : connect
          }
        >
          <Stepper label="circles" value={rules.maxCircles} min={MAX_CIRCLES_RANGE.min} max={MAX_CIRCLES_RANGE.max} onChange={(maxCircles) => setRules({ maxCircles })} />
        </Rule>

        <Rule
          icon="tag-alt"
          title="Categories that are bills"
          description="Anything bought in these categories is treated as a bill, along with anything Wallex finds repeating on a schedule. Insurance is always a bill."
          changed={isChanged('billCategories')}
          onReset={reset('billCategories')}
          impact={
            impacts
              ? <>{impacts.bills} {impacts.bills === 1 ? 'bill' : 'bills'} right now{impacts.billsFromCategories > 0 ? <>, {impacts.billsFromCategories} of them because of these categories.</> : '.'}</>
              : connect
          }
        >
          <div className="flex flex-wrap gap-1.5">
            {BILL_CATEGORY_OPTIONS.map((c) => {
              const on = rules.billCategories.includes(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setRules({ billCategories: on ? rules.billCategories.filter((k) => k !== c.key) : [...rules.billCategories, c.key] })}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm transition-colors ${on ? 'bg-accent text-canvas' : 'bg-surface text-muted hover:text-ink'}`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </Rule>
      </Group>

      <p className="px-1 font-support text-xs text-muted">
        Standard setting for each rule: card payments {DEFAULT_RULES.countCardPayments ? 'counted' : 'left out'}, income from pay only, {DEFAULT_RULES.defaultDays} days, any amount, up to {DEFAULT_RULES.maxCircles} circles.
      </p>
    </div>
  );
}
