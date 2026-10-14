import { useMemo } from 'react';
import { motion } from 'motion/react';
import MerchantLogo from '../MerchantLogo';
import { money } from '../../lib/patternFormat';
import { CX, CY, H, INCOME, ITEMS, MAX, SLICES, SUM, W, WHOLE, CenterText, Ring, Stage, pct, place, rad, short } from './patternsMock';

// Five more whole Patterns diagrams, each a different idea of what the main circle could be. Same example merchants and bills as
// the first ten, so only the design changes.

// Pushes neighbouring angles (sorted, in degrees) apart until each is at least `min` from the next.
function spread(angles: number[], min: number): number[] {
  const a = [...angles];
  for (let it = 0; it < 300; it++) {
    for (let i = 0; i < a.length; i++) {
      const j = (i + 1) % a.length;
      let d = a[j] - a[i];
      if (j === 0) d += 360;
      if (d < min) {
        const p = (min - d) / 2;
        a[i] -= p;
        a[j] += p;
      }
    }
  }
  return a;
}

// Fixed pseudo-random numbers, so a drawing looks the same every time it renders.
const noise = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function Bead({ i, size, ring = 3 }: { i: number; size: number; ring?: number }) {
  const it = ITEMS[i];
  return (
    <span className="block rounded-full" style={{ padding: ring, background: `rgb(${it.color})`, boxShadow: `0 0 ${size * 0.5}px rgba(${it.color}, 0.5)` }}>
      <MerchantLogo name={it.name} sources={[]} className="border-0 text-xs" style={{ width: size, height: size, fontSize: size * 0.3 }} />
    </span>
  );
}

/* ------------------------------------------------------------------------------------ 11 · Constellation */
// Each item is a star: the more it costs, the bigger and brighter it burns. Thin lines tie every star to the hub, which holds the income, and to its nearest
// neighbours, so the whole month reads as one map.
export function ConstellationDiagram() {
  const sizes = useMemo(() => ITEMS.map((it) => 48 + 58 * Math.sqrt(it.amount / MAX)), []);
  const pos = useMemo(() => place(sizes.map((d) => d + 44), 84).map((p) => ({ x: p.x, y: p.y - 14 })), [sizes]);
  const edges = useMemo(() => {
    const seen = new Set<string>();
    const out: [number, number][] = [];
    pos.forEach((p, i) => {
      pos
        .map((q, j) => ({ j, d: Math.hypot(p.x - q.x, p.y - q.y) }))
        .filter((o) => o.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2)
        .forEach(({ j }) => {
          const key = [i, j].sort().join('-');
          if (!seen.has(key)) {
            seen.add(key);
            out.push([i, j]);
          }
        });
    });
    return out;
  }, [pos]);
  return (
    <Stage>
      <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        {Array.from({ length: 46 }, (_, k) => (
          <circle key={k} cx={noise(k) * W} cy={noise(k + 90) * H} r={0.7 + noise(k + 40) * 1.3} fill="var(--ink)" opacity="0.5">
            <animate attributeName="opacity" values="0.1;0.7;0.1" dur={`${2.5 + noise(k + 7) * 4}s`} begin={`${noise(k + 3) * 3}s`} repeatCount="indefinite" />
          </circle>
        ))}
        {edges.map(([i, j]) => (
          <motion.line key={`${i}-${j}`} x1={pos[i].x} y1={pos[i].y} x2={pos[j].x} y2={pos[j].y} stroke="var(--ink)" strokeOpacity="0.16" strokeDasharray="3 6" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5, duration: 1 }} />
        ))}
        {ITEMS.map((it, i) => {
          // The line starts on the edge of the hub, not at its middle, so it never runs through the income.
          const d = Math.hypot(pos[i].x - CX, pos[i].y - CY) || 1;
          const x1 = CX + ((pos[i].x - CX) / d) * 70;
          const y1 = CY + ((pos[i].y - CY) / d) * 70;
          return <motion.line key={it.name} x1={x1} y1={y1} x2={pos[i].x} y2={pos[i].y} stroke={`rgb(${it.color})`} strokeOpacity="0.55" strokeWidth="1.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.2 + i * 0.05, duration: 0.8 }} />;
        })}
      </svg>
      <Ring r={60} w={9} />
      <CenterText size={0.6} />
      {ITEMS.map((it, i) => {
        const d = sizes[i];
        return (
          <motion.div key={it.name} initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.07, type: 'spring', stiffness: 200, damping: 15 }} className="absolute" style={{ left: pos[i].x - d / 2, top: pos[i].y - d / 2, width: d, height: d }}>
            <motion.span aria-hidden="true" className="absolute inset-0 rounded-full" style={{ border: `1.5px solid rgb(${it.color})` }} animate={{ scale: [1, 1.7], opacity: [0.55, 0] }} transition={{ duration: 3.2, repeat: Infinity, delay: i * 0.4, ease: 'easeOut' }} />
            <span className="absolute inset-0 flex items-center justify-center rounded-full" style={{ background: `radial-gradient(circle at 35% 30%, rgba(${it.color}, 0.55), rgba(${it.color}, 0.12) 70%), var(--card)`, border: `2px solid rgb(${it.color})`, boxShadow: `0 0 ${d * 0.55}px rgba(${it.color}, 0.55)` }}>
              <MerchantLogo name={it.name} sources={[]} className="border-0" style={{ width: d * 0.5, height: d * 0.5, fontSize: d * 0.16 }} />
            </span>
            <span className="absolute top-full left-1/2 mt-1.5 flex w-[130px] -translate-x-1/2 flex-col items-center text-center leading-tight">
              <span className="max-w-full truncate text-[12px] font-medium">{short(it.name, 17)}</span>
              <span className="text-[14px] font-semibold tabular-nums">{money(it.amount)}</span>
            </span>
          </motion.div>
        );
      })}
    </Stage>
  );
}

