import { motion } from 'motion/react';
import LineLoader from './loaders/LineLoader';

// The launch screen: Balance Line plays on a loop while the bank data is on its way, then counts up to the
// available balance and calls onDone so the app can take over. With no balance it just waits.
export default function LoadingLogo({ balance, onDone }: { balance: number | null; onDone: () => void }) {
  return (
    <motion.div
      role="status"
      aria-label="Loading"
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-canvas/95 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <LineLoader balance={balance} onDone={onDone} />
    </motion.div>
  );
}
