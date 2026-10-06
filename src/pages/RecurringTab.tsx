import { useMemo, useState } from 'react';
import SectionTitle from '../components/SectionTitle';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import ExpandingSearch from '../components/ExpandingSearch';
import MerchantLogo from '../components/MerchantLogo';
import type { Load } from '../lib/useTransactions';
import { cadenceWord, type Confidence, type Kind, type Recurring } from '../lib/recurring';
import { setOverride, useRecurring, type Corrected, type HideReason } from '../lib/recurringOverrides';
import {
  CONFIDENCE_LABEL,
  STATUS_LABEL,
  amountText,
  cadenceText,
  dateLong,
  dateShort,
  fmt,
  kindText,
  monthYear,
  monthlyText,
  nextText,
} from '../lib/recurringFormat';
import { SAMPLE_ANALYSIS } from '../lib/recurringSample';
import { useMobile } from '../lib/viewMode';
import type { LinkedAccount, Txn } from '../lib/wallex';

const GRID = 'grid grid-cols-[2.4fr_1.6fr_1.1fr_1.3fr] gap-4 px-4';
const GRID_MOBILE = 'grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-1';

const BADGE: Record<Confidence, { label: string; badge: string; value: string }> = {
  confirmed: { label: 'Confirmed', badge: 'bg-accent-soft text-accent', value: 'text-accent' },
  likely: { label: 'Likely', badge: 'bg-sky-400/15 text-sky-300', value: 'text-sky-300' },
  new: { label: 'New', badge: 'bg-violet-400/15 text-violet-300', value: 'text-violet-300' },
  review: { label: 'Needs Review', badge: 'bg-amber-400/15 text-amber-300', value: 'text-amber-300' },
  habit: { label: 'Habit', badge: 'bg-surface text-muted', value: 'text-muted' },
};
const ENDED_BADGE = 'rounded-full bg-red-400/15 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-red-300';

const FILTERS: { id: string; label: string; test: (r: Recurring) => boolean; empty: string }[] = [
  { id: 'all', label: 'All', test: () => true, empty: 'No recurring charges detected yet.' },
  { id: 'bills', label: 'Bills', test: (r) => r.kind === 'bill', empty: 'No bills detected yet.' },
  { id: 'debt', label: 'Debt', test: (r) => r.kind === 'debt' || r.kind === 'installment', empty: 'No debt or installment payments detected yet.' },
  {
    id: 'subs',
    label: 'Subscriptions',
    test: (r) => r.kind === 'subscription' || r.kind === 'usage',
    empty: 'No subscriptions detected yet. Wallex needs more transaction history to identify repeating subscriptions.',
  },
  { id: 'review', label: 'Needs Review', test: (r) => r.confidence === 'review', empty: 'Nothing needs review right now.' },
  { id: 'habits', label: 'Habits', test: (r) => r.kind === 'habit', empty: 'No spending habits detected yet.' },
  { id: 'ended', label: 'Possibly Ended', test: (r) => r.status === 'possibly-ended', empty: 'Nothing looks like it has ended.' },
];

const fmtMoney = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const signedFmt = (n: number) => `${n >= 0 ? '+' : '-'}${fmt(Math.abs(n))}`;

const corr = (r: Recurring) => r as Partial<Corrected> & Recurring;

