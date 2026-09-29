interface UnderlineTabsProps<T extends string> {
  tabs: readonly { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
  label: string;
  className?: string;
}

// Full-width tab row: a hairline along the bottom, with the active tab's name and its segment of the
// line highlighted in the accent colour. The lines are inset shadows so they still show when the row scrolls.
export default function UnderlineTabs<T extends string>({ tabs, active, onChange, label, className = '' }: UnderlineTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`flex w-full items-stretch gap-1 overflow-x-auto shadow-[inset_0_-1px_0_var(--line-strong)] ${className}`}
    >
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={`h-10 shrink-0 cursor-pointer px-4 text-[13px] font-[540] whitespace-nowrap transition-colors ${
              isActive
                ? 'text-accent shadow-[inset_0_-2px_0_var(--accent)]'
                : 'text-[#85878b] hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
