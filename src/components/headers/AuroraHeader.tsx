import { pad, type HeaderProps } from './shared';
import { BRAND } from './shared';

// Fine film grain, so the soft colour fields don't look like a flat web gradient.
const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

// 1 · Aurora glass: blurred colour fields, grain, and a frosted tile holding the page icon.
export default function AuroraHeader({ page, index }: HeaderProps) {
  const Icon = page.icon;
  return (
    <div className="relative min-h-[250px] overflow-hidden rounded-[32px] border border-white/10 bg-[#0b0e10]">
      <div className="absolute -top-28 -left-16 h-80 w-80 rounded-full opacity-60 blur-3xl" style={{ background: `rgba(${page.accent}, 0.55)` }} />
      <div className="absolute -right-10 -bottom-32 h-96 w-96 rounded-full opacity-45 blur-3xl" style={{ background: `rgba(${BRAND}, 0.6)` }} />
      <div className="absolute top-0 left-1/2 h-64 w-64 rounded-full opacity-30 blur-3xl" style={{ background: 'rgba(168, 130, 255, 0.6)' }} />
      <div className="absolute inset-0 opacity-[0.14] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      <div className="relative flex min-h-[250px] items-end justify-between gap-6 p-8">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 font-support text-xs tracking-wide text-white/70 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: `rgb(${page.accent})` }} />
            Page {pad(index)}
          </span>
          <h2 className="mt-4 text-[clamp(2.75rem,7cqw,5rem)] leading-none font-semibold tracking-tight">{page.name}</h2>
          <p className="mt-4 inline-block max-w-full rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 font-support text-sm text-white/75 backdrop-blur-md">
            {page.description}
          </p>
        </div>

        <div className="relative mr-4 mb-2 hidden shrink-0 @xl:block" style={{ width: 168, height: 168 }}>
          <div
            className="absolute inset-0 rotate-[9deg] rounded-[40px] border border-white/10"
            style={{ background: `linear-gradient(145deg, rgba(${page.accent}, 0.35), rgba(${page.accent}, 0.05))` }}
          />
          <div className="absolute inset-0 -rotate-[7deg] rounded-[40px] border border-white/25 bg-gradient-to-br from-white/20 to-white/[0.03] shadow-[0_24px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl" />
          <div className="absolute inset-0 -rotate-[7deg] rounded-[40px] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]" />
          <Icon className="absolute inset-0 m-auto h-24 w-24 drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)]" />
        </div>
      </div>
    </div>
  );
}