/* ----------------------------------------------------------------------------------------- 12 · Beaker */
// The whole diagram is one glass vessel. Each item is a layer of liquid, the biggest at the bottom, as deep as its cost. A dashed line marks the income, and
// the liquid above it is spending past what came in. Labels line up on the right, tied to their layer.
const VR = 190;
const VX = 262;
const waveFrom = (x: number, y: number, period: number, amp: number, count: number, bottom: number) =>
  `M${x} ${y} q${period / 4} ${-amp} ${period / 2} 0${` t${period / 2} 0`.repeat(count * 2 - 1)} V${bottom} H${x} Z`;

export function BeakerDiagram() {
  const top = CY - VR;
  const bottom = CY + VR;
  const height = bottom - top;
  const bands = useMemo(() => {
    let acc = 0;
    return ITEMS.map((it) => {
      const h = (height * it.amount) / WHOLE;
      acc += h;
      return { y: bottom - acc, mid: bottom - acc + h / 2 };
    });
  }, [bottom, height]);
  const incomeY = bottom - (height * INCOME) / WHOLE;
  // Labels keep their order top to bottom and are spaced so none overlap.
  const labelY = useMemo(() => {
    const idx = bands.map((b, i) => ({ i, y: b.mid })).sort((a, b) => a.y - b.y);
    const gap = 50;
    idx.forEach((o, k) => { if (k > 0) o.y = Math.max(o.y, idx[k - 1].y + gap); });
    const over = idx[idx.length - 1].y - (H - 30);
    if (over > 0) idx.forEach((o) => { o.y -= over; });
    idx.forEach((o, k) => { if (k === 0) o.y = Math.max(o.y, 30); else o.y = Math.max(o.y, idx[k - 1].y + gap); });
    const out: number[] = [];
    idx.forEach((o) => { out[o.i] = o.y; });
    return out;
  }, [bands]);
  const P = 96;
  return (
    <Stage>
      <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <clipPath id="beaker-clip"><circle cx={VX} cy={CY} r={VR - 3} /></clipPath>
          <linearGradient id="beaker-glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
            <stop offset="0.4" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx={VX} cy={CY} r={VR} fill="var(--card)" />
        <g clipPath="url(#beaker-clip)">
          {[...bands].map((b, i) => ({ b, i })).reverse().map(({ b, i }) => (
            <g key={ITEMS[i].name}>
              <motion.g initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 + (ITEMS.length - i) * 0.06, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
                <motion.path d={waveFrom(VX - VR - P, b.y, P, 5, 6, bottom + 4)} fill={`rgba(${ITEMS[i].color}, 0.55)`} animate={{ x: [0, P] }} transition={{ duration: 6 + i * 0.7, repeat: Infinity, ease: 'linear' }} />
                <motion.path d={waveFrom(VX - VR - P, b.y + 3, P, 4, 6, bottom + 4)} fill={`rgba(${ITEMS[i].color}, 0.9)`} animate={{ x: [P, 0] }} transition={{ duration: 8 + i * 0.6, repeat: Infinity, ease: 'linear' }} />
              </motion.g>
            </g>
          ))}
        </g>
        <circle cx={VX} cy={CY} r={VR} fill="url(#beaker-glass)" />
        <circle cx={VX} cy={CY} r={VR} fill="none" stroke="var(--line)" strokeWidth="4" />
        <path d={`M${VX - 150} ${CY - 70} A${VR - 24} ${VR - 24} 0 0 1 ${VX - 72} ${CY - 156}`} stroke="#fff" strokeOpacity="0.32" strokeWidth="5" strokeLinecap="round" fill="none" />
        <line x1={VX - VR - 14} x2={VX + VR + 14} y1={incomeY} y2={incomeY} stroke="var(--accent)" strokeWidth="2" strokeDasharray="7 6" />
        {bands.map((b, i) => {
          const dx = Math.sqrt(Math.max(0, VR * VR - (b.mid - CY) ** 2));
          const x0 = VX + dx;
          return <path key={ITEMS[i].name} d={`M${x0} ${b.mid} H${x0 + 16} L${478} ${labelY[i]}`} stroke={`rgb(${ITEMS[i].color})`} strokeOpacity="0.8" fill="none" />;
        })}
      </svg>
      <div className="absolute flex flex-col rounded-xl border border-line bg-card/90 px-2.5 py-1.5 leading-tight" style={{ left: 4, top: incomeY - 24 }}>
        <span className="font-support text-[10px] text-muted">Income</span>
        <span className="text-[14px] font-semibold tabular-nums">{money(INCOME)}</span>
      </div>
      <div className="absolute rounded-full border border-line bg-card/90 px-2.5 py-1 font-support text-[11px] text-red-300" style={{ left: 4, top: incomeY + 22 }}>{Math.round((SUM / INCOME) * 100)}% spent</div>
      {ITEMS.map((it, i) => (
        <motion.div key={it.name} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.06 }} className="absolute flex items-center gap-2.5" style={{ left: 484, top: labelY[i] - 22, width: 228 }}>
          <MerchantLogo name={it.name} sources={[]} className="border-0 text-[10px]" style={{ width: 38, height: 38, boxShadow: `0 0 0 2.5px rgb(${it.color})` }} />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[13px] font-medium">{short(it.name, 20)}</span>
            <span className="text-[15px] font-semibold tabular-nums">{money(it.amount)} <span className="font-support text-[11px] font-normal text-muted">{pct(it.amount)}</span></span>
          </span>
        </motion.div>
      ))}
    </Stage>
  );
}

