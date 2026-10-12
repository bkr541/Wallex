import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import type { Forecast, ForecastEvent, ForecastPoint } from '../../lib/forecast';
import { money } from '../../lib/patternFormat';

const GREEN = '#5fd38d';
const RED = '#ff6b6b';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const short = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;
const axis = (n: number) => {
  const a = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  return a >= 1000 ? `${sign}$${(a / 1000).toFixed(a % 1000 === 0 ? 0 : 1)}K` : `${sign}$${Math.round(a)}`;
};
const signedMoney = (n: number) => `${n < 0 ? '-' : ''}${money(Math.abs(n))}`;

// Round tick values that cover [lo, hi].
function niceTicks(lo: number, hi: number, target = 5): number[] {
  const span = Math.max(1, hi - lo);
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.floor(lo / step) * step; v <= hi + step * 0.999; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}

interface Marker {
  day: number;
  kind: 'income' | 'bill';
  amount: number;
  events: ForecastEvent[];
}

// The projected balance as a line: the real past solid, the future dashed, with a shaded typical range and an arrow on
// each day money is expected in (green) or a bill is due (red). Hover or tap a day for the figures.
export default function ForecastChart({ forecast, days, mobile = false }: { forecast: Forecast; days: number; mobile?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId().replace(/:/g, '');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.max(280, el.clientWidth)));
    ro.observe(el);
    setWidth(Math.max(280, el.clientWidth));
    return () => ro.disconnect();
  }, []);

  const past = Math.max(3, Math.round(days * 0.2));
  const pts = useMemo(() => forecast.points.filter((p) => p.day >= -past && p.day <= days), [forecast, past, days]);
  const markers = useMemo(() => {
    const map = new Map<string, Marker>();
    for (const e of forecast.events) {
      if (e.day > days) continue;
      const k = `${e.day}-${e.kind}`;
      const m = map.get(k) ?? { day: e.day, kind: e.kind, amount: 0, events: [] };
      m.amount += e.amount;
      m.events.push(e);
      map.set(k, m);
    }
    return [...map.values()];
  }, [forecast, days]);

  const H = mobile ? 270 : 330;
  const M = { l: mobile ? 42 : 50, r: mobile ? 12 : 18, t: 40, b: 50 };
  const plotW = Math.max(60, width - M.l - M.r);
  const plotH = H - M.t - M.b;

  const lo = Math.min(0, ...pts.map((p) => p.low));
  const hi = Math.max(1, ...pts.map((p) => p.high));
  const ticks = niceTicks(lo, hi * 1.04);
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const x = (day: number) => M.l + ((day + past) / (past + days)) * plotW;
  const y = (v: number) => M.t + (1 - (v - yMin) / (yMax - yMin || 1)) * plotH;
  const at = (day: number) => pts.find((p) => p.day === day) as ForecastPoint;

  const line = (list: ForecastPoint[]) => list.map((p, i) => `${i ? 'L' : 'M'}${x(p.day).toFixed(1)},${y(p.balance).toFixed(1)}`).join(' ');
  const pastPts = pts.filter((p) => p.day <= 0);
  const futurePts = pts.filter((p) => p.day >= 0);
  const area = `${line(pts)} L${x(days)},${y(yMin)} L${x(-past)},${y(yMin)} Z`;
  const band =
    futurePts.map((p, i) => `${i ? 'L' : 'M'}${x(p.day).toFixed(1)},${y(p.high).toFixed(1)}`).join(' ') +
    [...futurePts].reverse().map((p) => ` L${x(p.day).toFixed(1)},${y(p.low).toFixed(1)}`).join('') +
    ' Z';

  // Arrows get room: the biggest are drawn first, and any too close to one already drawn become a small dot.
  const arrowGap = mobile ? 26 : 30;
  const labelGap = mobile ? 54 : 66;
  const drawn: Marker[] = [];
  const labelled = new Set<Marker>();
  for (const m of [...markers].sort((a, b) => b.amount - a.amount)) {
    if (drawn.every((d) => Math.abs(x(d.day) - x(m.day)) >= arrowGap)) {
      drawn.push(m);
      if ([...labelled].every((d) => Math.abs(x(d.day) - x(m.day)) >= labelGap)) labelled.add(m);
    }
  }

  const step = Math.max(1, Math.ceil(days / (mobile ? 4 : 6)));
  const xTicks: number[] = [0];
  for (let d = step; d <= days; d += step) xTicks.push(d);
  if (days - xTicks[xTicks.length - 1] > step * 0.6) xTicks.push(days);
  if (xTicks.length > 1 && xTicks[xTicks.length - 1] - xTicks[xTicks.length - 2] < step * 0.5) xTicks.splice(xTicks.length - 2, 1);

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const day = Math.round(((e.clientX - box.left) / box.width) * (past + days) - past);
    setHover(Math.max(-past, Math.min(days, day)));
  };
  const hp = hover === null ? null : at(hover);
  const hEvents = hover === null ? [] : forecast.events.filter((e) => e.day === hover);
  const tipLeft = hp ? Math.min(Math.max(x(hp.day) - 90, 4), width - 184) : 0;

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height: H }}>
      <svg width={width} height={H} role="img" aria-label={`Projected balance over the next ${days} days, from ${money(forecast.cash)} today to ${money(at(days).balance)}`} className="block overflow-visible">
        <defs>
          <linearGradient id={`${gid}a`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.l} x2={width - M.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={t === 0 ? 1.2 : 0.6} strokeOpacity={t === 0 ? 0.9 : 0.5} />
            <text x={M.l - 8} y={y(t) + 4} textAnchor="end" className="fill-muted font-support" fontSize="11">{axis(t)}</text>
          </g>
        ))}

        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <path d={area} fill={`url(#${gid}a)`} />
          <path d={band} fill="var(--accent)" fillOpacity="0.13" />
          <path d={line(pastPts)} fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
          <path d={line(futurePts)} fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeDasharray="6 5" strokeLinejoin="round" strokeLinecap="round" />
        </motion.g>

        <line x1={x(0)} x2={x(0)} y1={M.t - 6} y2={M.t + plotH} stroke="var(--ink)" strokeOpacity="0.25" strokeDasharray="3 4" />

        {markers.filter((m) => !drawn.includes(m)).map((m) => (
          <circle key={`${m.day}${m.kind}`} cx={x(m.day)} cy={y(at(m.day).balance)} r="2.8" fill={m.kind === 'income' ? GREEN : RED} />
        ))}
        {drawn.map((m) => {
          const cx = x(m.day);
          const cy = y(at(m.day).balance);
          const my = Math.max(M.t + 6, cy - 22);
          const color = m.kind === 'income' ? GREEN : RED;
          return (
            <g key={`${m.day}${m.kind}`}>
              <line x1={cx} x2={cx} y1={my + 9} y2={cy} stroke={color} strokeOpacity="0.55" />
              <circle cx={cx} cy={cy} r="3.4" fill={color} />
              <circle cx={cx} cy={my} r="9" fill={color} />
              <path d={m.kind === 'income' ? `M${cx},${my + 4} V${my - 4} M${cx - 3.4},${my - 0.8} L${cx},${my - 4.2} L${cx + 3.4},${my - 0.8}` : `M${cx},${my - 4} V${my + 4} M${cx - 3.4},${my + 0.8} L${cx},${my + 4.2} L${cx + 3.4},${my + 0.8}`} stroke="#0d1412" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              {labelled.has(m) && (
                <text x={cx} y={my - 14} textAnchor="middle" fontSize="11" fontWeight="600" fill={color}>
                  {m.kind === 'income' ? '+' : '-'}{money(m.amount)}
                </text>
              )}
            </g>
          );
        })}

        <circle cx={x(0)} cy={y(forecast.cash)} r="5" fill="#fff" stroke="var(--accent)" strokeWidth="2" />

        {xTicks.map((d) => {
          const p = at(d);
          return (
            <g key={d}>
              <text x={x(d)} y={H - 24} textAnchor={d === 0 ? 'start' : d === days ? 'end' : 'middle'} fontSize="11" className={d === 0 ? 'fill-accent font-support' : 'fill-muted font-support'}>{short(p.date)}</text>
              {d === 0 && <text x={x(d)} y={H - 9} textAnchor="start" fontSize="11" className="fill-accent font-support">Today</text>}
            </g>
          );
        })}

        {hp && (
          <g pointerEvents="none">
            <line x1={x(hp.day)} x2={x(hp.day)} y1={M.t - 6} y2={M.t + plotH} stroke="var(--ink)" strokeOpacity="0.35" />
            <circle cx={x(hp.day)} cy={y(hp.balance)} r="4.5" fill="var(--accent)" stroke="var(--canvas)" strokeWidth="2" />
          </g>
        )}
        <rect x={M.l} y={M.t - 8} width={plotW} height={plotH + 8} fill="transparent" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} style={{ touchAction: 'pan-y' }} />
      </svg>

      {hp && (
        <div className="pointer-events-none absolute z-10 w-[180px] rounded-xl border border-line bg-card px-3 py-2 font-support text-xs shadow-[0_12px_30px_rgba(0,0,0,0.45)]" style={{ left: tipLeft, top: 2 }}>
          <p className="text-muted">{short(hp.date)}{hp.day === 0 ? ' · Today' : hp.actual ? ' · Actual' : ''}</p>
          <p className="mt-0.5 text-base font-semibold tabular-nums text-ink">{signedMoney(hp.balance)}</p>
          {!hp.actual && hp.day > 0 && <p className="text-muted tabular-nums">Typically {signedMoney(hp.low)} to {signedMoney(hp.high)}</p>}
          {hEvents.map((e) => (
            <p key={e.id} className="mt-1 flex items-center justify-between gap-2 tabular-nums" style={{ color: e.kind === 'income' ? GREEN : RED }}>
              <span className="truncate">{e.name}</span>
              <span>{e.kind === 'income' ? '+' : '-'}{money(e.amount)}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
