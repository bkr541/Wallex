import { useEffect, useState } from 'react';
import { AnimatePresence, animate, motion } from 'motion/react';

// The brand panel's three promises, played one at a time as small animations in the same style as the launch screen
// (thin lines, pinging dots, dashed arcs), with each promise written across the picture.

const ease = [0.22, 1, 0.36, 1] as const;
const SCENE_MS = 4800;
const LIGHT = 'color-mix(in srgb, var(--accent) 40%, white)'; // the accent, lifted to read on the dark panel
const CORAL = '#ff8a96';
const GRID = 'rgba(255,255,255,0.12)';
const MUTED = 'rgba(255,255,255,0.55)';

const W = 520;
const H = 300;

/* 1 · Bills land on a timeline, one after another, each with its amount. */
const BILLS = [
  { x: 70, name: 'Rent', amount: '$1,250', date: 'Oct 31' },
  { x: 195, name: 'Phone', amount: '$84', date: 'Nov 3' },
  { x: 320, name: 'Spotify', amount: '$12', date: 'Nov 8' },
  { x: 445, name: 'Power', amount: '$96', date: 'Nov 14' },
];

function Bills() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" fill="none" aria-hidden="true">
      {[112, 196, 226].map((y) => (
        <line key={y} x1="0" x2={W} y1={y} y2={y} stroke={GRID} strokeDasharray="3 6" />
      ))}
      <motion.line x1="24" x2={W - 24} y1="258" y2="258" stroke={MUTED} strokeWidth="1.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: 'easeInOut' }} />
      {BILLS.map((b, i) => {
        const d = 0.4 + i * 0.6;
        return (
          <g key={b.name}>
            <motion.g initial={{ opacity: 0, y: -34 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 16, delay: d }}>
              <line x1={b.x} x2={b.x} y1="184" y2="254" stroke={CORAL} strokeOpacity="0.55" strokeDasharray="2 4" />
              <circle cx={b.x} cy="176" r="7" fill={CORAL} />
              <text x={b.x} y="152" textAnchor="middle" fontSize="18" fontWeight="700" fill="#fff">{b.amount}</text>
              <text x={b.x} y="128" textAnchor="middle" fontSize="11" fill={MUTED}>{b.name}</text>
            </motion.g>
            <motion.circle cx={b.x} cy="258" r="4.5" fill={LIGHT} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 360, damping: 14, delay: d + 0.35 }} style={{ transformOrigin: `${b.x}px 258px` }} />
            <motion.circle cx={b.x} cy="258" r="4.5" stroke={LIGHT} initial={{ opacity: 0, scale: 1 }} animate={{ opacity: [0, 0.8, 0], scale: [1, 1, 3.2] }} transition={{ delay: d + 0.4, duration: 0.8, times: [0, 0.01, 1], ease: 'easeOut' }} style={{ transformOrigin: `${b.x}px 258px` }} />
            <motion.text x={b.x} y="280" textAnchor="middle" fontSize="11" fill={MUTED} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: d + 0.4 }}>{b.date}</motion.text>
          </g>
        );
      })}
    </svg>
  );
}

/* 2 · The same charge, again and again: dots along a timeline with dashed arcs hopping between them. */
const MONTHS = [
  { x: 60, m: 'Jun' },
  { x: 160, m: 'Jul' },
  { x: 260, m: 'Aug' },
  { x: 360, m: 'Sep' },
  { x: 460, m: 'Oct' },
];

