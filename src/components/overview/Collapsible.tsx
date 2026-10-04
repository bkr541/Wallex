import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';

// A section of the Overview that can be folded away. Closed it is a single row, a title with an arrow at
// the right; open it shows an optional description and controls (a range picker, a link), then the content.
export default function Collapsible({
  title,
  subtitle,
  aside,
  open,
  onToggle,
  className = '',
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  aside?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`border-t border-line ${className}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="group flex w-full cursor-pointer items-center justify-between gap-4 py-5 text-left"
      >
        <span className="font-support text-sm font-semibold tracking-[0.2em] text-ink/90 uppercase">{title}</span>
        <ChevronRight
          className={`h-5 w-5 shrink-0 text-muted transition-transform duration-200 group-hover:text-ink ${open ? 'rotate-90' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-8">
              {(subtitle || aside) && (
                <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                  {subtitle && <p className="font-support text-sm text-muted">{subtitle}</p>}
                  {aside && <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-2">{aside}</div>}
                </div>
              )}
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
