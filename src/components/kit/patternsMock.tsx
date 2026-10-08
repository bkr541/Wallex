import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import MerchantLogo from '../MerchantLogo';
import { money } from '../../lib/patternFormat';

// Five whole Patterns diagrams, each designed as one piece: the centre ring and every circle around it belong to the
// same idea. They all use the same example merchants and bills, so only the design changes between them.

const W = 720;
const H = 540;
const CX = W / 2;
const CY = H / 2;
const INCOME = 6322;

interface Item {
  name: string;
  amount: number;
  color: string; // r, g, b
  kind: 'Bill' | 'Merchant';
}
const ITEMS: Item[] = [
  { name: 'EarnIn repayments', amount: 2635, color: '255, 105, 180', kind: 'Bill' },
  { name: 'Zelle · Ryan', amount: 1337, color: '250, 204, 21', kind: 'Merchant' },
  { name: 'Dave', amount: 1279, color: '139, 108, 239', kind: 'Bill' },
  { name: 'Mastercard payment', amount: 782, color: '255, 152, 67', kind: 'Bill' },
  { name: 'Lost Lands', amount: 716, color: '74, 140, 255', kind: 'Merchant' },
  { name: 'Zelle · Brad', amount: 550, color: '74, 214, 130', kind: 'Merchant' },
  { name: 'Zelle · Kurt', amount: 450, color: '244, 114, 94', kind: 'Merchant' },
  { name: 'North Coast', amount: 435, color: '45, 212, 191', kind: 'Merchant' },
];
const MAX = ITEMS[0].amount;
const SUM = ITEMS.reduce((n, i) => n + i.amount, 0);
const WHOLE = Math.max(INCOME, SUM);
const rad = (deg: number) => (deg * Math.PI) / 180;
const pct = (n: number) => `${Math.round((n / INCOME) * 100)}%`;
const short = (n: string, max = 16) => (n.length > max ? `${n.slice(0, max - 1)}…` : n);

// Where each item's slice of the centre ring starts and ends (degrees clockwise from the top).
const SLICES = (() => {
  let at = 0;
  return ITEMS.map((it) => {
    const span = (it.amount / WHOLE) * 360;
    const out = { start: at, span, mid: at + span / 2 };
    at += span;
    return out;
  });
})();

// Draws one slice of a ring.
function Arc({ r, w, start, span, color, delay = 0, gap = 3, cx = CX, cy = CY }: { r: number; w: number; start: number; span: number; color: string; delay?: number; gap?: number; cx?: number; cy?: number }) {
  return (
    <g transform={`rotate(${start - 90} ${cx} ${cy})`}>
      <motion.circle cx={cx} cy={cy} r={r} fill="none" stroke={`rgb(${color})`} strokeWidth={w} strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: Math.max(0.01, (span - gap) / 360) }} transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }} />
    </g>
  );
}
function Ring({ r, w }: { r: number; w: number }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      <circle cx={CX} cy={CY} r={r} fill="none" stroke="var(--line)" strokeWidth={w} opacity="0.5" />
      {ITEMS.map((it, i) => <Arc key={it.name} r={r} w={w} start={SLICES[i].start} span={SLICES[i].span} color={it.color} delay={i * 0.07} />)}
    </svg>
  );
}
function CenterText({ size = 1 }: { size?: number }) {
  return (
    <div className="pointer-events-none absolute flex flex-col items-center justify-center text-center" style={{ left: CX - 90 * size, top: CY - 50 * size, width: 180 * size, height: 100 * size }}>
      <span className="font-support text-muted" style={{ fontSize: 13 * size }}>Monthly Income</span>
      <span className="leading-none font-semibold tracking-tight" style={{ fontSize: 38 * size }}>{money(INCOME)}</span>
      <span className="mt-1 font-support text-accent" style={{ fontSize: 12 * size }}>{Math.round((SUM / INCOME) * 100)}% spent</span>
    </div>
  );
}

