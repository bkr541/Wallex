import { pad, type HeaderProps } from './shared';

// 2 · Editorial index: a magazine-style masthead with a section counter, a hairline rule and an
// outlined oversize numeral. Typography does all the work, so it stays calm on busy pages.
export default function EditorialHeader({ page, index, total }: HeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-line bg-canvas px-8 pt-6 pb-9">
      <div className="relative z-10 flex items-center justify-between gap-4 font-support text-[11px] tracking-[0.22em] text-muted uppercase">
        <div className="flex items-center gap-4">
          <span>
            Section {pad(index)} / {pad(total)}
          </span>
          <div className="flex gap-1.5">
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className="h-[3px] w-7 rounded-full"
                style={{ background: i + 1 === index ? `rgb(${page.accent})` : 'rgba(255,255,255,0.12)' }}
              />
            ))}
          </div>
        </div>
        <span className="hidden @md:inline">Wallex · Money</span>
      </div>
      <div className="relative z-10 mt-4 h-px bg-line" />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-6 right-4 leading-none font-bold select-none"
        style={{
          fontSize: 'clamp(8rem, 24cqw, 17rem)',
          color: 'transparent',
          WebkitTextStroke: `1.5px rgba(${page.accent}, 0.4)`,
          letterSpacing: '-0.04em',
        }}
      >
        {pad(index)}
      </span>

      <div className="relative z-10 mt-12 max-w-[34rem]">
        <h2 className="text-[clamp(2.75rem,8cqw,5.5rem)] leading-[0.92] font-semibold tracking-[-0.045em]">{page.name}</h2>
        <div className="mt-6 flex items-start gap-4">
          <span className="mt-3 h-px w-10 shrink-0" style={{ background: `rgb(${page.accent})` }} />
          <p className="font-support text-base text-muted">{page.description}</p>
        </div>
      </div>
    </div>
  );
}
