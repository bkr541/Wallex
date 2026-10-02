import { useState } from 'react';
import { motion } from 'motion/react';
import type { FlowBucket } from '../../lib/overview';
import { money } from '../../lib/patternFormat';

const signed = (n: number) => `${n >= 0 ? '+' : '-'}${money(Math.abs(n))}`;

// Money in and money out for each period as paired bars, drawn without grid lines or legends.
// Hover, focus or tap a pair to read the exact figures above the chart.
export default function CashFlowChart({ buckets }: { buckets: FlowBucket[] }) {
  const [picked, setPicked] = useState<string | null>(null);
  const max = Math.max(1, ...buckets.flatMap((b) => [b.moneyIn, b.moneyOut]));
  const active = buckets.find((b) => b.key === picked) ?? buckets[buckets.length - 1];

  return (
    <div>
      <div className="flex min-h-[3.25rem] flex-wrap items-baseline gap-x-6 gap-y-1">
        <p className="text-base font-semibold">
          {active.longLabel}
          {active.partial === 'current' && <span className="ml-2 font-support text-xs font-normal text-muted">so far</span>}
          {active.partial === 'start' && <span className="ml-2 font-support text-xs font-normal text-muted">partial month</span>}
        </p>
        <p className="font-support text-sm text-muted">
          In <span className="text-accent tabular-nums">{money(active.moneyIn)}</span>
        </p>
        <p className="font-support text-sm text-muted">
          Out <span className="text-ink tabular-nums">{money(active.moneyOut)}</span>
        </p>
        <p className="font-support text-sm text-muted">
          Net <span className={`tabular-nums ${active.net < 0 ? 'text-red-300' : 'text-ink'}`}>{signed(active.net)}</span>
        </p>
      </div>

      <div className="mt-3 flex h-44 items-end gap-2 @3xl:gap-4" role="group" aria-label="Money in and out by period">
        {buckets.map((b, i) => {
          const dim = b.partial !== null;
          return (
            <button
              key={b.key}
              type="button"
              onMouseEnter={() => setPicked(b.key)}
              onFocus={() => setPicked(b.key)}
              onClick={() => setPicked(b.key)}
              onMouseLeave={() => setPicked(null)}
              onBlur={() => setPicked(null)}
              aria-label={`${b.longLabel}: in ${money(b.moneyIn)}, out ${money(b.moneyOut)}`}
              className="group flex h-full min-w-0 flex-1 cursor-pointer flex-col justify-end gap-2 outline-none"
            >
              <div className="flex h-full items-end justify-center gap-1">
                {([
                  ['moneyIn', 'bg-accent'],
                  ['moneyOut', 'bg-ink/35'],
                ] as const).map(([field, color], j) => (
                  <motion.span
                    key={field}
                    className={`block w-full max-w-7 origin-bottom rounded-t-md transition-opacity ${color} ${
                      dim ? 'opacity-45' : 'opacity-90'
                    } group-hover:opacity-100 group-focus-visible:opacity-100`}
                    style={{ height: `${Math.max(b[field] > 0 ? 2 : 0, (b[field] / max) * 100)}%` }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.5, delay: 0.05 * i + 0.04 * j, ease: [0.22, 1, 0.36, 1] }}
                  />
                ))}
              </div>
              <span className={`text-center font-support text-xs ${active.key === b.key ? 'text-ink' : 'text-muted'}`}>{b.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-5 font-support text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-accent" />
          Money in
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-ink/35" />
          Money out
        </span>
      </div>
    </div>
  );
}
