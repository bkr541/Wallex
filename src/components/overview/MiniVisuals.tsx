import { motion } from 'motion/react';

// The small pictures that sit in the corner of a stat card.

export function Sparkline({ values, color = 'var(--accent)' }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 76},${26 - ((v - lo) / (hi - lo || 1)) * 24}`).join(' ');
  return (
    <svg width="80" height="30" viewBox="-2 -2 80 30" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Bars({ bars }: { bars: { amount: number }[] }) {
  const max = Math.max(1, ...bars.map((b) => b.amount));
  return (
    <div className="flex h-[30px] items-end gap-[3px]" aria-hidden="true">
      {bars.map((b, i) => (
        <motion.span key={i} className={`w-[5px] origin-bottom rounded-sm ${b.amount > 0 ? 'bg-red-400' : 'bg-line'}`} style={{ height: `${Math.max(b.amount > 0 ? 18 : 8, (b.amount / max) * 100)}%` }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.4, delay: i * 0.04 }} />
      ))}
    </div>
  );
}

// A ring that fills to `share` (0 to 1), with room in the middle for an icon.
export function Ring({ share, children, size = 44 }: { share: number; children?: React.ReactNode; size?: number }) {
  const s = Math.max(0.03, Math.min(1, share));
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 44 44" className="absolute inset-0 h-full w-full -rotate-90" fill="none">
        <circle cx="22" cy="22" r="19" stroke="var(--line)" strokeWidth="3.5" />
        <motion.circle cx="22" cy="22" r="19" stroke="var(--accent)" strokeWidth="3.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: s }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />
      </svg>
      <span className="relative text-muted">{children}</span>
    </span>
  );
}