// Fits the 720 × 540 drawing into whatever width it is given.
function Stage({ children }: { children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(W);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const scale = Math.min(1, width / W);
  return (
    <div ref={box} className="w-full overflow-hidden rounded-3xl border border-line bg-canvas select-none" style={{ height: H * scale }}>
      <div className="relative" style={{ width: W, height: H, marginLeft: Math.max(0, (width - W * scale) / 2), transform: `scale(${scale})`, transformOrigin: 'top left' }}>{children}</div>
    </div>
  );
}

// Starts each circle outside its own slice and nudges them apart until none overlap each other or the centre.
function place(sizes: number[], inner: number): { x: number; y: number }[] {
  const pos = ITEMS.map((_, i) => {
    const a = rad(SLICES[i].mid - 90);
    const r = inner + sizes[i] / 2 + 12;
    return { x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r };
  });
  for (let it = 0; it < 400; it++) {
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const dx = pos[j].x - pos[i].x;
        const dy = pos[j].y - pos[i].y;
        const d = Math.hypot(dx, dy) || 0.01;
        const min = (sizes[i] + sizes[j]) / 2 + 8;
        if (d < min) {
          const push = (min - d) / 2;
          pos[i].x -= (dx / d) * push; pos[i].y -= (dy / d) * push;
          pos[j].x += (dx / d) * push; pos[j].y += (dy / d) * push;
        }
      }
      const dx = pos[i].x - CX;
      const dy = pos[i].y - CY;
      const d = Math.hypot(dx, dy) || 0.01;
      const min = inner + sizes[i] / 2 + 8;
      if (d < min) { pos[i].x = CX + (dx / d) * min; pos[i].y = CY + (dy / d) * min; }
      pos[i].x = Math.min(W - sizes[i] / 2 - 8, Math.max(sizes[i] / 2 + 8, pos[i].x));
      pos[i].y = Math.min(H - sizes[i] / 2 - 8, Math.max(sizes[i] / 2 + 8, pos[i].y));
    }
  }
  return pos;
}

const WAVE = 'M0 8 Q 12.5 0 25 8 T 50 8 T 75 8 T 100 8 T 125 8 T 150 8 T 175 8 T 200 8 V100 H0 Z';

/* ------------------------------------------------------------------------------------ 1 · Glass bubbles */
// Each circle is a glass bubble that fills with liquid up to its share of the income. The centre is a ring in the same colours.
export function GlassDiagram() {
  const sizes = ITEMS.map((it) => 62 + 92 * Math.sqrt(it.amount / MAX) * 0.9);
  const pos = useMemo(() => place(sizes, 120), []);
  return (
    <Stage>
      <Ring r={104} w={14} />
      <CenterText />
      {ITEMS.map((it, i) => {
        const d = sizes[i];
        const level = Math.min(0.92, Math.max(0.12, it.amount / INCOME));
        return (
          <motion.div key={it.name} initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.06, type: 'spring', stiffness: 200, damping: 16 }} className="absolute flex flex-col items-center justify-center rounded-full text-center [text-shadow:0_1px_6px_rgba(0,0,0,0.55)]" style={{ left: pos[i].x - d / 2, top: pos[i].y - d / 2, width: d, height: d, border: `2px solid rgba(${it.color}, 0.85)`, background: `radial-gradient(circle at 30% 18%, rgba(${it.color}, 0.26), rgba(${it.color}, 0.06) 62%), var(--card)`, boxShadow: `0 0 30px rgba(${it.color}, 0.2)` }}>
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-full" style={{ zIndex: -1 }}>
              <motion.span className="absolute left-0 h-[130%] w-[200%]" style={{ top: `${(1 - level) * 100 - 6}%` }} animate={{ x: ['0%', '-50%'] }} transition={{ duration: 6 + i, ease: 'linear', repeat: Infinity }}><svg viewBox="0 0 200 100" preserveAspectRatio="none" className="h-full w-full"><path d={WAVE} fill={`rgba(${it.color}, 0.3)`} /></svg></motion.span>
              <motion.span className="absolute left-0 h-[130%] w-[200%]" style={{ top: `${(1 - level) * 100 + 1}%` }} animate={{ x: ['-50%', '0%'] }} transition={{ duration: 8.5 + i, ease: 'linear', repeat: Infinity }}><svg viewBox="0 0 200 100" preserveAspectRatio="none" className="h-full w-full"><path d={WAVE} fill={`rgba(${it.color}, 0.45)`} /></svg></motion.span>
            </span>
            <MerchantLogo name={it.name} sources={[]} style={{ width: d * 0.26, height: d * 0.26, fontSize: d * 0.09 }} />
            <span className="mt-0.5 max-w-[88%] truncate font-medium" style={{ fontSize: Math.max(10, d * 0.095) }}>{short(it.name, 14)}</span>
            <span className="leading-none font-semibold" style={{ fontSize: Math.max(12, d * 0.14) }}>{money(it.amount)}</span>
            <span className="font-support text-ink/80" style={{ fontSize: Math.max(9, d * 0.07) }}>{pct(it.amount)}</span>
          </motion.div>
        );
      })}
    </Stage>
  );
}

