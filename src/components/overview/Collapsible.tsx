import { AnimatePresence, motion } from 'motion/react';
import { Minus, Plus } from 'lucide-react';
import PlumpIcon, { type PlumpName } from '../PlumpIcon';

// A section of the Overview that can be folded away. Closed it is a single row: the group's icon with a plus box over its
// corner, the title and a rule running out to the right; open the box becomes a minus and it shows an optional description and controls
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
        className="group flex w-full cursor-pointer items-center gap-4 py-3 text-left"
      >
        {/* The group's icon, with the plus / minus tucked over its bottom-right corner on a solid patch so the icon's lines
            do not run through it. */}
        <span className="relative shrink-0">
          <PlumpIcon name={icon} className="h-6 w-6 text-accent" />
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            className="absolute -right-1.5 -bottom-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border border-ink/50 bg-canvas text-ink transition-colors group-hover:border-ink"
          >
            {open ? <Minus className="h-2.5 w-2.5" strokeWidth={3} /> : <Plus className="h-2.5 w-2.5" strokeWidth={3} />}
          </motion.span>
        </span>
        <span className="text-lg font-semibold tracking-tight capitalize">{title}</span>
        <span className="h-px min-w-3 flex-1 bg-line" />
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
