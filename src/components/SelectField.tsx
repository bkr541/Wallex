import { ChevronDown } from 'lucide-react';

interface SelectFieldProps {
  label: string;
  value: string;
  options: readonly string[];
  placeholder: string;
  onChange: (value: string) => void;
}

// Dropdown for choosing one option from a fixed list.
export default function SelectField({ label, value, options, placeholder, onChange }: SelectFieldProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={`h-10 w-full cursor-pointer appearance-none rounded-[11px] border border-line-strong bg-[#222326] pr-10 pl-3.5 text-[13px] outline-none transition focus:border-accent/55 focus:bg-[#25272a] focus:shadow-[0_0_0_3px_rgba(92,230,209,0.08)] ${
          value ? 'text-ink' : 'text-[#6f7175]'
        }`}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o} value={o} className="text-ink">
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-ink-3" strokeWidth={1.8} />
    </div>
  );
}
