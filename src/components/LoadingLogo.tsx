import { motion } from 'motion/react';
import { asset } from '../assets';

// Floating loader: the Wallex wallet breathing in the middle of the screen, with a soft glow and a thin
// ring turning slowly around it.
export default function LoadingLogo() {
  const logo = asset('logos/logo2.png');
  return (
    <motion.div
      role="status"
      aria-label="Loading"
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-canvas/85 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="relative flex h-44 w-44 items-center justify-center">
        <motion.span
          aria-hidden="true"
          className="absolute inset-4 rounded-full bg-accent/25 blur-2xl"
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border border-transparent border-t-accent/70 border-r-accent/20"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
        />
        {logo ? (
          <motion.img
            src={logo}
            alt=""
            draggable={false}
            className="relative h-28 w-28 object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)]"
            animate={{ y: [0, -6, 0], scale: [1, 1.04, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        ) : (
          <span className="relative h-3 w-3 animate-pulse rounded-full bg-accent" />
        )}
      </div>
    </motion.div>
  );
}
