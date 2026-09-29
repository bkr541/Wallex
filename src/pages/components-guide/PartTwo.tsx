import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock, Search, X, Music, MoreHorizontal, Filter } from 'lucide-react';
import { Section, Label, btn, cardClass, inputClass } from './shared';

export function Modals() {
  const [kind, setKind] = useState<'confirm' | 'form' | null>(null);
  useEffect(() => {
    if (!kind) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setKind(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [kind]);

  return (
    <Section id="modals" title="7. Modals / Dialogs" description="Overlays for confirmations, forms, warnings, detailed settings, or focused tasks.">
      <div className="flex flex-wrap gap-3">
        <button type="button" className={`${btn.base} ${btn.dangerSoft}`} onClick={() => setKind('confirm')}>Open confirmation</button>
        <button type="button" className={`${btn.base} ${btn.secondary}`} onClick={() => setKind('form')}>Open form dialog</button>
      </div>
      {kind && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/30 backdrop-blur-sm" onMouseDown={() => setKind(null)}>
          <div
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-[0_24px_60px_rgba(15,23,42,0.22)] select-text"
          >
            <div className="flex items-start justify-between">
              {kind === 'confirm' ? (
                <div className="w-11 h-11 rounded-full bg-red-50 text-red-500 flex items-center justify-center"><AlertTriangle className="w-5 h-5" /></div>
              ) : (
                <h3 className="text-lg font-semibold text-slate-800 tracking-tight">New project</h3>
              )}
              <button type="button" aria-label="Close" onClick={() => setKind(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            {kind === 'confirm' ? (
              <>
                <h3 className="mt-4 text-lg font-semibold text-slate-800 tracking-tight">Delete this project?</h3>
                <p className="mt-1 text-sm text-slate-500">This action can't be undone. All tracks in it will be removed.</p>
              </>
            ) : (
              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="block text-sm font-medium text-slate-700 mb-1.5">Name</span>
                  <input autoFocus type="text" placeholder="Untitled" className={inputClass} />
                </label>
                <label className="block">
                  <span className="block text-sm font-medium text-slate-700 mb-1.5">Tempo</span>
                  <input type="number" defaultValue={120} className={inputClass} />
                </label>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className={`${btn.base} ${btn.ghost}`} onClick={() => setKind(null)}>Cancel</button>
              <button type="button" className={`${btn.base} ${kind === 'confirm' ? btn.danger : btn.primary}`} onClick={() => setKind(null)}>
                {kind === 'confirm' ? 'Delete' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}

const SEARCH_DATA = ['Amber Keys', 'Analog Pad', 'Arp Lead', 'Bassline 303', 'Bell Pluck', 'Brass Stab', 'Chord Stack'];
const CATEGORIES = ['All', 'Synth', 'Bass', 'Keys'];

export function SearchDemo() {
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState(['Analog Pad', 'Bell Pluck']);
  const [cat, setCat] = useState('All');
  const results = useMemo(
    () => SEARCH_DATA.filter((d) => d.toLowerCase().includes(q.trim().toLowerCase())),
    [q],
  );
  const commit = (v: string) => {
    setQ(v);
    setFocused(false);
    setRecent((r) => [v, ...r.filter((x) => x !== v)].slice(0, 4));
  };

  return (
    <Section id="search" title="8. Search" description="Search input, suggestions, recent searches, filtering, and results.">
      <div className="max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={q}
            placeholder="Search presets…"
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 120)}
            className={`${inputClass} !pl-11 !pr-10`}
          />
          {q && (
            <button type="button" aria-label="Clear" onClick={() => setQ('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-4 h-4" /></button>
          )}
          {focused && (
            <div className="absolute z-20 mt-2 w-full p-1.5 rounded-2xl bg-white border border-slate-100 shadow-[0_16px_40px_rgba(16,160,140,0.14),0_2px_12px_rgba(0,0,0,0.06)]">
              {!q && recent.length > 0 && (
                <>
                  <div className="px-3 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Recent</div>
                  {recent.map((r) => (
                    <button key={r} type="button" onMouseDown={() => commit(r)} className="w-full flex items-center gap-2.5 px-3 h-9 rounded-xl text-sm text-slate-700 hover:bg-[#dcf6f0] cursor-pointer text-left">
                      <Clock className="w-4 h-4 text-slate-400" /> {r}
                    </button>
                  ))}
                </>
              )}
              {q && (
                <>
                  <div className="px-3 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Suggestions</div>
                  {results.slice(0, 4).map((r) => (
                    <button key={r} type="button" onMouseDown={() => commit(r)} className="w-full flex items-center gap-2.5 px-3 h-9 rounded-xl text-sm text-slate-700 hover:bg-[#dcf6f0] cursor-pointer text-left">
                      <Search className="w-4 h-4 text-slate-400" /> {r}
                    </button>
                  ))}
                  {results.length === 0 && <div className="px-3 h-9 flex items-center text-sm text-slate-400">No matches</div>}
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-4">
          <Filter className="w-4 h-4 text-slate-400" />
          {CATEGORIES.map((c) => (
            <button key={c} type="button" onClick={() => setCat(c)}
              className={`h-8 px-3.5 rounded-full text-xs font-semibold transition cursor-pointer ${cat === c ? 'bg-[#00c9a7] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {c}
            </button>
          ))}
        </div>
        <div className={`${cardClass} mt-4 p-1.5`}>
          <div className="px-3 py-2 text-xs text-slate-500">{results.length} result{results.length === 1 ? '' : 's'}{q && <> for “{q}”</>}</div>
          {results.map((r) => (
            <div key={r} className="flex items-center gap-3 px-3 h-11 rounded-xl hover:bg-slate-50 text-sm text-slate-700">
              <Music className="w-4 h-4 text-[#00bda0]" /> {r}
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

const ROWS = [
  { name: 'Summer EP', type: 'Project', status: 'Active', modified: '2 min ago' },
  { name: 'Analog Pad.fxp', type: 'Preset', status: 'Draft', modified: 'Yesterday' },
  { name: 'Demo Mix v3', type: 'Bounce', status: 'Archived', modified: 'Sep 12' },
];
const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-[#dcf6f0] text-[#00bda0]',
  Draft: 'bg-amber-100 text-amber-700',
  Archived: 'bg-slate-100 text-slate-500',
};

export function ListsTables() {
  const [sel, setSel] = useState(0);
  return (
    <Section id="lists-tables" title="9. Lists / Tables" description="Tracks, files, users, projects, records, settings, and other repeated data.">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 max-w-5xl">
        <div>
          <Label>List</Label>
          <div className={`${cardClass} p-1.5`}>
            {ROWS.map((r, i) => (
              <button key={r.name} type="button" onClick={() => setSel(i)}
                className={`w-full flex items-center gap-3 px-3 h-14 rounded-2xl text-left transition cursor-pointer ${sel === i ? 'bg-[#dcf6f0]' : 'hover:bg-slate-50'}`}>
                <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-[#00bda0]"><Music className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800 truncate">{r.name}</div>
                  <div className="text-xs text-slate-500">{r.type} · {r.modified}</div>
                </div>
                <MoreHorizontal className="w-4 h-4 text-slate-400" />
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Table</Label>
          <div className={`${cardClass} overflow-hidden`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="font-semibold px-5 py-3">Name</th>
                  <th className="font-semibold px-3 py-3">Status</th>
                  <th className="font-semibold px-5 py-3 text-right">Modified</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.name} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-medium text-slate-800">{r.name}</td>
                    <td className="px-3 py-3"><span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[r.status]}`}>{r.status}</span></td>
                    <td className="px-5 py-3 text-right text-slate-500">{r.modified}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Section>
  );
}

function Switch({ on, set, label, disabled }: { on: boolean; set?: () => void; label: string; disabled?: boolean }) {
  return (
  <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={set}
    className={`relative w-12 h-7 shrink-0 rounded-full transition outline-none focus-visible:ring-2 focus-visible:ring-[#00c9a7]/50 ${on ? 'bg-[#00c9a7]' : 'bg-slate-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
    <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
  </button>
);
}

export function Toggles() {
  const [a, setA] = useState(true);
  const [b, setB] = useState(false);
  return (
    <Section id="toggles" title="10. Toggles / Switches" description="Simple on/off controls for settings and features.">
      <div className={`${cardClass} max-w-md p-2`}>
        {[
          { l: 'Metronome click', d: 'Play a click while recording', on: a, set: () => setA((v) => !v) },
          { l: 'Auto-save', d: 'Save changes every minute', on: b, set: () => setB((v) => !v) },
        ].map((r) => (
          <div key={r.l} className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">{r.l}</div>
              <div className="text-xs text-slate-500">{r.d}</div>
            </div>
            <Switch on={r.on} set={r.set} label={r.l} />
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="text-sm font-semibold text-slate-800">Disabled</div>
          <Switch on={false} disabled label="Disabled" />
        </div>
      </div>
    </Section>
  );
}

export function Checkboxes() {
  const items = ['Kick', 'Snare', 'Hi-hat'];
  const [checked, setChecked] = useState<string[]>(['Kick']);
  const all = checked.length === items.length;
  const some = checked.length > 0 && !all;
  const flip = (i: string) => setChecked((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]));
  return (
    <Section id="checkboxes" title="11. Checkboxes" description="Boolean selections and multi-select interfaces.">
      <div className={`${cardClass} max-w-xs p-5 space-y-3 text-sm text-slate-700`}>
        <label className="flex items-center gap-2.5 font-semibold text-slate-800 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 accent-[#00c9a7]" checked={all}
            ref={(el) => { if (el) el.indeterminate = some; }}
            onChange={() => setChecked(all ? [] : items)} />
          Select all
        </label>
        <div className="pl-6 space-y-3">
          {items.map((i) => (
            <label key={i} className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-[#00c9a7]" checked={checked.includes(i)} onChange={() => flip(i)} />
              {i}
            </label>
          ))}
        </div>
        <label className="flex items-center gap-2.5 text-slate-400 cursor-not-allowed">
          <input type="checkbox" disabled className="w-4 h-4" /> Disabled
        </label>
      </div>
    </Section>
  );
}

export function Radios() {
  const [v, setV] = useState('stereo');
  const opts = [
    { id: 'mono', l: 'Mono', d: 'Single channel' },
    { id: 'stereo', l: 'Stereo', d: 'Left and right' },
    { id: 'surround', l: 'Surround', d: '5.1 channels' },
  ];
  return (
    <Section id="radios" title="12. Radio Buttons" description="Selecting one choice from a small group of mutually exclusive options.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        <div className={`${cardClass} p-5 space-y-3 text-sm text-slate-700`}>
          {opts.map((o) => (
            <label key={o.id} className="flex items-center gap-2.5 cursor-pointer">
              <input type="radio" name="guide-radio" className="w-4 h-4 accent-[#00c9a7]" checked={v === o.id} onChange={() => setV(o.id)} />
              {o.l}
            </label>
          ))}
        </div>
        <div className="space-y-2">
          {opts.map((o) => (
            <label key={o.id} className={`flex items-center gap-3 px-4 h-14 rounded-2xl bg-white border cursor-pointer transition ${v === o.id ? 'border-[#00c9a7] ring-2 ring-[#00c9a7]/20' : 'border-slate-200 hover:bg-slate-50'}`}>
              <input type="radio" name="guide-radio-card" className="w-4 h-4 accent-[#00c9a7]" checked={v === o.id} onChange={() => setV(o.id)} />
              <div>
                <div className="text-sm font-semibold text-slate-800">{o.l}</div>
                <div className="text-xs text-slate-500">{o.d}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </Section>
  );
}

export function Sliders() {
  const [vol, setVol] = useState(70);
  const [pan, setPan] = useState(0);
  const pct = vol;
  return (
    <Section id="sliders" title="13. Sliders" description="Adjusting continuous values such as volume, opacity, intensity, zoom, or brightness.">
      <div className={`${cardClass} max-w-md p-5 space-y-6`}>
        <div>
          <div className="flex justify-between text-sm mb-2"><span className="font-medium text-slate-700">Volume</span><span className="text-slate-500">{vol}%</span></div>
          <input type="range" min={0} max={100} value={vol} onChange={(e) => setVol(Number(e.target.value))} aria-label="Volume"
            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#00c9a7]"
            style={{ background: `linear-gradient(to right, #00c9a7 ${pct}%, #e2e8f0 ${pct}%)` }} />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-2"><span className="font-medium text-slate-700">Pan</span><span className="text-slate-500">{pan === 0 ? 'C' : pan < 0 ? `L${-pan}` : `R${pan}`}</span></div>
          <input type="range" min={-50} max={50} value={pan} onChange={(e) => setPan(Number(e.target.value))} aria-label="Pan" className="w-full accent-[#00c9a7] cursor-pointer" />
        </div>
        <div>
          <div className="text-sm font-medium text-slate-400 mb-2">Disabled</div>
          <input type="range" disabled defaultValue={30} aria-label="Disabled slider" className="w-full opacity-50 cursor-not-allowed" />
        </div>
      </div>
    </Section>
  );
}
