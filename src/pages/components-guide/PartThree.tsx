import React, { useEffect, useState } from 'react';
import * as L from 'lucide-react';
import { Section, Label, btn, cardClass, inputClass, useDismiss, menuPanelClass, menuItemClass } from './shared';

function Tip({ text, side = 'top', children }: { text: string; side?: 'top' | 'bottom'; children: React.ReactNode }) {
  return (
  <span className="relative inline-flex group">
    {children}
    <span
      role="tooltip"
      className={`pointer-events-none absolute left-1/2 -translate-x-1/2 ${side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-medium shadow-lg opacity-0 scale-95 transition group-hover:opacity-100 group-hover:scale-100 group-focus-within:opacity-100 group-focus-within:scale-100 z-30`}
    >
      {text}
    </span>
  </span>
);
}

export function Tooltips() {
  return (
    <Section id="tooltips" title="14. Tooltips" description="Small contextual explanations that appear on hover or focus.">
      <div className="flex flex-wrap items-center gap-6 pt-8 pb-8">
        <Tip text="Play (Space)"><button type="button" aria-label="Play" className={`${btn.base} ${btn.icon}`}><L.Play className="w-4 h-4" /></button></Tip>
        <Tip text="Add a new track" side="bottom"><button type="button" className={`${btn.base} ${btn.secondary}`}>Hover me</button></Tip>
        <Tip text="Tap tempo"><L.Info className="w-5 h-5 text-slate-400 cursor-help" tabIndex={0} /></Tip>
      </div>
    </Section>
  );
}

const BADGES: [string, string][] = [
  ['Active', 'bg-[#dcf6f0] text-[#00bda0]'],
  ['New', 'bg-[#fecba4]/50 text-orange-600'],
  ['Beta', 'bg-[#ccbefe]/40 text-violet-600'],
  ['Processing', 'bg-sky-100 text-sky-700'],
  ['Warning', 'bg-amber-100 text-amber-700'],
  ['Error', 'bg-red-100 text-red-600'],
  ['Offline', 'bg-slate-100 text-slate-500'],
];
const DOTS: [string, string][] = [
  ['Online', 'bg-emerald-500'], ['Away', 'bg-amber-400'], ['Busy', 'bg-red-500'], ['Offline', 'bg-slate-300'],
];

export function Badges() {
  return (
    <Section id="badges" title="15. Badges / Status Indicators" description="Things like Active, New, Offline, 3, Beta, Processing, or Error.">
      <div className="space-y-6">
        <div>
          <Label>Labels</Label>
          <div className="flex flex-wrap gap-2">
            {BADGES.map(([n, c]) => <span key={n} className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${c}`}>{n}</span>)}
          </div>
        </div>
        <div>
          <Label>Status dots</Label>
          <div className="flex flex-wrap gap-5 text-sm text-slate-700">
            {DOTS.map(([n, c]) => (
              <span key={n} className="inline-flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full ${c}`} />{n}</span>
            ))}
          </div>
        </div>
        <div>
          <Label>Counts</Label>
          <div className="flex items-center gap-6">
            <span className="relative inline-flex">
              <button type="button" aria-label="Notifications" className={`${btn.base} ${btn.icon}`}><L.Bell className="w-4 h-4" /></button>
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">3</span>
            </span>
            <span className="relative inline-flex">
              <button type="button" aria-label="Messages" className={`${btn.base} ${btn.icon}`}><L.Mail className="w-4 h-4" /></button>
              <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-[#00c9a7] ring-2 ring-white" />
            </span>
          </div>
        </div>
      </div>
    </Section>
  );
}

