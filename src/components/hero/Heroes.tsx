import { useEffect, useState } from 'react';
import { AnimatePresence, animate, motion } from 'motion/react';
import { asset } from '../../assets';
import { Cluster } from '../calendar/Variants';
import type { CalEvent } from '../calendar/data';

// Ideas for the left side of the sign-in screen. Each has its own colour, its own animated background and its
// own words. They all sit on a dark base with white text, so they read the same in either theme and with any accent.

const ease = [0.22, 1, 0.36, 1] as const;
const LIGHT = 'color-mix(in srgb, var(--accent) 40%, white)';
const CORAL = '#ff8a96';
const AMBER = '#ffc14d';
const BLUE = '#7db7ff';
const VIOLET = '#b9a2ff';

function Brand() {
  const logo = asset('logos/logo2.png');
  return (
    <div className="flex items-center gap-3">
      {logo && <img src={logo} alt="" className="h-9 w-9 object-contain" draggable={false} />}
      <span className="text-lg font-semibold tracking-tight">Wallex</span>
    </div>
  );
}

// A card-sized stage the same shape as the sign-in screen's left half.
function Stage({ background, children }: { background: string; children: React.ReactNode }) {
  return (
    <div className="relative h-[640px] w-full overflow-hidden rounded-3xl border border-white/10 text-white select-none" style={{ background }}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------------
   1 · Spending bubbles: circles sized by what each habit costs, drifting slowly.
------------------------------------------------------------------------------------------------------ */
const BUBBLES = [
  { x: 63, y: 74, s: 140, c: BLUE, l: 'Rent', a: '$1,250' },
  { x: 27, y: 79, s: 96, c: AMBER, l: 'Groceries', a: '$420' },
  { x: 86, y: 91, s: 74, c: CORAL, l: 'Spotify', a: '$12' },
  { x: 45, y: 92, s: 64, c: LIGHT, l: 'Gas', a: '$96' },
  { x: 12, y: 64, s: 58, c: VIOLET, l: 'Coffee', a: '$64' },
  { x: 90, y: 60, s: 48, c: LIGHT },
  { x: 8, y: 90, s: 46, c: BLUE },
  { x: 70, y: 56, s: 40, c: AMBER },
  { x: 38, y: 62, s: 38, c: CORAL },
];

export function BubblesHero() {
  return (
    <Stage background="radial-gradient(120% 90% at 70% 70%, #2a2552 0%, #14122c 55%, #0b0a1c 100%)">
      <motion.span aria-hidden="true" className="absolute top-[34%] left-[40%] h-[380px] w-[380px] rounded-full blur-3xl" style={{ background: 'color-mix(in srgb, var(--accent) 35%, transparent)' }} animate={{ x: [0, 30, -20, 0], y: [0, -24, 18, 0], scale: [1, 1.12, 0.96, 1] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }} />
      {BUBBLES.map((b, i) => (
        <motion.div
          key={i}
          className="absolute flex flex-col items-center justify-center rounded-full text-center"
          style={{ left: `${b.x}%`, top: `${b.y}%`, width: b.s, height: b.s, marginLeft: -b.s / 2, marginTop: -b.s / 2, border: `2px solid ${b.c}`, background: `radial-gradient(circle at 30% 20%, color-mix(in srgb, ${b.c} 38%, transparent), color-mix(in srgb, ${b.c} 8%, transparent) 70%)`, boxShadow: `0 0 34px color-mix(in srgb, ${b.c} 25%, transparent)` }}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1, y: [0, -14 - (i % 3) * 5, 0], x: [0, 8 - (i % 4) * 4, 0] }}
          transition={{ opacity: { duration: 0.6, delay: i * 0.12 }, scale: { type: 'spring', stiffness: 200, damping: 14, delay: i * 0.12 }, y: { duration: 6 + (i % 4) * 1.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }, x: { duration: 8 + (i % 3) * 2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 } }}
        >
          {b.l && (
            <>
              <span className="text-xs font-medium text-white/80">{b.l}</span>
              <span className="text-base leading-tight font-semibold tabular-nums">{b.a}</span>
            </>
          )}
        </motion.div>
      ))}
      <div className="relative flex h-full flex-col p-10">
        <Brand />
        <div className="mt-12">
          <h2 className="max-w-[12ch] text-[3.2rem] leading-[1.02] font-medium tracking-tight normal-case">
            Every dollar has a{' '}
            <span className="bg-[linear-gradient(transparent_64%,color-mix(in_srgb,var(--accent)_55%,transparent)_64%)]">habit.</span>
          </h2>
          <p className="mt-4 max-w-xs font-support text-base leading-relaxed text-white/70">
            Wallex sorts your spending into the routines that repeat, and shows which ones are growing.
          </p>
        </div>
      </div>
    </Stage>
  );
}

