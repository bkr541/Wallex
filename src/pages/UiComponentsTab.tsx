import { asset } from '../assets';

const LOGOS = [
  { file: 'logos/Wallex_logo1.png', label: 'Wallex_logo1' },
  { file: 'logos/logo.png', label: 'logo' },
  { file: 'logos/logo2.png', label: 'logo2' },
  { file: 'logos/main_logo.png', label: 'main_logo' },
];

export default function UiComponentsTab() {
  return (
    <section className="space-y-5 px-4">
      <div>
        <h2 className="text-lg font-semibold">Logos</h2>
        <p className="mt-1 font-support text-sm text-muted">Shown at 100 × 100 px, kept in proportion.</p>
      </div>

      <div className="flex flex-wrap gap-8">
        {LOGOS.map((logo) => {
          const src = asset(logo.file);
          return (
            <figure key={logo.file} className="flex flex-col items-center gap-2">
              <div className="flex h-[100px] w-[100px] items-center justify-center">
                {src ? (
                  <img src={src} alt={logo.label} draggable={false} className="h-[100px] w-[100px] object-contain" />
                ) : (
                  <span className="font-support text-xs text-muted">Missing</span>
                )}
              </div>
              <figcaption className="font-support text-xs text-muted">{logo.label}</figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}