/* ------------------------------------------------------------------------------------- 2 · Orbit map */
// A thick ring in the middle, a thin orbit round it, and each item a logo bead on the orbit joined to its own slice by a spoke.
export function OrbitDiagram() {
  const R = 215;
  // Spread the beads so they never touch, keeping them as near to their slices as the spacing allows.
  const angles = useMemo(() => {
    const a = SLICES.map((s) => s.mid);
    for (let it = 0; it < 300; it++) {
      for (let i = 0; i < a.length; i++) {
        const j = (i + 1) % a.length;
        let d = a[j] - a[i];
        if (j === 0) d += 360;
        if (d < 36) { const p = (36 - d) / 2; a[i] -= p; a[j] += p; }
      }
    }
    return a;
  }, []);
  return (
    <Stage>
      <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--line)" strokeDasharray="2 7" />
        {ITEMS.map((it, i) => {
          const a = rad(angles[i] - 90);
          const sa = rad(SLICES[i].mid - 90);
          return <motion.line key={it.name} x1={CX + Math.cos(sa) * 112} y1={CY + Math.sin(sa) * 112} x2={CX + Math.cos(a) * (R - 26)} y2={CY + Math.sin(a) * (R - 26)} stroke={`rgb(${it.color})`} strokeOpacity="0.6" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.4 + i * 0.06, duration: 0.6 }} />;
        })}
      </svg>
      <Ring r={96} w={22} />
      <CenterText size={0.9} />
      {ITEMS.map((it, i) => {
        const a = rad(angles[i] - 90);
        const x = CX + Math.cos(a) * R;
        const y = CY + Math.sin(a) * R;
        const right = Math.cos(a) >= 0;
        return (
          <motion.div key={it.name} initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + i * 0.06, type: 'spring', stiffness: 240, damping: 16 }} className="absolute" style={{ left: x - 26, top: y - 26 }}>
            <span className="block rounded-full p-[3px]" style={{ background: `rgb(${it.color})`, boxShadow: `0 0 22px rgba(${it.color}, 0.45)` }}>
              <MerchantLogo name={it.name} sources={[]} className="border-0 text-xs" style={{ width: 46, height: 46 }} />
            </span>
            <span className={`absolute top-1/2 flex w-[120px] -translate-y-1/2 flex-col ${right ? 'left-[60px] items-start text-left' : 'right-[60px] items-end text-right'}`}>
              <span className="truncate text-[13px] leading-tight font-medium">{short(it.name, 16)}</span>
              <span className="text-[15px] leading-tight font-semibold tabular-nums">{money(it.amount)}</span>
              <span className="font-support text-[11px] text-muted">{pct(it.amount)} of income</span>
            </span>
          </motion.div>
        );
      })}
    </Stage>
  );
}

