import Silhouette from './Silhouette';
import { BRAND, type HeaderProps } from './shared';

// 12 · Slab and disc: a slanted translucent slab sweeps up from the bottom, with a big glowing disc at the
// right holding a medium-sized page icon.
export default function SlabHeader({ page }: HeaderProps) {
  return (
    <div
      className="relative min-h-[230px] overflow-hidden rounded-[28px] border"
      style={{ borderColor: `rgba(${BRAND}, 0.35)`, background: 'linear-gradient(90deg, #070d10 0%, #08161a 60%, #0a2227 100%)' }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 right-0 w-[62%] opacity-0 @xl:opacity-100"
        style={{
          clipPath: 'polygon(0 100%, 34% 0, 100% 0, 100% 100%)',
          background: `linear-gradient(120deg, rgba(${BRAND}, 0.04), rgba(${BRAND}, 0.32))`,
        }}
      />
      <span
        aria-hidden="true"
        className="absolute inset-y-0 right-[34%] w-[16%] opacity-0 @xl:opacity-100"
        style={{
          clipPath: 'polygon(0 100%, 60% 30%, 100% 30%, 40% 100%)',
          background: `linear-gradient(120deg, rgba(${BRAND}, 0.03), rgba(${BRAND}, 0.1))`,
        }}
      />
      <span
        aria-hidden="true"
        className="absolute top-[-14%] right-[4%] h-[128%] aspect-square rounded-full opacity-0 @xl:opacity-100"
        style={{ background: `linear-gradient(180deg, rgba(${BRAND}, 0.42), rgba(${BRAND}, 0.1) 80%)` }}
      />
      <Silhouette
        icon={page.icon}
        className="absolute top-1/2 right-[13%] h-[56%] aspect-square -translate-y-1/2 opacity-0 @xl:opacity-100"
        style={{
          background: 'linear-gradient(150deg, #1ee6dc 0%, #12b2b8 55%, #0c7881 100%)',
          filter: `drop-shadow(0 12px 22px rgba(0,0,0,0.35)) drop-shadow(0 0 18px rgba(${BRAND}, 0.35))`,
        }}
      />
      <div className="relative flex min-h-[230px] flex-col justify-center px-8 py-6">
        <h2 className="text-[clamp(2.75rem,7cqw,5rem)] leading-none font-semibold tracking-tight">{page.name}</h2>
        <p className="mt-3 max-w-md font-support text-base text-white/70">{page.description}</p>
      </div>
    </div>
  );
}
