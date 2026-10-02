import { pad, type HeaderProps } from './shared';

// 5 · Compact status bar: one slim row for dense pages (tables, forms) where tall artwork would
// push the content down. Icon tile, title, live status and a light sweep along the bottom edge.
export default function CompactHeader({ page, index, total }: HeaderProps) {
  const Icon = page.icon;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-card">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-white/10"
          style={{
            background: `linear-gradient(145deg, rgba(${page.accent}, 0.4), rgba(${page.accent}, 0.08))`,
            boxShadow: `0 8px 24px rgba(${page.accent}, 0.25), inset 0 1px 0 rgba(255,255,255,0.2)`,
          }}
        >
          <Icon className="h-9 w-9" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-2xl leading-tight font-semibold tracking-tight">{page.name}</h2>
          <p className="truncate font-support text-sm text-muted">{page.description}</p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 font-support text-xs text-muted">
            <span
              className="header-anim h-2 w-2 rounded-full"
              style={{ background: `rgb(${page.accent})`, animation: 'header-pulse 2.2s ease-in-out infinite' }}
            />
            Synced just now
          </span>
          <span className="rounded-full border border-line px-3 py-1.5 font-support text-xs text-muted tabular-nums">
            {pad(index)} / {pad(total)}
          </span>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden bg-white/[0.04]">
        <div
          className="header-anim h-full w-1/2"
          style={{
            background: `linear-gradient(90deg, transparent, rgb(${page.accent}), transparent)`,
            animation: 'header-sweep 3.2s ease-in-out infinite',
          }}
        />
      </div>
    </div>
  );
}
