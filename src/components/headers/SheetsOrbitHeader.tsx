import { BRAND, type HeaderProps } from './shared';

// 9 · Sheets and orbit: the title is right-aligned on the front of a stack of tilted sheets, with
// the page icon circling in its own orbit on the open left side.
export default function SheetsOrbitHeader({ page }: HeaderProps) {
  const Icon = page.icon;
  return (
    <div className="relative min-h-[270px] overflow-hidden rounded-[28px] border border-line bg-[#0e1114]">
      <div className="absolute top-1/2 left-8 hidden h-[200px] w-[200px] -translate-y-1/2 @2xl:block" aria-hidden="true">
        <div
          className="header-anim absolute inset-0 rounded-full border border-dashed"
          style={{ borderColor: `rgba(${page.accent}, 0.4)`, animation: 'header-spin 60s linear infinite' }}
        >
          <span className="absolute -top-1.5 left-1/2 h-3 w-3 rounded-full" style={{ background: `rgb(${page.accent})`, boxShadow: `0 0 14px rgba(${page.accent}, 0.9)` }} />
        </div>
        <div
          className="header-anim absolute inset-7 rounded-full border"
          style={{ borderColor: `rgba(${BRAND}, 0.4)`, animation: 'header-spin 36s linear infinite reverse' }}
        >
          <span className="absolute top-1/2 -right-1 h-2 w-2 rounded-full" style={{ background: `rgb(${BRAND})`, boxShadow: `0 0 10px rgba(${BRAND}, 0.9)` }} />
        </div>
        <div
          className="absolute inset-[3.4rem] flex items-center justify-center rounded-full border border-white/15"
          style={{
            background: `radial-gradient(circle at 30% 20%, rgba(${page.accent}, 0.45), rgba(${page.accent}, 0.08) 70%), #12161a`,
            boxShadow: `0 0 40px rgba(${page.accent}, 0.3)`,
          }}
        >
          <Icon className="h-11 w-11" />
        </div>
      </div>

      <div className="absolute inset-y-0 right-0 w-full @2xl:w-[68%]" aria-hidden="true">
        <div
          className="absolute top-12 right-10 bottom-[-30px] left-6 rounded-[30px]"
          style={{ background: `rgba(${BRAND}, 0.22)`, transform: 'rotate(-3deg)' }}
        />
        <div
          className="absolute top-20 right-6 bottom-[-30px] left-16 rounded-[30px]"
          style={{ background: `rgb(${BRAND})`, transform: 'rotate(-3deg)' }}
        />
        <div
          className="absolute top-28 right-[-10px] bottom-[-30px] left-28 rounded-[30px] border border-white/10 shadow-[0_-18px_44px_rgba(0,0,0,0.4)]"
          style={{ background: 'linear-gradient(180deg, #1c2329, #151a1f)', transform: 'rotate(-3deg)' }}
        />
      </div>

      <div className="relative flex min-h-[270px] flex-col items-end justify-end gap-3 p-8 pb-9 text-right">
        <h2 className="text-[clamp(2.75rem,7cqw,5rem)] leading-none font-semibold tracking-tight">{page.name}</h2>
        <p
          className="w-fit max-w-full rounded-2xl px-4 py-2.5 font-support text-base font-medium text-[#0b0e10]"
          style={{ background: `rgb(${page.accent})` }}
        >
          {page.description}
        </p>
      </div>
    </div>
  );
}
