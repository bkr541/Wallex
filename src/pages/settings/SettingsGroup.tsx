import type { ComponentType, ReactNode } from 'react';

interface SettingsGroupProps {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  children: ReactNode;
}

// Outlined settings group: an icon + title header over an indented body.
export default function SettingsGroup({ id, title, icon: Icon, children }: SettingsGroupProps) {
  return (
    <section aria-labelledby={id} className="w-full overflow-hidden rounded-[15px] border border-line">
      <h2
        id={id}
        className="flex h-14 items-center gap-3 border-b border-line px-4 text-[16px] font-[650] tracking-tight text-ink"
      >
        <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-accent-soft text-accent">
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </span>
        {title}
      </h2>
      <div className="grid gap-5 py-4 pr-4 pl-[60px]">{children}</div>
    </section>
  );
}