/* ----------------------------------------------------------------------------------------- 3 · Planets */
// Income is the sun. Each item is a planet on its own orbit, circling slowly, as big as what it costs.
export function PlanetDiagram() {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      setT((now - t0) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const orbits = [120, 152, 184, 216];
  return (
    <Stage>
      <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        {orbits.map((r) => <ellipse key={r} cx={CX} cy={CY} rx={r * 1.5} ry={r} fill="none" stroke="var(--line)" strokeDasharray="2 6" />)}
        <circle cx={CX} cy={CY} r="96" fill="url(#sun)" />
        <defs><radialGradient id="sun"><stop offset="0" stopColor="var(--accent)" stopOpacity="0.5" /><stop offset="0.7" stopColor="var(--accent)" stopOpacity="0.14" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></radialGradient></defs>
        {ITEMS.map((it, i) => <Arc key={it.name} r={80} w={5} start={SLICES[i].start} span={SLICES[i].span} color={it.color} delay={i * 0.07} />)}
      </svg>
      <CenterText size={0.8} />
      {ITEMS.map((it, i) => {
        const orbit = orbits[i % 4];
        // All the planets turn at the same speed, so the gaps between them never close.
        const a = rad(i * 45 - 70) + t * 0.16;
        const x = CX + Math.cos(a) * orbit * 1.5;
        const y = CY + Math.sin(a) * orbit;
        const d = 40 + 40 * Math.sqrt(it.amount / MAX);
        return (
          <div key={it.name} className="absolute flex flex-col items-center" style={{ left: x - d / 2, top: y - d / 2, width: d, zIndex: Math.round(y) }}>
            <span className="flex items-center justify-center rounded-full" style={{ width: d, height: d, background: `radial-gradient(circle at 32% 26%, rgba(${it.color}, 1), rgba(${it.color}, 0.55) 70%, rgba(${it.color}, 0.35))`, boxShadow: `0 8px 22px rgba(0,0,0,0.5), 0 0 24px rgba(${it.color}, 0.35), inset -6px -8px 14px rgba(0,0,0,0.3)` }}>
              <MerchantLogo name={it.name} sources={[]} className="border-0 text-[10px]" style={{ width: d * 0.62, height: d * 0.62 }} />
            </span>
            <span className="mt-1 whitespace-nowrap rounded-full bg-canvas/70 px-2 py-0.5 text-center text-[11px] leading-tight backdrop-blur-sm"><b className="font-semibold tabular-nums">{money(it.amount)}</b> <span className="text-muted">{short(it.name, 12)}</span></span>
          </div>
        );
      })}
    </Stage>
  );
}

/* ------------------------------------------------------------------------------------------- 4 · Rose */
// A polar bar chart: every item is a wedge pointing out from the centre, as long as what it costs, with its logo and amount in it.
export function RoseDiagram() {
  const inner = 104;
  const step = 360 / ITEMS.length;
  const sector = (a0: number, a1: number, r0: number, r1: number) => {
    const p = (a: number, r: number) => `${CX + Math.cos(rad(a - 90)) * r} ${CY + Math.sin(rad(a - 90)) * r}`;
    return `M ${p(a0, r0)} L ${p(a0, r1)} A ${r1} ${r1} 0 0 1 ${p(a1, r1)} L ${p(a1, r0)} A ${r0} ${r0} 0 0 0 ${p(a0, r0)} Z`;
  };
  return (
    <Stage>
      <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        {[150, 200, 250].map((r) => <circle key={r} cx={CX} cy={CY} r={r} fill="none" stroke="var(--line)" strokeDasharray="2 7" opacity="0.7" />)}
        {ITEMS.map((it, i) => {
          const mid = i * step + step / 2;
          const r1 = inner + 40 + (250 - inner - 40) * Math.sqrt(it.amount / MAX);
          return (
            <motion.path key={it.name} d={sector(mid - step / 2 + 2, mid + step / 2 - 2, inner, r1)} fill={`rgba(${it.color}, 0.28)`} stroke={`rgb(${it.color})`} strokeWidth="2" strokeLinejoin="round" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.07, duration: 0.6, ease: [0.22, 1, 0.36, 1] }} style={{ transformOrigin: `${CX}px ${CY}px` }} />
          );
        })}
      </svg>
      <div className="pointer-events-none absolute rounded-full border border-line bg-card" style={{ left: CX - 100, top: CY - 100, width: 200, height: 200 }} />
      <CenterText size={0.95} />
      {ITEMS.map((it, i) => {
        const mid = i * step + step / 2;
        const r1 = inner + 40 + (250 - inner - 40) * Math.sqrt(it.amount / MAX);
        const rr = r1 - 38;
        const x = CX + Math.cos(rad(mid - 90)) * rr;
        const y = CY + Math.sin(rad(mid - 90)) * rr;
        return (
          <motion.div key={it.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.07 }} className="absolute flex w-[84px] -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center" style={{ left: x, top: y }}>
            <MerchantLogo name={it.name} sources={[]} className="border-0 text-[10px]" style={{ width: 32, height: 32 }} />
            <span className="mt-0.5 w-full truncate text-[11px] leading-tight font-medium">{short(it.name, 13)}</span>
            <span className="text-[13px] leading-tight font-semibold tabular-nums">{money(it.amount)}</span>
          </motion.div>
        );
      })}
    </Stage>
  );
}

