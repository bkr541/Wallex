import { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronUp, ReceiptText } from 'lucide-react';
import TransactionTable from './TransactionTable';
import type { TxnWithBalance } from '../lib/balances';
import type { Bubble } from '../lib/patterns';
import type { PatternMetrics, TrendBucket } from '../lib/patternMetrics';
import { changeText, frequencyText, money, percentText, periodText, signed } from '../lib/patternFormat';

const KIND_LABEL: Record<Bubble['kind'], string> = { bill: 'Bill', merchant: 'Merchant', category: 'Category' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;

const singular = (noun: Bubble['noun']) => noun.replace(/s$/, '');
const plural = (n: number, word: string) => `${n} ${n === 1 ? word : word.endsWith('s') ? word : `${word}s`}`;

// Parent animates this group in and out with the "hidden" and "show" variants.
const rise = {
  hidden: { opacity: 0, y: 14, transition: { duration: 0.18 } },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const, delay: 0.12 + i * 0.06 },
  }),
};

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
              <span className="h-[3px] w-full rounded-full" style={{ background: none ? 'var(--line)' : `rgba(${rgb}, 0.3)` }} />
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
  const single = m.count === 1;

  // The supporting facts that exist for this circle, in the grid beside the large figure. The rest are simply not shown.
  const change = changeText(m.change, days);
  const facts: { label: string; value: string; note?: string; tone?: string }[] = [];
  if (m.avgTransaction !== null) facts.push({ label: `Average ${singular(noun)}`, value: money(m.avgTransaction) });
  if (m.perMonth !== null) facts.push({ label: 'How often', value: frequencyText(m.perMonth, noun) });
  if (m.incomeShare !== null && hasIncome) facts.push({ label: 'Of monthly income', value: percentText(m.incomeShare) });
  if (m.discretionaryShare !== null) facts.push({ label: 'Of discretionary spending', value: percentText(m.discretionaryShare) });
  if (m.change.state === 'available') {
    facts.push({
      label: 'Change',
      value: m.change.isNew ? 'New' : change.direction === 'flat' ? 'No change' : `${signed(m.change.delta)} · ${Math.round(Math.abs(m.change.pct ?? 0) * 100)}%`,
      note: change.detail,
      tone: change.direction === 'up' ? 'text-amber-300' : change.direction === 'down' ? 'text-accent' : '',
    });
  }
  if (m.highestMonth) facts.push({ label: 'Highest month', value: money(m.highestMonth.amount), note: m.highestMonth.label });
  if (bubble.kind !== 'category' && m.credits > 0) facts.push({ label: 'Refunds', value: money(m.credits), note: 'Not subtracted from the total' });
  const rows = scope === 'period' ? periodRows : historyRows;

  return (
    <motion.div
      className="w-full px-1 pt-8 pb-6"
      initial="hidden"
      animate="show"
      exit="hidden"
      variants={{ hidden: {}, show: {} }}
    >
      {/* The summary: who it is, one large figure with a quiet grid of supporting facts beside it, and the transactions below. */}
      <motion.div
        variants={{
          hidden: { opacity: 0, y: -20, transition: { duration: 0.2 } },
          show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 240, damping: 26 } },
        }}
        className="@container rounded-2xl border border-line bg-card/45 p-5 @2xl:p-6"
      >
        <div className="flex items-start justify-between gap-5">
          <div className="flex min-w-0 items-center gap-3">
            {icon}
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold tracking-tight normal-case">{bubble.name}</h2>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 font-support text-xs text-muted">
                <span>{KIND_LABEL[bubble.kind]}</span>
                {bubble.classLabel && (
                  <>
                    <span>·</span>
                    <span>{bubble.classLabel}</span>
                  </>
                )}
                <span>·</span>
                <span>{plural(m.count, singular(noun))}</span>
                <span className="ml-1 rounded-full border border-line px-2 py-0.5 text-[11px]">{bubble.badge}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to patterns"
            title="Back to patterns"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-muted transition-colors hover:text-ink"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 grid gap-5 @2xl:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="font-support text-xs font-semibold tracking-[0.18em] text-muted uppercase">Monthly Average</p>
            <p className="mt-1 text-5xl leading-none font-semibold tracking-tight">
              <span className="text-accent">$</span>
              {money(m.monthly).replace(/^-?\$/, '')}
              <span className="ml-1.5 font-support text-base font-normal text-muted">/ month</span>
            </p>
            <p className="mt-2 font-support text-sm text-muted">{money(m.total)} total in the {period}</p>
            {bubble.recurringMonthly != null && Math.abs(bubble.recurringMonthly - m.monthly) > Math.max(1, m.monthly * 0.02) && (
              <p className="mt-1.5 font-support text-xs text-muted">Recurring estimates ~{money(bubble.recurringMonthly)} / month, from its usual charge</p>
            )}
            {m.partial && (
              <p className="mt-1.5 font-support text-xs text-muted">
                Only {m.effectiveDays} days of history so far, so this is an estimate from those days.
              </p>
            )}
          </div>

          {facts.length > 0 && (
            <div className="grid grid-cols-2 border-y border-line @2xl:border-y-0 @2xl:border-l @2xl:pl-5">
              {facts.map((f) => (
                <div key={f.label} className="border-line py-3 odd:pr-3 even:border-l even:pl-3 [&:nth-child(n+3)]:border-t">
                  <p className="font-support text-[10px] font-semibold tracking-wider text-muted uppercase">{f.label}</p>
                  <p className={`mt-1 text-sm font-semibold ${f.tone ?? ''}`}>{f.value}</p>
                  {f.note && <p className="mt-0.5 font-support text-[11px] text-muted">{f.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {single && (
          <p className="mt-4 font-support text-sm text-muted">Only one {singular(noun)} in this period, so there is no pattern to measure yet.</p>
        )}

        {m.trend.label && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line pt-4">
            <p className="font-support text-xs text-muted">
              {m.trend.label} · {days <= 30 ? 'every few days' : days <= 60 ? 'weekly' : 'every ~10 days'}
            </p>
            <Spark buckets={m.trend.buckets} rgb={bubble.rgb} />
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-line pt-4">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <ReceiptText className="h-5 w-5 text-accent" />
            <span className="font-semibold">Transactions</span>
            <span className="font-support text-xs text-muted">
              {scope === 'period'
                ? `${plural(m.count, singular(noun))} · ${money(m.total)} in the ${period}`
                : `Everything for ${bubble.name}, including refunds and earlier months`}
            </span>
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
      </motion.div>

      {/* Evidence: the charges behind the numbers above. */}
      <motion.div variants={rise} custom={2} className="mt-5">
        <TransactionTable
          rows={rows}
          emptyText={scope === 'period' ? 'No transactions for this in the selected period.' : 'No transactions found for this item.'}
        />
      </motion.div>
    </motion.div>
  );
}
