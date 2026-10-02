import { BRAND, pad, type HeaderProps } from './shared';

// 7 · Monogram: a huge gradient numeral with the page icon laid over it, an accent dash above the
// title, aurora light behind and the editorial progress strip on the right.
export default function MonogramHeader({ page, index, total }: HeaderProps) {
  const Icon = page.icon;
  return (
    <div className="relative min-h-[230px] overflow-hidden rounded-[28px] border border-line bg-[#0c0f12]">
      <div className="absolute -top-20 -left-10 h-72 w-72 rounded-full opacity-40 blur-3xl" style={{ background: `rgba(${page.accent}, 0.5)` }} />
      <div className="absolute -right-20 -bottom-24 h-72 w-72 rounded-full opacity-25 blur-3xl" style={{ background: `rgba(${BRAND}, 0.6)` }} />

      <div className="relative flex min-h-[230px] items-center gap-8 px-8 py-6">
        <div className="relative hidden h-[190px] w-[250px] shrink-0 @md:block" aria-hidden="true">
          <span
            className="absolute inset-0 flex items-center text-[12.5rem] leading-none font-extrabold select-none"
            style={{
              letterSpacing: '-0.06em',
              backgroundImage: `linear-gradient(180deg, rgba(${page.accent}, 0.5), rgba(${page.accent}, 0.03) 90%)`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {pad(index)}
          </span>
          <Icon className="absolute bottom-0 left-0 h-28 w-28 opacity-90 drop-shadow-[0_14px_28px_rgba(0,0,0,0.55)]" />
        </div>

        <div className="min-w-0 flex-1">
          <span className="block h-1.5 w-14 rounded-full" style={{ background: `rgb(${BRAND})`, boxShadow: `0 0 14px rgba(${BRAND}, 0.6)` }} />
          <h2 className="mt-5 text-[clamp(2.5rem,6.5cqw,4.5rem)] leading-none font-semibold tracking-tight">{page.name}</h2>
          <p className="mt-3 max-w-md font-support text-base text-muted">{page.description}</p>
        </div>

        <div className="hidden shrink-0 flex-col items-end gap-2 @2xl:flex">
          <div className="flex gap-1.5">
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className="h-[3px] w-6 rounded-full"
                style={{ background: i + 1 === index ? `rgb(${page.accent})` : 'rgba(255,255,255,0.12)' }}
              />
            ))}
          </div>
          <span className="font-support text-[11px] tracking-[0.22em] text-muted uppercase">
            {pad(index)} / {pad(total)}
          </span>
        </div>
      </div>
    </div>
  );
}