/* ---------------------------------------------------------------------------------------- 5 · Ribbons */
// Solid discs in each colour, and a ribbon from every slice of the centre ring to the disc it belongs to.
export function RibbonDiagram() {
  const sizes = ITEMS.map((it) => 58 + 84 * Math.sqrt(it.amount / MAX) * 0.9);
  const pos = useMemo(() => place(sizes, 160), []);
  return (
    <Stage>
      <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        {ITEMS.map((it, i) => {
          const a = rad(SLICES[i].mid - 90);
          const sx = CX + Math.cos(a) * 112;
          const sy = CY + Math.sin(a) * 112;
          const dx = pos[i].x - sx;
          const dy = pos[i].y - sy;
          const d = Math.hypot(dx, dy) || 1;
          const ex = pos[i].x - (dx / d) * (sizes[i] / 2);
          const ey = pos[i].y - (dy / d) * (sizes[i] / 2);
          const c1x = sx + Math.cos(a) * d * 0.45;
          const c1y = sy + Math.sin(a) * d * 0.45;
          return <motion.path key={it.name} d={`M ${sx} ${sy} C ${c1x} ${c1y}, ${ex - (dx / d) * d * 0.3} ${ey - (dy / d) * d * 0.3}, ${ex} ${ey}`} fill="none" stroke={`rgb(${it.color})`} strokeOpacity="0.55" strokeWidth={Math.max(3, 2 + 7 * (it.amount / MAX))} strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.3 + i * 0.07, duration: 0.8, ease: 'easeOut' }} />;
        })}
      </svg>
      <Ring r={96} w={16} />
      <CenterText size={0.9} />
      {ITEMS.map((it, i) => {
        const d = sizes[i];
        return (
          <motion.div key={it.name} initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.06, type: 'spring', stiffness: 220, damping: 16 }} className="absolute flex flex-col items-center justify-center rounded-full text-center text-[#0b0b0d]" style={{ left: pos[i].x - d / 2, top: pos[i].y - d / 2, width: d, height: d, background: `rgb(${it.color})`, boxShadow: `0 10px 28px rgba(${it.color}, 0.35)` }}>
            <MerchantLogo name={it.name} sources={[]} className="border-2 border-white/80 text-[10px]" style={{ width: d * 0.28, height: d * 0.28 }} />
            <span className="mt-0.5 max-w-[88%] truncate font-semibold" style={{ fontSize: Math.max(10, d * 0.092) }}>{short(it.name, 13)}</span>
            <span className="leading-none font-bold" style={{ fontSize: Math.max(12, d * 0.15) }}>{money(it.amount)}</span>
            <span className="font-medium opacity-70" style={{ fontSize: Math.max(9, d * 0.07) }}>{pct(it.amount)}</span>
          </motion.div>
        );
      })}
    </Stage>
  );
}


/* =======================================================================================================
   Gauge family: the same five ideas drawn with thin ring gauges, tick marks and a knob, as in the Ring Gauge and
   Gauge Dial pieces.
======================================================================================================= */
const polar = (cx: number, cy: number, r: number, deg: number) => [cx + Math.cos(rad(deg - 90)) * r, cy + Math.sin(rad(deg - 90)) * r] as const;
const DIAL_FROM = 135; // an open-bottomed dial: 270 degrees, starting bottom-left
const DIAL_SWEEP = 270;

