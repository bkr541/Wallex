import { useId, useState } from 'react';
import { motion } from 'motion/react';
import PlumpIcon, { type PlumpName } from './PlumpIcon';

// The app's text field: no box, a small label above, an icon at the left and a line along the bottom. Click in
// and the icon waves and takes the accent colour while the line draws out from the middle.
export default function UnderlineField({
  label,
  icon,
  hint,
  error,
  trailing,
  className = '',
  onFocus,
  onBlur,
  ...input
}: {
  label: string;
  icon: PlumpName;
  hint?: string;
  error?: string | null;
  trailing?: React.ReactNode; // something at the right end of the line, such as a show/hide button
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className' | 'id'>) {
  const id = useId();
  const [on, setOn] = useState(false);
  return (
    <div className={`w-full ${className}`}>
      <label htmlFor={id} className="mb-1 block font-support text-[10px] font-semibold tracking-[0.2em] text-muted uppercase">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <motion.span
          aria-hidden="true"
          animate={on ? { rotate: [0, -14, 14, -8, 0] } : { rotate: 0 }}
          transition={{ duration: 0.6 }}
          className={`transition-colors duration-200 ${on ? 'text-accent' : 'text-muted'}`}
        >
          <PlumpIcon name={icon} className="h-4 w-4" />
        </motion.span>
        <input
          {...input}
          id={id}
          onFocus={(e) => {
            setOn(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setOn(false);
            onBlur?.(e);
          }}
          className="min-w-0 flex-1 bg-transparent py-2 text-base text-ink outline-none select-text placeholder:text-muted/60"
        />
        {trailing}
      </div>
      <div className={`relative h-px ${error ? 'bg-red-300/60' : 'bg-line'}`}>
        <motion.span
          className="absolute top-[-1px] left-1/2 h-[3px] -translate-x-1/2 rounded-full bg-accent"
          animate={{ width: on ? '100%' : '0%' }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      {(error || hint) && <p className={`mt-1.5 font-support text-xs ${error ? 'text-red-300' : 'text-muted'}`}>{error ?? hint}</p>}
    </div>
  );
}
