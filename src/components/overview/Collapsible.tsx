import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';

// A section of the Overview that can be folded away. The title row is the button; any controls for the
// section (a range picker, a link) sit on the right and only show while it is open.
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
    <section className={`border-t border-line px-3 pt-6 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="group flex min-w-0 cursor-pointer flex-col items-start text-left"
        >
          <span className="flex items-center gap-2 font-support text-xs font-semibold tracking-[0.18em] text-muted uppercase transition-colors group-hover:text-ink">
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
            {title}
          </span>
          {open && subtitle && <span className="mt-2 pl-6 font-support text-sm font-normal tracking-normal text-muted normal-case">{subtitle}</span>}
        </button>
        {open && aside && <div className="flex flex-wrap items-center gap-x-5 gap-y-2">{aside}</div>}
      </div>

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
            <div className="pt-5 pb-8">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
      {!open && <div className="pb-3" />}
    </section>
  );
}
