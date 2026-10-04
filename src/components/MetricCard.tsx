import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

export interface MetricChip {
  text: string;
  direction: 'up' | 'down' | 'flat';
}

const CHIP_TONE = {
  up: 'bg-amber-300/15 text-amber-300', // more spending than before
  down: 'bg-accent-soft text-accent',
  flat: 'bg-surface text-muted',
};

// One figure with its label: an accent bar down the left edge, the label (and a change chip beside it, when the
// figure has a change to show) over a note, and the value at the right.
export default function MetricCard({ label, value, note, chip }: { label: string; value: string; note?: string; chip?: MetricChip }) {
  const Arrow = chip?.direction === 'up' ? ArrowUp : chip?.direction === 'down' ? ArrowDown : Minus;
  return (
    <div className="flex min-w-0 items-center gap-4 border-l-4 border-accent bg-card py-3 pr-4 pl-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-support text-[11px] font-semibold tracking-widest text-muted uppercase">{label}</span>
          {chip && (
            <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${CHIP_TONE[chip.direction]}`}>
              <Arrow className="h-3 w-3" strokeWidth={2.4} />
              {chip.text}
            </span>
          )}
        </div>
        {note && <span className="mt-0.5 block font-support text-sm text-muted">{note}</span>}
      </div>
      <span className="text-right text-lg leading-tight font-semibold tracking-tight tabular-nums">{value}</span>
    </div>
  );
}