function Tile({
  label,
  value,
  tone,
  detail,
  active,
  onClick,
}: {
  label: string;
  value: string;
  tone: string;
  detail?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <>
      <p className="font-support text-xs text-muted">{label}</p>
      <p className={`mt-1.5 text-2xl font-semibold tracking-tight @3xl:mt-2 @3xl:text-3xl ${tone}`}>{value}</p>
      {detail && <p className="mt-1 truncate font-support text-[11px] text-muted" title={detail}>{detail}</p>}
    </>
  );
  const cls = `rounded-2xl border bg-card p-3 text-left @3xl:p-4 ${active ? 'border-accent' : 'border-line'}`;
  return onClick ? (
    <button type="button" onClick={onClick} aria-pressed={active} className={`${cls} cursor-pointer transition-colors hover:bg-surface/60`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold tracking-wider text-muted uppercase">{label}</dt>
      <dd className="mt-1.5 font-support text-sm select-text">{children}</dd>
      {hint && <p className="mt-0.5 font-support text-xs text-muted">{hint}</p>}
    </div>
  );
}

const CONFIRM_AS: { kind: Kind; label: string }[] = [
  { kind: 'bill', label: 'Bill' },
  { kind: 'subscription', label: 'Subscription' },
  { kind: 'debt', label: 'Debt Payment' },
  { kind: 'installment', label: 'Installment' },
];
const DISMISS_AS: { reason: HideReason; label: string }[] = [
  { reason: 'transfer', label: 'A Transfer' },
  { reason: 'not-recurring', label: 'Not Recurring' },
  { reason: 'ignored', label: 'Just Ignore It' },
];
const HIDE_TEXT: Record<HideReason, string> = { transfer: 'Marked as a transfer', 'not-recurring': 'Marked as not recurring', ignored: 'Ignored' };

function Pill({ children, onClick, on, tone }: { children: React.ReactNode; onClick: () => void; on?: boolean; tone?: 'quiet' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-full px-3 py-1.5 text-xs transition-colors ${
        on ? 'bg-accent text-canvas' : tone === 'quiet' ? 'text-muted hover:text-ink' : 'border border-line bg-surface text-ink hover:border-accent'
      }`}
    >
      {children}
    </button>
  );
}

function Detail({
  r,
  editable,
  accounts,
}: {
  r: Recurring;
  editable: boolean;
  accounts: Map<string, LinkedAccount>;
}) {
  const mobile = useMobile();
  const c = corr(r);
  const [mode, setMode] = useState<null | 'rename' | 'confirm' | 'dismiss'>(null);
  const [label, setLabel] = useState(r.name);
  const [showAll, setShowAll] = useState(false);

  const next = nextText(r);
  const charges = showAll ? r.charges : r.charges.slice(0, 6);
  const change = r.priceChange;
  const isReview = r.confidence === 'review';
  const annualWord = r.cadence === 'annual';

  return (
    <div className="space-y-6 border-t border-line bg-surface/30 px-4 py-5 @container">
      {/* Why this is uncertain: first, because it is what needs the user's attention. */}
      {isReview && r.uncertainty && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] px-4 py-3 font-support text-sm select-text">
          <p className="text-xs font-semibold tracking-wider text-amber-300 uppercase">Why this needs review</p>
          <p className="mt-1.5">{r.uncertainty}</p>
        </div>
      )}

      <dl className="grid gap-x-8 gap-y-5 @2xl:grid-cols-3">
        {/* Core financial information */}
        <div className="space-y-4">
          <Field label="Typical amount">
            <span className="text-lg font-semibold tracking-tight">{amountText(r)}</span>
            {r.amountKind === 'usage' && <span className="text-muted"> · base charge, usage varies</span>}
          </Field>
          <Field
            label="Monthly impact"
            hint={
              annualWord && r.monthly !== null
                ? 'The yearly charge spread over 12 months'
                : r.monthly !== null && r.annualApprox
                  ? 'Estimated from past charges'
                  : undefined
            }
          >
            {r.monthly === null ? (
              <span className="text-muted">{r.status === 'possibly-ended' ? 'Not counted while it may have ended' : isReview ? 'Not counted until identified' : 'Not estimated'}</span>
            ) : (
              <>
                {annualWord ? 'Equivalent to ' : ''}
                <span className="font-medium">{monthlyText(r)?.replace('/mo', ' / month')}</span>
              </>
            )}
          </Field>
          {r.annual !== null && (
            <Field label="Annual impact" hint={r.annualApprox ? 'An estimate, not a promise' : undefined}>
              <span className="font-medium">{`${r.annualApprox ? '~' : ''}${fmt(r.annualApprox ? Math.round(r.annual) : r.annual)} / year`}</span>
            </Field>
          )}
          {r.usage && (
            <Field label="Usage on top" hint={`${r.usage.count} extra charges, about ${fmt(Math.round(r.usage.perMonth))} a month`}>
              {r.usage.combinedMonthly !== null ? (
                <>
                  Recently about <span className="font-medium">{fmt(Math.round(r.usage.combinedMonthly))} / month</span> in total
                </>
              ) : (
                <span className="text-muted">Variable</span>
              )}
            </Field>
          )}
        </div>

        {/* Timing */}
        <div className="space-y-4">
          <Field label="Last charged">
            {r.lastCharge ? `${dateShort(r.lastCharge.date)} · ${fmtMoney(r.lastCharge.amount)}` : <span className="text-muted">Not available</span>}
          </Field>
          <Field
            label={next && r.nextExpected?.approx ? 'Expected around' : 'Next expected'}
            hint={!next ? (r.status === 'possibly-ended' ? 'Not predicted while it may have ended' : 'The timing is not steady enough to predict') : undefined}
          >
            {next ? next.replace(/^Around /, '') : <span className="text-muted">Not predicted</span>}
          </Field>
          <Field label="History">
            {r.charges.length > 0 ? (
              <>
                {r.charges.length} charges{r.firstDate ? ` since ${monthYear(r.firstDate)}` : ''}
              </>
            ) : (
              <span className="text-muted">{r.recent.length ? `${r.recent.length}+ charges` : 'Example data'}</span>
            )}
          </Field>
        </div>

        {/* Classification */}
        <div className="space-y-4">
          <Field label="Type" hint={r.kind === 'installment' ? 'A temporary recurring obligation. It should end.' : undefined}>
            {kindText(r)}
            {r.paidOnCard && <span className="text-muted"> · paid with a credit card</span>}
            {c.userConfirmed && <span className="text-muted"> · confirmed by you</span>}
          </Field>
          <Field label="Status">
            {STATUS_LABEL[r.status]}
            {r.status === 'possibly-ended' && <span className="text-muted"> · no recent charge, which does not prove it was cancelled</span>}
          </Field>
          <Field label="Confidence">
            {c.userConfirmed ? 'Confirmed by You' : CONFIDENCE_LABEL[r.confidence]}
          </Field>
        </div>
      </dl>

      {/* Price change */}
      {change && (
        <div className="flex items-start gap-3 rounded-2xl border border-line bg-card px-4 py-3 font-support text-sm select-text">
          {change.delta > 0 ? <ArrowUp className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /> : <ArrowDown className="mt-0.5 h-4 w-4 shrink-0 text-accent" />}
          <p>
            <span className="font-semibold">
              Price {change.delta > 0 ? 'increased' : 'decreased'} {signedFmt(change.delta)}
            </span>{' '}
            <span className="text-muted">
              · {fmt(change.previous)} → {fmt(change.current)} since {dateShort(change.since)} ({change.pct > 0 ? '+' : ''}
              {Math.round(change.pct * 100)}%)
            </span>
          </p>
        </div>
      )}

      {/* Why it was recognised, and what was noticed */}
      <div className="grid gap-5 @2xl:grid-cols-2">
        <div>
          <SectionTitle as="h4" icon="magic-wand-1" iconClass="h-4 w-4" className="text-xs font-semibold tracking-wider text-muted uppercase !gap-2">Why Wallex recognised it</SectionTitle>
          <p className="mt-1.5 font-support text-sm select-text">{r.reason}</p>
        </div>
        {r.notes.length > 0 && (
          <div>
            <SectionTitle as="h4" icon="search-visual" iconClass="h-4 w-4" className="text-xs font-semibold tracking-wider text-muted uppercase !gap-2">Observations</SectionTitle>
            <ul className="mt-1.5 space-y-1.5 font-support text-sm select-text">
              {r.notes.map((n) => (
                <li key={n} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted" />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {r.settlement === 'card' && (
        <p className="font-support text-sm text-muted">
          This pays a credit card. When that card's own purchases are linked to Wallex they are already counted as spending, so this
          payment is a cash-flow event and not extra spending.
        </p>
      )}

      {/* Evidence */}
      {charges.length > 0 && (
        <div>
          <SectionTitle as="h4" icon="task-list-edit" iconClass="h-4 w-4" className="text-xs font-semibold tracking-wider text-muted uppercase !gap-2">The charges behind this</SectionTitle>
          <div className="mt-2 divide-y divide-line font-support text-sm">
            {charges.map((t: Txn) => {
              const acct = accounts.get(t.accountId);
              const desc = t.details.find((d) => d.label === 'Bank Description')?.value ?? t.merchant;
              return (
                <div
                  key={t.id}
                  className={`grid items-center gap-x-4 gap-y-0.5 py-2.5 ${mobile ? 'grid-cols-[auto_minmax(0,1fr)_auto]' : 'grid-cols-[6.5rem_minmax(0,1fr)_13rem_9rem_auto]'}`}
                >
                  <span className="text-muted tabular-nums">{dateShort(t.date)}</span>
                  <span className="min-w-0 truncate select-text" title={desc}>
                    {desc}
                    {t.pending && <span className="ml-2 rounded-full bg-surface px-2 py-0.5 text-xs text-muted">Pending</span>}
                  </span>
                  {!mobile && <span className="truncate text-muted">{acct ? `${acct.name}${acct.mask ? ` ••${acct.mask}` : ''}` : '—'}</span>}
                  {!mobile && <span className="truncate text-muted">{t.category || '—'}</span>}
                  <span className="text-right font-medium tabular-nums">{fmtMoney(-t.amount)}</span>
                </div>
              );
            })}
          </div>
          {r.charges.length > 6 && (
            <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-2 cursor-pointer text-sm text-muted hover:text-ink">
              {showAll ? 'Show Fewer' : `Show All ${r.charges.length}`}
            </button>
          )}
        </div>
      )}

      {/* Corrections */}
      <div className="border-t border-line pt-4">
        {editable ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 font-support text-xs text-muted">{isReview ? 'Help Wallex understand it:' : 'Not right?'}</span>
              <Pill on={mode === 'rename'} onClick={() => setMode(mode === 'rename' ? null : 'rename')}>
                {isReview ? 'Identify It' : 'Rename'}
              </Pill>
              <Pill on={mode === 'confirm'} onClick={() => setMode(mode === 'confirm' ? null : 'confirm')}>
                Confirm As…
              </Pill>
              <Pill on={mode === 'dismiss'} onClick={() => setMode(mode === 'dismiss' ? null : 'dismiss')}>
                Mark As…
              </Pill>
              {c.corrected && (
                <Pill tone="quiet" onClick={() => setOverride(r.id, null)}>
                  Reset My Changes
                </Pill>
              )}
            </div>

            <AnimatePresence initial={false}>
              {mode && (
                <motion.div
                  key={mode}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap items-center gap-2 pt-3">
                    {mode === 'rename' && (
                      <form
                        className="flex flex-wrap items-center gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const name = label.trim();
                          setOverride(r.id, { label: name && name !== c.originalName ? name : undefined });
                          setMode(null);
                        }}
                      >
                        <input
                          value={label}
                          onChange={(e) => setLabel(e.target.value)}
                          aria-label="Name"
                          placeholder="What is this charge for?"
                          className="w-64 max-w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none select-text focus:border-accent"
                        />
                        <button type="submit" className="cursor-pointer rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-canvas capitalize">
                          Save
                        </button>
                      </form>
                    )}
                    {mode === 'confirm' &&
                      CONFIRM_AS.map((o) => (
                        <Pill
                          key={o.kind}
                          on={c.userConfirmed && r.kind === o.kind}
                          onClick={() => {
                            setOverride(r.id, { kind: o.kind });
                            setMode(null);
                          }}
                        >
                          {o.label}
                        </Pill>
                      ))}
                    {mode === 'dismiss' &&
                      DISMISS_AS.map((o) => (
                        <Pill
                          key={o.reason}
                          onClick={() => {
                            setOverride(r.id, { hide: o.reason });
                            setMode(null);
                          }}
                        >
                          {o.label}
                        </Pill>
                      ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <p className="mt-3 font-support text-xs text-muted">Changes are saved on this computer and apply across Wallex.</p>
          </>
        ) : (
          <p className="font-support text-xs text-muted">Connect your bank to correct what Wallex found.</p>
        )}
      </div>
    </div>
  );
}

export default function RecurringTab({ load, initialFilter = 'all' }: { load: Load; initialFilter?: string }) {
  const mobile = useMobile();
  const [filter, setFilter] = useState(initialFilter);
  const [status, setStatus] = useState<Confidence | null>(null);
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const live = load.state === 'live';
  // Every linked account, cards included, so a subscription paid with a card is found as well.
  const detected = useRecurring(live ? load.allTransactions : null, live ? load.allAccounts : undefined);
  const analysis = live ? detected! : SAMPLE_ANALYSIS;
  const hidden = (analysis.hidden ?? []) as Recurring[];

  const accounts = useMemo(
    () => new Map((live ? load.allAccounts : []).map((a) => [a.id, a])),
    [live, load],
  );

  const showHidden = filter === 'hidden';
  const active = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
  const q = query.trim().toLowerCase();
  const pool = showHidden ? hidden : analysis.items;
  const rows = pool.filter((r) => {
    if (!showHidden && (!active.test(r) || (status && r.confidence !== status))) return false;
    if (!q) return true;
    const text = `${r.name} ${corr(r).originalName ?? ''} ${kindText(r)} ${cadenceWord(r.cadence)} ${r.amountLabel} ${r.reason}`.toLowerCase();
    return text.includes(q);
  });

  const caption =
    load.state === 'loading'
      ? ''
      : load.state === 'sample'
        ? load.note
        : analysis.earliest
          ? ''
          : 'No transactions to analyze yet.';
  const transactionCount = live ? load.allTransactions.length.toLocaleString('en-US') : '—';
  const transactionRange =
    live && analysis.earliest && analysis.latest
      ? `${dateLong(analysis.earliest)} – ${dateLong(analysis.latest)}`
      : load.state === 'loading'
        ? 'Loading…'
        : load.state === 'sample'
          ? 'Sample Data'
          : 'No Date Range';

  const tile = (id: Confidence, label: string) => {
    const on = id === 'review' ? filter === 'review' : status === id;
    return (
      <Tile
        key={id}
        label={label}
        value={String(analysis.counts[id])}
        tone={BADGE[id].value}
        active={on}
        onClick={() => {
          if (id === 'review') {
            setFilter(filter === 'review' ? 'all' : 'review');
            setStatus(null);
          } else {
            setStatus(on ? null : id);
            if (filter === 'review' || filter === 'hidden') setFilter('all');
          }
        }}
      />
    );
  };

  const emptyText = (() => {
    if (q) return `Nothing matches “${query.trim()}”.`;
    if (showHidden) return 'Nothing is ignored.';
    if (live && analysis.items.length === 0) {
      return analysis.monthsOfHistory < 2
        ? 'Wallex needs more transaction history to identify repeating charges.'
        : 'No recurring charges detected yet.';
    }
    if (status) return `Nothing here is marked ${BADGE[status].label.toLowerCase()}.`;
    return active.empty;
  })();

  return (
    <div className="w-full pb-6">
      {caption && (
        <p className={`px-4 pb-3 font-support text-sm ${load.state === 'sample' && load.isError ? 'text-red-400' : 'text-muted'}`}>
          {caption}
          {load.state === 'sample' && !load.isError && ' The list below is an example.'}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 px-4 @3xl:grid-cols-6">
        {tile('confirmed', 'Confirmed')}
        {tile('likely', 'Likely')}
        {tile('new', 'New')}
        {tile('review', 'Needs Review')}
        <div className="col-span-2 @3xl:col-span-1">
          <Tile label="Est. Monthly" value={`$${Math.round(analysis.monthlyTotal).toLocaleString('en-US')}`} tone="" />
        </div>
        <div className="col-span-2 @3xl:col-span-1">
          <Tile label="Transactions" value={transactionCount} detail={transactionRange} tone="text-sky-300" />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 px-4">
        <div role="tablist" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const count = analysis.items.filter(f.test).length;
            if (f.id === 'ended' && count === 0 && filter !== 'ended') return null;
            const selected = f.id === filter;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setFilter(f.id)}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-sm transition-colors ${
                  selected ? 'bg-accent text-canvas' : 'bg-surface text-muted hover:text-ink'
                }`}
              >
                {f.label} <span className="opacity-70">{count}</span>
              </button>
            );
          })}
          {hidden.length > 0 && (
            <button
              type="button"
              role="tab"
              aria-selected={showHidden}
              onClick={() => setFilter('hidden')}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-sm transition-colors ${
                showHidden ? 'bg-accent text-canvas' : 'bg-surface text-muted hover:text-ink'
              }`}
            >
              Ignored <span className="opacity-70">{hidden.length}</span>
            </button>
          )}
        </div>
        <div className={mobile ? 'w-full' : ''}>
          <ExpandingSearch value={query} onChange={setQuery} placeholder="Search recurring items" width={mobile ? '100%' : 260} />
        </div>
      </div>

      <div role="table" aria-label="Recurring relationships" className="mt-4 w-full">
        {!mobile && (
          <div role="row" className={`${GRID} border-b border-line py-3`}>
            {['Merchant', 'Cadence', 'Confidence'].map((h) => (
              <div key={h} role="columnheader" className="text-xs font-semibold tracking-wider text-muted uppercase">
                {h}
              </div>
            ))}
            <div role="columnheader" className="text-right text-xs font-semibold tracking-wider text-muted uppercase">
              Typical amount
            </div>
          </div>
        )}

        {rows.length === 0 && <p className="px-4 py-6 font-support text-sm text-muted">{emptyText}</p>}

        {rows.map((r) => {
          const expanded = expandedId === r.id;
          const toggle = () => setExpandedId(expanded ? null : r.id);
          const c = corr(r);
          const b = BADGE[r.confidence];
          const monthly = monthlyText(r);
          return (
            <div key={r.id} role="rowgroup" className="border-b border-line">
              <div
                role="row"
                tabIndex={0}
                aria-expanded={expanded}
                onClick={toggle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggle();
                  }
                }}
                className={`${mobile ? GRID_MOBILE : GRID} cursor-pointer items-center py-3 text-sm transition-colors hover:bg-surface/50 ${
                  expanded ? 'bg-surface/50' : ''
                }`}
              >
                <div role="cell" className="flex min-w-0 items-center gap-2.5">
                  <MerchantLogo key={r.id} name={r.name} sources={r.logos} />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.name}</p>
                    <p className="truncate font-support text-xs text-muted">
                      {showHidden && c.hideReason
                        ? HIDE_TEXT[c.hideReason]
                        : mobile
                          ? `${kindText(r)} · ${cadenceWord(r.cadence)}`
                          : `${kindText(r)}${r.charges.length ? ` · ${r.charges.length} charge${r.charges.length === 1 ? '' : 's'}` : ''}`}
                    </p>
                    {mobile && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${b.badge}`}>{b.label}</span>
                        {r.status === 'possibly-ended' && <span className={`${ENDED_BADGE} text-[11px]`}>Possibly Ended</span>}
                      </div>
                    )}
                  </div>
                </div>
                {!mobile && (
                  <div role="cell" className="min-w-0 truncate font-support text-muted" title={r.cadenceLabel}>
                    {cadenceText(r)}
                  </div>
                )}
                {!mobile && (
                  <div role="cell" className="flex items-center gap-1.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${b.badge}`} title={CONFIDENCE_LABEL[r.confidence]}>
                      {c.userConfirmed ? 'You Confirmed' : b.label}
                    </span>
                    {r.status === 'possibly-ended' && <span className={ENDED_BADGE}>Possibly Ended</span>}
                  </div>
                )}
                <div role="cell" className="min-w-0 text-right">
                  <p className="truncate font-medium tabular-nums">{amountText(r)}</p>
                  {monthly && <p className="truncate font-support text-xs text-muted tabular-nums">{monthly}</p>}
                </div>
              </div>

              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    key="details"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    {showHidden && (
                      <div className="flex items-center justify-between gap-3 border-t border-line bg-surface/30 px-4 py-3 font-support text-sm">
                        <span className="text-muted">{c.hideReason ? HIDE_TEXT[c.hideReason] : 'Ignored'}. It is left out of the lists and totals.</span>
                        <Pill onClick={() => setOverride(r.id, { hide: undefined })}>Restore</Pill>
                      </div>
                    )}
                    <Detail r={r} editable={live} accounts={accounts} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
