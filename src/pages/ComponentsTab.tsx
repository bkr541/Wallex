import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { User, Check, ChevronDown, CreditCard, Landmark, Minus, PiggyBank, Plus } from 'lucide-react';
import SectionTitle from '../components/SectionTitle';
import { overviewRows } from '../components/kit/overview';
import { patternsRows } from '../components/kit/patterns';
import { settingsRows } from '../components/kit/settings';
import type { KitRow } from '../components/kit/shared';
import { transactionRows } from '../components/kit/transactions';
import type { PlumpName } from '../components/PlumpIcon';

// A kit of the basic pieces the app is built from. Within a row, every component is a different design: its own
// border, icon treatment, placement and motion. They all work, and all draw from the theme variables, so they
// follow the theme and accent chosen in Settings → Appearance.

function Row({ index, name, note, children }: { index: string; name: string; note: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3">
        <span className="font-support text-xs tracking-widest text-muted">{index}</span>
        <h4 className="text-base font-semibold">{name}</h4>
        <p className="font-support text-sm text-muted">{note}</p>
      </div>
      <div className="grid grid-cols-1 gap-x-8 gap-y-8 rounded-2xl border border-line bg-card/40 p-5 @3xl:grid-cols-3 @3xl:p-6">{children}</div>
    </section>
  );
}

function Group({ title, icon, children }: { title: string; icon: PlumpName; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <SectionTitle as="h3" icon={icon} className="border-b border-line px-3 pb-3 text-lg font-semibold">
        {title}
      </SectionTitle>
      <div className="space-y-8">{children}</div>
    </div>
  );
}

function Cell({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex min-h-[5.5rem] flex-1 items-center">{children}</div>
      <p className="font-support text-xs text-muted">{caption}</p>
    </div>
  );
}

const spring = { type: 'spring', stiffness: 420, damping: 30 } as const;

/* ============================================================================================ INPUTS */

