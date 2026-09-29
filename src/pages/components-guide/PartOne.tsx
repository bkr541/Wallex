import React, { useState } from 'react';
import {
  Play, Plus, Trash2, Download, Settings, Heart, X, Home, Folder, Music, ChevronRight,
  ChevronDown, Mail, Eye, EyeOff, Layers, Sliders,
} from 'lucide-react';
import { Section, Label, btn, cardClass, inputClass, useDismiss, menuPanelClass, menuItemClass } from './shared';

export function Buttons() {
  return (
    <Section id="buttons" title="1. Buttons" description="Primary actions, secondary actions, icon buttons, destructive buttons, and more.">
      <div className="space-y-6">
        <div>
          <Label>Variants</Label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={`${btn.base} ${btn.primary}`}>Primary</button>
            <button type="button" className={`${btn.base} ${btn.secondary}`}>Secondary</button>
            <button type="button" className={`${btn.base} ${btn.outline}`}>Outline</button>
            <button type="button" className={`${btn.base} ${btn.ghost}`}>Ghost</button>
            <button type="button" className={`${btn.base} ${btn.danger}`}>Destructive</button>
            <button type="button" className={`${btn.base} ${btn.dangerSoft}`}>Destructive soft</button>
            <button type="button" disabled className={`${btn.base} ${btn.primary}`}>Disabled</button>
          </div>
        </div>
        <div>
          <Label>With icons</Label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={`${btn.base} ${btn.primary}`}><Play className="w-4 h-4" /> Play</button>
            <button type="button" className={`${btn.base} ${btn.secondary}`}><Plus className="w-4 h-4" /> New</button>
            <button type="button" className={`${btn.base} ${btn.outline}`}><Download className="w-4 h-4" /> Export</button>
            <button type="button" className={`${btn.base} ${btn.dangerSoft}`}><Trash2 className="w-4 h-4" /> Delete</button>
          </div>
        </div>
        <div>
          <Label>Icon buttons</Label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" aria-label="Play" className={`${btn.base} ${btn.icon} !bg-[#00c9a7] !text-white !border-transparent hover:!bg-[#00bda0]`}><Play className="w-4 h-4" /></button>
            <button type="button" aria-label="Settings" className={`${btn.base} ${btn.icon}`}><Settings className="w-4 h-4" /></button>
            <button type="button" aria-label="Favorite" className={`${btn.base} ${btn.icon} !bg-[#dcf6f0] !text-[#00bda0] !border-transparent`}><Heart className="w-4 h-4" /></button>
            <button type="button" aria-label="Delete" className={`${btn.base} ${btn.icon} !text-red-500 hover:!bg-red-50`}><Trash2 className="w-4 h-4" /></button>
            <button type="button" aria-label="Close" className={`${btn.base} ${btn.icon} !border-transparent !bg-transparent hover:!bg-slate-100/70`}><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div>
          <Label>Sizes</Label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={`${btn.base} ${btn.primary} !h-8 !px-4 !text-xs`}>Small</button>
            <button type="button" className={`${btn.base} ${btn.primary}`}>Medium</button>
            <button type="button" className={`${btn.base} ${btn.primary} !h-14 !px-8 !text-base`}>Large</button>
          </div>
        </div>
      </div>
    </Section>
  );
}

