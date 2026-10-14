// A row of range buttons in one pill: the style the forecast uses for 7D / 30D / 60D / 90D. `full` stretches it across the
// width it sits in, with the buttons sharing the space equally.
export default function RangeTabs<T extends string | number>({
  value,
  onChange,
  options,
  label,
  full = false,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
  full?: boolean;
}) {
  return (
    <div role="tablist" aria-label={label} className={`flex min-w-0 gap-1 rounded-xl bg-surface p-1 ${full ? 'w-full' : ''}`}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`cursor-pointer rounded-lg py-1 whitespace-nowrap transition-colors ${full ? 'min-w-0 flex-1 truncate px-0.5 text-[13px]' : 'px-3 text-sm'} ${value === o.value ? 'bg-accent font-semibold text-canvas' : 'text-muted hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
