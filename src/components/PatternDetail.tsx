import { useState } from 'react';
import { motion } from 'motion/react';
import { AudioLines, CalendarDays, ChevronUp, ReceiptText } from 'lucide-react';
import type { BnplLedger } from '../lib/bnpl';
import TransactionTable from './TransactionTable';
import { useMobile } from '../lib/viewMode';
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
function Spark({ buckets, rgb, fill = false }: { buckets: TrendBucket[]; rgb: string; fill?: boolean }) {
  const max = Math.max(1, ...buckets.map((b) => b.amount ?? 0));
  return (
    <div className={`flex items-end gap-1 ${fill ? 'h-9 w-full' : 'h-12'}`} role="img" aria-label="Spending over the period">
      {buckets.map((b, i) => {
        const none = b.amount === null;
        const h = none ? 0 : Math.max(b.amount === 0 ? 0 : 8, (b.amount! / max) * 100);
        return (
          <div
            key={b.start}
            title={`${shortDate(b.start)} – ${shortDate(b.end)}: ${none ? 'no history yet' : money(b.amount ?? 0)}`}
            className={`flex h-full flex-col justify-end ${fill ? 'min-w-0 flex-1' : 'w-3'}`}
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

// The share of income (or of spending, with no income found) as a ring, with the figure in the middle.
function ShareRing({ share, label }: { share: number; label: string }) {
  const filled = Math.max(0.015, Math.min(1, share));
  return (
    <div className="relative h-[7.25rem] w-[7.25rem] shrink-0 @2xl:h-40 @2xl:w-40" role="img" aria-label={`${percentText(share)} ${label.toLowerCase()}`}>
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90" fill="none" aria-hidden="true">
        <circle cx="60" cy="60" r="52" stroke="var(--line)" strokeOpacity="0.7" strokeWidth="9" />
        <motion.circle
          cx="60"
          cy="60"
          r="52"
          stroke="var(--accent)"
          strokeWidth="9"
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 6px color-mix(in srgb, var(--accent) 55%, transparent))' }}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: filled }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-[14%] flex flex-col items-center justify-center rounded-full bg-canvas/60 text-center">
        <span className="text-2xl leading-none font-semibold tracking-tight @2xl:text-3xl">{percentText(share)}</span>
        <span className="mt-1 font-support text-[9px] font-semibold tracking-[0.16em] text-muted uppercase">{label}</span>
      </div>
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
  bnpl,
  onBack,
}: {
  bubble: Bubble;
  metrics: PatternMetrics;
  days: number;
  hasIncome: boolean;
  icon: React.ReactNode;
  periodRows: TxnWithBalance[];
  historyRows: TxnWithBalance[];
  bnpl?: BnplLedger;
  onBack: () => void;
}) {
  const mobile = useMobile();
  const [scope, setScope] = useState<'period' | 'history'>('period');
  const m = metrics;
  const noun = bubble.noun;
  const period = periodText(days, m.effectiveDays, m.partial);
  const single = m.count === 1;

  // What sits beside the large figure and in the rows under it. Anything Wallex cannot work out is simply not shown.
  const change = changeText(m.change, days);
  const ring =
    m.incomeShare !== null && hasIncome
      ? { share: m.incomeShare, label: 'Of income' }
      : m.discretionaryShare !== null
        ? { share: m.discretionaryShare, label: 'Of spending' }
        : null;
  const stats: { label: string; value: string; note?: string; tone?: string }[] = [];
  if (m.avgTransaction !== null) stats.push({ label: `Average ${singular(noun)}`, value: money(m.avgTransaction) });
  if (m.highestMonth) stats.push({ label: 'Highest month', value: money(m.highestMonth.amount), note: m.highestMonth.label });
  if (m.change.state === 'available') {
    stats.push({
      label: 'Change',
      value: m.change.isNew ? 'New' : change.direction === 'flat' ? 'No change' : `${signed(m.change.delta)} · ${Math.round(Math.abs(m.change.pct ?? 0) * 100)}%`,
      note: change.detail,
      tone: m.change.isNew ? 'text-yellow-300' : change.direction === 'up' ? 'text-amber-300' : change.direction === 'down' ? 'text-accent' : '',
    });
  }
  const extras: { label: string; value: string; note?: string }[] = [];
  if (m.incomeShare !== null && hasIncome && m.discretionaryShare !== null) extras.push({ label: 'Of discretionary spending', value: percentText(m.discretionaryShare) });
  if (bubble.kind !== 'category' && m.credits > 0) extras.push({ label: 'Refunds', value: money(m.credits), note: 'Not subtracted from the total' });
  const rows = scope === 'period' ? periodRows : historyRows;

  return (
    <motion.div
      className={`w-full px-1 pb-6 ${mobile ? 'pt-0' : 'pt-8'}`}
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
        className="@container relative mt-6 rounded-3xl border border-line bg-card/45 px-5 pt-9 pb-5 @2xl:px-6"
      >
        {/* Close: sits on the card's top edge. */}
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to patterns"
          title="Back to patterns"
          className="absolute top-0 left-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-muted shadow-[0_6px_18px_rgba(0,0,0,0.45)] transition-colors hover:text-ink"
        >
          <ChevronUp className="h-5 w-5" />
        </button>

        <div className="flex min-w-0 items-center gap-3.5">
          {icon}
          <div className="min-w-0">
            <h2 className="truncate text-[1.65rem] leading-tight font-semibold tracking-tight normal-case">{bubble.name}</h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-support text-[13px] text-muted">
              <span>{KIND_LABEL[bubble.kind]}</span>
              {bubble.classLabel && (
                <>
                  <span>·</span>
                  <span>{bubble.classLabel}</span>
                </>
              )}
              <span>·</span>
              <span>{plural(m.count, singular(noun))}</span>
              {noun !== 'transactions' && (
                <>
                  <span>·</span>
                  <span>{plural(m.count, 'charge')}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-support text-xs font-semibold tracking-[0.22em] text-muted uppercase">Monthly Average</p>
            <p className="mt-1.5 text-[2.9rem] leading-none font-semibold tracking-tight whitespace-nowrap @2xl:text-6xl">
              <span className="text-accent">$</span>
              {money(m.monthly).replace(/^-?\$/, '')}
              <span className="ml-1 font-support text-base font-normal text-muted">/ month</span>
            </p>
            <p className="mt-2.5 font-support text-sm text-muted">{money(m.total)} spent in {period}</p>
            {bubble.recurringMonthly != null && Math.abs(bubble.recurringMonthly - m.monthly) > Math.max(1, m.monthly * 0.02) && (
              <p className="mt-1.5 font-support text-xs text-muted">Recurring estimates ~{money(bubble.recurringMonthly)} / month, from its usual charge</p>
            )}
            {m.partial && (
              <p className="mt-1.5 font-support text-xs text-muted">Only {m.effectiveDays} days of history so far, so this is an estimate.</p>
            )}
          </div>
          {ring && <ShareRing share={ring.share} label={ring.label} />}
        </div>

        {single && (
          <p className="mt-4 font-support text-sm text-muted">Only one {singular(noun)} in this period, so there is no pattern to measure yet.</p>
        )}

        {(m.perMonth !== null || m.trend.label) && (
          <div className="mt-5 grid grid-cols-2 border-t border-line">
            {m.perMonth !== null && (
              <div className="py-3.5 pr-3">
                <p className="flex items-center gap-2 font-support text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">
                  <CalendarDays className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                  {noun === 'visits' ? 'Visit frequency' : 'How often'}
                </p>
                <p className="mt-2 text-lg leading-snug font-semibold tracking-tight">{frequencyText(m.perMonth, noun)}</p>
              </div>
            )}
            {m.trend.label && (
              <div className={`py-3.5 ${m.perMonth !== null ? 'border-l border-line pl-3' : 'col-span-2'}`}>
                <div className="flex items-start gap-2">
                  <AudioLines className="h-5 w-5 shrink-0 text-orange-300" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="font-support text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">Spending rhythm</p>
                    <p className="mt-1 text-sm leading-snug font-semibold">
                      {m.trend.label} · {days <= 30 ? 'every few days' : days <= 60 ? 'weekly' : 'every ~10 days'}
                    </p>
                    <div className="mt-2.5">
                      <Spark buckets={m.trend.buckets} rgb="255, 152, 67" fill />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {stats.length > 0 && (
          <div className={`grid border-t border-line ${stats.length === 3 ? 'grid-cols-3' : stats.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {stats.map((f, i) => (
              <div key={f.label} className={`py-3.5 ${i > 0 ? 'border-l border-line pl-3' : ''} ${i < stats.length - 1 ? 'pr-2' : ''}`}>
                <p className="font-support text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">{f.label}</p>
                <p className={`mt-1.5 text-lg leading-tight font-semibold tracking-tight ${f.tone ?? ''}`}>{f.value}</p>
                {f.note && <p className="mt-1 font-support text-[13px] leading-snug text-muted">{f.note}</p>}
              </div>
            ))}
          </div>
        )}

        {extras.length > 0 && (
          <div className="flex flex-wrap gap-x-8 gap-y-2 border-t border-line py-3 font-support text-xs text-muted">
            {extras.map((f) => (
              <p key={f.label}>
                {f.label}: <span className="font-semibold text-ink">{f.value}</span>
                {f.note ? ` · ${f.note}` : ''}
              </p>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-line pt-5">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <ReceiptText className="h-6 w-6 shrink-0 text-accent" />
              <span className="text-xl font-semibold tracking-tight">Transactions</span>
            </div>
            <p className="mt-1 font-support text-sm text-muted @sm:pl-9">
              {scope === 'period'
                ? `${plural(m.count, singular(noun))} · ${money(m.total)} in the ${period}`
                : `Everything for ${bubble.name}, including refunds and earlier months`}
            </p>
          </div>
          <div className="flex w-full gap-2 pb-0.5" role="tablist" aria-label="Which transactions">
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
                className={`cursor-pointer rounded-2xl px-4 py-2.5 text-[15px] whitespace-nowrap transition-colors ${
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
          bnpl={bnpl}
          emptyText={scope === 'period' ? 'No transactions for this in the selected period.' : 'No transactions found for this item.'}
        />
      </motion.div>
    </motion.div>
  );
}
