import NeonTitle from './NeonTitle';
import { BRAND, pad, type HeaderProps } from './shared';

// 10 · Split block: a solid colour block carries the numeral and icon like a luggage tag, beside a
// dark panel with the neon title, the page's tabs and a light sweep.
export default function SplitBlockHeader({ page, index, total }: HeaderProps) {
  const Icon = page.icon;
  const tabs = page.tabs?.length ? page.tabs : [];
  return (
    <div className="grid overflow-hidden rounded-[28px] border border-line @xl:grid-cols-[250px_1fr]">
      <div
        className="relative flex min-h-[210px] flex-col justify-between overflow-hidden p-6 text-[#0b0e10]"
        style={{ background: `linear-gradient(155deg, rgb(${page.accent}), rgba(${page.accent}, 0.62))` }}
      >
        <span
          aria-hidden="true"
          className="absolute -right-3 -bottom-8 text-[10rem] leading-none font-extrabold select-none"
          style={{ color: 'rgba(11,14,16,0.16)', letterSpacing: '-0.06em' }}
        >
          {pad(index)}
        </span>
        <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0b0e10]/80 shadow-[0_10px_24px_rgba(0,0,0,0.3)]">
          <Icon className="h-9 w-9" />
        </span>
        <span className="relative font-support text-[11px] font-semibold tracking-[0.25em] uppercase">
          Wallex · {pad(index)}/{pad(total)}
        </span>
      </div>

      <div className="relative flex flex-col justify-center gap-3 bg-[#0c0f12] p-8">
        {tabs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <span key={t} className="rounded-full border border-line px-3 py-1 font-support text-xs text-muted">
                {t}
              </span>
            ))}
          </div>
        )}
        <NeonTitle text={page.name} rgb={page.accent} className="text-[clamp(2.5rem,6cqw,4.5rem)] leading-none" />
        <p className="max-w-md font-support text-base text-muted">{page.description}</p>
        <div className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden bg-white/[0.04]">
          <div
            className="header-anim h-full w-1/3"
            style={{
              background: `linear-gradient(90deg, transparent, rgb(${BRAND}), transparent)`,
              animation: 'header-sweep 3.4s ease-in-out infinite',
            }}
          />
        </div>
      </div>
    </div>
  );
}
