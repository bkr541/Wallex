import { Check } from 'lucide-react';
import SectionTitle from '../components/SectionTitle';
import PlumpIcon, { type PlumpName } from '../components/PlumpIcon';
import {
  ACCENTS,
  DEFAULTS,
  TEXT_SIZES,
  resetAppearance,
  setAppearance,
  useAppearance,
  type Theme,
} from '../lib/appearance';

function Setting({
  icon,
  label,
  hint,
  children,
}: {
  icon: PlumpName;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="group" aria-label={label}>
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <PlumpIcon name={icon} className="h-5 w-5 shrink-0 text-muted" />
        {label}
      </div>
      {children}
      {hint && <p className="mt-2 font-support text-xs text-muted">{hint}</p>}
    </div>
  );
}

// A tiny drawing of the app in each theme, so the choice is visible before it is made.
function ThemePreview({ theme }: { theme: Theme }) {
  const dark = { bg: '#0a0a0a', card: '#1a1a1a', bar: '#8a8a8a' };
  const light = { bg: '#f4f4f1', card: '#ffffff', bar: '#a3a3a3' };
  const tile = (c: typeof dark, wide?: boolean) => (
    <div className="flex h-full flex-1 flex-col gap-1.5 p-2.5" style={{ background: c.bg }}>
      <span className="h-1.5 w-1/2 rounded-full" style={{ background: c.bar }} />
      <span className="flex-1 rounded-md" style={{ background: c.card }} />
      {wide && <span className="h-1.5 w-1/3 rounded-full bg-accent" />}
    </div>
  );
  return (
    <div className="flex h-16 w-full overflow-hidden rounded-lg border border-line">
      {theme === 'system' ? (
        <>
          {tile(light)}
          {tile(dark)}
        </>
      ) : (
        tile(theme === 'light' ? light : dark, true)
      )}
    </div>
  );
}

const THEMES: { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function AppearanceTab() {
  const a = useAppearance();
  const isDefault =
    a.theme === DEFAULTS.theme &&
    a.accent === DEFAULTS.accent &&
    a.textSize === DEFAULTS.textSize &&
    a.reduceMotion === DEFAULTS.reduceMotion;

  return (
    <div className="space-y-8 px-1 pb-10">
      <section className="space-y-6">
        <div>
          <SectionTitle icon="paint-palette">Look and feel</SectionTitle>
          <p className="mt-1 font-support text-sm text-muted">Changes apply straight away and are remembered.</p>
        </div>

        <Setting
          icon="moon-stars"
          label="Theme"
          hint="System follows your computer’s light or dark setting."
        >
          <div role="radiogroup" aria-label="Theme" className="grid max-w-xl grid-cols-3 gap-3">
            {THEMES.map((t) => {
              const on = a.theme === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setAppearance({ theme: t.value })}
                  className={`cursor-pointer rounded-xl border p-2 text-left transition-colors ${
                    on ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-muted'
                  }`}
                >
                  <ThemePreview theme={t.value} />
                  <span className="mt-2 flex items-center justify-between px-1 text-sm">
                    <span className={on ? 'text-ink' : 'text-muted'}>{t.label}</span>
                    {on && <Check className="h-4 w-4 text-accent" />}
                  </span>
                </button>
              );
            })}
          </div>
        </Setting>

        <Setting icon="paint-palette" label="Accent color" hint="Used for buttons, highlights and the active page marker.">
          <div role="radiogroup" aria-label="Accent color" className="flex flex-wrap gap-3">
            {ACCENTS.map((c) => {
              const on = a.accent === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={c.name}
                  title={c.name}
                  onClick={() => setAppearance({ accent: c.id })}
                  className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 transition-transform hover:scale-105 ${
                    on ? 'border-ink' : 'border-transparent'
                  }`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: c.color }}>
                    {on && <Check className="h-4 w-4 text-[#0a0a0a]" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        </Setting>

        <Setting icon="zoom-in" label="Text size" hint="Scales the text and spacing across the whole app.">
          <div role="radiogroup" aria-label="Text size" className="flex max-w-xl gap-2">
            {TEXT_SIZES.map((t) => {
              const on = a.textSize === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setAppearance({ textSize: t.value })}
                  className={`flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-xl border px-3 py-3 transition-colors ${
                    on ? 'border-accent bg-accent-soft text-ink' : 'border-line bg-surface text-muted hover:text-ink'
                  }`}
                >
                  <span className="font-semibold leading-none" style={{ fontSize: t.px + 6 }}>
                    Aa
                  </span>
                  <span className="text-sm">{t.label}</span>
                </button>
              );
            })}
          </div>
        </Setting>
      </section>

      <section className="space-y-6 border-t border-line pt-8">
        <div>
          <SectionTitle icon="eye-optic">Accessibility</SectionTitle>
        </div>

        <Setting icon="flash-1" label="Reduce motion">
          <button
            type="button"
            role="switch"
            aria-checked={a.reduceMotion}
            onClick={() => setAppearance({ reduceMotion: !a.reduceMotion })}
            className="flex w-full max-w-xl cursor-pointer items-center justify-between gap-6 rounded-xl border border-line bg-surface px-4 py-3 text-left"
          >
            <span>
              <span className="block text-sm">Turn off animations</span>
              <span className="mt-0.5 block font-support text-xs text-muted">
                Page changes, the circle animations, number spins and the launch screen stop moving. Off follows your
                computer’s own setting.
              </span>
            </span>
            <span
              aria-hidden="true"
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${a.reduceMotion ? 'bg-accent' : 'bg-line'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  a.reduceMotion ? 'translate-x-5' : ''
                }`}
              />
            </span>
          </button>
        </Setting>
      </section>

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-8">
        <button
          type="button"
          onClick={resetAppearance}
          disabled={isDefault}
          className="cursor-pointer rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reset to defaults
        </button>
        <p className="font-support text-xs text-muted">Icons: Streamline Plump, CC BY 4.0.</p>
      </div>
    </div>
  );
}
