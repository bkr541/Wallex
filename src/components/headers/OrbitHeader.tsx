import { BRAND, type HeaderProps } from './shared';

// 3 · Orbit spotlight: the page icon sits in a glowing disc with slow rings and moons around it,
// echoing the Patterns circles.
export default function OrbitHeader({ page }: HeaderProps) {
  const Icon = page.icon;
  return (
    <div
      className="relative min-h-[250px] overflow-hidden rounded-[30px] border border-line"
      style={{ background: `radial-gradient(120% 150% at 88% 50%, rgba(${page.accent}, 0.2), transparent 58%), #0c0f11` }}
    >
      <div className="relative z-10 flex min-h-[250px] flex-col justify-center gap-4 p-8 @xl:max-w-[60%]">
        <h2 className="text-[clamp(2.5rem,6.5cqw,4.5rem)] leading-none font-semibold tracking-tight">{page.name}</h2>
        <p className="max-w-md font-support text-base text-muted">{page.description}</p>
      </div>

      <div className="absolute top-1/2 right-6 hidden h-[270px] w-[270px] -translate-y-1/2 @xl:block">
        <div
          className="header-anim absolute inset-0 rounded-full border border-dashed"
          style={{ borderColor: `rgba(${page.accent}, 0.35)`, animation: 'header-spin 70s linear infinite' }}
        />
        <div
          className="header-anim absolute inset-9 rounded-full border border-white/10"
          style={{ animation: 'header-spin 48s linear infinite reverse' }}
        >
          <span className="absolute -top-1.5 left-1/2 h-3 w-3 rounded-full" style={{ background: `rgb(${page.accent})`, boxShadow: `0 0 14px rgba(${page.accent}, 0.9)` }} />
        </div>
        <div
          className="header-anim absolute inset-[4.5rem] rounded-full border"
          style={{ borderColor: `rgba(${BRAND}, 0.4)`, animation: 'header-spin 30s linear infinite' }}
        >
          <span className="absolute top-1/2 -right-1 h-2 w-2 rounded-full" style={{ background: `rgb(${BRAND})`, boxShadow: `0 0 10px rgba(${BRAND}, 0.9)` }} />
        </div>
        <div
          className="absolute inset-[6.6rem] flex items-center justify-center rounded-full border border-white/15"
          style={{
            background: `radial-gradient(circle at 30% 20%, rgba(${page.accent}, 0.45), rgba(${page.accent}, 0.08) 70%), #12161a`,
            boxShadow: `0 0 50px rgba(${page.accent}, 0.35), inset 0 1px 0 rgba(255,255,255,0.25)`,
          }}
        >
          <Icon className="h-[3.6rem] w-[3.6rem]" />
        </div>
      </div>
    </div>
  );
}
