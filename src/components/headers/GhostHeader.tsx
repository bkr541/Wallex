import Silhouette from './Silhouette';
import { BRAND, type HeaderProps } from './shared';

// 16 · Ghost outline: a huge near-black page icon whose top edges catch a thin line of teal light, and a
// description set in an outlined pill under the title.
export default function GhostHeader({ page }: HeaderProps) {
  return (
    <div
      className="relative min-h-[230px] overflow-hidden rounded-[28px] border"
      style={{ borderColor: `rgba(${BRAND}, 0.3)`, background: 'linear-gradient(90deg, #070b0e, #08131a)' }}
    >
      <div
        aria-hidden="true"
        className="absolute top-[4%] right-[-2%] h-[132%] aspect-square opacity-40 @xl:opacity-100"
        style={{ filter: `drop-shadow(0 -2px 0 rgba(40,220,230,0.85)) drop-shadow(0 0 14px rgba(${BRAND}, 0.28))` }}
      >
        <Silhouette
          icon={page.icon}
          className="h-full w-full"
          style={{ background: 'linear-gradient(180deg, #0f2e34, #0c1d23 60%, #0a1418)' }}
        />
      </div>
      <div className="relative flex min-h-[230px] flex-col items-start justify-center px-8 py-6">
        <h2 className="text-[clamp(2.75rem,7cqw,5rem)] leading-none font-semibold tracking-tight">{page.name}</h2>
        <p className="mt-4 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 font-support text-base text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          {page.description}
        </p>
      </div>
    </div>
  );
}
