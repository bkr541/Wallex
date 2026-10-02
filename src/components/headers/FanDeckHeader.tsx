import { BRAND, type HeaderProps } from './shared';

// 8 · Fan deck: flat cards fanned out from the corner in the page colour and teal, with a solid
// colour subtitle chip.
export default function FanDeckHeader({ page }: HeaderProps) {
  const cards: { rotate: number; background: string; left: string }[] = [
    { rotate: -52, background: `rgba(${BRAND}, 0.28)`, left: '12%' },
    { rotate: -34, background: `rgba(${page.accent}, 0.9)`, left: '22%' },
    { rotate: -17, background: `rgba(${BRAND}, 0.95)`, left: '31%' },
    { rotate: -2, background: '#0f2a2c', left: '40%' },
  ];
  return (
    <div className="relative min-h-[260px] overflow-hidden rounded-[28px] border border-line bg-[#12161a]">
      <div className="absolute right-[-4%] bottom-[-46%] hidden h-[470px] w-[470px] @lg:block" aria-hidden="true">
        {cards.map((c, i) => (
          <div
            key={i}
            className="absolute bottom-0 h-[330px] w-[200px] origin-bottom-left rounded-[30px] shadow-[0_-10px_40px_rgba(0,0,0,0.35)]"
            style={{ left: c.left, background: c.background, transform: `rotate(${c.rotate}deg)` }}
          />
        ))}
      </div>

      <div className="relative flex min-h-[260px] flex-col justify-center gap-4 p-8 @lg:max-w-[62%]">
        <h2 className="text-[clamp(2.75rem,7cqw,5.25rem)] leading-none font-semibold tracking-tight">{page.name}</h2>
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
