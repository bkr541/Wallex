import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowDown, ArrowUp, ChevronUp, Minus } from 'lucide-react';
import TransactionTable from './TransactionTable';
import type { TxnWithBalance } from '../lib/balances';
import type { Bubble } from '../lib/patterns';
import type { PatternMetrics, TrendBucket } from '../lib/patternMetrics';
import { changeText, frequencyText, money, percentText, periodText } from '../lib/patternFormat';

const KIND_LABEL: Record<Bubble['kind'], string> = { bill: 'Bill', merchant: 'Merchant', category: 'Category' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;

const singular = (noun: Bubble['noun']) => noun.replace(/s$/, '');

// Parent animates this group in and out with the "hidden" and "show" variants.
const rise = {
  hidden: { opacity: 0, y: 14, transition: { duration: 0.18 } },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const, delay: 0.12 + i * 0.06 },
  }),
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xl leading-tight font-semibold tracking-tight">{value}</p>
      <p className="mt-1 font-support text-xs text-muted">{label}</p>
      {hint && <p className="font-support text-xs text-muted/70">{hint}</p>}
    </div>
  );
}

// A small row of bars, one per slice of the period. It is there to show the shape of the spending
// (rising, falling, steady, spiky, occasional), so it carries no axes.
function Spark({ buckets, rgb }: { buckets: TrendBucket[]; rgb: string }) {
  const max = Math.max(1, ...buckets.map((b) => b.amount ?? 0));
  return (
    <div className="flex h-12 items-end gap-1" role="img" aria-label="Spending over the period">
      {buckets.map((b, i) => {
        const none = b.amount === null;
        const h = none ? 0 : Math.max(b.amount === 0 ? 0 : 8, (b.amount! / max) * 100);
        return (
          <div
            key={b.start}
            title={`${shortDate(b.start)} – ${shortDate(b.end)}: ${none ? 'no history yet' : money(b.amount ?? 0)}`}
            className="flex h-full w-3 flex-col justify-end"
          >
            {none || b.amount === 0 ? (
              <span className="h-[3px] w-full rounded-full" style={{ background: none ? 'rgba(255,255,255,0.06)' : `rgba(${rgb}, 0.3)` }} />
            ) : (
              <motion.span
                className="block w-full origin-bottom rounded-[3px]"
                style={{ height: `${h}%`, background: `rgba(${rgb}, 0.85)` }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.45, delay: 0.25 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PatternDetail({
  bubble,
  metrics,
  days,
  hasIncome,
  icon,
  periodRows,
  historyRows,
  onBack,
}: {
  bubble: Bubble;
  metrics: PatternMetrics;
  days: number;
  hasIncome: boolean;
  icon: React.ReactNode;
  periodRows: TxnWithBalance[];
  historyRows: TxnWithBalance[];
  onBack: () => void;
}) {
  const [scope, setScope] = useState<'period' | 'history'>('period');
  const m = metrics;
  const noun = bubble.noun;
  const period = periodText(days, m.effectiveDays, m.partial);
  const change = changeText(m.change, days);
  const single = m.count === 1;

  // The secondary figures that exist for this circle; the rest are simply not shown.
  const stats: { label: string; value: string }[] = [];
  if (m.avgTransaction !== null) stats.push({ label: `Average ${singular(noun)}`, value: money(m.avgTransaction) });
  if (m.perMonth !== null) stats.push({ label: 'How often', value: frequencyText(m.perMonth, noun) });
  if (m.incomeShare !== null && hasIncome) stats.push({ label: 'Of monthly income', value: percentText(m.incomeShare) });
  if (m.discretionaryShare !== null) stats.push({ label: 'Of discretionary spending', value: percentText(m.discretionaryShare) });

  const showContext = m.change.state === 'available' || m.highestMonth || m.trend.label;
  const rows = scope === 'period' ? periodRows : historyRows;
  const arrow = change.direction === 'up' ? ArrowUp : change.direction === 'down' ? ArrowDown : Minus;
  const Arrow = arrow;

  return (
    <motion.div
      className="w-full px-1 pt-8 pb-6"
      initial="hidden"
      animate="show"
      exit="hidden"
      variants={{ hidden: {}, show: {} }}
    >
      <motion.div
        variants={{
          hidden: { opacity: 0, y: -28, scale: 0.96, transition: { duration: 0.2 } },
          show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 240, damping: 24 } },
        }}
        className="@container relative rounded-3xl p-5 @xl:p-6"
        style={
          {
            '--rgb': bubble.rgb,
            background: `radial-gradient(circle at 12% 0%, rgba(${bubble.rgb}, 0.3), rgba(${bubble.rgb}, 0.06) 55%), #101214`,
            border: `1.5px solid rgba(${bubble.rgb}, 0.7)`,
            boxShadow: `0 22px 54px rgba(0, 0, 0, 0.55), 0 0 44px rgba(${bubble.rgb}, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
          } as React.CSSProperties
        }
      >
        <motion.button
          type="button"
          onClick={onBack}
          aria-label="Back to patterns"
          title="Back to patterns"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          whileHover={{ scale: 1.1 }}
          className="absolute -top-5 left-1/2 flex h-10 w-10 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border bg-card text-ink"
          style={{ borderColor: `rgba(${bubble.rgb}, 0.8)`, boxShadow: `0 10px 26px rgba(0,0,0,0.6), 0 0 22px rgba(${bubble.rgb}, 0.35)` }}
        >
          <ChevronUp className="h-5 w-5" strokeWidth={2.2} />
        </motion.button>

        {/* Primary: who it is, what it came to, and what that means per month. */}
        <div className="grid gap-5 @xl:grid-cols-[1fr_auto] @xl:items-center">
          <div className="flex min-w-0 items-center gap-4">
            {icon}
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-semibold tracking-tight @xl:text-3xl">{bubble.name}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-support text-sm text-muted">
                <span>{KIND_LABEL[bubble.kind]}</span>
                {bubble.classLabel && (
                  <>
                    <span className="opacity-40">·</span>
                    <span>{bubble.classLabel}</span>
                  </>
                )}
                <span className="bubble-badge px-2.5 py-0.5 text-xs">{bubble.badge}</span>
              </p>
            </div>
          </div>

          <div className="flex items-end gap-6 @xl:justify-end">
            <div>
              <p className="font-support text-xs text-muted">Total · {period}</p>
              <p className="mt-1 text-2xl leading-none font-semibold tracking-tight">{money(m.total)}</p>
            </div>
            <div className="border-l border-line pl-6">
              <p className="font-support text-xs text-muted">Monthly average</p>
              <p className="mt-1 text-4xl leading-none font-semibold tracking-tight">
                {money(m.monthly)}
                <span className="ml-1 font-support text-base font-normal text-muted">/ month</span>
              </p>
            </div>
          </div>
        </div>

        {m.partial && (
          <p className="mt-3 font-support text-xs text-muted">
            Only {m.effectiveDays} days of history so far, so the monthly average is an estimate from those days.
          </p>
        )}

        {/* Secondary: how it behaves. */}
        {(stats.length > 0 || single) && (
          <div className="mt-5 border-t border-line pt-4">
            {stats.length > 0 && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 @xl:grid-cols-4">
                {stats.map((s) => (
                  <Stat key={s.label} label={s.label} value={s.value} />
                ))}
              </div>
            )}
            {single && (
              <p className="font-support text-sm text-muted">
                Only one {singular(noun)} in this period, so there is no pattern to measure yet.
              </p>
            )}
          </div>
        )}

        {/* Context: change, best/worst month and shape. */}
        {(showContext || m.change.state === 'unavailable') && (
          <div className="mt-5 grid gap-5 border-t border-line pt-4 @xl:grid-cols-[1fr_auto] @xl:items-end">
            <div className="flex flex-wrap gap-x-10 gap-y-4">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-base font-semibold">
                  <Arrow
                    className={`h-4 w-4 ${change.direction === 'up' ? 'text-amber-300' : change.direction === 'down' ? 'text-accent' : 'text-muted'}`}
                    strokeWidth={2.4}
                  />
                  {change.headline}
                </p>
                <p className="mt-1 font-support text-xs text-muted">{change.detail}</p>
              </div>
              {m.highestMonth && (
                <div className="min-w-0">
                  <p className="text-base font-semibold">
                    {m.highestMonth.label} · {money(m.highestMonth.amount)}
                  </p>
                  <p className="mt-1 font-support text-xs text-muted">Highest month</p>
                </div>
              )}
              {bubble.kind !== 'category' && m.credits > 0 && (
                <div className="min-w-0">
                  <p className="text-base font-semibold">{money(m.credits)} back</p>
                  <p className="mt-1 font-support text-xs text-muted">Refunds, not subtracted from the total</p>
                </div>
              )}
            </div>

            {m.trend.label && (
              <div className="@xl:text-right">
                <Spark buckets={m.trend.buckets} rgb={bubble.rgb} />
                <p className="mt-1.5 font-support text-xs text-muted">
                  {m.trend.label} · {days <= 30 ? 'every few days' : days <= 60 ? 'weekly' : 'every ~10 days'}
                </p>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Evidence: the charges behind the numbers above. */}
      <motion.div variants={rise} custom={2} className="mt-8">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-3 px-3">
          <div>
            <h3 className="text-base font-semibold">Transactions</h3>
            <p className="font-support text-sm text-muted">
              {scope === 'period'
                ? `${m.count} ${m.count === 1 ? singular(noun) : noun} adding up to ${money(m.total)} in the ${period}.`
                : `Everything for ${bubble.name} in the chosen accounts, including refunds and earlier months.`}
            </p>
          </div>
          <div className="flex gap-1.5" role="tablist" aria-label="Which transactions">
            {(
              [
                ['period', `This period · ${periodRows.length}`],
                ['history', `All history · ${historyRows.length}`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={scope === id}
                onClick={() => setScope(id)}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  scope === id ? 'bg-accent text-canvas' : 'bg-surface text-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <TransactionTable
          rows={rows}
          emptyText={scope === 'period' ? 'No transactions for this in the selected period.' : 'No transactions found for this item.'}
        />
      </motion.div>
    </motion.div>
  );
}
