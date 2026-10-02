import { useEffect, useRef, useState } from 'react';

const DURATION = 900; // how long the digits spin, in ms
const TICK = 45;

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Shows a number and, whenever it changes, spins its digits like a slot machine and settles them one at
// a time, left to right, on the new value. Anything that is not a digit ($ , . + -) stays put.
export default function SlotNumber({ text, className }: { text: string; className?: string }) {
  const [shown, setShown] = useState(text);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      setShown(text);
      return;
    }
    if (reduced()) {
      setShown(text);
      return;
    }

    const chars = [...text];
    const digits = chars.reduce((n, c) => n + (/\d/.test(c) ? 1 : 0), 0);
    let seen = 0;
    // Each digit locks at its own moment: the leftmost first, the last one at the very end.
    const lockAt = chars.map((c) => (/\d/.test(c) ? 350 + (seen++ / Math.max(1, digits - 1)) * (DURATION - 350) : 0));
    const start = performance.now();
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const elapsed = performance.now() - start;
      if (elapsed >= DURATION) {
        setShown(text);
        return;
      }
      setShown(chars.map((c, i) => (/\d/.test(c) && elapsed < lockAt[i] ? String(Math.floor(Math.random() * 10)) : c)).join(''));
      timer = setTimeout(tick, TICK);
    };
    tick();
    return () => clearTimeout(timer);
  }, [text]);

  return (
    <span className={`tabular-nums ${className ?? ''}`} aria-label={text}>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}
