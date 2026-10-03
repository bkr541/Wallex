import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import LineLoader from './loaders/LineLoader';

const FLIGHT_S = 1.3; // the balance travelling to its place on Overview
const VEIL_S = 1.5; // the loading backdrop thinning out, so Overview fades in underneath
const LAND_S = 0.4; // the travelling copy giving way to the real number

interface Flight {
  left: number;
  top: number;
  dx: number;
  dy: number;
  scale: number;
}

const reducedMotion = () =>
  document.documentElement.dataset.reduceMotion === 'true' || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// The launch screen: Balance Line plays on a loop while the bank data is on its way, then counts up to the
// available balance. It does not just close: the balance stays where it is, Overview fades in behind it, and
// the number glides into the "Cash available" spot on Overview before the screen leaves.
export default function LoadingLogo({ balance, onDone }: { balance: number | null; onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const timers = useRef<number[]>([]);
  const [fading, setFading] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [landed, setLanded] = useState(false);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      delete document.documentElement.dataset.handoff;
    },
    [],
  );

  const handOff = useCallback(() => {
    if (started.current) return;
    started.current = true;

    const src = document.querySelector<HTMLElement>('[data-loader-balance]');
    const target = document.querySelector<HTMLElement>('[data-cash-balance]');
    const box = root.current?.getBoundingClientRect();
    const s = src?.getBoundingClientRect();
    const t = target?.getBoundingClientRect();
    const visible = !!(box && t && t.width > 0 && t.top >= box.top && t.bottom <= box.bottom && t.left >= box.left && t.right <= box.right);

    // Nothing to land on (another page, off screen, reduced motion): fade out and leave.
    if (!src || !target || !box || !s || !t || !visible || reducedMotion()) {
      setFading(true);
      later(onDone, reducedMotion() ? 350 : 700);
      return;
    }

    const scale = parseFloat(getComputedStyle(target).fontSize) / parseFloat(getComputedStyle(src).fontSize);
    document.documentElement.dataset.handoff = 'flying';
    setFlight({ left: s.left - box.left, top: s.top - box.top, dx: t.left - s.left, dy: t.top - s.top, scale });
    setFading(true);
    later(() => {
      delete document.documentElement.dataset.handoff;
      setLanded(true);
    }, FLIGHT_S * 1000);
    later(onDone, (FLIGHT_S + LAND_S) * 1000 + 100);
  }, [onDone]);

  return (
    <motion.div
      ref={root}
      role="status"
      aria-label="Loading"
      className="pointer-events-none absolute inset-0 z-30"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className="absolute inset-0 bg-canvas/95 backdrop-blur-sm"
        animate={{ opacity: fading ? 0 : 1 }}
        transition={{ duration: fading ? VEIL_S : 0, ease: 'easeInOut' }}
      />
      <motion.div
        className="relative flex h-full items-center justify-center"
        animate={{ opacity: fading ? 0 : 1 }}
        transition={{ duration: fading ? 0.6 : 0 }}
      >
        <LineLoader balance={balance} onDone={handOff} />
      </motion.div>

      {flight && balance !== null && (
        <motion.p
          aria-hidden="true"
          className="absolute text-5xl font-semibold tracking-tight whitespace-nowrap tabular-nums"
          style={{ left: flight.left, top: flight.top, originX: 0, originY: 0 }}
          initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          animate={{ x: flight.dx, y: flight.dy, scale: flight.scale, opacity: landed ? 0 : 1 }}
          transition={{
            x: { duration: FLIGHT_S, ease: [0.65, 0, 0.25, 1] },
            y: { duration: FLIGHT_S, ease: [0.65, 0, 0.25, 1] },
            scale: { duration: FLIGHT_S, ease: [0.65, 0, 0.25, 1] },
            opacity: { duration: LAND_S },
          }}
        >
          <span className="text-accent">$</span>
          {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </motion.p>
      )}
    </motion.div>
  );
}
