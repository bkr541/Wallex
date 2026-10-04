import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ArrowUp, ArrowUpRight, Bell, Check, ChevronDown, CreditCard, Eye, EyeOff, Hash, Landmark, Lock, Minus, PiggyBank, Plus, Search, X } from 'lucide-react';
import SectionTitle from '../components/SectionTitle';
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

/* 1.1 · Floating label: the label rides up into the border as you type, on a thick rounded field with a halo. */
function FloatingField() {
  const [v, setV] = useState('');
  return (
    <div className="relative w-full">
      <input
        id="fl"
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder=" "
        className="peer w-full rounded-2xl border-2 border-line bg-transparent px-4 pt-6 pb-2 text-sm text-ink outline-none transition-all focus:border-accent focus:shadow-[0_0_0_5px_var(--accent-soft)]"
      />
      <label
        htmlFor="fl"
        className="pointer-events-none absolute top-2 left-4 text-[11px] font-semibold text-accent transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:text-muted peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-accent"
      >
        Account nickname
      </label>
      {v && <Check className="absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-accent" />}
    </div>
  );
}

/* 1.2 · Brutalist: square corners, a heavy border, a label bolted on as a solid block, and a hard shadow that
   the field sinks into when focused. */
function BoltedField() {
  return (
    <div className="flex w-full items-stretch border-2 border-ink bg-card shadow-[5px_5px_0_var(--accent)] transition-all focus-within:translate-x-[3px] focus-within:translate-y-[3px] focus-within:shadow-[2px_2px_0_var(--accent)]">
      <span className="flex items-center bg-ink px-3 font-support text-[11px] font-black tracking-[0.2em] text-canvas uppercase">Email</span>
      <input placeholder="you@wallex.app" className="min-w-0 flex-1 bg-transparent px-3 py-3.5 text-sm font-medium text-ink outline-none placeholder:text-muted" />
    </div>
  );
}

/* 1.3 · Display line: no box at all. Large type, a counter, and a rule that draws out from the middle. */
function LineField() {
  const [v, setV] = useState('');
  const [on, setOn] = useState(false);
  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between">
        <span className="font-support text-[10px] tracking-[0.3em] text-muted uppercase">Note to self</span>
        <span className="font-support text-xs text-muted tabular-nums">{v.length}/40</span>
      </div>
      <input
        value={v}
        maxLength={40}
        onChange={(e) => setV(e.target.value)}
        onFocus={() => setOn(true)}
        onBlur={() => setOn(false)}
        placeholder="Rent is due on the 1st…"
        className="w-full bg-transparent py-2 text-2xl font-semibold tracking-tight text-ink outline-none placeholder:text-muted/50"
      />
      <div className="relative h-px bg-line">
        <motion.span className="absolute inset-y-[-1px] left-1/2 h-[3px] -translate-x-1/2 rounded-full bg-accent" animate={{ width: on ? '100%' : '0%' }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} />
      </div>
    </div>
  );
}

/* 1.4 · Search pill: the icon is a filled circle, the whole pill grows when you click into it, and a shortcut hint
   sits at the right until you type. */
