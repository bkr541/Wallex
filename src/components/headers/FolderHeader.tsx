import type { HeaderProps } from './shared';

// 4 · Dossier folder: an icon tab, a pinstriped body, loose sheets peeking out underneath and a
// rubber-stamp seal. Reads like paperwork, which suits a ledger.
export default function FolderHeader({ page }: HeaderProps) {
  const Icon = page.icon;
  return (
    <div className="relative pt-11 pb-5">
      <div
        className="absolute top-0 left-6 z-10 flex h-12 items-center gap-2.5 rounded-t-2xl border border-b-0 px-5 text-sm font-medium"
        style={{
          background: `linear-gradient(180deg, rgba(${page.accent}, 0.3), rgba(${page.accent}, 0.1)), #12161a`,
          borderColor: `rgba(${page.accent}, 0.55)`,
        }}
      >
        <Icon className="h-6 w-6" />
        <span className="font-support text-xs tracking-[0.25em] text-muted uppercase">Wallex</span>
      </div>

      <div className="absolute inset-x-8 bottom-0 h-8 rounded-b-3xl border border-line bg-white/[0.025]" />
      <div className="absolute inset-x-4 bottom-2.5 h-8 rounded-b-3xl border border-line bg-white/[0.04]" />

      <div
        className="relative overflow-hidden rounded-[26px] rounded-tl-md border p-8"
        style={{
          borderColor: `rgba(${page.accent}, 0.4)`,
          background:
            'repeating-linear-gradient(135deg, rgba(255,255,255,0.028) 0 2px, transparent 2px 14px), linear-gradient(180deg, #131820, #0e1215)',
          boxShadow: `0 20px 50px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07)`,
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0">
            <h2 className="text-[clamp(2.5rem,6.5cqw,4.5rem)] leading-none font-semibold tracking-tight">{page.name}</h2>
            <p className="mt-4 max-w-md font-support text-base text-muted">{page.description}</p>
          </div>

          <div
            className="hidden h-28 w-28 shrink-0 rotate-[-10deg] flex-col items-center justify-center gap-1 rounded-full border-2 border-dashed @xl:flex"
            style={{ borderColor: `rgba(${page.accent}, 0.6)`, color: `rgb(${page.accent})` }}
          >
            <span className="text-[9px] font-semibold tracking-[0.3em] uppercase">Wallex</span>
            <Icon className="h-10 w-10" />
            <span className="text-[9px] tracking-[0.3em] uppercase opacity-70">Money</span>
          </div>
        </div>
      </div>
    </div>
  );
}
