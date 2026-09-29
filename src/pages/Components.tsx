import React from 'react';
import { Section, Label, Swatches, cardClass } from './components-guide/shared';
import { Buttons, Navigation, TextInputs, Dropdowns, TabRow, Cards } from './components-guide/PartOne';
import { Modals, SearchDemo, ListsTables, Toggles, Checkboxes, Radios, Sliders } from './components-guide/PartTwo';
import { Tooltips, Badges, Menus, Toasts, Progress, Toolbars, Icons } from './components-guide/PartThree';

// Temporary visual style guide. Purely presentational: local state only, no backend/IPC.
// To remove: delete this file, the ./components-guide folder, and the nav entry in App.tsx.

const BRAND_COLORS = [
  { name: 'Accent', hex: '#00c9a7' },
  { name: 'Accent Deep', hex: '#00bda0' },
  { name: 'Accent Tint', hex: '#dcf6f0' },
  { name: 'Mint Glow', hex: '#c8f6ec' },
  { name: 'Background', hex: '#eaf7f4' },
  { name: 'Surface', hex: '#ffffff' },
];
const DECORATIVE_COLORS = [
  { name: 'Turquoise', hex: '#6de0ee' },
  { name: 'Lavender', hex: '#ccbefe' },
  { name: 'Peach', hex: '#fecba4' },
  { name: 'Cream', hex: '#fff6ed' },
];
const NEUTRAL_COLORS = [
  { name: 'Slate 800', hex: '#1e293b' },
  { name: 'Slate 700', hex: '#334155' },
  { name: 'Slate 500', hex: '#64748b' },
  { name: 'Slate 300', hex: '#cbd5e1' },
  { name: 'Slate 100', hex: '#f1f5f9' },
];
const SEMANTIC_COLORS = [
  { name: 'Danger', hex: '#ef4444' },
  { name: 'Warning', hex: '#f59e0b' },
  { name: 'Info', hex: '#0ea5e9' },
  { name: 'Success', hex: '#10b981' },
];
const CAMELOT_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#10B981',
  '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
];

const INDEX = [
  ['buttons', 'Buttons'], ['navigation', 'Navigation'], ['text-inputs', 'Text Inputs'], ['dropdowns', 'Dropdowns'],
  ['tab-row', 'Tab Row'], ['cards', 'Cards'], ['modals', 'Modals'], ['search', 'Search'],
  ['lists-tables', 'Lists / Tables'], ['toggles', 'Toggles'], ['checkboxes', 'Checkboxes'], ['radios', 'Radios'],
  ['sliders', 'Sliders'], ['tooltips', 'Tooltips'], ['badges', 'Badges'], ['menus', 'Menus'],
  ['toasts', 'Toasts'], ['progress', 'Progress'], ['toolbars', 'Toolbars'], ['icons', 'Icons'],
];

export default function Components() {
  return (
    <div className="w-full pb-24 select-text">
      <h1 className="text-3xl font-semibold text-slate-800 tracking-tight mb-4">Components</h1>
      <div className="flex flex-wrap gap-2 mb-10 max-w-4xl">
        {INDEX.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="h-8 px-3.5 rounded-full bg-white/80 border border-white text-xs font-semibold text-slate-600 hover:text-[#00bda0] hover:bg-[#dcf6f0] transition cursor-pointer"
          >
            {label}
          </button>
        ))}
      </div>

      <Section id="palette" title="Color Palette" description="Colors used across the app.">
        <div className="space-y-6">
          <div><Label>Brand</Label><Swatches colors={BRAND_COLORS} /></div>
          <div><Label>Decorative</Label><Swatches colors={DECORATIVE_COLORS} /></div>
          <div><Label>Neutral</Label><Swatches colors={NEUTRAL_COLORS} /></div>
          <div><Label>Semantic</Label><Swatches colors={SEMANTIC_COLORS} /></div>
          <div>
            <Label>Camelot Wheel</Label>
            <div className="flex flex-wrap gap-2">
              {CAMELOT_COLORS.map((hex) => (
                <div key={hex} className="text-center">
                  <div className="w-12 h-12 rounded-full border border-slate-200/70" style={{ backgroundColor: hex }} />
                  <div className="mt-1 text-[10px] text-slate-500 uppercase">{hex}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section id="typography" title="Typography" description="Type scale.">
        <div className={`${cardClass} p-6 space-y-2 max-w-xl`}>
          <div className="text-3xl font-semibold text-slate-800 tracking-tight">Heading 1 — 30px Semibold</div>
          <div className="text-lg font-semibold text-slate-800 tracking-tight">Heading 2 — 18px Semibold</div>
          <div className="text-sm font-semibold text-slate-800 tracking-tight">Label — 14px Semibold</div>
          <div className="text-sm text-slate-700">Body — 14px Regular</div>
          <div className="text-xs text-slate-500">Caption — 12px Regular</div>
        </div>
      </Section>

      <Buttons />
      <Navigation />
      <TextInputs />
      <Dropdowns />
      <TabRow />
      <Cards />
      <Modals />
      <SearchDemo />
      <ListsTables />
      <Toggles />
      <Checkboxes />
      <Radios />
      <Sliders />
      <Tooltips />
      <Badges />
      <Menus />
      <Toasts />
      <Progress />
      <Toolbars />
      <Icons />
    </div>
  );
}
