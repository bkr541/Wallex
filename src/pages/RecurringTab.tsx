import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search } from 'lucide-react';
import MerchantLogo from '../components/MerchantLogo';
import type { Load } from '../lib/useTransactions';
import { analyze, type Confidence, type Kind, type Recurring } from '../lib/recurring';
import { SAMPLE_ANALYSIS } from '../lib/recurringSample';

const GRID = 'grid grid-cols-[2.4fr_1.6fr_1.1fr_1.3fr] gap-4 px-4';

const CONFIDENCE: Record<Confidence, { label: string; badge: string; value: string }> = {
  confirmed: { label: 'Confirmed', badge: 'bg-accent-soft text-accent', value: 'text-accent' },
  likely: { label: 'Likely', badge: 'bg-sky-400/15 text-sky-300', value: 'text-sky-300' },
  new: { label: 'New', badge: 'bg-violet-400/15 text-violet-300', value: 'text-violet-300' },
  review: { label: 'Needs review', badge: 'bg-amber-400/15 text-amber-300', value: 'text-amber-300' },
  habit: { label: 'Habit', badge: 'bg-surface text-muted', value: 'text-muted' },
};

const KIND_LABEL: Record<Kind, string> = {
  bill: 'Bill',
  debt: 'Debt',
  installment: 'Installment',
  subscription: 'Subscription',
  usage: 'Subscription + usage',
  aggregator: 'Billing aggregator',
  habit: 'Habit',
};

const FILTERS: { id: string; label: string; test: (r: Recurring) => boolean }[] = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'bills', label: 'Bills', test: (r) => r.kind === 'bill' },
  { id: 'debt', label: 'Debt', test: (r) => r.kind === 'debt' || r.kind === 'installment' },
  { id: 'subs', label: 'Subscriptions', test: (r) => r.kind === 'subscription' || r.kind === 'usage' },
  { id: 'review', label: 'Needs review', test: (r) => r.confidence === 'review' },
  { id: 'habits', label: 'Habits', test: (r) => r.kind === 'habit' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};
const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Tile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="font-support text-xs text-muted">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight ${tone}`}>{value}</p>
    </div>
  );
}

export default function RecurringTab({ load, initialFilter = 'all' }: { load: Load; initialFilter?: string }) {
  const [filter, setFilter] = useState(initialFilter);
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const analysis = useMemo(
    () => (load.state === 'live' ? analyze(load.transactions) : SAMPLE_ANALYSIS),
    [load],
  );

  const active = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
  const q = query.trim().toLowerCase();
  const rows = analysis.items.filter(
    (r) => active.test(r) && (!q || `${r.name} ${r.summary} ${r.kind}`.toLowerCase().includes(q)),
  );

  const live = load.state === 'live';
  const caption =
    load.state === 'loading'
      ? 'Looking for recurring charges…'
      : load.state === 'sample'
        ? load.note
        : analysis.earliest
          ? `${load.transactions.length} transactions from ${formatDate(analysis.earliest)} to ${formatDate(analysis.latest!)}.`
          : 'No transactions to analyze yet.';
  const shortHistory = live && analysis.monthsOfHistory < 4;

  return (
    <div className="w-full pb-6">
      <p className={`px-4 pb-3 font-support text-sm ${load.state === 'sample' && load.isError ? 'text-red-400' : 'text-muted'}`}>
        {caption}
        {load.state === 'sample' && !load.isError && ' The list below is an example.'}
      </p>
      {shortHistory && (
        <p className="mx-4 mb-4 rounded-xl border border-line bg-surface/50 px-4 py-3 font-support text-sm text-muted">
          Only about {Math.max(1, Math.round(analysis.monthsOfHistory))} month(s) of history so far, so most items can only
          reach Likely or New. Reconnect in Settings → Setup to request up to two years and confirm more.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 px-4 @3xl:grid-cols-5">
        <Tile label="Confirmed" value={String(analysis.counts.confirmed)} tone={CONFIDENCE.confirmed.value} />
        <Tile label="Likely" value={String(analysis.counts.likely)} tone={CONFIDENCE.likely.value} />
        <Tile label="New" value={String(analysis.counts.new)} tone={CONFIDENCE.new.value} />
        <Tile label="Needs review" value={String(analysis.counts.review)} tone={CONFIDENCE.review.value} />
        <Tile label="Est. monthly" value={`$${Math.round(analysis.monthlyTotal).toLocaleString('en-US')}`} tone="" />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 px-4">
        <div role="tablist" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const count = analysis.items.filter(f.test).length;
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
        </div>
        <label className="flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2">
          <Search className="h-4 w-4 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recurring items"
            className="w-56 bg-transparent text-sm outline-none placeholder:text-muted select-text"
          />
        </label>
      </div>

      <div className="mt-4 overflow-x-auto">
      <div role="table" aria-label="Recurring relationships" className="w-full min-w-[680px]">
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

        {rows.length === 0 && (
          <p className="px-4 py-6 font-support text-sm text-muted">
            {live && analysis.items.length === 0
              ? 'No recurring charges found yet. More history will help.'
              : 'Nothing matches that filter.'}
          </p>
        )}

        {rows.map((r) => {
          const expanded = expandedId === r.id;
          const toggle = () => setExpandedId(expanded ? null : r.id);
          const c = CONFIDENCE[r.confidence];
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
                className={`${GRID} cursor-pointer items-center py-3 text-sm transition-colors hover:bg-surface/50 ${
                  expanded ? 'bg-surface/50' : ''
                }`}
              >
                <div role="cell" className="flex min-w-0 items-center gap-2.5">
                  <MerchantLogo key={r.id} name={r.name} sources={r.logos} />
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {r.name}
                      {!r.active && <span className="ml-2 text-xs font-normal text-muted">may have ended</span>}
                    </p>
                    <p className="truncate font-support text-xs text-muted">{r.summary}</p>
                  </div>
                </div>
                <div role="cell" className="min-w-0 truncate font-support text-muted">
                  {r.cadenceLabel}
                </div>
                <div role="cell">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${c.badge}`}>{c.label}</span>
                </div>
                <div role="cell" className="min-w-0 truncate text-right font-medium tabular-nums">
                  {r.amountLabel}
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
                    <div className="grid gap-6 border-t border-line bg-surface/30 px-4 py-4 @3xl:grid-cols-[1.6fr_1fr]">
                      <ul className="space-y-2 font-support text-sm select-text">
                        {r.notes.map((n) => (
                          <li key={n} className="flex gap-2">
                            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted" />
                            <span>{n}</span>
                          </li>
                        ))}
                      </ul>
                      {r.recent.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Recent charges</p>
                          <ul className="space-y-1 font-support text-sm tabular-nums select-text">
                            {r.recent.map((o, i) => (
                              <li key={i} className="flex justify-between gap-4">
                                <span className="text-muted">{formatDate(o.date)}</span>
                                <span>{money(o.amount)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
