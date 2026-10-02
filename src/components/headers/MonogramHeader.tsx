import { BRAND, type HeaderProps } from './shared';

// 7 · Monogram: the page icon laid over a huge soft gradient disc, an accent dash above the title
// and aurora light behind.
export default function MonogramHeader({ page }: HeaderProps) {
  const Icon = page.icon;
  return (
    <div className="relative min-h-[230px] overflow-hidden rounded-[28px] border border-line bg-[#0c0f12]">
      <div className="absolute -top-20 -left-10 h-72 w-72 rounded-full opacity-40 blur-3xl" style={{ background: `rgba(${page.accent}, 0.5)` }} />
      <div className="absolute -right-20 -bottom-24 h-72 w-72 rounded-full opacity-25 blur-3xl" style={{ background: `rgba(${BRAND}, 0.6)` }} />

      <div className="relative flex min-h-[230px] items-center gap-8 px-8 py-6">
        <div className="relative hidden h-[190px] w-[230px] shrink-0 @md:block" aria-hidden="true">
          <span
            className="absolute top-1/2 left-0 h-[190px] w-[190px] -translate-y-1/2 rounded-full"
            style={{ background: `linear-gradient(180deg, rgba(${page.accent}, 0.5), rgba(${page.accent}, 0.03) 92%)` }}
          />
          <span
            className="absolute top-1/2 left-[86px] h-[132px] w-[132px] -translate-y-1/2 rounded-full border"
            style={{ borderColor: `rgba(${page.accent}, 0.25)` }}
          />
          <Icon className="absolute top-1/2 left-[34px] h-28 w-28 -translate-y-1/2 drop-shadow-[0_14px_28px_rgba(0,0,0,0.55)]" />
        </div>

        <div className="min-w-0 flex-1">
          <span className="block h-1.5 w-14 rounded-full" style={{ background: `rgb(${BRAND})`, boxShadow: `0 0 14px rgba(${BRAND}, 0.6)` }} />
          <h2 className="mt-5 text-[clamp(2.5rem,6.5cqw,4.5rem)] leading-none font-semibold tracking-tight">{page.name}</h2>
          <p className="mt-3 max-w-md font-support text-base text-muted">{page.description}</p>
        </div>
      </div>
    </div>
  );
}
