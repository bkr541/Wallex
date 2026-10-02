import type { HeaderProps } from './shared';

// 2 · Editorial: a magazine-style masthead with a short accent rule, a hairline and a ghosted
// outline of the page icon. Typography does the work, so it stays calm on busy pages.
export default function EditorialHeader({ page }: HeaderProps) {
  const Icon = page.icon;
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-line bg-canvas px-8 pt-6 pb-9">
      <div className="relative z-10 flex items-center gap-4 font-support text-[11px] tracking-[0.3em] text-muted uppercase">
        <span className="h-[3px] w-10 rounded-full" style={{ background: `rgb(${page.accent})` }} />
        <span>Wallex</span>
      </div>
      <div className="relative z-10 mt-4 h-px bg-line" />

      <Icon
        aria-hidden="true"
        className="pointer-events-none absolute -top-4 right-6 hidden h-[17rem] w-[17rem] opacity-[0.16] grayscale select-none @md:block"
      />

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