/* 1.7 · Stepper: no text box, just a number between two round buttons, rolling up or down as it changes. */
function Stepper() {
  const [n, setN] = useState(250);
  const [dir, setDir] = useState(1);
  const step = (d: number) => {
    setDir(d);
    setN((x) => Math.max(0, x + d * 50));
  };
  return (
    <div className="w-full">
      <span className="mb-1.5 block font-support text-xs text-muted">Monthly budget</span>
      <div className="flex items-center justify-between rounded-full bg-surface p-1.5">
        <button type="button" aria-label="Less" onClick={() => step(-1)} className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-card text-ink shadow transition-transform active:scale-90">
          <Minus className="h-4 w-4" />
        </button>
        <span className="relative flex h-11 flex-1 items-center justify-center overflow-hidden text-2xl font-semibold tabular-nums">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={n} initial={{ y: dir * 22, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: dir * -22, opacity: 0 }} transition={{ duration: 0.18 }}>
              ${n.toLocaleString('en-US')}
            </motion.span>
          </AnimatePresence>
        </span>
        <button type="button" aria-label="More" onClick={() => step(1)} className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-accent text-canvas shadow transition-transform active:scale-90">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* 1.8 · Listbox: a custom menu in place of the browser's select, with a coloured icon per choice, a check on the
   chosen one, and a panel that scales open. */
const ACCOUNTS = [
  { id: 'checking', label: 'Total Checking', sub: '••6201', Icon: Landmark, color: 'var(--accent)' },
  { id: 'savings', label: 'Savings', sub: '••8830', Icon: PiggyBank, color: '#6cc4ff' },
  { id: 'card', label: 'Freedom card', sub: '••1111', Icon: CreditCard, color: '#b9a2ff' },
];
function Listbox() {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(ACCOUNTS[0]);
  return (
    <div className="relative w-full" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <span className="mb-1.5 block font-support text-xs text-muted">Account</span>
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-line bg-card px-3 py-2.5 text-left shadow-sm">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${sel.color} 18%, transparent)`, color: sel.color }}>
          <sel.Icon className="h-4 w-4" />
        </span>
        <span className="flex-1 text-sm font-medium">
          {sel.label} <span className="font-support text-xs text-muted">{sel.sub}</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul role="listbox" initial={{ opacity: 0, scale: 0.95, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -6 }} transition={{ duration: 0.15 }} className="absolute top-full z-20 mt-2 w-full origin-top rounded-xl border border-line bg-card p-1.5 shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
            {ACCOUNTS.map((a) => (
              <li key={a.id}>
                <button type="button" role="option" aria-selected={a.id === sel.id} onClick={() => { setSel(a); setOpen(false); }} className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-surface">
                  <a.Icon className="h-4 w-4" style={{ color: a.color }} />
                  <span className="flex-1">{a.label}</span>
                  {a.id === sel.id && <Check className="h-4 w-4 text-accent" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/* 1.9 · Slider: drag to choose, and a bubble above the thumb follows the value. */
function Slider() {
  const [v, setV] = useState(35);
  return (
    <div className="w-full pt-7">
      <div className="relative">
        <span className="absolute -top-8 -translate-x-1/2 rounded-md bg-ink px-2 py-0.5 text-xs font-bold text-canvas tabular-nums" style={{ left: `calc(${v}% + ${12 - v * 0.24}px)` }}>
          {v}%
          <span className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-ink" />
        </span>
        <input type="range" min={0} max={100} value={v} onChange={(e) => setV(Number(e.target.value))} aria-label="Savings goal" className="wx-range" style={{ ['--pct' as string]: `${v}%` }} />
      </div>
      <div className="mt-2 flex justify-between font-support text-[11px] text-muted">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
      <span className="mt-1 block font-support text-xs text-muted">Savings goal, % of income</span>
    </div>
  );
}


/* 1.10–1.15 · Underline fields: no box at all, only a line along the bottom and an icon on the left. Each one
   animates its line (and its icon) differently when you click into it. */
const lineBase = 'min-w-0 flex-1 bg-transparent py-2 text-base text-ink outline-none placeholder:text-muted/60';
const lineLabel = 'mb-1 block font-support text-[10px] font-semibold tracking-[0.2em] text-muted uppercase';

/* The line grows out from the middle; the icon waves like the email one and takes the accent colour. */
function CenterDraw() {
  const [v, setV] = useState('');
  const [on, setOn] = useState(false);
  return (
    <div className="w-full">
      <span className={lineLabel}>Full name</span>
      <div className="flex items-center gap-3">
        <motion.span animate={on ? { rotate: [0, -14, 14, -8, 0] } : { rotate: 0 }} transition={{ duration: 0.6 }} className={`transition-colors duration-200 ${on ? 'text-accent' : 'text-muted'}`}><User className="h-4 w-4" /></motion.span>
        <input value={v} onChange={(e) => setV(e.target.value)} onFocus={() => setOn(true)} onBlur={() => setOn(false)} placeholder="Ada Lovelace" className={lineBase} />
      </div>
      <div className="relative h-px bg-line">
        <motion.span className="absolute top-[-1px] left-1/2 h-[3px] -translate-x-1/2 rounded-full bg-accent" animate={{ width: on ? '100%' : '0%' }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} />
      </div>
    </div>
  );
}

// The parts the four main pages are built from, one row per kind of part, each shown three ways. The first
// mockup in a row is usually how the app does it today.
function KitGroup({ title, icon, rows }: { title: string; icon: PlumpName; rows: KitRow[] }) {
  return (
    <Group title={title} icon={icon}>
      {rows.map((r, i) => (
        <Row key={r.name} index={String(i + 1).padStart(2, '0')} name={r.name} note={`Used in ${r.used}.`}>
          {r.items.map(([caption, node]) => (
            <Cell key={caption} caption={caption}>{node}</Cell>
          ))}
        </Row>
      ))}
    </Group>
  );
}

export default function ComponentsTab() {
  return (
    <div className="space-y-14 px-1 pb-12">
      <Group title="Inputs" icon="text-box-1">
        <Row index="01" name="Choosing" note="A stepper, a custom menu and a slider.">
          <Cell caption="Stepper"><Stepper /></Cell>
          <Cell caption="Listbox"><Listbox /></Cell>
          <Cell caption="Slider with bubble"><Slider /></Cell>
        </Row>
        <Row index="02" name="Underline fields" note="No box, just a line and an icon. The line draws out from the middle when you click in.">
          <Cell caption="Draws from the middle"><CenterDraw /></Cell>
        </Row>
      </Group>

      <KitGroup title="Overview" icon="graph-bar-increase" rows={overviewRows} />
      <KitGroup title="Transactions" icon="dollar-coin" rows={transactionRows} />
      <KitGroup title="Settings" icon="paint-palette" rows={settingsRows} />
      <KitGroup title="Patterns" icon="layers-1" rows={patternsRows} />
    </div>
  );
}