export function Menus() {
  const [overflow, setOverflow] = useState(false);
  const [profile, setProfile] = useState(false);
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null);
  const [sub, setSub] = useState(false);
  const oRef = useDismiss(overflow, () => setOverflow(false));
  const pRef = useDismiss(profile, () => setProfile(false));
  const cRef = useDismiss(!!ctx, () => setCtx(null));

  const Actions = ({ onPick }: { onPick: () => void }) => (
    <>
      <button type="button" className={menuItemClass} onClick={onPick}><L.Pencil className="w-4 h-4" /> Rename</button>
      <button type="button" className={menuItemClass} onClick={onPick}><L.Copy className="w-4 h-4" /> Duplicate</button>
      <button type="button" className={menuItemClass} onClick={onPick}><L.Share2 className="w-4 h-4" /> Share</button>
      <div className="my-1 h-px bg-slate-100" />
      <button type="button" className={`${menuItemClass} !text-red-500 hover:!bg-red-50`} onClick={onPick}><L.Trash2 className="w-4 h-4" /> Delete</button>
    </>
  );

  return (
    <Section id="menus" title="16. Menus" description="Context menus, overflow menus, profile menus, action menus, and nested menus.">
      <div className="flex flex-wrap items-start gap-8 min-h-[16rem]">
        <div ref={oRef} className="relative">
          <Label>Overflow</Label>
          <button type="button" aria-label="More" aria-haspopup="menu" aria-expanded={overflow} onClick={() => setOverflow((v) => !v)} className={`${btn.base} ${btn.icon}`}><L.MoreHorizontal className="w-4 h-4" /></button>
          {overflow && <div role="menu" className={menuPanelClass}><Actions onPick={() => setOverflow(false)} /></div>}
        </div>

        <div ref={pRef} className="relative">
          <Label>Profile</Label>
          <button type="button" aria-haspopup="menu" aria-expanded={profile} onClick={() => setProfile((v) => !v)} className="flex items-center gap-2 h-11 pl-1.5 pr-3 rounded-full bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6de0ee] to-[#ccbefe] text-white text-xs font-bold flex items-center justify-center">KR</span>
            <L.ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
          {profile && (
            <div role="menu" className={menuPanelClass}>
              <div className="px-3 py-2"><div className="text-sm font-semibold text-slate-800">Kody</div><div className="text-xs text-slate-500">kody@example.com</div></div>
              <div className="my-1 h-px bg-slate-100" />
              <button type="button" className={menuItemClass}><L.User className="w-4 h-4" /> Account</button>
              <button type="button" className={menuItemClass}><L.Settings className="w-4 h-4" /> Preferences</button>
              <div className="relative" onMouseEnter={() => setSub(true)} onMouseLeave={() => setSub(false)}>
                <button type="button" className={`${menuItemClass} justify-between`}><span className="flex items-center gap-2.5"><L.Palette className="w-4 h-4" /> Theme</span><L.ChevronRight className="w-4 h-4" /></button>
                {sub && (
                  <div className={`${menuPanelClass} !mt-0 top-0 left-full ml-1 !min-w-[9rem]`}>
                    <button type="button" className={menuItemClass}>Light</button>
                    <button type="button" className={menuItemClass}>Dark</button>
                    <button type="button" className={menuItemClass}>System</button>
                  </div>
                )}
              </div>
              <div className="my-1 h-px bg-slate-100" />
              <button type="button" className={menuItemClass}><L.LogOut className="w-4 h-4" /> Sign out</button>
            </div>
          )}
        </div>

        <div>
          <Label>Context (right-click)</Label>
          <div
            onContextMenu={(e) => {
              e.preventDefault();
              const r = e.currentTarget.getBoundingClientRect();
              setCtx({ x: e.clientX - r.left, y: e.clientY - r.top });
            }}
            className="relative w-64 h-32 rounded-3xl border-2 border-dashed border-slate-300 flex items-center justify-center text-sm text-slate-500"
          >
            Right-click here
            {ctx && (
              <div ref={cRef} role="menu" className={`${menuPanelClass} !mt-0`} style={{ left: ctx.x, top: ctx.y }}>
                <Actions onPick={() => setCtx(null)} />
              </div>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}

type ToastKind = 'success' | 'info' | 'error';
const TOAST_STYLES: Record<ToastKind, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  success: { icon: L.CheckCircle2, color: 'text-[#00bda0] bg-[#dcf6f0]' },
  info: { icon: L.Info, color: 'text-sky-600 bg-sky-100' },
  error: { icon: L.AlertCircle, color: 'text-red-500 bg-red-100' },
};

function Toast({ kind, title, body, onClose }: { kind: ToastKind; title: string; body?: string; onClose?: () => void }) {
  const { icon: Icon, color } = TOAST_STYLES[kind];
  return (
    <div role="status" className="w-80 flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-slate-100 shadow-[0_16px_40px_rgba(16,160,140,0.14),0_2px_12px_rgba(0,0,0,0.06)]">
      <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${color}`}><Icon className="w-4 h-4" /></span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        {body && <div className="text-xs text-slate-500 mt-0.5">{body}</div>}
      </div>
      {onClose && <button type="button" aria-label="Dismiss" onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer"><L.X className="w-4 h-4" /></button>}
    </div>
  );
}

export function Toasts() {
  const [live, setLive] = useState<{ id: number; kind: ToastKind; title: string } | null>(null);
  useEffect(() => {
    if (!live) return;
    const t = setTimeout(() => setLive(null), 2500);
    return () => clearTimeout(t);
  }, [live]);
  const fire = (kind: ToastKind, title: string) => setLive({ id: Date.now(), kind, title });
  return (
    <Section id="toasts" title="17. Notifications / Toasts" description="Temporary feedback such as Saved, Upload complete, Connection lost, or Copied.">
      <div className="space-y-6">
        <div className="space-y-3">
          <Toast kind="success" title="Saved" body="Summer EP was saved." />
          <Toast kind="info" title="Upload complete" body="3 files added to the library." />
          <Toast kind="error" title="Connection lost" body="Retrying in 5 seconds…" onClose={() => {}} />
        </div>
        <div>
          <Label>Live (auto-dismiss)</Label>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={`${btn.base} ${btn.secondary}`} onClick={() => fire('success', 'Copied')}>Show “Copied”</button>
            <button type="button" className={`${btn.base} ${btn.dangerSoft}`} onClick={() => fire('error', 'Connection lost')}>Show error</button>
          </div>
        </div>
      </div>
      {live && (
        <div key={live.id} className="fixed bottom-6 right-6 z-50">
          <Toast kind={live.kind} title={live.title} onClose={() => setLive(null)} />
        </div>
      )}
    </Section>
  );
}

export function Progress() {
  const [pct, setPct] = useState(45);
  useEffect(() => {
    const t = setInterval(() => setPct((p) => (p >= 100 ? 0 : p + 5)), 700);
    return () => clearInterval(t);
  }, []);
  const steps = ['Upload', 'Analyze', 'Export'];
  const step = 1;
  const R = 22;
  const C = 2 * Math.PI * R;
  return (
    <Section id="progress" title="18. Progress Indicators" description="Progress bars, spinners, loading states, skeleton loaders, step indicators, and percentages.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        <div className={`${cardClass} p-5 space-y-5`}>
          <div>
            <div className="flex justify-between text-sm mb-2"><span className="font-medium text-slate-700">Uploading…</span><span className="text-slate-500">{pct}%</span></div>
            <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="h-2 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full rounded-full bg-[#00c9a7] transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="h-2 rounded-full bg-slate-200 overflow-hidden relative">
            <div className="absolute inset-y-0 w-1/3 rounded-full bg-[#00c9a7] animate-pulse" style={{ left: '33%' }} />
          </div>
          <div className="flex items-center gap-6">
            <L.Loader2 className="w-6 h-6 text-[#00c9a7] animate-spin" />
            <span className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-[#00c9a7] animate-spin" />
            <svg width="52" height="52" viewBox="0 0 52 52" role="img" aria-label={`${pct}%`}>
              <circle cx="26" cy="26" r={R} fill="none" stroke="#e2e8f0" strokeWidth="5" />
              <circle cx="26" cy="26" r={R} fill="none" stroke="#00c9a7" strokeWidth="5" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} transform="rotate(-90 26 26)" className="transition-all duration-500" />
              <text x="26" y="30" textAnchor="middle" className="fill-slate-700 text-[11px] font-semibold">{pct}%</text>
            </svg>
          </div>
        </div>
        <div className={`${cardClass} p-5 space-y-5`}>
          <div className="flex items-center gap-3 animate-pulse">
            <div className="w-12 h-12 rounded-2xl bg-slate-200" />
            <div className="flex-1 space-y-2"><div className="h-3 w-2/3 rounded-full bg-slate-200" /><div className="h-3 w-1/3 rounded-full bg-slate-200" /></div>
          </div>
          <div className="flex items-center">
            {steps.map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center gap-1">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i < step ? 'bg-[#00c9a7] text-white' : i === step ? 'bg-[#dcf6f0] text-[#00bda0] ring-2 ring-[#00c9a7]' : 'bg-slate-100 text-slate-400'}`}>
                    {i < step ? <L.Check className="w-4 h-4" /> : i + 1}
                  </span>
                  <span className={`text-xs font-medium ${i <= step ? 'text-slate-800' : 'text-slate-400'}`}>{s}</span>
                </div>
                {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-2 mb-5 rounded-full ${i < step ? 'bg-[#00c9a7]' : 'bg-slate-200'}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

export function Toolbars() {
  return (
    <Section id="toolbars" title="19. Headers / Toolbars" description="Page titles plus actions like Save, Edit, Share, Filter, Sort, View, Undo, and Redo.">
      <div className="space-y-4 max-w-4xl">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-2xl font-semibold text-slate-800 tracking-tight">Summer EP</h3>
            <p className="text-sm text-slate-500">5 tracks · Edited 2 min ago</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className={`${btn.base} ${btn.outline}`}><L.Share2 className="w-4 h-4" /> Share</button>
            <button type="button" className={`${btn.base} ${btn.primary}`}><L.Save className="w-4 h-4" /> Save</button>
          </div>
        </div>
        <div className={`${cardClass} flex items-center gap-1 p-1.5 flex-wrap`}>
          {[L.Undo2, L.Redo2].map((Icon, i) => (
            <button key={i} type="button" aria-label={i ? 'Redo' : 'Undo'} className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"><Icon className="w-4 h-4" /></button>
          ))}
          <span className="w-px h-5 bg-slate-200 mx-1" />
          <button type="button" className="h-9 px-3 rounded-full flex items-center gap-2 text-sm font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"><L.Pencil className="w-4 h-4" /> Edit</button>
          <button type="button" className="h-9 px-3 rounded-full flex items-center gap-2 text-sm font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"><L.Filter className="w-4 h-4" /> Filter</button>
          <button type="button" className="h-9 px-3 rounded-full flex items-center gap-2 text-sm font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"><L.ArrowUpDown className="w-4 h-4" /> Sort</button>
          <span className="flex-1" />
          <div className="inline-flex p-0.5 rounded-full bg-slate-100">
            <button type="button" aria-label="List view" className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-[#00bda0] cursor-pointer"><L.List className="w-4 h-4" /></button>
            <button type="button" aria-label="Grid view" className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 cursor-pointer"><L.LayoutGrid className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </Section>
  );
}

const ICONS: [string, React.ComponentType<{ className?: string; strokeWidth?: number }>][] = [
  ['Settings', L.Settings], ['Play', L.Play], ['Pause', L.Pause], ['Search', L.Search], ['Delete', L.Trash2],
  ['Download', L.Download], ['Upload', L.Upload], ['Favorite', L.Heart], ['Close', L.X], ['Add', L.Plus],
  ['Edit', L.Pencil], ['Copy', L.Copy], ['Share', L.Share2], ['Check', L.Check], ['Info', L.Info],
  ['Warning', L.AlertTriangle], ['Music', L.Music], ['Folder', L.Folder], ['Volume', L.Volume2], ['Home', L.Home],
];

export function Icons() {
  return (
    <Section id="icons" title="20. Icons" description="Visual shorthand for actions and concepts. Uses lucide-react at 1.8 stroke width, matching the sidebar.">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-3 max-w-4xl">
        {ICONS.map(([name, Icon]) => (
          <div key={name} className={`${cardClass} !rounded-2xl h-24 flex flex-col items-center justify-center gap-2 text-slate-700 hover:text-[#00bda0] transition`}>
            <Icon className="w-6 h-6" strokeWidth={1.8} />
            <span className="text-xs text-slate-500">{name}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-end gap-5 text-slate-700">
        {['w-4 h-4', 'w-5 h-5', 'w-6 h-6', 'w-8 h-8'].map((s) => <L.Music key={s} className={s} strokeWidth={1.8} />)}
        <span className="text-xs text-slate-500">16 / 20 / 24 / 32px</span>
      </div>
    </Section>
  );
}
