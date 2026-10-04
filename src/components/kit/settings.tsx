import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Camera, Check, ChevronDown, Eye, EyeOff, Monitor, Moon, Pencil, Sun, Trash2 } from 'lucide-react';
import PlumpIcon from '../PlumpIcon';
import { spring, type KitRow } from './shared';

/* ------------------------------------------------------------------------------- avatar uploader */
const gradient = 'linear-gradient(150deg, color-mix(in srgb, var(--accent) 80%, white), color-mix(in srgb, var(--accent) 55%, black))';

function CameraAvatar() {
  return (
    <div className="flex items-center gap-4">
      <span className="relative flex h-20 w-20 items-center justify-center rounded-full text-2xl font-semibold text-canvas" style={{ background: gradient }}>AL</span>
      <div><p className="font-semibold">Ada Lovelace</p><button type="button" className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm hover:border-muted"><Camera className="h-4 w-4" />Upload photo</button></div>
    </div>
  );
}
function EditBadgeAvatar() {
  return (
    <button type="button" aria-label="Edit photo" className="group relative h-20 w-20 cursor-pointer rounded-full">
      <span className="flex h-full w-full items-center justify-center rounded-full text-2xl font-semibold text-canvas ring-4 ring-accent/30" style={{ background: gradient }}>AL</span>
      <span className="absolute right-0 bottom-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-accent text-canvas transition-transform group-hover:scale-110"><Pencil className="h-3.5 w-3.5" /></span>
    </button>
  );
}
function DropAvatar() {
  const [over, setOver] = useState(false);
  return (
    <div onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); }} className={`flex w-full items-center gap-3 rounded-2xl border-2 border-dashed p-3 transition-colors ${over ? 'border-accent bg-accent-soft' : 'border-line'}`}>
      <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface text-muted"><Camera className="h-6 w-6" /></span>
      <span className="flex-1 font-support text-xs text-muted"><span className="block text-sm font-medium text-ink">Drop a photo here</span>or click to choose one</span>
      <button type="button" aria-label="Remove" className="cursor-pointer text-muted hover:text-ink"><Trash2 className="h-4 w-4" /></button>
    </div>
  );
}

/* ------------------------------------------------------------------------------- labeled field */
function IconLabelField() {
  return (
    <label className="block w-full"><span className="mb-1.5 flex items-center gap-2 text-sm font-medium"><PlumpIcon name="user-face-male" className="h-5 w-5 text-muted" />First name</span>
      <input placeholder="Ada" className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-muted focus:border-accent" /></label>
  );
}
function InsideIconField() {
  return (
    <span className="relative block w-full"><PlumpIcon name="mail-send" className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted" />
      <input placeholder="you@example.com" className="w-full rounded-xl border-2 border-transparent bg-surface py-3 pr-3 pl-11 text-sm outline-none placeholder:text-muted focus:border-accent focus:bg-card" /></span>
  );
}
function InlineField() {
  return (
    <label className="grid w-full grid-cols-[6rem_1fr] items-center gap-3 border-b border-line pb-2"><span className="font-support text-sm text-muted">Phone</span>
      <input placeholder="+1 555 123 4567" className="bg-transparent text-right text-sm outline-none placeholder:text-muted/60 focus:text-accent" /></label>
  );
}

