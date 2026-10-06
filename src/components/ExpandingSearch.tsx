import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Search, X } from 'lucide-react';

const SIZE = 46;

// A search that is just a round button until you need it: click and it opens into a field, click the cross and
// it closes again, clearing what you typed. Pass width="100%" to open across whatever space the parent gives it.
export default function ExpandingSearch({
  value,
  onChange,
  placeholder,
  width = 240,
  size = SIZE,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  width?: number | '100%';
  size?: number; // the height, and the width while closed
}) {
  // Stays open while there is something typed, so a search can never be hiding behind a closed button.
  const [open, setOpen] = useState(value !== '');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const close = () => {
    onChange('');
    setOpen(false);
  };

  return (
    <motion.div
      initial={false}
      animate={{ width: open ? width : size }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      style={{ height: size }}
      className={`flex max-w-full items-center overflow-hidden rounded-full border bg-surface transition-colors ${open ? 'border-accent' : 'border-line'}`}
    >
      <button
        type="button"
        aria-label={open ? 'Clear and close search' : 'Search'}
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        style={{ height: size, width: size }}
        className="flex shrink-0 cursor-pointer items-center justify-center text-muted transition-colors hover:text-accent"
      >
        {open ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
      </button>
      <input
        ref={input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && close()}
        placeholder={placeholder}
        aria-label={placeholder}
        tabIndex={open ? 0 : -1}
        className="min-w-0 flex-1 bg-transparent pr-4 text-sm outline-none select-text placeholder:text-muted"
      />
    </motion.div>
  );
}
