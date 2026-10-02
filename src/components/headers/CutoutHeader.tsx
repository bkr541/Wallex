import Silhouette from './Silhouette';
import { BRAND, type HeaderProps } from './shared';

// 14 · Cutout: a bright slanted teal panel on the right with a glowing edge, and the page icon punched out of
// it in the dark so it reads as a hole through to the night behind.
export default function CutoutHeader({ page }: HeaderProps) {
  return (
    <div
      className="relative min-h-[230px] overflow-hidden rounded-[28px] border"
      style={{ borderColor: `rgba(${BRAND}, 0.3)`, background: 'linear-gradient(90deg, #070d10, #09161a)' }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 w-[52%] opacity-0 @xl:opacity-100"
        style={{
          clipPath: 'polygon(30% 0, 100% 0, 100% 100%, 0 100%)',
          background: 'linear-gradient(200deg, #1fb5c0 0%, #0e6f78 45%, #0a3c44 100%)',
        }}
      >
        <Silhouette
          icon={page.icon}
          className="absolute right-[8%] bottom-[-8%] h-[104%] aspect-square"
          style={{
            background: 'linear-gradient(180deg, #082329, #061419)',
            filter: `drop-shadow(0 0 10px rgba(${BRAND}, 0.7)) drop-shadow(0 -1px 0 rgba(120,255,245,0.55))`,
          }}
        />
      </div>
      <svg
        aria-hidden="true"
        className="absolute inset-y-0 right-0 hidden h-full w-[52%] @xl:block"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        fill="none"
      >
        <line x1="30" y1="0" x2="0" y2="100" stroke="rgb(60,235,230)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" style={{ filter: 'drop-shadow(0 0 6px rgba(60,235,230,0.8))' }} />
      </svg>
      <div className="relative flex min-h-[230px] flex-col justify-center px-8 py-6">
        <h2 className="text-[clamp(2.75rem,7cqw,5rem)] leading-none font-semibold tracking-tight">{page.name}</h2>
        <p className="mt-3 max-w-md font-support text-base text-white/70">{page.description}</p>
      </div>
    </div>
  );
}