export function Navigation() {
  const [side, setSide] = useState(0);
  const [bottom, setBottom] = useState(0);
  const sideIcons = [Home, Folder, Music, Settings];
  const bottomItems = [{ i: Home, l: 'Home' }, { i: Music, l: 'Chords' }, { i: Layers, l: 'VST' }, { i: Sliders, l: 'MIDI' }];
  return (
    <Section id="navigation" title="2. Navigation" description="Sidebars, top navs, tab bars, bottom navigation, and breadcrumbs.">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
        <div>
          <Label>Sidebar (matches app nav)</Label>
          <div className="relative w-[64px] bg-white/95 rounded-[32px] p-2 shadow-[0_16px_40px_rgba(16,160,140,0.08),0_2px_12px_rgba(0,0,0,0.04)] border border-white/80 flex flex-col items-center gap-3.5">
            {sideIcons.map((Icon, i) => (
              <div key={i} className="relative w-full">
                {side === i && <div className="absolute -left-2 top-3 w-1.5 h-6 rounded-r-full bg-[#00c9a7]" />}
                <button
                  type="button"
                  aria-label={`Nav item ${i + 1}`}
                  onClick={() => setSide(i)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition cursor-pointer ${side === i ? 'bg-[#dcf6f0] text-[#00bda0]' : 'text-slate-700 hover:bg-slate-100/60'}`}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.8} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div>
            <Label>Top nav</Label>
            <div className={`${cardClass} h-14 px-5 flex items-center justify-between`}>
              <div className="flex items-center gap-2 font-semibold text-slate-800"><Music className="w-5 h-5 text-[#00bda0]" /> Downbeat</div>
              <div className="flex items-center gap-1 text-sm font-medium">
                <a className="px-3 h-9 inline-flex items-center rounded-full bg-[#dcf6f0] text-[#00bda0] cursor-pointer">Projects</a>
                <a className="px-3 h-9 inline-flex items-center rounded-full text-slate-600 hover:bg-slate-100/70 cursor-pointer">Library</a>
                <a className="px-3 h-9 inline-flex items-center rounded-full text-slate-600 hover:bg-slate-100/70 cursor-pointer">Help</a>
              </div>
            </div>
          </div>
          <div>
            <Label>Breadcrumbs</Label>
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
              <a className="text-slate-500 hover:text-[#00bda0] cursor-pointer">Projects</a>
              <ChevronRight className="w-4 h-4 text-slate-300" />
              <a className="text-slate-500 hover:text-[#00bda0] cursor-pointer">Summer EP</a>
              <ChevronRight className="w-4 h-4 text-slate-300" />
              <span className="font-semibold text-slate-800">Track 03</span>
            </nav>
          </div>
          <div>
            <Label>Bottom navigation</Label>
            <div className={`${cardClass} p-2 flex justify-around max-w-md`}>
              {bottomItems.map(({ i: Icon, l }, idx) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setBottom(idx)}
                  className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-2xl text-[11px] font-semibold transition cursor-pointer ${bottom === idx ? 'bg-[#dcf6f0] text-[#00bda0]' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.8} />
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-4">Tab bars are shown in section 5.</p>
    </Section>
  );
}

export function TextInputs() {
  const [showPw, setShowPw] = useState(false);
  const [value, setValue] = useState('Downbeat');
  return (
    <Section id="text-inputs" title="3. Text Inputs" description="Single-line fields for names, search, email, values, and other data entry.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1.5">Default</span>
          <input type="text" placeholder="Project name" className={inputClass} />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1.5">With value</span>
          <input type="text" value={value} onChange={(e) => setValue(e.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1.5">Email (leading icon)</span>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="email" placeholder="you@example.com" className={`${inputClass} !pl-11`} />
          </div>
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1.5">Password (trailing action)</span>
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} defaultValue="hunter2" className={`${inputClass} !pr-11`} />
            <button type="button" aria-label="Toggle visibility" onClick={() => setShowPw((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1.5">Numeric value with unit</span>
          <div className="relative">
            <input type="number" defaultValue={128} className={`${inputClass} !pr-14`} />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">BPM</span>
          </div>
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1.5">Error</span>
          <input type="text" defaultValue="Invalid name!" className={`${inputClass} !border-red-400 focus:!ring-red-400/25 focus:!border-red-500`} />
          <span className="block text-xs text-red-500 mt-1.5 ml-4">Names can't contain special characters.</span>
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1.5">Disabled</span>
          <input type="text" disabled value="Disabled" readOnly className={inputClass} />
        </label>
      </div>
    </Section>
  );
}

export function Dropdowns() {
  const options = ['C Major', 'A Minor', 'G Major', 'E Minor'];
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(options[0]);
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <Section id="dropdowns" title="4. Dropdowns / Select Menus" description="Choosing one option from a predefined set.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1.5">Native select</span>
          <select className={`${inputClass} cursor-pointer`} defaultValue={options[0]}>
            {options.map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
        <div>
          <span className="block text-sm font-medium text-slate-700 mb-1.5">Custom select</span>
          <div ref={ref} className="relative">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className={`${inputClass} flex items-center justify-between text-left cursor-pointer ${open ? '!border-[#00c9a7] !ring-2 !ring-[#00c9a7]/25' : ''}`}
            >
              {selected}
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
              <div role="listbox" className={`${menuPanelClass} w-full`}>
                {options.map((o) => (
                  <button
                    key={o}
                    type="button"
                    role="option"
                    aria-selected={o === selected}
                    onClick={() => { setSelected(o); setOpen(false); }}
                    className={`${menuItemClass} justify-between ${o === selected ? '!bg-[#dcf6f0] !text-[#00bda0] font-semibold' : ''}`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1.5">Disabled</span>
          <select disabled className={inputClass}><option>Unavailable</option></select>
        </label>
      </div>
    </Section>
  );
}

export function TabRow() {
  const tabs = ['Overview', 'Tracks', 'Notes'];
  const [pill, setPill] = useState(tabs[0]);
  const [underline, setUnderline] = useState(tabs[0]);
  return (
    <Section id="tab-row" title="5. Tab Row" description="Switching between related views without changing the overall page.">
      <div className="space-y-6">
        <div>
          <Label>Pill tabs</Label>
          <div role="tablist" className="inline-flex p-1 rounded-full bg-white/95 border border-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            {tabs.map((t) => (
              <button key={t} role="tab" aria-selected={pill === t} type="button" onClick={() => setPill(t)}
                className={`h-9 px-5 rounded-full text-sm font-semibold transition cursor-pointer ${pill === t ? 'bg-[#dcf6f0] text-[#00bda0]' : 'text-slate-600 hover:text-slate-900'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Underline tabs</Label>
          <div role="tablist" className="flex gap-6 border-b border-slate-200 max-w-md">
            {tabs.map((t) => (
              <button key={t} role="tab" aria-selected={underline === t} type="button" onClick={() => setUnderline(t)}
                className={`relative pb-3 text-sm font-semibold transition cursor-pointer ${underline === t ? 'text-[#00bda0]' : 'text-slate-500 hover:text-slate-800'}`}>
                {t}
                {underline === t && <span className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full bg-[#00c9a7]" />}
              </button>
            ))}
          </div>
          <div className={`${cardClass} mt-4 p-5 max-w-md text-sm text-slate-600`}>Content for <b className="text-slate-800">{underline}</b>.</div>
        </div>
      </div>
    </Section>
  );
}

export function Cards() {
  return (
    <Section id="cards" title="6. Cards" description="Contained surfaces grouping related information, controls, media, or actions.">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
        <div className={`${cardClass} p-5`}>
          <div className="text-sm font-semibold text-slate-800">Basic card</div>
          <p className="mt-1 text-sm text-slate-500">Rounded 24px, white surface, soft teal shadow.</p>
        </div>
        <div className={`${cardClass} p-5 ring-2 ring-[#00c9a7]/40`}>
          <div className="text-sm font-semibold text-slate-800">Selected card</div>
          <p className="mt-1 text-sm text-slate-500">Adds a teal ring to show selection.</p>
        </div>
        <div className={`${cardClass} p-5 hover:-translate-y-0.5 transition cursor-pointer`}>
          <div className="text-sm font-semibold text-slate-800">Interactive card</div>
          <p className="mt-1 text-sm text-slate-500">Lifts slightly on hover.</p>
        </div>
        <div className={`${cardClass} p-5`}>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Stat card</div>
          <div className="mt-1 text-3xl font-semibold text-slate-800 tracking-tight">128 BPM</div>
          <div className="text-xs text-[#00bda0] font-semibold mt-1">Key: 8B · C Major</div>
        </div>
        <div className={`${cardClass} overflow-hidden`}>
          <div className="h-28 bg-gradient-to-br from-[#c8f6ec] via-[#ccbefe]/60 to-[#fecba4]/70" />
          <div className="p-5">
            <div className="text-sm font-semibold text-slate-800">Media card</div>
            <p className="mt-1 text-sm text-slate-500">Artwork on top, details below.</p>
          </div>
        </div>
        <div className={`${cardClass} p-5 flex flex-col`}>
          <div className="text-sm font-semibold text-slate-800">Action card</div>
          <p className="mt-1 text-sm text-slate-500 flex-1">Groups related copy with actions.</p>
          <div className="mt-4 flex gap-2">
            <button type="button" className={`${btn.base} ${btn.primary} !h-9 !px-4`}>Open</button>
            <button type="button" className={`${btn.base} ${btn.ghost} !h-9 !px-4`}>Dismiss</button>
          </div>
        </div>
      </div>
    </Section>
  );
}
