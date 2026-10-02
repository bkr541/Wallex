import { BRAND, type HeaderProps } from './shared';

// 13 · Corner arc: no icon at all. A huge dim disc swells in from the top-left corner behind the title and
// the rest of the panel stays calm and empty.
export default function ArcHeader({ page }: HeaderProps) {
  return (
    <div
      className="relative min-h-[230px] overflow-hidden rounded-[28px] border"
      style={{ borderColor: `rgba(${BRAND}, 0.28)`, background: 'linear-gradient(100deg, #09191d 0%, #08141a 45%, #070c10 100%)' }}
    >
      <span
        aria-hidden="true"
        className="absolute top-[-70%] left-[-14%] h-[260%] aspect-square rounded-full"
        style={{
          background: `radial-gradient(circle at 25% 28%, rgba(${BRAND}, 0.34), rgba(${BRAND}, 0.12) 55%, rgba(${BRAND}, 0.03) 75%)`,
          boxShadow: `inset 0 0 70px rgba(${BRAND}, 0.1)`,
          maskImage: 'linear-gradient(120deg, #000 35%, transparent 70%)',
          WebkitMaskImage: 'linear-gradient(120deg, #000 35%, transparent 70%)',
        }}
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      <div className="relative flex min-h-[230px] flex-col justify-center px-10 py-6">
        <h2 className="text-[clamp(2.75rem,7cqw,5rem)] leading-none font-semibold tracking-tight drop-shadow-[0_2px_16px_rgba(255,255,255,0.15)]">
          {page.name}
        </h2>
        <p className="mt-3 max-w-md font-support text-base text-white/65">{page.description}</p>
      </div>
    </div>
  );
}