/* ------------------------------------------------------------------------------- theme choice */
const THEMES = [{ id: 'system', label: 'System', Icon: Monitor }, { id: 'light', label: 'Light', Icon: Sun }, { id: 'dark', label: 'Dark', Icon: Moon }];
function PreviewThemes() {
  const [t, setT] = useState('dark');
  const tile = (bg: string, card: string) => <span className="flex h-12 w-full flex-col gap-1 rounded-md p-1.5" style={{ background: bg }}><span className="h-1 w-1/2 rounded-full bg-[#8a8a8a]" /><span className="flex-1 rounded" style={{ background: card }} /></span>;
  return (
    <div role="radiogroup" className="grid w-full grid-cols-3 gap-2">
      {THEMES.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={t === o.id} onClick={() => setT(o.id)} className={`cursor-pointer rounded-xl border p-1.5 text-left ${t === o.id ? 'border-accent bg-accent-soft' : 'border-line bg-surface'}`}>
          {o.id === 'dark' ? tile('#0a0a0a', '#1a1a1a') : o.id === 'light' ? tile('#f4f4f1', '#fff') : <span className="flex h-12 overflow-hidden rounded-md"><span className="flex-1 bg-[#f4f4f1]" /><span className="flex-1 bg-[#0a0a0a]" /></span>}
          <span className={`mt-1.5 flex items-center justify-between px-0.5 text-xs ${t === o.id ? '' : 'text-muted'}`}>{o.label}{t === o.id && <Check className="h-3 w-3 text-accent" />}</span>
        </button>
      ))}
    </div>
  );
}
function IconThemes() {
  const [t, setT] = useState('dark');
  return (
    <div role="radiogroup" className="inline-flex rounded-xl bg-surface p-1">
      {THEMES.map((o) => <button key={o.id} type="button" role="radio" aria-checked={t === o.id} aria-label={o.label} onClick={() => setT(o.id)} className={`flex h-10 w-12 cursor-pointer items-center justify-center rounded-lg transition-colors ${t === o.id ? 'bg-accent text-canvas' : 'text-muted hover:text-ink'}`}><o.Icon className="h-5 w-5" /></button>)}
    </div>
  );
}
function ListThemes() {
  const [t, setT] = useState('system');
  return (
    <div role="radiogroup" className="w-full divide-y divide-line overflow-hidden rounded-xl border border-line">
      {THEMES.map((o) => <button key={o.id} type="button" role="radio" aria-checked={t === o.id} onClick={() => setT(o.id)} className="flex w-full cursor-pointer items-center gap-3 bg-card/40 px-3.5 py-2.5 text-left text-sm hover:bg-card"><o.Icon className="h-4 w-4 text-muted" /><span className="flex-1">{o.label}</span><span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${t === o.id ? 'border-accent' : 'border-line'}`}>{t === o.id && <span className="h-2 w-2 rounded-full bg-accent" />}</span></button>)}
    </div>
  );
}

/* ------------------------------------------------------------------------------- accent swatches */
const ACCENTS = [['Teal', '#4fb8a5'], ['Blue', '#4aa3ff'], ['Violet', '#a67cff'], ['Pink', '#ff6fa8'], ['Orange', '#ffa94d'], ['Green', '#5fd38d']];
function CircleSwatches() {
  const [a, setA] = useState(0);
  return <div role="radiogroup" className="flex gap-2.5">{ACCENTS.map(([n, c], i) => <button key={n} type="button" role="radio" aria-checked={a === i} aria-label={n} onClick={() => setA(i)} className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 ${a === i ? 'border-ink' : 'border-transparent'}`}><span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: c }}>{a === i && <Check className="h-4 w-4 text-[#0a0a0a]" strokeWidth={3} />}</span></button>)}</div>;
}
function SquareSwatches() {
  const [a, setA] = useState(1);
  return <div role="radiogroup" className="grid grid-cols-3 gap-2">{ACCENTS.slice(0, 6).map(([n, c], i) => <button key={n} type="button" role="radio" aria-checked={a === i} onClick={() => setA(i)} className={`overflow-hidden rounded-lg border-2 text-left ${a === i ? 'border-ink' : 'border-line'}`}><span className="block h-6" style={{ background: c }} /><span className="block px-2 py-1 font-support text-[11px]">{n}</span></button>)}</div>;
}
function ChipSwatches() {
  const [a, setA] = useState(2);
  return <div role="radiogroup" className="flex flex-wrap gap-1.5">{ACCENTS.map(([n, c], i) => <button key={n} type="button" role="radio" aria-checked={a === i} onClick={() => setA(i)} className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${a === i ? 'border-ink bg-surface font-semibold' : 'border-line text-muted'}`}><span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{n}</button>)}</div>;
}

/* ------------------------------------------------------------------------------- toggle switch */
function RowToggle() {
  const [on, setOn] = useState(false);
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => setOn(!on)} className="flex w-full cursor-pointer items-center justify-between gap-5 rounded-xl border border-line bg-surface px-4 py-3 text-left">
      <span><span className="block text-sm">Turn off animations</span><span className="block font-support text-xs text-muted">Reduce motion</span></span>
      <span aria-hidden="true" className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-line'}`}><span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} /></span>
    </button>
  );
}
function CheckToggle() {
  const [on, setOn] = useState(true);
  return (
    <button type="button" role="checkbox" aria-checked={on} onClick={() => setOn(!on)} className="flex cursor-pointer items-center gap-3 text-sm">
      <span className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors ${on ? 'border-accent bg-accent text-canvas' : 'border-line'}`}><AnimatePresence>{on && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Check className="h-4 w-4" strokeWidth={3} /></motion.span>}</AnimatePresence></span>
      Reduce motion
    </button>
  );
}
function BigToggle() {
  const [on, setOn] = useState(true);
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => setOn(!on)} className={`relative flex h-10 w-[88px] cursor-pointer items-center rounded-full px-1 transition-colors ${on ? 'bg-accent' : 'bg-surface'}`}>
      <span className={`absolute text-[10px] font-bold tracking-wider ${on ? 'left-3 text-canvas' : 'right-3 text-muted'}`}>{on ? 'ON' : 'OFF'}</span>
      <motion.span layout transition={spring} className={`flex h-8 w-8 items-center justify-center rounded-full bg-white shadow ${on ? 'ml-auto' : ''}`}>{on ? <Check className="h-4 w-4 text-accent" strokeWidth={3} /> : <span className="h-2 w-2 rounded-full bg-muted" />}</motion.span>
    </button>
  );
}

/* ------------------------------------------------------------------------------- select field */
const ENVS = ['Sandbox (test data)', 'Production (real accounts)'];
function FilledSelect() {
  const [v, setV] = useState(1);
  return (
    <label className="relative block w-full"><span className="mb-1.5 block text-sm font-medium">Environment</span>
      <select value={v} onChange={(e) => setV(Number(e.target.value))} className="w-full cursor-pointer appearance-none rounded-lg border border-line bg-surface px-3 py-2.5 pr-9 text-sm outline-none focus:border-accent">{ENVS.map((e, i) => <option key={e} value={i}>{e}</option>)}</select>
      <ChevronDown className="pointer-events-none absolute right-3 bottom-3 h-4 w-4 text-muted" /></label>
  );
}
function MenuSelect() {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(1);
  return (
    <div className="relative w-full" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm shadow-sm"><span>{ENVS[v]}</span><ChevronDown className={`h-4 w-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`} /></button>
      <AnimatePresence>{open && <motion.ul initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute top-full z-20 mt-1.5 w-full rounded-xl border border-line bg-card p-1 shadow-xl">{ENVS.map((e, i) => <li key={e}><button type="button" onClick={() => { setV(i); setOpen(false); }} className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-surface">{e}{v === i && <Check className="h-4 w-4 text-accent" />}</button></li>)}</motion.ul>}</AnimatePresence>
    </div>
  );
}
function SegmentSelect() {
  const [v, setV] = useState(1);
  return <div role="radiogroup" className="flex w-full gap-2">{ENVS.map((e, i) => <button key={e} type="button" role="radio" aria-checked={v === i} onClick={() => setV(i)} className={`flex-1 cursor-pointer rounded-lg border px-2 py-2.5 text-xs ${v === i ? 'border-accent bg-accent-soft font-semibold' : 'border-line text-muted'}`}>{e.split(' (')[0]}<span className="block font-support text-[10px] font-normal text-muted">{e.match(/\((.*)\)/)?.[1]}</span></button>)}</div>;
}

/* ------------------------------------------------------------------------------- toggle chips */
const PRODUCTS = ['Transactions', 'Auth', 'Balance', 'Identity'];
function useSet(initial: string[]) {
  const [s, setS] = useState(initial);
  return [s, (v: string) => setS((c) => (c.includes(v) ? c.filter((x) => x !== v) : [...c, v]))] as const;
}
function BorderChips() {
  const [s, t] = useSet(['Transactions']);
  return <div className="flex flex-wrap gap-2">{PRODUCTS.map((p) => <button key={p} type="button" role="checkbox" aria-checked={s.includes(p)} onClick={() => t(p)} className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${s.includes(p) ? 'border-accent bg-accent-soft' : 'border-line bg-surface text-muted'}`}>{p}</button>)}</div>;
}
function TickChips() {
  const [s, t] = useSet(['Transactions', 'Balance']);
  return <div className="flex flex-wrap gap-2">{PRODUCTS.map((p) => <button key={p} type="button" role="checkbox" aria-checked={s.includes(p)} onClick={() => t(p)} className={`flex cursor-pointer items-center gap-1.5 rounded-full border py-1.5 pr-3 pl-2 text-sm ${s.includes(p) ? 'border-accent text-ink' : 'border-line text-muted'}`}><span className={`flex h-4 w-4 items-center justify-center rounded-full ${s.includes(p) ? 'bg-accent text-canvas' : 'bg-line'}`}>{s.includes(p) && <Check className="h-3 w-3" strokeWidth={3} />}</span>{p}</button>)}</div>;
}
function SolidChips() {
  const [s, t] = useSet(['Auth']);
  return <div className="flex flex-wrap gap-1.5">{PRODUCTS.map((p) => <button key={p} type="button" role="checkbox" aria-checked={s.includes(p)} onClick={() => t(p)} className={`cursor-pointer rounded-md px-2.5 py-1 font-support text-xs font-semibold transition-colors ${s.includes(p) ? 'bg-ink text-canvas' : 'bg-surface text-muted hover:text-ink'}`}>{p.toUpperCase()}</button>)}</div>;
}