/* ------------------------------------------------------------------------------------------------------
   2 · Receipt stream: charges scroll past, and the ones that repeat are picked out.
------------------------------------------------------------------------------------------------------ */
const CHARGES = [
  { n: 'Netflix', a: '$15.49', c: '#e5575f', again: true },
  { n: 'Publix', a: '$88.00', c: '#4f9a54' },
  { n: 'Spotify', a: '$11.99', c: '#3fbf72', again: true },
  { n: 'Shell', a: '$52.18', c: '#d9a21b' },
  { n: 'Planet Fitness', a: '$24.99', c: '#9a6bff', again: true },
  { n: 'Uber', a: '$21.40', c: '#8a8f98' },
  { n: 'Adobe', a: '$54.99', c: '#e0453a', again: true },
  { n: 'Target', a: '$47.26', c: '#d1453b' },
  { n: 'iCloud', a: '$2.99', c: '#5aaaff', again: true },
  { n: 'Chipotle', a: '$12.85', c: '#a6542a' },
];

export function StreamHero() {
  const rows = (key: string) =>
    CHARGES.map((c) => (
      <div key={key + c.n} className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: c.c }}>{c.n.slice(0, 2).toUpperCase()}</span>
        <span className="min-w-0 flex-1 text-[15px] font-medium">{c.n}</span>
        {c.again && <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-[#1a0a0c]" style={{ background: CORAL }}>Every month</span>}
        <span className="w-16 text-right text-[15px] font-semibold tabular-nums">{c.a}</span>
      </div>
    ));
  return (
    <Stage background="linear-gradient(170deg, #1d1f26 0%, #0c0d11 100%)">
      <div
        className="absolute -top-6 right-[10px] h-[430px] w-[420px] overflow-hidden"
        style={{ transform: 'rotate(-5deg)', maskImage: 'linear-gradient(to bottom, transparent, #000 22%, #000 70%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 22%, #000 70%, transparent)' }}
      >
        <motion.div className="rounded-2xl border border-white/10 bg-white/[0.04]" animate={{ y: ['0%', '-50%'] }} transition={{ duration: 16, ease: 'linear', repeat: Infinity }}>
          {rows('a')}
          {rows('b')}
        </motion.div>
      </div>
      <div className="relative flex h-full flex-col justify-between p-10">
        <Brand />
        <div>
          <h2 className="max-w-[13ch] text-[2.8rem] leading-[1.04] font-semibold tracking-tight normal-case">
            Spot the charges <span style={{ color: CORAL }}>you forgot.</span>
          </h2>
          <p className="mt-4 max-w-sm font-support text-base leading-relaxed text-white/70">
            Wallex picks out every charge that repeats, so a subscription can&rsquo;t hide in the noise.
          </p>
        </div>
      </div>
    </Stage>
  );
}

/* ------------------------------------------------------------------------------------------------------
   3 · App showcase: the receipt-stream tape, but it plays through the app's own screens one after another.
------------------------------------------------------------------------------------------------------ */
const rowsOf = (key: string) =>
  CHARGES.map((c) => (
    <div key={key + c.n} className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: c.c }}>{c.n.slice(0, 2).toUpperCase()}</span>
      <span className="min-w-0 flex-1 text-[15px] font-medium">{c.n}</span>
      {c.again && <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-[#1a0a0c]" style={{ background: CORAL }}>Every month</span>}
      <span className="w-16 text-right text-[15px] font-semibold tabular-nums">{c.a}</span>
    </div>
  ));

// Transactions: the same scrolling tape as above.
function ShowTransactions() {
  return (
    <div className="h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
      <motion.div animate={{ y: ['0%', '-50%'] }} transition={{ duration: 16, ease: 'linear', repeat: Infinity }}>
        {rowsOf('a')}
        {rowsOf('b')}
      </motion.div>
    </div>
  );
}

