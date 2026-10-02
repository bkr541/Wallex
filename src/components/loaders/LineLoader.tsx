import { useEffect, useState } from 'react';
import { AnimatePresence, animate, motion } from 'motion/react';

// Every scene's timings are multiplied by K; lower is faster.
const K = 0.65;
const STAGE_MS = 2500;
const MIN_SCENE_MS = 1500; // the first scene always gets this long, even when the data is already there
const HOLD_MS = 900;

interface LoaderProps {
  balance: number | null;
  onDone?: () => void;
}
const TEAL = '#4fb8a5';
const CORAL = '#ff6b7a';
const AMBER = '#ffb000';
const GRID = 'rgba(255,255,255,0.06)';
const ease = [0.22, 1, 0.36, 1] as const;

const LINE = 'M4 78 L36 64 L64 70 L96 44 L126 52 L156 26 L186 36 L216 12';
const AREA = `${LINE} L216 96 L4 96 Z`;

// 1 · A balance line draws itself upward across a faint grid, fills in and lands on a pinging dot.
function Trace() {
  return (
    <svg width="240" height="104" viewBox="0 0 220 100" fill="none" aria-hidden="true" className="overflow-visible">
      {[24, 48, 72].map((y) => (
        <line key={y} x1="0" x2="220" y1={y} y2={y} stroke={GRID} strokeDasharray="3 5" />
      ))}
      <motion.path
        d={AREA}
        fill="rgba(79,184,165,0.12)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.7 * K, duration: 0.6 * K }}
      />
      <motion.path
        d={LINE}
        stroke={TEAL}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: 'drop-shadow(0 0 6px rgba(79,184,165,0.6))' }}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.8 * K, ease: 'easeInOut' }}
      />
      <motion.circle
        cx="216"
        cy="12"
        r="4"
        fill={TEAL}
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.8 * K, duration: 0.3 * K }}
        style={{ transformOrigin: '216px 12px' }}
      />
      <motion.circle
        cx="216"
        cy="12"
        r="4"
        stroke={TEAL}
        initial={{ opacity: 0, scale: 1 }}
        animate={{ opacity: [0, 0.8, 0], scale: [1, 1, 4] }}
        transition={{ delay: 1.85 * K, duration: 0.9 * K, times: [0, 0.01, 1], ease: 'easeOut' }}
        style={{ transformOrigin: '216px 12px' }}
      />
    </svg>
  );
}

// 2 · New transactions drop in from above, one at a time, and the habits among them get tagged.
const ROWS = [
  { color: CORAL, name: 'w-16', amount: 'w-9', habit: true },
  { color: AMBER, name: 'w-24', amount: 'w-11', habit: false },
  { color: '#5aaaff', name: 'w-20', amount: 'w-8', habit: true },
];

function Habits() {
  return (
    <div className="flex w-[230px] flex-col gap-2">
      {ROWS.map((row, i) => (
        <motion.div
          key={i}
          className="flex h-8 items-center gap-2.5 rounded-lg border border-line bg-white/[0.04] px-2.5"
          initial={{ opacity: 0, y: -22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: (i * 0.45) * K }}
        >
          <span className="h-4 w-4 rounded-full" style={{ background: row.color }} />
          <span className={`h-2 rounded-full bg-white/20 ${row.name}`} />
          {row.habit && (
            <motion.span
              className="rounded-full bg-accent px-1.5 py-[1px] font-support text-[9px] leading-3 font-semibold text-canvas"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 14, delay: (1.5 + i * 0.35) * K }}
            >
              habit
            </motion.span>
          )}
          <span className={`ml-auto h-2 rounded-full bg-white/30 ${row.amount}`} />
        </motion.div>
      ))}
    </div>
  );
}

// 3 · Dots appear along a timeline and arcs hop from each one to the next: the same charge, again and again.
const STOPS = [28, 74, 120, 166, 212];

function Recurring() {
  return (
    <svg width="240" height="104" viewBox="0 0 240 104" fill="none" aria-hidden="true" className="overflow-visible">
      <line x1="10" x2="230" y1="70" y2="70" stroke={GRID} />
      {STOPS.slice(0, -1).map((x, i) => (
        <motion.path
          key={x}
          d={`M${x} 66 Q${(x + STOPS[i + 1]) / 2} 22 ${STOPS[i + 1]} 66`}
          stroke={TEAL}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="1 6"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: (0.5 + i * 0.5) * K, duration: 0.5 * K, ease: 'easeInOut' }}
        />
      ))}
      {STOPS.map((x, i) => (
        <g key={x}>
          <motion.circle
            cx={x}
            cy="70"
            r="6"
            fill={TEAL}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 360, damping: 14, delay: (i * 0.5) * K }}
            style={{ transformOrigin: `${x}px 70px` }}
          />
          <motion.circle
            cx={x}
            cy="70"
            r="6"
            stroke={TEAL}
            initial={{ opacity: 0, scale: 1 }}
            animate={{ opacity: [0, 0.8, 0], scale: [1, 1, 2.8] }}
            transition={{ delay: (i * 0.5 + 0.1) * K, duration: 0.8 * K, times: [0, 0.01, 1], ease: 'easeOut' }}
            style={{ transformOrigin: `${x}px 70px` }}
          />
        </g>
      ))}
    </svg>
  );
}

// 4 · A ring chart is built up segment by segment, one colour per area of spending.
const SEGMENTS = [
  { start: 0, len: 0.36, color: TEAL },
  { start: 0.4, len: 0.25, color: CORAL },
  { start: 0.69, len: 0.18, color: AMBER },
  { start: 0.91, len: 0.07, color: '#5aaaff' },
];