/* ------------------------------------------------------------------------------- confirm action */
function InlineConfirm() {
  const [c, setC] = useState(false);
  return c ? (
    <span className="flex flex-wrap items-center gap-2"><span className="font-support text-sm text-muted">Erase everything?</span><button type="button" onClick={() => setC(false)} className="cursor-pointer rounded-lg bg-red-500/90 px-3 py-1.5 text-sm font-semibold text-white">Yes, erase</button><button type="button" onClick={() => setC(false)} className="cursor-pointer rounded-lg border border-line px-3 py-1.5 text-sm">Cancel</button></span>
  ) : <button type="button" onClick={() => setC(true)} className="cursor-pointer rounded-lg border border-line px-4 py-2.5 text-sm font-semibold hover:border-red-400/60 hover:text-red-300">Reset saved data</button>;
}
function TwoStepConfirm() {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const id = setTimeout(() => setArmed(false), 3000); return () => clearTimeout(id); }, [armed]);
  return <button type="button" onClick={() => setArmed(!armed)} className={`flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${armed ? 'bg-red-500 text-white' : 'border border-line hover:border-red-400/60'}`}><Trash2 className="h-4 w-4" />{armed ? 'Click again to unlink' : 'Unlink Chase'}</button>;
}
function CardConfirm() {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full">
      {!open ? <button type="button" onClick={() => setOpen(true)} className="cursor-pointer font-support text-sm text-red-300 underline underline-offset-2">Delete my data…</button> : (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-red-400/40 bg-red-400/10 p-4">
          <p className="text-sm font-semibold">Delete everything saved here?</p><p className="mt-1 font-support text-xs text-muted">Your profile and settings are removed from this device.</p>
          <div className="mt-3 flex gap-2"><button type="button" onClick={() => setOpen(false)} className="cursor-pointer rounded-lg bg-red-500 px-3 py-1.5 text-sm font-semibold text-white">Delete</button><button type="button" onClick={() => setOpen(false)} className="cursor-pointer rounded-lg px-3 py-1.5 text-sm">Keep</button></div>
        </motion.div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------------- save bar */
function ButtonSave() {
  const [done, setDone] = useState(false);
  return <div className="flex gap-2"><button type="button" onClick={() => { setDone(true); setTimeout(() => setDone(false), 1500); }} className={`flex cursor-pointer items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-canvas ${done ? 'bg-green-400' : 'bg-accent'}`}>{done && <Check className="h-4 w-4" strokeWidth={3} />}{done ? 'Saved' : 'Save changes'}</button><button type="button" className="cursor-pointer rounded-lg border border-line px-4 py-2.5 text-sm font-semibold">Discard</button></div>;
}
function UnsavedBar() {
  return <div className="flex w-full items-center justify-between gap-3 rounded-xl bg-ink px-4 py-2.5 text-canvas"><span className="flex items-center gap-2 font-support text-sm"><span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />You have unsaved changes</span><span className="flex gap-1"><button type="button" className="cursor-pointer rounded-md px-2.5 py-1 text-sm opacity-70 hover:opacity-100">Discard</button><button type="button" className="cursor-pointer rounded-md bg-accent px-3 py-1 text-sm font-bold text-canvas">Save</button></span></div>;
}
function FloatSave() {
  return <button type="button" className="flex cursor-pointer items-center gap-2 rounded-full bg-accent py-2.5 pr-5 pl-3 text-sm font-bold text-canvas shadow-[0_10px_28px_color-mix(in_srgb,var(--accent)_45%,transparent)]"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-canvas/25"><Check className="h-4 w-4" strokeWidth={3} /></span>Save</button>;
}

/* ------------------------------------------------------------------------------- secret field */
function useReveal() { return useState(false); }
function EyeSecret() {
  const [s, setS] = useReveal();
  return <label className="block w-full"><span className="mb-1.5 block text-sm font-medium">Secret</span><span className="relative block"><input type={s ? 'text' : 'password'} defaultValue="abcdef123456" className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 pr-10 text-sm outline-none focus:border-accent" /><button type="button" aria-label="Show" onClick={() => setS(!s)} className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-muted hover:text-ink">{s ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>;
}
function TextSecret() {
  const [s, setS] = useReveal();
  return <div className="flex w-full items-center gap-2 border-b border-line pb-1.5"><input type={s ? 'text' : 'password'} defaultValue="abcdef123456" aria-label="Secret" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /><button type="button" onClick={() => setS(!s)} className="cursor-pointer font-support text-xs font-semibold text-accent">{s ? 'HIDE' : 'SHOW'}</button></div>;
}
function SavedSecret() {
  const [edit, setEdit] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  return edit ? <input ref={ref} autoFocus placeholder="New secret" onBlur={() => setEdit(false)} className="w-full rounded-lg border border-accent bg-surface px-3 py-2.5 text-sm outline-none" /> : <div className="flex w-full items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5"><Lock /><span className="flex-1 font-support text-sm text-muted">Saved — leave blank to keep it</span><button type="button" onClick={() => setEdit(true)} className="cursor-pointer text-sm text-accent hover:underline">Replace</button></div>;
}
const Lock = () => <PlumpIcon name="padlock-key" className="h-5 w-5 text-muted" />;

export const settingsRows: KitRow[] = [
  { name: 'Avatar uploader', used: 'Settings → Profile', items: [['Photo with button', <CameraAvatar />], ['Edit badge', <EditBadgeAvatar />], ['Drop zone', <DropAvatar />]] },
  { name: 'Labeled field', used: 'Settings → Profile and Setup', items: [['Icon beside the label', <IconLabelField />], ['Icon inside the field', <InsideIconField />], ['Inline label', <InlineField />]] },
  { name: 'Theme choice', used: 'Settings → Appearance', items: [['Preview cards', <PreviewThemes />], ['Icon buttons', <IconThemes />], ['Radio list', <ListThemes />]] },
  { name: 'Accent colour', used: 'Settings → Appearance', items: [['Circles', <CircleSwatches />], ['Swatch cards', <SquareSwatches />], ['Named chips', <ChipSwatches />]] },
  { name: 'Toggle', used: 'Settings → Appearance: Reduce motion', items: [['Row with switch', <RowToggle />], ['Checkbox', <CheckToggle />], ['Labelled switch', <BigToggle />]] },
  { name: 'Select', used: 'Settings → Setup: Environment, Bank, Language', items: [['Filled select', <FilledSelect />], ['Custom menu', <MenuSelect />], ['Choice buttons', <SegmentSelect />]] },
  { name: 'Choice chips', used: 'Settings → Setup: Products and Countries', items: [['Bordered', <BorderChips />], ['With ticks', <TickChips />], ['Solid capitals', <SolidChips />]] },
  { name: 'Secret field', used: 'Settings → Setup: Plaid secret', items: [['Eye button', <EyeSecret />], ['Text link', <TextSecret />], ['Saved with Replace', <SavedSecret />]] },
  { name: 'Destructive action', used: 'Settings → Profile and Setup: Reset, Unlink', items: [['Inline confirm', <InlineConfirm />], ['Click twice', <TwoStepConfirm />], ['Warning card', <CardConfirm />]] },
  { name: 'Save actions', used: 'Settings → Profile', items: [['Save and Discard', <ButtonSave />], ['Unsaved changes bar', <UnsavedBar />], ['Floating pill', <FloatSave />]] },
];