// Patterns: the spending circles around the monthly income.
const ORBS = [
  { x: 322, y: 292, s: 104, c: BLUE, l: 'Rent', a: '$1,250' },
  { x: 92, y: 160, s: 88, c: AMBER, l: 'Groceries', a: '$420' },
  { x: 338, y: 108, s: 66, c: CORAL, l: 'Spotify', a: '$12' },
  { x: 98, y: 306, s: 70, c: LIGHT, l: 'Gas', a: '$96' },
  { x: 214, y: 378, s: 58, c: VIOLET, l: 'Coffee', a: '$64' },
  { x: 208, y: 56, s: 42, c: BLUE },
];
function ShowPatterns() {
  return (
    <div className="relative h-full w-full">
      <motion.div className="absolute flex flex-col items-center justify-center rounded-full border-2 text-center" style={{ left: 210 - 78, top: 215 - 78, width: 156, height: 156, borderColor: 'color-mix(in srgb, var(--accent) 60%, transparent)', background: 'color-mix(in srgb, var(--accent) 14%, rgba(255,255,255,0.03))' }} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 180, damping: 16 }}>
        <span className="font-support text-[11px] text-white/60">Monthly Income</span>
        <span className="text-2xl font-semibold tabular-nums">$6,322</span>
        <span className="font-support text-[11px]" style={{ color: LIGHT }}>57% spent</span>
      </motion.div>
      {ORBS.map((b, i) => (
        <motion.div key={i} className="absolute flex flex-col items-center justify-center rounded-full text-center" style={{ left: b.x - b.s / 2, top: b.y - b.s / 2, width: b.s, height: b.s, border: `2px solid ${b.c}`, background: `radial-gradient(circle at 30% 20%, color-mix(in srgb, ${b.c} 36%, transparent), color-mix(in srgb, ${b.c} 7%, transparent) 70%)` }} initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }} transition={{ opacity: { delay: 0.2 + i * 0.1 }, scale: { type: 'spring', stiffness: 200, damping: 14, delay: 0.2 + i * 0.1 }, y: { duration: 5 + i * 0.7, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 } }}>
          {b.l && (<><span className="text-[11px] font-medium text-white/80">{b.l}</span><span className="text-sm leading-tight font-semibold tabular-nums">{b.a}</span></>)}
        </motion.div>
      ))}
    </div>
  );
}

