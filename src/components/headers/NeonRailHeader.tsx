import NeonTitle from './NeonTitle';
import { BRAND, type HeaderProps } from './shared';

// 6 · Neon rail: no panel at all. A glowing vertical rail beside a title whose last syllable is
// a neon outline, with the compact bar's live status and light sweep underneath.
export default function NeonRailHeader({ page }: HeaderProps) {
  return (
    <div className="px-2 pt-4 pb-5">
      <div className="flex flex-wrap items-end gap-x-5 gap-y-4">
        <span
          className="w-1.5 self-stretch rounded-full"
          style={{ background: `rgb(${BRAND})`, boxShadow: `0 0 18px rgba(${BRAND}, 0.8)` }}
        />
        <div className="min-w-0 flex-1">
          <NeonTitle text={page.name} rgb={BRAND} className="text-[clamp(2.75rem,7cqw,5rem)] leading-none" />
          <p className="mt-3 font-support text-base text-muted">{page.description}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 font-support text-xs text-muted">
            <span
              className="header-anim h-2 w-2 rounded-full"
              style={{ background: `rgb(${BRAND})`, animation: 'header-pulse 2.2s ease-in-out infinite' }}
            />
            Live
          </span>
        </div>
      </div>

      <div className="relative mt-6 h-px overflow-hidden bg-line">
        <div
          className="header-anim absolute inset-y-0 w-1/3"
          style={{
            background: `linear-gradient(90deg, transparent, rgb(${BRAND}), transparent)`,
            animation: 'header-sweep 3.6s ease-in-out infinite',
          }}
        />
      </div>
    </div>
  );
}