/* ------------------------------------------------------------------------------------------ 13 · Bloom */
// A flower. Every item is a petal pointing out from the middle, as long as it costs, in its own colour. The petals overlap where they meet, and
// each one ends in its logo.
export function BloomDiagram() {
  const step = 360 / ITEMS.length;
  const lens = ITEMS.map((it) => 78 + 112 * Math.sqrt(it.amount / MAX));
  return (
    <Stage>
      <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          {ITEMS.map((it, i) => (
            <linearGradient key={it.name} id={`petal-${i}`} x1="0" y1="0" x2="0" y2="-1">
              <stop offset="0" stopColor={`rgb(${it.color})`} stopOpacity="0.08" />
              <stop offset="1" stopColor={`rgb(${it.color})`} stopOpacity="0.8" />
            </linearGradient>
          ))}
        </defs>
        {ITEMS.map((it, i) => {
          const L = lens[i];
          const w = 30 + 26 * Math.sqrt(it.amount / MAX);
          return (
            <g key={it.name} transform={`translate(${CX} ${CY}) rotate(${i * step + step / 2})`}>
              <motion.path
                d={`M0 0 C${w} ${-L * 0.28} ${w * 0.95} ${-L * 0.82} 0 ${-L} C${-w * 0.95} ${-L * 0.82} ${-w} ${-L * 0.28} 0 0 Z`}
                fill={`url(#petal-${i})`}
                stroke={`rgb(${it.color})`}
                strokeOpacity="0.9"
                strokeWidth="1.5"
                style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 + i * 0.07, type: 'spring', stiffness: 120, damping: 14 }}
              />
            </g>
          );
        })}
        <circle cx={CX} cy={CY} r={74} fill="var(--canvas)" />
        <circle cx={CX} cy={CY} r={74} fill="none" stroke="var(--line)" />
      </svg>
      <Ring r={62} w={10} />
      <CenterText size={0.68} />
      {ITEMS.map((it, i) => {
        const a = rad(i * step + step / 2 - 90);
        const L = lens[i];
        const bx = CX + Math.cos(a) * L;
        const by = CY + Math.sin(a) * L;
        const lx = CX + Math.cos(a) * (L + 50);
        const ly = CY + Math.sin(a) * (L + 50);
        const right = Math.cos(a) >= 0;
        return (
          <motion.div key={it.name} initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + i * 0.07, type: 'spring', stiffness: 220, damping: 15 }}>
            <div className="absolute" style={{ left: bx - 22, top: by - 22 }}><Bead i={i} size={36} /></div>
            <div className={`absolute flex w-[124px] flex-col leading-tight ${right ? 'items-start text-left' : 'items-end text-right'}`} style={{ left: right ? lx - 2 : lx - 122, top: ly - 20 }}>
              <span className="max-w-full truncate text-[12px] font-medium">{short(it.name, 17)}</span>
              <span className="text-[14px] font-semibold tabular-nums">{money(it.amount)}</span>
              <span className="font-support text-[11px] text-muted">{pct(it.amount)}</span>
            </div>
          </motion.div>
        );
      })}
    </Stage>
  );
}

