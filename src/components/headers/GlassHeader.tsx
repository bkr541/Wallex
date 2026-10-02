import Silhouette from './Silhouette';
import { BRAND, type HeaderProps } from './shared';

// 15 · Frosted card: the title and description sit on a pane of frosted glass in front of a big dim page icon,
// a slanted slab and a pool of teal light.
export default function GlassHeader({ page }: HeaderProps) {
  return (
    <div
      className="relative min-h-[240px] overflow-hidden rounded-[28px] border"
      style={{ borderColor: `rgba(${BRAND}, 0.35)`, background: 'linear-gradient(100deg, #08161a, #0a1c22 60%, #09171c)' }}
    >
      <span
        aria-hidden="true"
        className="absolute -top-20 left-[18%] h-56 w-[60%] rounded-full blur-3xl"
        style={{ background: `rgba(${BRAND}, 0.28)` }}
      />
      <span
        aria-hidden="true"
        className="absolute inset-y-0 right-0 w-[56%] opacity-0 @xl:opacity-100"
        style={{
          clipPath: 'polygon(0 100%, 52% 0, 100% 0, 100% 100%)',
          background: `linear-gradient(120deg, rgba(${BRAND}, 0.1), rgba(${BRAND}, 0.38))`,
        }}
      />
      <Silhouette
        icon={page.icon}
        className="absolute top-[-8%] right-[-2%] h-[130%] aspect-square opacity-30 @xl:opacity-100"
        style={{ background: `linear-gradient(160deg, rgba(${BRAND}, 0.6), rgba(${BRAND}, 0.12) 70%)` }}
      />
      <div className="relative flex min-h-[240px] items-center px-5 py-6 @xl:px-8">
        <div className="max-w-[min(100%,520px)] rounded-3xl border border-white/15 bg-white/[0.07] px-8 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl">
          <h2 className="text-[clamp(2.5rem,6.5cqw,4.5rem)] leading-none font-semibold tracking-tight">{page.name}</h2>
          <p className="mt-3 font-support text-base text-white/70">{page.description}</p>
        </div>
      </div>
    </div>
  );
}