function Subscriptions() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" fill="none" aria-hidden="true">
      {[112, 196, 226].map((y) => (
        <line key={y} x1="0" x2={W} y1={y} y2={y} stroke={GRID} strokeDasharray="3 6" />
      ))}
      <line x1="24" x2={W - 24} y1="244" y2="244" stroke={MUTED} strokeOpacity="0.6" />
      {MONTHS.slice(0, -1).map((p, i) => (
        <motion.path
          key={p.m}
          d={`M${p.x} 238 Q${(p.x + MONTHS[i + 1].x) / 2} 150 ${MONTHS[i + 1].x} 238`}
          stroke={LIGHT}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="1 7"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.5 + i * 0.5, duration: 0.5, ease: 'easeInOut' }}
        />
      ))}
      {MONTHS.map((p, i) => (
        <g key={p.m}>
          <motion.circle cx={p.x} cy="244" r="7" fill={LIGHT} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 360, damping: 14, delay: i * 0.5 }} style={{ transformOrigin: `${p.x}px 244px` }} />
          <motion.circle cx={p.x} cy="244" r="7" stroke={LIGHT} initial={{ opacity: 0, scale: 1 }} animate={{ opacity: [0, 0.8, 0], scale: [1, 1, 3] }} transition={{ delay: i * 0.5 + 0.1, duration: 0.8, times: [0, 0.01, 1], ease: 'easeOut' }} style={{ transformOrigin: `${p.x}px 244px` }} />
          <text x={p.x} y="272" textAnchor="middle" fontSize="11" fill={MUTED}>{p.m}</text>
        </g>
      ))}
      <motion.g initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 2.5 }} style={{ transformOrigin: '260px 140px' }}>
        <rect x="170" y="124" width="180" height="32" rx="16" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.28)" />
        <text x="260" y="145" textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff">$11.99 every month</text>
      </motion.g>
    </svg>
  );
}

/* 3 · A bar of cash; the bills slide in at the end and take their share, and what is left is counted up. */
const BAR = { x: 24, w: 472, y: 226, h: 26 };
const LEFT_SHARE = 0.74;

function Left() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const c = animate(0, 3884, { duration: 1.1, delay: 1.6, ease: 'easeOut', onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, []);
  const keep = BAR.w * LEFT_SHARE;
  const bills = [0.12, 0.08, 0.06];
  let at = BAR.x + keep + 2;
  const mid = BAR.x + keep / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" fill="none" aria-hidden="true">
      {[112, 204].map((y) => (
        <line key={y} x1="0" x2={W} y1={y} y2={y} stroke={GRID} strokeDasharray="3 6" />
      ))}
      <rect x={BAR.x} y={BAR.y} width={BAR.w} height={BAR.h} rx="13" fill="rgba(255,255,255,0.1)" />
      <motion.rect x={BAR.x} y={BAR.y} height={BAR.h} rx="13" fill={LIGHT} initial={{ width: 0 }} animate={{ width: [0, BAR.w, keep] }} transition={{ duration: 2, times: [0, 0.4, 1], ease: 'easeInOut' }} style={{ filter: 'drop-shadow(0 0 8px color-mix(in srgb, var(--accent) 55%, transparent))' }} />
      {bills.map((share, i) => {
        const w = BAR.w * share - 2;
        const x = at;
        at += w + 2;
        return (
          <motion.rect key={i} x={x} y={BAR.y} width={w} height={BAR.h} rx="6" fill={CORAL} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 240, damping: 20, delay: 0.7 + i * 0.25 }} />
        );
      })}
      <motion.text x={BAR.x + 4} y="214" fontSize="11" fill={MUTED} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>Your cash</motion.text>
      <motion.text x={BAR.x + BAR.w} y="214" textAnchor="end" fontSize="11" fill={CORAL} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>Bills ahead</motion.text>
      <motion.g initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5, duration: 0.5, ease }}>
        <text x={mid} y="162" textAnchor="middle" fontSize="38" fontWeight="700" fill="#fff">${n.toLocaleString('en-US')}</text>
        <text x={mid} y="182" textAnchor="middle" fontSize="12" fill={MUTED}>left</text>
        <line x1={mid} x2={mid} y1="190" y2={BAR.y - 6} stroke={LIGHT} strokeOpacity="0.6" strokeDasharray="2 3" />
      </motion.g>
    </svg>
  );
}

const SCENES = [
  { text: 'See upcoming bills before they hit', Art: Bills },
  { text: 'Find subscriptions you forgot about', Art: Subscriptions },
  { text: 'Know what is left once everything is paid', Art: Left },
];

export default function BrandStage() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % SCENES.length), SCENE_MS);
    return () => clearInterval(id);
  }, []);
  const { text, Art } = SCENES[i];

  return (
    <div
      className="relative h-[300px] w-full overflow-hidden rounded-3xl border border-white/12 bg-black/20"
      role="img"
      aria-label="Wallex shows upcoming bills, finds forgotten subscriptions and tells you what is left once everything is paid."
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} className="absolute inset-0">
          <Art />
          {/* The promise is written across the top of the picture. */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease }}
            className="absolute top-6 left-7 max-w-[19ch] text-[1.65rem] leading-[1.15] font-semibold tracking-tight text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.4)]"
          >
            {text}
          </motion.p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