/* ------------------------------------------------------------------------------------------ 14 · Vinyl */
// A record. The grooves are cut in sectors, one colour per item, and a sheen sweeps round as it plays. The label in the middle holds the income. Each item is
// a sleeve tag on the edge, tied to its sector.
export function VinylDiagram() {
  const R = 182;
  const stops = useMemo(() => {
    const out: string[] = [];
    ITEMS.forEach((it, i) => {
      const s = SLICES[i];
      out.push(`rgba(${it.color}, 0.92) ${s.start}deg ${s.start + s.span - 1.6}deg`, `var(--canvas) ${s.start + s.span - 1.6}deg ${s.start + s.span}deg`);
    });
    return out.join(', ');
  }, []);
  const angles = useMemo(() => spread(SLICES.map((s) => s.mid), 33), []);
  return (
    <Stage>
      <motion.div initial={{ opacity: 0, scale: 0.8, rotate: -40 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} className="absolute rounded-full" style={{ left: CX - R, top: CY - R, width: R * 2, height: R * 2, background: `conic-gradient(from 0deg, ${stops})`, boxShadow: '0 18px 50px rgba(0,0,0,0.5), inset 0 0 0 5px rgba(0,0,0,0.5)' }}>
        <span aria-hidden="true" className="absolute inset-0 rounded-full" style={{ background: 'repeating-radial-gradient(circle at 50% 50%, rgba(0,0,0,0.3) 0px, rgba(0,0,0,0.3) 1px, transparent 1px, transparent 4px)' }} />
        <span aria-hidden="true" className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle at 50% 50%, transparent 0 28%, rgba(0,0,0,0.35) 28.5%, transparent 30%)' }} />
        <motion.span aria-hidden="true" className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(from 0deg, transparent 0 18deg, rgba(255,255,255,0.28) 32deg, transparent 50deg 190deg, rgba(255,255,255,0.2) 212deg, transparent 230deg)' }} animate={{ rotate: 360 }} transition={{ duration: 16, repeat: Infinity, ease: 'linear' }} />
      </motion.div>
      <div className="absolute flex items-center justify-center rounded-full border-4 border-canvas" style={{ left: CX - 78, top: CY - 78, width: 156, height: 156, background: 'radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--accent) 55%, var(--card)), color-mix(in srgb, var(--accent) 18%, var(--card)))' }}>
        <span className="absolute top-3.5 h-2 w-2 rounded-full bg-canvas" />
        <div className="relative" style={{ width: 156, height: 156 }}>
          <div className="absolute flex flex-col items-center justify-center text-center" style={{ inset: 0, paddingTop: 8 }}>
            <span className="font-support text-[11px] text-ink/80">Monthly Income</span>
            <span className="text-[27px] leading-none font-semibold tracking-tight">{money(INCOME)}</span>
            <span className="mt-1 font-support text-[11px] text-ink/80">{Math.round((SUM / INCOME) * 100)}% spent</span>
          </div>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        {ITEMS.map((it, i) => {
          const a = rad(SLICES[i].mid - 90);
          const b = rad(angles[i] - 90);
          return <motion.path key={it.name} d={`M${CX + Math.cos(a) * (R - 8)} ${CY + Math.sin(a) * (R - 8)} L${CX + Math.cos(a) * (R + 14)} ${CY + Math.sin(a) * (R + 14)} L${CX + Math.cos(b) * (R + 34)} ${CY + Math.sin(b) * (R + 34)}`} stroke={`rgb(${it.color})`} strokeWidth="2" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.7 + i * 0.05, duration: 0.5 }} />;
        })}
      </svg>
      {ITEMS.map((it, i) => {
        const b = rad(angles[i] - 90);
        const px = CX + Math.cos(b) * (R + 34);
        const py = CY + Math.sin(b) * (R + 34);
        const right = Math.cos(b) >= 0;
        return (
          <motion.div key={it.name} initial={{ opacity: 0, x: right ? -10 : 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 + i * 0.05 }} className="absolute flex h-[46px] w-[142px] items-center gap-2 rounded-lg border border-line bg-card/95 pr-2.5 pl-0 shadow-[0_8px_20px_rgba(0,0,0,0.3)]" style={{ left: right ? px : px - 142, top: py - 23, flexDirection: right ? 'row' : 'row-reverse' }}>
            <span className="h-full w-1.5 shrink-0 rounded-l-lg" style={{ background: `rgb(${it.color})` }} />
            <MerchantLogo name={it.name} sources={[]} className="border-0 text-[9px]" style={{ width: 28, height: 28 }} />
            <span className={`flex min-w-0 flex-col leading-tight ${right ? 'text-left' : 'text-right'}`}>
              <span className="truncate text-[11px] font-medium">{short(it.name, 15)}</span>
              <span className="text-[13px] font-semibold tabular-nums">{money(it.amount)}</span>
            </span>
          </motion.div>
        );
      })}
    </Stage>
  );
}

