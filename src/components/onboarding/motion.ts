import type { Variants } from 'motion/react';

// Everything on a screen hides together when Next is pressed, then the next screen's pieces come in one
// after another.
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
  exit: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
};
export const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 24 } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.15 } },
};
