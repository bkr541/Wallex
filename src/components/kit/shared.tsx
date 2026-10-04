import { AnimatePresence, motion } from 'motion/react';

// One row of the components kit: a component the app uses, shown three differently styled ways.
export interface KitRow {
  name: string;
  used: string; // where in the app it appears
  items: [caption: string, node: React.ReactNode][];
}

export const spring = { type: 'spring', stiffness: 420, damping: 32 } as const;
export const ease = [0.22, 1, 0.36, 1] as const;

export const sample = {
  months: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
  moneyIn: [4200, 4500, 4800, 4300, 5100, 4800],
  moneyOut: [3900, 4700, 3600, 4400, 3800, 3120],
};

export const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

// A body that folds open and shut.
export function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease }} className="overflow-hidden">
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