/* ------------------------------------------------------------------------------------- 15 · Sunflower */
// The month as a field of dots, laid out the way a sunflower grows its seeds. Each dot takes the colour of the item whose sector it falls in, and the dots
// ripple outward from the middle. The part of the circle past where the income runs out is dimmed.
export function SunflowerDiagram() {
  const R = 188;
  const R0 = 62;
  const K = 620;
  const GOLD = 137.508;
  const T = (INCOME / WHOLE) * 360;
  const dots = useMemo(
    () =>
      Array.from({ length: K }, (_, k) => {
        const r = Math.sqrt(R0 * R0 + ((k + 0.5) * (R * R - R0 * R0)) / K);
        const theta = (((k * GOLD) % 360) + 360) % 360; // clockwise from the top
        let idx = SLICES.findIndex((s) => theta >= s.start && theta < s.start + s.span);
        if (idx < 0) idx = ITEMS.length - 1;
        const a = rad(theta - 90);
        return { x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r, r, idx, over: theta > T };
      }),
    [T],
  );
  const angles = useMemo(() => spread(SLICES.map((s) => s.mid), 34), []);
  const ta = rad(T - 90);
  return (
    <Stage>
      <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        {dots.map((d, k) => {
          const base = 2.7 + ((d.r - R0) / (R - R0)) * 2.6;
          return (
            <circle key={k} cx={d.x} cy={d.y} r={base} fill={`rgb(${ITEMS[d.idx].color})`} opacity={d.over ? 0.38 : 0.95}>
              <animate attributeName="r" values={`${base};${base * 1.45};${base}`} dur="3.4s" begin={`${((d.r - R0) / (R - R0)) * 2.4}s`} repeatCount="indefinite" />
            </circle>
          );
        })}
        <line x1={CX + Math.cos(ta) * (R0 - 6)} y1={CY + Math.sin(ta) * (R0 - 6)} x2={CX + Math.cos(ta) * (R + 12)} y2={CY + Math.sin(ta) * (R + 12)} stroke="var(--ink)" strokeOpacity="0.55" strokeDasharray="4 5" />
        {ITEMS.map((it, i) => {
          const a = rad(SLICES[i].mid - 90);
          const b = rad(angles[i] - 90);
          return <path key={it.name} d={`M${CX + Math.cos(a) * (R + 8)} ${CY + Math.sin(a) * (R + 8)} L${CX + Math.cos(b) * (R + 30)} ${CY + Math.sin(b) * (R + 30)}`} stroke={`rgb(${it.color})`} strokeOpacity="0.7" fill="none" />;
        })}
      </svg>
      <CenterText size={0.74} />
      {ITEMS.map((it, i) => {
        const b = rad(angles[i] - 90);
        const x = CX + Math.cos(b) * (R + 46);
        const y = CY + Math.sin(b) * (R + 46);
        const right = Math.cos(b) >= 0;
        return (
          <motion.div key={it.name} initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + i * 0.06, type: 'spring', stiffness: 220, damping: 16 }} className="absolute" style={{ left: x - 18, top: y - 18 }}>
            <Bead i={i} size={30} ring={2.5} />
            <span className={`absolute top-1/2 flex w-[112px] -translate-y-1/2 flex-col leading-tight ${right ? 'left-[44px] items-start text-left' : 'right-[44px] items-end text-right'}`}>
              <span className="max-w-full truncate text-[12px] font-medium">{short(it.name, 15)}</span>
              <span className="text-[14px] font-semibold tabular-nums">{money(it.amount)}</span>
            </span>
          </motion.div>
        );
      })}
    </Stage>
  );
}
