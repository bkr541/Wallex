import Silhouette from './Silhouette';
import { BRAND, type HeaderProps } from './shared';

// 11 · Giant crop: the page icon blown up so far that the frame cuts it off, on a soft disc, with a
// deep teal wash fading out under the title.
export default function CropHeader({ page }: HeaderProps) {
  return (
    <div
      className="relative min-h-[230px] overflow-hidden rounded-[28px] border"
      style={{ borderColor: `rgba(${BRAND}, 0.4)`, background: 'linear-gradient(90deg, #070d10 0%, #08181c 55%, #0a2a30 100%)' }}
    >
      <span
        aria-hidden="true"
        className="absolute top-[-35%] right-[2%] h-[190%] aspect-square rounded-full opacity-70 @xl:opacity-100"
        style={{ background: `radial-gradient(circle at 50% 30%, rgba(${BRAND}, 0.35), rgba(${BRAND}, 0.08) 65%, transparent 72%)` }}
      />
      <Silhouette
        icon={page.icon}
        className="absolute top-[-14%] right-[-4%] h-[150%] aspect-square opacity-45 @xl:opacity-100"
        style={{
          background: 'linear-gradient(150deg, #14e0d6 0%, #12a9b0 35%, #0b5f68 75%, #0a3d45 100%)',
          filter: `drop-shadow(0 0 30px rgba(${BRAND}, 0.3))`,
        }}
      />
      <div className="relative flex min-h-[230px] flex-col justify-center px-8 py-6">
        <h2 className="text-[clamp(2.75rem,7cqw,5rem)] leading-none font-semibold tracking-tight drop-shadow-[0_2px_14px_rgba(255,255,255,0.18)]">
          {page.name}
        </h2>
        <p className="mt-3 max-w-md font-support text-base text-white/70">{page.description}</p>
      </div>
    </div>
  );
}
