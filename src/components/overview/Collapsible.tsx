import { AnimatePresence, motion } from 'motion/react';
import { Minus, Plus } from 'lucide-react';
import PlumpIcon, { type PlumpName } from '../PlumpIcon';

// A section of the Overview that can be folded away. Closed it is a single row: a plus box, the title and a
// rule running out to "Show"; open the box becomes a minus and it shows an optional description and controls
// (a range picker, a link), then the content.
export default function Collapsible({
  title,
  icon,
  subtitle,
  aside,
  open,
  onToggle,
  className = '',
  children,
}: {
  title: string;
  icon: PlumpName;
  subtitle?: React.ReactNode;
  aside?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`py-1 ${className}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="group flex w-full cursor-pointer items-center gap-3 py-3 text-left"
      >
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-ink/40 text-ink transition-colors group-hover:border-ink"
        >
          {open ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </motion.span>
        <PlumpIcon name={icon} className="h-6 w-6 shrink-0 text-muted" />
        <span className="text-lg font-semibold tracking-tight">{title}</span>
        <span className="h-px min-w-3 flex-1 bg-line" />
        <span className="font-support text-xs text-muted transition-colors group-hover:text-ink">{open ? 'Hide' : 'Show'}</span>
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
            <div className="pt-2 pb-8">
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