function Sorting() {
  return (
    <svg width="240" height="104" viewBox="0 0 240 104" fill="none" aria-hidden="true">
      <circle cx="120" cy="52" r="34" stroke={GRID} strokeWidth="10" />
      {SEGMENTS.map((seg, i) => (
        <g key={i} transform={`rotate(${-90 + seg.start * 360} 120 52)`}>
          <motion.circle
            cx="120"
            cy="52"
            r="34"
            stroke={seg.color}
            strokeWidth="10"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: seg.len }}
            transition={{ delay: (0.15 + i * 0.5) * K, duration: 0.55 * K, ease }}
          />
        </g>
      ))}
    </svg>
  );
}

// 5 · The line carries on as a dashed forecast and payments drop onto it.
const AHEAD_SOLID = 'M4 72 L34 60 L62 66 L100 44';
const AHEAD_DASH = 'M100 44 L132 34 L164 42 L196 24 L226 18';
const DROPS = [
  { x: 132, y: 34 },
  { x: 164, y: 42 },
  { x: 196, y: 24 },
];

function Ahead() {
  return (
    <svg width="240" height="104" viewBox="0 0 240 104" fill="none" aria-hidden="true" className="overflow-visible">
      <defs>
        <clipPath id="ahead-reveal">
          <motion.rect
            x="100"
            y="0"
            height="104"
            initial={{ width: 0 }}
            animate={{ width: 140 }}
            transition={{ delay: 1.1 * K, duration: 1.1 * K, ease: 'easeInOut' }}
          />
        </clipPath>
      </defs>
      {[24, 48, 72].map((y) => (
        <line key={y} x1="0" x2="240" y1={y} y2={y} stroke={GRID} strokeDasharray="3 5" />
      ))}
      <motion.path
        d={AHEAD_SOLID}
        stroke={TEAL}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1 * K, ease: 'easeInOut' }}
      />
      <path d={AHEAD_DASH} stroke={TEAL} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 7" clipPath="url(#ahead-reveal)" />
      {DROPS.map((d, i) => (
        <motion.g
          key={d.x}
          initial={{ opacity: 0, y: -26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15, delay: (1.5 + i * 0.35) * K }}
        >
          <line x1={d.x} x2={d.x} y1={d.y + 6} y2="90" stroke={CORAL} strokeOpacity="0.5" strokeDasharray="2 3" />
          <circle cx={d.x} cy={d.y} r="5" fill={CORAL} />
        </motion.g>
      ))}
    </svg>
  );
}

// 6 · The finale: the figure counts up from nothing and lands on the available balance.
function Balance({ balance, onDone }: LoaderProps) {
  const [value, setValue] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const controls = animate(0, balance ?? 0, {
      duration: 2 * K + 0.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setValue,
      onComplete: () => setDone(true),
    });
    return () => controls.stop();
  }, [balance]);

  // Let the final figure sit for a moment before the loader hands over to the app.
  useEffect(() => {
    if (!done) return;
    const id = setTimeout(() => onDone?.(), HOLD_MS);
    return () => clearTimeout(id);
  }, [done, onDone]);

  return (
    <div className="relative flex items-center justify-center">
      <motion.span
        aria-hidden="true"
        className="absolute inset-x-0 top-1/2 h-14 -translate-y-1/2 rounded-full bg-accent/25 blur-2xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: done ? [0.9, 0.35] : 0 }}
        transition={{ duration: 0.8 }}
      />
      <motion.p
        className="relative text-5xl font-semibold tracking-tight tabular-nums"
        animate={{ scale: done ? [1, 1.06, 1] : 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <span className="text-accent">$</span>
        {value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </motion.p>
    </div>
  );
}

const STAGES: { label: string; Visual: (props: LoaderProps) => React.ReactElement }[] = [
  { label: 'Tracing your balance', Visual: Trace },
  { label: 'Finding spending habits', Visual: Habits },
  { label: 'Spotting recurring bills', Visual: Recurring },
  { label: 'Sorting your spending', Visual: Sorting },
  { label: 'Looking ahead', Visual: Ahead },
  { label: 'Your available balance', Visual: Balance },
];

// Plays five short scenes on a loop, each with its own animation and status line, for as long as the data is
// on its way. Once a balance is passed in it finishes by counting up to it, holds, then calls onDone.
export default function LineLoader({ balance, onDone }: LoaderProps) {
  const [scene, setScene] = useState(0);
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setScene((s) => (s + 1) % (STAGES.length - 1)), STAGE_MS);
    const min = setTimeout(() => setMinElapsed(true), MIN_SCENE_MS);
    return () => {
      clearInterval(id);
      clearTimeout(min);
    };
  }, []);

  const finale = balance !== null && minElapsed;
  const stage = finale ? STAGES.length - 1 : scene;
  const { label, Visual } = STAGES[stage];
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative flex h-[104px] w-[240px] items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Visual balance={balance} onDone={onDone} />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="relative h-5 w-64 text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={stage}
            className="absolute inset-0 font-support text-sm text-muted"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
          >
            {label}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="flex gap-1.5" aria-hidden="true">
        {STAGES.map((_, i) => (
          <span
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${i === stage ? 'w-5 bg-accent' : 'w-1.5 bg-white/15'}`}
          />
        ))}
      </div>
    </div>
  );
}
