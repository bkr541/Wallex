import { pad, type HeaderProps } from './shared';

// 4 · Dossier folder: a tab for the section number, a pinstriped body, loose sheets peeking out
// underneath and a rubber-stamp icon. Reads like paperwork, which suits a ledger.
export default function FolderHeader({ page, index, total }: HeaderProps) {
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
        <span>{pad(index)}</span>
        <span className="text-muted">/ {pad(total)}</span>
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
            className="hidden h-28 w-28 shrink-0 rotate-[-10deg] flex-col items-center justify-center rounded-full border-2 border-dashed @xl:flex"
            style={{ borderColor: `rgba(${page.accent}, 0.6)`, color: `rgb(${page.accent})` }}
          >
            <span className="text-[10px] font-semibold tracking-[0.3em] uppercase">Section</span>
            <span className="text-4xl leading-none font-bold">{pad(index)}</span>
            <span className="text-[9px] tracking-[0.25em] uppercase opacity-70">Wallex</span>
          </div>
        </div>
      </div>
    </div>
  );
}