// The open dial: tick marks, a track, one coloured arc per item, and a knob where the income runs out.
function Dial({ cx = CX, cy = CY, r, w = 10, ticks = true }: { cx?: number; cy?: number; r: number; w?: number; ticks?: boolean }) {
  const arcOf = (from: number, to: number, rr: number) => {
    const [x1, y1] = polar(cx, cy, rr, from);
    const [x2, y2] = polar(cx, cy, rr, to);
    return `M ${x1} ${y1} A ${rr} ${rr} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };
  const knob = DIAL_FROM + DIAL_SWEEP * (INCOME / WHOLE);
  const [kx, ky] = polar(cx, cy, r, knob);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      {ticks && Array.from({ length: 21 }, (_, i) => {
        const deg = DIAL_FROM + (DIAL_SWEEP / 20) * i;
        const [x1, y1] = polar(cx, cy, r + w / 2 + 8, deg);
        const [x2, y2] = polar(cx, cy, r + w / 2 + (i % 5 === 0 ? 20 : 14), deg);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--muted)" strokeWidth={i % 5 === 0 ? 2 : 1} strokeLinecap="round" opacity="0.6" />;
      })}
      <path d={arcOf(DIAL_FROM, DIAL_FROM + DIAL_SWEEP, r)} fill="none" stroke="var(--line)" strokeWidth={w} strokeLinecap="round" opacity="0.6" />
      {ITEMS.map((it, i) => (
        <Arc key={it.name} cx={cx} cy={cy} r={r} w={w} start={DIAL_FROM + (SLICES[i].start / 360) * DIAL_SWEEP} span={(SLICES[i].span / 360) * DIAL_SWEEP} color={it.color} delay={i * 0.07} gap={2.5} />
      ))}
      <motion.circle cx={kx} cy={ky} r={w / 2 + 4} fill="var(--canvas)" stroke="var(--accent)" strokeWidth="3" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8, type: 'spring', stiffness: 300, damping: 16 }} style={{ transformOrigin: `${kx}px ${ky}px` }} />
    </svg>
  );
}
function DialText({ cx = CX, cy = CY, size = 1 }: { cx?: number; cy?: number; size?: number }) {
  return (
    <div className="pointer-events-none absolute flex flex-col items-center justify-center text-center" style={{ left: cx - 80 * size, top: cy - 38 * size, width: 160 * size, height: 76 * size }}>
      <span className="font-support text-muted" style={{ fontSize: 12 * size }}>Monthly Income</span>
      <span className="leading-none font-semibold tracking-tight" style={{ fontSize: 34 * size }}>{money(INCOME)}</span>
      <span className="mt-1 font-support font-semibold text-accent" style={{ fontSize: 12 * size }}>{Math.round((SUM / INCOME) * 100)}% spent</span>
    </div>
  );
}

// A thin ring gauge with a knob at the end of its arc, and whatever is given sitting in the disc inside it.
function MiniRing({ size, color, share, delay = 0, children }: { size: number; color: string; share: number; delay?: number; children: React.ReactNode }) {
  const v = Math.min(1, Math.max(0.03, share));
  const [kx, ky] = polar(50, 50, 44, v * 360);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" fill="none" aria-hidden="true">
        <circle cx="50" cy="50" r="44" stroke="var(--line)" strokeWidth="5" />
        <g transform="rotate(-90 50 50)"><motion.circle cx="50" cy="50" r="44" stroke={`rgb(${color})`} strokeWidth="5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: v }} transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }} style={{ filter: `drop-shadow(0 0 3px rgba(${color}, 0.6))` }} /></g>
        <motion.circle cx={kx} cy={ky} r="4.5" fill="var(--canvas)" stroke={`rgb(${color})`} strokeWidth="2.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: delay + 0.8 }} />
      </svg>
      <div className="absolute inset-[9%] flex flex-col items-center justify-center rounded-full bg-card text-center">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------ 6 · Gauge cluster */
// A dial in the middle and a ring gauge for every item around it, each gauge filled to that item's share of the income.
export function GaugeClusterDiagram() {
  const sizes = ITEMS.map((it) => 78 + 78 * Math.sqrt(it.amount / MAX) * 0.9);
  const pos = useMemo(() => place(sizes, 150), []);
  return (
    <Stage>
      <Dial r={96} w={12} />
      <DialText size={0.9} />
      {ITEMS.map((it, i) => (
        <motion.div key={it.name} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.06, type: 'spring', stiffness: 200, damping: 16 }} className="absolute" style={{ left: pos[i].x - sizes[i] / 2, top: pos[i].y - sizes[i] / 2 }}>
          <MiniRing size={sizes[i]} color={it.color} share={it.amount / INCOME} delay={0.3 + i * 0.06}>
            <MerchantLogo name={it.name} sources={[]} style={{ width: sizes[i] * 0.27, height: sizes[i] * 0.27, fontSize: sizes[i] * 0.09 }} />
            <span className="mt-0.5 max-w-[86%] truncate font-medium" style={{ fontSize: Math.max(9, sizes[i] * 0.085) }}>{short(it.name, 13)}</span>
            <span className="leading-none font-semibold tabular-nums" style={{ fontSize: Math.max(11, sizes[i] * 0.125) }}>{money(it.amount)}</span>
            <span className="font-support text-muted" style={{ fontSize: Math.max(8, sizes[i] * 0.065) }}>{pct(it.amount)}</span>
          </MiniRing>
        </motion.div>
      ))}
    </Stage>
  );
}

/* ----------------------------------------------------------------------------------- 7 · Activity rings */
// One thin ring for each item, nested like watch activity rings, the biggest outermost. Each ends in a knob carrying the logo.
export function ActivityRingsDiagram() {
  const cx = 250;
  const cy = CY;
  return (
    <Stage>
      <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        {ITEMS.map((it, i) => {
          const r = 214 - i * 21;
          const sweep = 270 * (it.amount / MAX) * 0.98;
          return (
            <g key={it.name}>
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line)" strokeWidth="12" opacity="0.45" />
              <Arc cx={cx} cy={cy} r={r} w={12} start={0} span={sweep + 3} gap={3} color={it.color} delay={0.1 + i * 0.1} />
            </g>
          );
        })}
      </svg>
      {ITEMS.map((it, i) => {
        const r = 214 - i * 21;
        const [x, y] = polar(cx, cy, r, 270 * (it.amount / MAX) * 0.98);
        return (
          <motion.span key={it.name} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9 + i * 0.08, type: 'spring', stiffness: 300, damping: 16 }} className="absolute rounded-full p-[2px]" style={{ left: x - 11, top: y - 11, background: `rgb(${it.color})`, boxShadow: `0 0 10px rgba(${it.color}, 0.6)` }}>
            <MerchantLogo name={it.name} sources={[]} className="border-0 text-[6px]" style={{ width: 18, height: 18 }} />
          </motion.span>
        );
      })}
      <div className="pointer-events-none absolute flex flex-col items-center justify-center text-center" style={{ left: cx - 38, top: cy - 24, width: 76, height: 48 }}>
        <span className="font-support text-[9px] text-muted">Income</span>
        <span className="text-[15px] leading-none font-semibold tracking-tight">{money(INCOME)}</span>
        <span className="font-support text-[9px] font-semibold text-accent">{Math.round((SUM / INCOME) * 100)}% spent</span>
      </div>
      <div className="absolute flex flex-col gap-[7px]" style={{ left: 506, top: CY - 8 * 21 }}>
        {ITEMS.map((it, i) => (
          <motion.div key={it.name} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.07 }} className="flex items-center gap-2.5">
            <span className="h-8 w-1 rounded-full" style={{ background: `rgb(${it.color})` }} />
            <MerchantLogo name={it.name} sources={[]} className="text-[9px]" style={{ width: 28, height: 28 }} />
            <span className="min-w-0">
              <span className="block max-w-[130px] truncate text-[12px] leading-tight font-medium">{short(it.name, 16)}</span>
              <span className="block text-[12px] leading-tight tabular-nums"><b className="font-semibold">{money(it.amount)}</b> <span className="text-muted">· {pct(it.amount)}</span></span>
            </span>
          </motion.div>
        ))}
      </div>
    </Stage>
  );
}

/* --------------------------------------------------------------------------------------- 8 · Speedometer */
// A big open dial across the top for the income, and a row of ring gauges beneath it, one for every item.
export function SpeedometerDiagram() {
  const cy = 200;
  return (
    <Stage>
      <Dial cy={cy} r={138} w={16} />
      <DialText cy={cy + 10} size={1.15} />
      {ITEMS.map((it, i) => (
        <motion.div key={it.name} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.06 }} className="absolute flex flex-col items-center" style={{ left: CX + (i - 3.5) * 88 - 40, top: 372, width: 80 }}>
          <MiniRing size={72} color={it.color} share={it.amount / INCOME} delay={0.5 + i * 0.06}>
            <MerchantLogo name={it.name} sources={[]} className="text-[10px]" style={{ width: 30, height: 30 }} />
          </MiniRing>
          <span className="mt-1.5 w-full truncate text-center text-[11px] leading-tight font-medium">{short(it.name, 13)}</span>
          <span className="text-[13px] leading-tight font-semibold tabular-nums">{money(it.amount)}</span>
          <span className="font-support text-[10px] text-muted">{pct(it.amount)}</span>
        </motion.div>
      ))}
    </Stage>
  );
}

/* ------------------------------------------------------------------------------------------ 9 · Tick halos */
// A dial in the middle, and each item a disc ringed by tick marks that light up for its share of the income.
export function TickHalosDiagram() {
  const sizes = ITEMS.map((it) => 70 + 66 * Math.sqrt(it.amount / MAX) * 0.95);
  const pos = useMemo(() => place(sizes.map((d) => d + 30), 150), []);
  return (
    <Stage>
      <Dial r={96} w={12} />
      <DialText size={0.9} />
      {ITEMS.map((it, i) => {
        const d = sizes[i];
        const halo = d + 30;
        const lit = Math.max(1, Math.round((it.amount / INCOME) * 60));
        return (
          <motion.div key={it.name} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.06, type: 'spring', stiffness: 200, damping: 16 }} className="absolute" style={{ left: pos[i].x - halo / 2, top: pos[i].y - halo / 2, width: halo, height: halo }}>
            <svg viewBox={`0 0 ${halo} ${halo}`} className="absolute inset-0" aria-hidden="true">
              {Array.from({ length: 60 }, (_, k) => {
                const on = k < lit;
                const [x1, y1] = polar(halo / 2, halo / 2, d / 2 + 5, (k / 60) * 360);
                const [x2, y2] = polar(halo / 2, halo / 2, d / 2 + (on ? 13 : 10), (k / 60) * 360);
                return <motion.line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke={on ? `rgb(${it.color})` : 'var(--line)'} strokeWidth={on ? 2.4 : 1.5} strokeLinecap="round" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 + i * 0.06 + k * 0.012 }} />;
              })}
            </svg>
            <div className="absolute flex flex-col items-center justify-center rounded-full border border-line bg-card text-center" style={{ left: 15, top: 15, width: d, height: d }}>
              <MerchantLogo name={it.name} sources={[]} style={{ width: d * 0.27, height: d * 0.27, fontSize: d * 0.09 }} />
              <span className="mt-0.5 max-w-[86%] truncate font-medium" style={{ fontSize: Math.max(9, d * 0.09) }}>{short(it.name, 13)}</span>
              <span className="leading-none font-semibold tabular-nums" style={{ fontSize: Math.max(11, d * 0.135) }}>{money(it.amount)}</span>
              <span className="font-support" style={{ fontSize: Math.max(8, d * 0.07), color: `rgb(${it.color})` }}>{pct(it.amount)}</span>
            </div>
          </motion.div>
        );
      })}
    </Stage>
  );
}

/* ------------------------------------------------------------------------------------------ 10 · Scale ring */
// A graduated ring like a gauge bezel, coloured one stretch per item, with each item's logo as a knob on its own stretch,
// round a ring gauge that shows how much of the income is spent.
export function ScaleRingDiagram() {
  const R = 188;
  const spent = Math.min(1, SUM / INCOME);
  // Keep the logo knobs apart so their labels never touch, as near to their own stretch as the spacing allows.
  const angles = useMemo(() => {
    const m = SLICES.map((sl) => sl.mid);
    for (let it = 0; it < 300; it++) {
      for (let i = 0; i < m.length; i++) {
        const j = (i + 1) % m.length;
        let d = m[j] - m[i];
        if (j === 0) d += 360;
        if (d < 38) { const push = (38 - d) / 2; m[i] -= push; m[j] += push; }
      }
    }
    return m;
  }, []);
  return (
    <Stage>
      <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        {Array.from({ length: 72 }, (_, i) => {
          const [x1, y1] = polar(CX, CY, R + 10, i * 5);
          const [x2, y2] = polar(CX, CY, R + (i % 6 === 0 ? 22 : 15), i * 5);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--muted)" strokeWidth={i % 6 === 0 ? 2 : 1} strokeLinecap="round" opacity="0.5" />;
        })}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--line)" strokeWidth="8" opacity="0.5" />
        {ITEMS.map((it, i) => <Arc key={it.name} r={R} w={8} start={SLICES[i].start} span={SLICES[i].span} color={it.color} delay={i * 0.08} />)}
        <circle cx={CX} cy={CY} r="96" fill="none" stroke="var(--line)" strokeWidth="6" />
        <g transform={`rotate(-90 ${CX} ${CY})`}><motion.circle cx={CX} cy={CY} r="96" fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: spent }} transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }} style={{ filter: 'drop-shadow(0 0 5px color-mix(in srgb, var(--accent) 55%, transparent))' }} /></g>
      </svg>
      <div className="pointer-events-none absolute rounded-full bg-card" style={{ left: CX - 86, top: CY - 86, width: 172, height: 172 }} />
      <CenterText size={0.9} />
      {ITEMS.map((it, i) => {
        const [x, y] = polar(CX, CY, R, angles[i]);
        const sx = Math.sin(rad(angles[i]));
        const sy = -Math.cos(rad(angles[i]));
        const vertical = Math.abs(sx) < 0.42;
        const cls = vertical
          ? `left-1/2 w-[120px] -translate-x-1/2 items-center text-center ${sy < 0 ? 'bottom-[50px]' : 'top-[50px]'}`
          : `top-1/2 w-[116px] -translate-y-1/2 ${sx >= 0 ? 'left-[52px] items-start text-left' : 'right-[52px] items-end text-right'}`;
        return (
          <motion.div key={it.name} initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 + i * 0.07, type: 'spring', stiffness: 240, damping: 16 }} className="absolute" style={{ left: x - 21, top: y - 21 }}>
            <span className="block rounded-full border-[3px] bg-canvas p-[2px]" style={{ borderColor: `rgb(${it.color})`, boxShadow: `0 0 16px rgba(${it.color}, 0.5)` }}>
              <MerchantLogo name={it.name} sources={[]} className="border-0 text-[9px]" style={{ width: 30, height: 30 }} />
            </span>
            <span className={`absolute flex flex-col ${cls}`}>
              <span className="max-w-full truncate text-[12px] leading-tight font-medium">{short(it.name, 15)}</span>
              <span className="text-[14px] leading-tight font-semibold tabular-nums">{money(it.amount)}</span>
              <span className="font-support text-[10px] text-muted">{pct(it.amount)} of income</span>
            </span>
          </motion.div>
        );
      })}
    </Stage>
  );
}