function SearchPill() {
  const [q, setQ] = useState('');
  const [on, setOn] = useState(false);
  return (
    <motion.div
      animate={{ width: on || q ? '100%' : '78%' }}
      transition={spring}
      className={`flex items-center gap-2 rounded-full bg-surface p-1.5 pr-3 shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition-shadow ${on ? 'ring-2 ring-accent' : 'ring-1 ring-line'}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-canvas">
        <Search className="h-4 w-4" strokeWidth={2.5} />
      </span>
      <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setOn(true)} onBlur={() => setOn(false)} placeholder="Search merchants" className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted" />
      {q ? (
        <button type="button" aria-label="Clear" onClick={() => setQ('')} className="cursor-pointer text-muted hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      ) : (
        <kbd className="rounded-md border border-line bg-canvas px-1.5 py-0.5 font-support text-[10px] text-muted">⌘K</kbd>
      )}
    </motion.div>
  );
}

/* 1.5 · Password with a strength meter: an icon tile fixed to the left edge, a reveal button fixed to the right,
   and four bars that fill and change colour as the password gets stronger. */
function PasswordMeter() {
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const score = [pw.length >= 8, pw.length >= 12, /\d/.test(pw) && /[a-zA-Z]/.test(pw), /[^a-zA-Z0-9]/.test(pw)].filter(Boolean).length;
  const labels = ['Too short', 'Weak', 'Okay', 'Good', 'Strong'];
  const colors = ['var(--line)', '#f87171', '#f5c542', '#6cc4ff', 'var(--accent)'];
  return (
    <div className="w-full">
      <div className="flex items-stretch overflow-hidden rounded-lg border border-line bg-surface focus-within:border-accent">
        <span className="flex w-11 items-center justify-center border-r border-line bg-canvas/40">
          <Lock className="h-4 w-4 text-muted" />
        </span>
        <input type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Choose a passphrase" className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-ink outline-none placeholder:text-muted" />
        <button type="button" aria-label={show ? 'Hide' : 'Show'} onClick={() => setShow((s) => !s)} className="flex w-11 cursor-pointer items-center justify-center border-l border-line text-muted hover:text-ink">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
            <motion.span className="block h-full rounded-full" initial={false} animate={{ width: i < score ? '100%' : '0%', background: colors[score] }} transition={{ duration: 0.3 }} />
          </span>
        ))}
        <span className="w-16 text-right font-support text-[11px] text-muted">{pw ? labels[score] : ''}</span>
      </div>
    </div>
  );
}

/* 1.6 · Tag input: type and press Enter, and each entry becomes a chip inside a dashed field. */
function TagField() {
  const [tags, setTags] = useState<string[]>(['Rent', 'Spotify']);
  const [v, setV] = useState('');
  const add = () => {
    const t = v.trim().replace(/,$/, '');
    if (t && !tags.includes(t)) setTags((c) => [...c, t]);
    setV('');
  };
  return (
    <div className="w-full">
      <span className="mb-1.5 flex items-center gap-1.5 font-support text-xs text-muted">
        <Hash className="h-3.5 w-3.5" />
        Hide these from Patterns
      </span>
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border-2 border-dashed border-line p-2 transition-colors focus-within:border-solid focus-within:border-accent">
        <AnimatePresence initial={false}>
          {tags.map((t) => (
            <motion.span key={t} layout initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={spring} className="flex items-center gap-1 rounded-md bg-accent-soft py-1 pr-1 pl-2 text-xs font-medium text-accent">
              {t}
              <button type="button" aria-label={`Remove ${t}`} onClick={() => setTags((c) => c.filter((x) => x !== t))} className="flex h-4 w-4 cursor-pointer items-center justify-center rounded hover:bg-accent hover:text-canvas">
                <X className="h-3 w-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add();
            } else if (e.key === 'Backspace' && !v) setTags((c) => c.slice(0, -1));
          }}
          placeholder={tags.length ? '' : 'Type and press Enter'}
          className="min-w-[6rem] flex-1 bg-transparent px-1 py-1 text-sm text-ink outline-none"
        />
      </div>
    </div>
  );
}

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

/* ========================================================================================== BUTTONS */

/* 2.1 · Arrow orb: the arrow lives in its own circle, which turns and inverts when you point at it. */
function ArrowOrb() {
  return (
    <button type="button" className="group inline-flex cursor-pointer items-center gap-4 rounded-full bg-accent py-1.5 pr-1.5 pl-6 text-sm font-semibold text-canvas shadow-[0_8px_22px_color-mix(in_srgb,var(--accent)_35%,transparent)]">
      Connect your bank
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-canvas text-ink transition-all duration-300 group-hover:rotate-[-45deg] group-hover:bg-ink group-hover:text-canvas">
        <ArrowRight className="h-4 w-4" />
      </span>
    </button>
  );
}

/* 2.2 · Hard shadow: sharp corners, a thick outline and an offset block shadow that it presses into. */
function HardShadow() {
  return (
    <button type="button" className="cursor-pointer border-2 border-ink bg-accent px-6 py-3 text-xs font-black tracking-[0.2em] text-canvas uppercase shadow-[6px_6px_0_var(--text)] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_var(--text)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none">
      Add account
    </button>
  );
}

/* 2.3 · Split button: a main action and a separate arrow that opens the related choices. */
function SplitButton() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <div className="inline-flex overflow-hidden rounded-xl text-sm font-semibold text-canvas">
        <button type="button" className="flex cursor-pointer items-center gap-2 bg-accent px-5 py-3 hover:brightness-110">
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Import
        </button>
        <button type="button" aria-label="More ways to import" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex cursor-pointer items-center border-l-2 border-canvas/40 bg-accent px-3 hover:brightness-110">
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.14 }} className="absolute top-full right-0 z-20 mt-2 w-44 rounded-xl border border-line bg-card p-1.5 text-sm font-normal text-ink shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
            {['From a CSV file', 'Link another bank', 'Add by hand'].map((t) => (
              <button key={t} type="button" onClick={() => setOpen(false)} className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left hover:bg-surface">
                {t}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* 2.4 · Progress fill: pressing it fills the button from the left like a download, counting up. */
function ProgressFill() {
  const [pct, setPct] = useState<number | null>(null);
  useEffect(() => {
    if (pct === null || pct >= 100) return;
    const id = setTimeout(() => setPct((p) => (p === null ? p : Math.min(100, p + 4))), 60);
    return () => clearTimeout(id);
  }, [pct]);
  useEffect(() => {
    if (pct !== 100) return;
    const id = setTimeout(() => setPct(null), 1400);
    return () => clearTimeout(id);
  }, [pct]);
  return (
    <button type="button" disabled={pct !== null && pct < 100} onClick={() => setPct(0)} className="relative min-w-[11.5rem] cursor-pointer overflow-hidden rounded-lg border-2 border-accent bg-transparent px-5 py-3 text-sm font-semibold text-ink disabled:cursor-progress">
      <span className="absolute inset-y-0 left-0 bg-accent/55" style={{ width: `${pct ?? 0}%`, transition: 'width 0.06s linear' }} />
      <span className="relative flex items-center justify-center gap-2">
        {pct === null ? 'Sync transactions' : pct < 100 ? `Syncing ${pct}%` : (<><Check className="h-4 w-4" strokeWidth={3} /> Synced</>)}
      </span>
    </button>
  );
}

/* 2.5 · Locked: striped and dashed, with a padlock, and a tooltip that says why it can't be pressed. */
function Locked() {
  return (
    <div className="group relative inline-block">
      <button type="button" aria-disabled="true" onClick={(e) => e.preventDefault()} className="flex cursor-not-allowed items-center gap-2 rounded-lg border-2 border-dashed border-line px-5 py-3 text-sm font-semibold text-muted" style={{ background: 'repeating-linear-gradient(135deg, transparent 0 7px, color-mix(in srgb, var(--muted) 14%, transparent) 7px 9px)' }}>
        <Lock className="h-4 w-4" />
        Run forecast
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 translate-y-1 rounded-md bg-ink px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-canvas opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
        Connect a bank first
      </span>
    </div>
  );
}

/* 2.6 · Morph: after you press it, the button shrinks into a round tick and then grows back. */
function Morph() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const id = setTimeout(() => setDone(false), 1600);
    return () => clearTimeout(id);
  }, [done]);
  return (
    <motion.button type="button" onClick={() => setDone(true)} animate={{ width: done ? 52 : 168 }} transition={spring} className="flex h-[52px] cursor-pointer items-center justify-center overflow-hidden rounded-full bg-accent text-sm font-semibold whitespace-nowrap text-canvas">
      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <motion.span key="ok" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
            <Check className="h-5 w-5" strokeWidth={3} />
          </motion.span>
        ) : (
          <motion.span key="go" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            Save changes
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/* 2.7 · Shimmer: a bright band keeps sweeping across a gradient with a glow underneath. */
function Shimmer() {
  return (
    <button type="button" className="relative cursor-pointer overflow-hidden rounded-xl px-7 py-3.5 text-sm font-bold text-canvas shadow-[0_12px_32px_color-mix(in_srgb,var(--accent)_45%,transparent)]" style={{ background: 'linear-gradient(120deg, var(--accent), color-mix(in srgb, var(--accent) 50%, #4aa3ff) 55%, color-mix(in srgb, var(--accent) 60%, #b9a2ff))' }}>
      <motion.span aria-hidden="true" className="absolute inset-y-0 w-10 -skew-x-[20deg] bg-white/45 blur-[2px]" initial={{ left: '-30%' }} animate={{ left: '130%' }} transition={{ duration: 1.1, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1.4 }} />
      <span className="relative">See your overview</span>
    </button>
  );
}

/* 2.8 · Orbit border: a dark button with a light that circles its edge all the time. */
function OrbitBorder() {
  return (
    <button type="button" className="group relative cursor-pointer overflow-hidden rounded-xl p-[2px]">
      <motion.span aria-hidden="true" className="absolute -inset-[150%]" style={{ background: 'conic-gradient(from 0deg, transparent 0 62%, var(--accent) 92%, transparent 100%)' }} animate={{ rotate: 360 }} transition={{ duration: 2.6, ease: 'linear', repeat: Infinity }} />
      <span className="relative flex items-center gap-2 rounded-[10px] bg-canvas px-6 py-3 text-sm font-semibold text-ink transition-colors group-hover:bg-card">
        Review recurring
        <ArrowUpRight className="h-4 w-4 text-accent transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </span>
    </button>
  );
}

/* 2.9 · Press and hold: for actions that should not happen by accident. Hold it down and a fill runs across. */
function HoldToConfirm() {
  const [holding, setHolding] = useState(false);
  const [done, setDone] = useState(false);
  const timer = useRef<number | null>(null);
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (!done) return;
    const id = setTimeout(() => setDone(false), 1500);
    return () => clearTimeout(id);
  }, [done]);
  return (
    <button
      type="button"
      onPointerDown={() => {
        setHolding(true);
        timer.current = window.setTimeout(() => {
          setDone(true);
          setHolding(false);
        }, 1000);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      className="relative min-w-[11rem] cursor-pointer overflow-hidden rounded-xl border border-red-400/60 bg-red-400/10 px-6 py-3 text-sm font-semibold text-red-300 select-none"
    >
      <span className="absolute inset-y-0 left-0 bg-red-400/70" style={{ width: holding || done ? '100%' : '0%', transition: holding ? 'width 1s linear' : 'width 0.25s ease-out' }} />
      <span className={`relative flex items-center justify-center gap-2 ${holding || done ? 'text-canvas' : ''}`}>
        {done ? (<><Check className="h-4 w-4" strokeWidth={3} /> Unlinked</>) : 'Hold to unlink bank'}
      </span>
    </button>
  );
}

/* =========================================================================================== BADGES */

/* 3.1 · Live: a pill with a dot that pings, for something that is happening right now. */
function LivePill() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft py-1 pr-3 pl-2.5 font-support text-xs font-semibold text-accent">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
      </span>
      Confirmed · live
    </span>
  );
}

/* 3.2 · Tag: a luggage-tag shape pointing right, with a punched hole. */
function TagShape() {
  return (
    <span className="inline-flex h-8 items-center gap-2 bg-red-400 pr-7 pl-3 font-support text-xs font-bold text-canvas" style={{ clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)' }}>
      <span className="h-2.5 w-2.5 rounded-full bg-canvas/80" />
      Needs review
    </span>
  );
}

/* 3.3 · Stamp: tilted, double-ruled, in capitals like an ink stamp. It straightens when you point at it. */
function Stamp() {
  return (
    <span className="inline-flex -rotate-3 cursor-default items-center gap-1.5 border-2 border-amber-400 px-3 py-1 font-support text-[11px] font-black tracking-[0.22em] text-amber-400 uppercase shadow-[0_0_0_3px_var(--card),0_0_0_4px_color-mix(in_srgb,#fbbf24_60%,transparent)] transition-transform hover:rotate-0">
      <ArrowUp className="h-3 w-3" strokeWidth={3} />
      Price up
    </span>
  );
}

/* 3.4 · Notification: a count that sits on the corner of an icon and bounces when it arrives. */
function CountBadge() {
  const [n, setN] = useState(3);
  return (
    <button type="button" aria-label={`${n} alerts. Press to add one`} onClick={() => setN((c) => c + 1)} className="relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl bg-surface text-ink">
      <Bell className="h-5 w-5" />
      <motion.span key={n} initial={{ scale: 0.3 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 12 }} className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white ring-2 ring-card">
        {n}
      </motion.span>
    </button>
  );
}

/* 3.5 · Two-tone: a label and a value butted together as one badge, each half its own colour. */
function TwoTone() {
  return (
    <span className="inline-flex overflow-hidden rounded-md font-support text-[11px] font-semibold">
      <span className="bg-surface px-2.5 py-1 text-muted">recurring</span>
      <span className="bg-accent px-2.5 py-1 text-canvas">12 found</span>
    </span>
  );
}

/* 3.6 · Removable: a dashed chip you can dismiss, which collapses away, with a way to bring it back. */
function Removable() {
  const [gone, setGone] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <AnimatePresence mode="popLayout">
        {!gone && (
          <motion.span key="chip" layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6, x: -8 }} className="inline-flex items-center gap-2 rounded-lg border border-dashed py-1 pr-1 pl-1.5 font-support text-xs font-medium" style={{ borderColor: '#b9a2ff', background: 'color-mix(in srgb, #b9a2ff 12%, transparent)', color: '#b9a2ff' }}>
            <span className="flex h-5 w-5 items-center justify-center rounded" style={{ background: '#b9a2ff', color: 'var(--canvas)' }}>
              <Hash className="h-3 w-3" strokeWidth={3} />
            </span>
            Subscriptions
            <button type="button" aria-label="Remove" onClick={() => setGone(true)} className="flex h-5 w-5 cursor-pointer items-center justify-center rounded hover:bg-white/15">
              <X className="h-3 w-3" />
            </button>
          </motion.span>
        )}
      </AnimatePresence>
      {gone && (
        <button type="button" onClick={() => setGone(false)} className="cursor-pointer font-support text-xs text-muted underline underline-offset-2 hover:text-ink">
          Restore
        </button>
      )}
    </div>
  );
}

export default function ComponentsTab() {
  return (
    <div className="space-y-14 px-1 pb-12">
      <Group title="Inputs" icon="text-box-1">
        <Row index="01" name="Text fields" note="A floating label, a bolted-on label with a hard shadow, and a borderless display line.">
          <Cell caption="Floating label"><FloatingField /></Cell>
          <Cell caption="Bolted label, hard shadow"><BoltedField /></Cell>
          <Cell caption="Display line with counter"><LineField /></Cell>
        </Row>
        <Row index="02" name="With icons" note="A search pill that grows, a password with a strength meter, and a tag field.">
          <Cell caption="Search pill"><SearchPill /></Cell>
          <Cell caption="Password with strength meter"><PasswordMeter /></Cell>
          <Cell caption="Tag input"><TagField /></Cell>
        </Row>
        <Row index="03" name="Choosing" note="A stepper, a custom menu and a slider.">
          <Cell caption="Stepper"><Stepper /></Cell>
          <Cell caption="Listbox"><Listbox /></Cell>
          <Cell caption="Slider with bubble"><Slider /></Cell>
        </Row>
      </Group>

      <Group title="Primary buttons" icon="button-play-circle">
        <Row index="01" name="Shapes" note="An arrow orb, a hard-shadow block and a split button with a menu.">
          <Cell caption="Arrow orb"><ArrowOrb /></Cell>
          <Cell caption="Hard shadow"><HardShadow /></Cell>
          <Cell caption="Split button"><SplitButton /></Cell>
        </Row>
        <Row index="02" name="States" note="A progress fill, a locked button with a reason, and a button that morphs into a tick. Press them.">
          <Cell caption="Progress fill"><ProgressFill /></Cell>
          <Cell caption="Locked, with tooltip"><Locked /></Cell>
          <Cell caption="Morph to a tick"><Morph /></Cell>
        </Row>
        <Row index="03" name="Motion" note="A sweeping shimmer, a light that circles the edge, and a press-and-hold confirmation.">
          <Cell caption="Shimmer"><Shimmer /></Cell>
          <Cell caption="Orbit border"><OrbitBorder /></Cell>
          <Cell caption="Press and hold"><HoldToConfirm /></Cell>
        </Row>
      </Group>

      <Group title="Badges" icon="tag-alt">
        <Row index="01" name="Status" note="A live pill with a pinging dot, a tag shape, and a tilted stamp.">
          <Cell caption="Live pill"><LivePill /></Cell>
          <Cell caption="Tag shape"><TagShape /></Cell>
          <Cell caption="Stamp (point at it)"><Stamp /></Cell>
        </Row>
        <Row index="02" name="Labels" note="A count on an icon, a two-tone badge, and a chip you can remove.">
          <Cell caption="Count on icon (press it)"><CountBadge /></Cell>
          <Cell caption="Two-tone"><TwoTone /></Cell>
          <Cell caption="Removable chip"><Removable /></Cell>
        </Row>
      </Group>
    </div>
  );
}