// Schedule: the calendar tab's first style. Each merchant's round logo takes the place of the day number, and drops onto
// the days a payment is due. One payment shows one logo, two overlap, and more show the first with a "+N" circle.
const day = (d: number, id: string, name: string): CalEvent => ({ id, name, logos: [], amount: 0, date: `2026-10-${String(d).padStart(2, '0')}`, paid: false, approx: false });
const DUE_ON: Record<number, CalEvent[]> = {
  3: [day(3, 'a', 'Rent')],
  9: [day(9, 'b', 'Verizon')],
  16: [day(16, 'c', 'Spotify'), day(16, 'd', 'Netflix')],
  22: [day(22, 'e', 'Georgia Power'), day(22, 'f', 'Planet Fitness'), day(22, 'g', 'iCloud')],
  27: [day(27, 'h', 'Comcast')],
};
// The same dark colours whatever the app's theme, since the hero is always a dark panel.
const DARK_VARS = { '--text': '#f5f5f4', '--surface': '#2a2b31', '--line': 'rgba(255,255,255,0.14)', '--canvas': '#16171c', '--card': '#1d1f26' } as React.CSSProperties;
const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function ShowCalendar() {
  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 pt-4 pb-3" style={DARK_VARS}>
      <div className="flex items-baseline justify-between px-2">
        <span className="text-2xl font-semibold tracking-tight">October</span>
        <span className="font-support text-xs text-white/50">{Object.keys(DUE_ON).length} days with payments</span>
      </div>
      <div className="mt-3 grid grid-cols-7 text-center font-support text-[10px] text-white/50">
        {WEEK.map((w) => <span key={w} className="py-1.5">{w}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: 35 }, (_, i) => {
          const d = i + 1;
          const list = DUE_ON[d];
          return (
            <div key={i} className="flex h-[46px] items-center justify-center">
              {list ? (
                <motion.span initial={{ opacity: 0, y: -44, scale: 0.6 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.4 + Object.keys(DUE_ON).indexOf(String(d)) * 0.55 }}>
                  <Cluster list={list} size={40} ring="#16171c" />
                </motion.span>
              ) : (
                <span className={`font-support text-sm tabular-nums ${d === 12 ? 'flex h-8 w-8 items-center justify-center rounded-full bg-white font-semibold text-[#16171c]' : 'text-white/60'}`}>{d <= 31 ? d : ''}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Overview: money in against money out as one bar, with the cash below it.
function ShowPosition() {
  const share = 4800 / (4800 + 3120);
  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="grid grid-cols-3 gap-2">
        {[['Money In', '$4,800', '#fff'], ['Money Out', '$3,120', '#fff'], ['Net', '+$1,680', LIGHT]].map(([l, v, c]) => (
          <div key={l}><p className="font-support text-[11px] text-white/60">{l}</p><p className="text-xl font-semibold tabular-nums" style={{ color: c }}>{v}</p></div>
        ))}
      </div>
      <div className="relative mt-5 h-3 rounded-full bg-white/10">
        <motion.span className="absolute inset-y-0 left-0 rounded-full" style={{ background: `linear-gradient(90deg, color-mix(in srgb, var(--accent) 55%, transparent), ${LIGHT})` }} initial={{ width: 0 }} animate={{ width: `${share * 100}%` }} transition={{ duration: 1.1, ease }} />
        <motion.span className="absolute inset-y-0 right-0 rounded-full" style={{ background: `linear-gradient(90deg, ${CORAL}, rgba(255,138,150,0.15))` }} initial={{ width: 0 }} animate={{ width: `${(1 - share) * 100}%` }} transition={{ duration: 1.1, ease }} />
        <motion.span className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#0c0d11]" initial={{ left: '0%' }} animate={{ left: `${share * 100}%` }} transition={{ duration: 1.1, ease }}><span className="absolute inset-[5px] rounded-full" style={{ background: LIGHT }} /></motion.span>
      </div>
      <div className="mt-7 text-center">
        <p className="font-support text-[11px] font-semibold tracking-[0.2em] text-white/60 uppercase">Cash available</p>
        <p className="mt-1 text-5xl leading-none font-semibold tabular-nums"><span style={{ color: LIGHT }}>$</span>5,240.18</p>
        <p className="mt-2 font-support text-sm text-white/60">In Chase</p>
      </div>
    </div>
  );
}

// Overview: the cash buffer gauge.
function ShowGauge() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const c = animate(0, 3884, { duration: 1.4, delay: 0.4, ease: 'easeOut', onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, []);
  const arc = Math.PI * 52;
  const path = 'M 8 62 A 52 52 0 0 1 112 62';
  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center">
      <div className="relative mx-auto w-[260px]">
        <svg viewBox="0 0 120 70" className="w-full" fill="none">
          <path d={path} stroke="rgba(255,255,255,0.12)" strokeWidth="10" strokeLinecap="round" />
          <motion.path d={path} stroke={LIGHT} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${arc} ${arc}`} initial={{ strokeDashoffset: arc }} animate={{ strokeDashoffset: arc * (1 - 0.74) }} transition={{ duration: 1.4, delay: 0.3, ease }} style={{ filter: 'drop-shadow(0 0 6px color-mix(in srgb, var(--accent) 55%, transparent))' }} />
        </svg>
        <div className="absolute inset-x-0 bottom-0"><p className="text-4xl leading-none font-semibold tabular-nums">${n.toLocaleString('en-US')}</p><p className="mt-1 font-support text-xs text-white/60">74% left</p></div>
      </div>
      <dl className="mt-5 space-y-2 font-support text-sm">
        <div className="flex justify-between"><dt className="text-white/60">Cash available</dt><dd className="tabular-nums">$5,240.18</dd></div>
        <div className="flex justify-between border-t border-white/10 pt-2"><dt className="text-white/60">Expected payments</dt><dd className="tabular-nums">-$1,356.00</dd></div>
      </dl>
    </div>
  );
}

const SHOWCASE = [
  { Scene: ShowTransactions, plain: 'Spot the charges', tint: 'you forgot.', tintColor: CORAL, detail: 'Wallex picks out every charge that repeats, so a subscription can\u2019t hide in the noise.', full: true },
  { Scene: ShowPatterns, plain: 'Every dollar has a', tint: 'habit.', tintColor: LIGHT, detail: 'Your spending sorted into the routines that repeat, sized by what each one costs.' },
  { Scene: ShowCalendar, plain: 'Know what is due,', tint: 'and when.', tintColor: AMBER, detail: 'Bills land on a calendar you can read at a glance, so nothing arrives mid-month as a surprise.' },
  { Scene: ShowPosition, plain: 'What came in,', tint: 'what went out.', tintColor: BLUE, detail: 'One bar sets money in against money out, with your cash right underneath.' },
  { Scene: ShowGauge, plain: 'Know what is left', tint: 'once it is all paid.', tintColor: LIGHT, detail: 'Your cash minus every bill still coming, as one number you can trust.' },
];

export function ShowcaseHero() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % SHOWCASE.length), 5600);
    return () => clearInterval(id);
  }, []);
  const { Scene, plain, tint, tintColor, detail } = SHOWCASE[i];
  return (
    <Stage background="linear-gradient(170deg, #1d1f26 0%, #0c0d11 100%)">
      <div
        className="absolute -top-6 right-[10px] h-[430px] w-[420px] overflow-hidden"
        style={{ transform: 'rotate(-5deg)', maskImage: 'linear-gradient(to bottom, transparent, #000 14%, #000 80%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 14%, #000 80%, transparent)' }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={i} className="absolute inset-0 flex items-center justify-center px-3" initial={{ y: 90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -90, opacity: 0 }} transition={{ duration: 0.5, ease }}>
            <Scene />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="relative flex h-full flex-col justify-between p-10">
        <Brand />
        <div className="min-h-[190px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4, ease }}>
              <h2 className="max-w-[13ch] text-[2.8rem] leading-[1.04] font-semibold tracking-tight normal-case">
                {plain} <span style={{ color: tintColor }}>{tint}</span>
              </h2>
              <p className="mt-4 max-w-sm font-support text-base leading-relaxed text-white/70">{detail}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Stage>
  );
}
