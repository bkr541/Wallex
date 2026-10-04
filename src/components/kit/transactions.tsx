import { useId, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, BadgeCheck, CalendarClock, Check, ChevronDown, ChevronRight, Clock, RefreshCw, Sparkles, X } from 'lucide-react';
import ChaseLogo from '../ChaseLogo';
import MerchantLogo from '../MerchantLogo';
import { spring, type KitRow } from './shared';

/* ------------------------------------------------------------------------------- page tabs */
const TABS = ['TOTAL CHECKING ••6201', 'Recurring'];

function UnderTabs() {
  const [i, setI] = useState(0);
  const id = useId();
  return (
    <div role="tablist" className="flex w-full gap-1 border-b border-line">
      {TABS.map((t, n) => (
        <button key={t} type="button" role="tab" aria-selected={i === n} onClick={() => setI(n)} className={`relative flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm font-medium ${i === n ? 'text-ink' : 'text-muted hover:text-ink'}`}>
          {n === 0 && <ChaseLogo className="h-4 w-4" />}{t}
          {i === n && <motion.span layoutId={id} className="absolute inset-x-0 -bottom-px h-0.5 bg-accent" transition={spring} />}
        </button>
      ))}
    </div>
  );
}
function PillTabs() {
  const [i, setI] = useState(0);
  return (
    <div role="tablist" className="flex w-full gap-2">
      {TABS.map((t, n) => (
        <button key={t} type="button" role="tab" aria-selected={i === n} onClick={() => setI(n)} className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${i === n ? 'border-accent bg-accent-soft font-semibold text-ink' : 'border-line text-muted hover:text-ink'}`}>
          {n === 0 && <ChaseLogo className="h-4 w-4" />}{t}
        </button>
      ))}
    </div>
  );
}
function CardTabs() {
  const [i, setI] = useState(0);
  const id = useId();
  return (
    <div role="tablist" className="grid w-full grid-cols-2 rounded-xl bg-surface p-1">
      {TABS.map((t, n) => (
        <button key={t} type="button" role="tab" aria-selected={i === n} onClick={() => setI(n)} className={`relative z-10 flex cursor-pointer flex-col items-center rounded-lg py-2 text-xs ${i === n ? 'font-semibold text-ink' : 'text-muted'}`}>
          {i === n && <motion.span layoutId={id} className="absolute inset-0 -z-10 rounded-lg bg-card shadow" transition={spring} />}
          <span className="truncate px-1">{t}</span><span className="font-support text-[10px] text-muted">{n === 0 ? '4,400 transactions' : '57 found'}</span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------------------- status badge */
function TintBadge() {
  return <div className="flex gap-2"><span className="rounded-full bg-accent-soft px-3 py-1 font-support text-xs text-accent">Posted</span><span className="rounded-full bg-surface px-3 py-1 font-support text-xs text-muted">Pending</span></div>;
}
function DotBadge() {
  return <div className="flex gap-4 font-support text-xs"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" />Posted</span><span className="flex items-center gap-1.5 text-muted"><span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />Pending</span></div>;
}
function IconBadge() {
  return <div className="flex gap-2"><span className="inline-flex items-center gap-1 rounded-md border border-accent/50 px-2 py-1 font-support text-[11px] font-semibold text-accent"><Check className="h-3 w-3" strokeWidth={3} />POSTED</span><span className="inline-flex items-center gap-1 rounded-md border border-dashed border-muted px-2 py-1 font-support text-[11px] font-semibold text-muted"><Clock className="h-3 w-3" />PENDING</span></div>;
}

/* ------------------------------------------------------------------------------- transaction row */
function TableRow() {
  return (
    <div className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-line py-3">
      <span className="rounded-full bg-accent-soft px-2.5 py-0.5 font-support text-[11px] text-accent">Posted</span>
      <span className="flex min-w-0 items-center gap-2"><MerchantLogo name="Publix" sources={[]} /><span className="truncate text-sm">Publix</span></span>
      <span className="text-sm font-medium tabular-nums">-$88.00</span>
    </div>
  );
}
function CardRow() {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full rounded-2xl border border-line bg-card">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full cursor-pointer items-center gap-3 p-3 text-left">
        <MerchantLogo name="Starbucks" sources={[]} className="h-10 w-10 text-xs" />
        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Starbucks</span><span className="block font-support text-xs text-muted">Food & drink · Sep 25</span></span>
        <span className="text-sm font-semibold tabular-nums">-$6.40</span>
        <ChevronDown className={`h-4 w-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>{open && <motion.dl initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="grid grid-cols-2 gap-2 overflow-hidden px-3 font-support text-xs"><div className="pb-3"><dt className="text-muted">Type</dt><dd>In store</dd></div><div className="pb-3"><dt className="text-muted">Balance after</dt><dd>$901.00</dd></div></motion.dl>}</AnimatePresence>
    </div>
  );
}
function LeaderRow() {
  return (
    <div className="flex w-full items-baseline gap-2 font-support text-sm">
      <span className="text-muted tabular-nums">Sep 28</span>
      <span className="font-medium text-ink">Spotify</span>
      <span className="flex-1 translate-y-[-3px] border-b border-dotted border-muted/60" />
      <span className="font-semibold tabular-nums">-$11.99</span>
    </div>
  );
}

/* ------------------------------------------------------------------------------- filter notice */
function BannerNotice() {
  return (
    <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-accent-soft px-4 py-3">
      <p className="font-support text-sm">Showing <b>4</b> of 20 transactions for <b>Spotify</b></p>
      <button type="button" className="cursor-pointer rounded-lg border border-line px-3 py-1.5 text-sm hover:border-muted">Show all</button>
    </div>
  );
}
function ChipNotice() {
  const [on, setOn] = useState(true);
  return on ? (
    <span className="inline-flex items-center gap-2 rounded-full bg-accent py-1 pr-1.5 pl-3 text-sm font-semibold text-canvas">Spotify · 4 of 20<button type="button" aria-label="Clear filter" onClick={() => setOn(false)} className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-canvas/25 hover:bg-canvas/40"><X className="h-3.5 w-3.5" /></button></span>
  ) : (
    <button type="button" onClick={() => setOn(true)} className="cursor-pointer font-support text-sm text-accent hover:underline">Filter by Spotify again</button>
  );
}
function CrumbNotice() {
  return <p className="flex flex-wrap items-center gap-1.5 font-support text-sm text-muted"><button type="button" className="cursor-pointer hover:text-ink">All transactions</button><ChevronRight className="h-3.5 w-3.5" /><span className="font-semibold text-ink">Spotify</span><span className="ml-1 rounded-md bg-surface px-1.5 py-0.5 text-xs">4 of 20</span></p>;
}

/* ------------------------------------------------------------------------------- status tile */
function ClassicTile() {
  return <div className="w-full rounded-2xl border border-line bg-card p-4"><p className="font-support text-sm text-muted">Needs review</p><p className="mt-2 text-3xl font-semibold text-[#f5c542]">15</p></div>;
}
function EdgeTile() {
  return <div className="relative w-full overflow-hidden rounded-xl border border-line bg-card py-3 pr-3 pl-4"><span className="absolute inset-y-0 left-0 w-1.5 bg-[#f5c542]" /><p className="font-support text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">Needs review</p><p className="mt-1 text-2xl font-semibold">15</p><p className="font-support text-xs text-muted">Wallex wants a look</p></div>;
}
function ChipTile() {
  return <div className="flex w-full items-center gap-3 rounded-3xl border border-line bg-card p-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5c542]/15 text-[#f5c542]"><AlertTriangle className="h-5 w-5" /></span><div><p className="text-2xl leading-none font-semibold">15</p><p className="font-support text-xs text-muted">Needs review</p></div></div>;
}

/* ------------------------------------------------------------------------------- recurring row */
function ListRecurring() {
  return (
    <div className="grid w-full grid-cols-[1fr_auto] items-center gap-3 border-b border-line py-3">
      <span className="flex min-w-0 items-center gap-2.5"><MerchantLogo name="Verizon" sources={[]} /><span className="min-w-0"><span className="block truncate text-sm font-medium">Verizon</span><span className="block font-support text-xs text-muted">Monthly · next Oct 22</span></span></span>
      <span className="text-right"><span className="block text-sm font-medium tabular-nums">$34</span><span className="block font-support text-xs text-amber-400">Price up from $30</span></span>
    </div>
  );
}
function CardRecurring() {
  return (
    <div className="w-full rounded-2xl border border-line bg-card p-3.5">
      <div className="flex items-center gap-3"><MerchantLogo name="Chase Loan" sources={[]} className="h-10 w-10 text-xs" /><span className="flex-1"><span className="block text-sm font-semibold">Chase Loan</span><span className="block font-support text-xs text-muted">Debt · every month on the 15th</span></span><span className="text-lg font-semibold tabular-nums">$500</span></div>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3 font-support text-xs"><span className="flex items-center gap-1.5 text-muted"><CalendarClock className="h-4 w-4" />Next Oct 15</span><span className="flex items-center gap-1 text-accent"><BadgeCheck className="h-4 w-4" />Confirmed</span></div>
    </div>
  );
}
function CompactRecurring() {
  return <div className="flex w-full items-center gap-3 rounded-lg bg-surface px-3 py-2"><span className="h-8 w-1 rounded-full bg-accent" /><span className="flex-1 text-sm font-medium">Netflix</span><span className="font-support text-xs text-muted">monthly</span><span className="w-14 text-right text-sm font-semibold tabular-nums">$15.49</span></div>;
}

/* ------------------------------------------------------------------------------- refresh button */
function TextRefresh() {
  const [s, setS] = useState(false);
  return <button type="button" onClick={() => { setS(true); setTimeout(() => setS(false), 1200); }} className="flex cursor-pointer items-center gap-1.5 text-sm text-muted hover:text-ink"><RefreshCw className={`h-4 w-4 ${s ? 'animate-spin' : ''}`} />Refresh</button>;
}
function OrbRefresh() {
  const [s, setS] = useState(false);
  return <button type="button" aria-label="Refresh" onClick={() => { setS(true); setTimeout(() => setS(false), 1200); }} className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line bg-surface hover:border-accent hover:text-accent"><motion.span animate={{ rotate: s ? 360 : 0 }} transition={{ duration: 1, ease: 'easeInOut' }}><RefreshCw className="h-5 w-5" /></motion.span></button>;
}
function StatusRefresh() {
  const [s, setS] = useState(false);
  return (
    <button type="button" onClick={() => { setS(true); setTimeout(() => setS(false), 1400); }} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-card py-2 pr-4 pl-2 text-left">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">{s ? <Sparkles className="h-4 w-4 animate-pulse" /> : <RefreshCw className="h-4 w-4" />}</span>
      <span><span className="block text-sm font-medium">{s ? 'Syncing…' : 'Sync now'}</span><span className="block font-support text-[11px] text-muted">Last synced 2 min ago</span></span>
    </button>
  );
}

export const transactionRows: KitRow[] = [
  { name: 'Page tabs', used: 'Transactions: Checking and Recurring', items: [['Underline', <UnderTabs />], ['Pills', <PillTabs />], ['Tabs with counts', <CardTabs />]] },
  { name: 'Status badge', used: 'Transactions table: Posted and Pending', items: [['Tinted pills', <TintBadge />], ['Dots', <DotBadge />], ['Outlined with icons', <IconBadge />]] },
  { name: 'Transaction row', used: 'Transactions: Checking table', items: [['Table row', <TableRow />], ['Expanding card', <CardRow />], ['Dotted leader', <LeaderRow />]] },
  { name: 'Filter notice', used: 'Transactions: opened from an Upcoming payment', items: [['Banner', <BannerNotice />], ['Removable chip', <ChipNotice />], ['Breadcrumb', <CrumbNotice />]] },
  { name: 'Status tile', used: 'Transactions: Recurring status tiles', items: [['Classic', <ClassicTile />], ['Accent edge', <EdgeTile />], ['Icon chip', <ChipTile />]] },
  { name: 'Recurring row', used: 'Transactions: Recurring list', items: [['List row', <ListRecurring />], ['Card', <CardRecurring />], ['Compact bar', <CompactRecurring />]] },
  { name: 'Refresh button', used: 'Transactions: Checking', items: [['Text with icon', <TextRefresh />], ['Round icon', <OrbRefresh />], ['With last-synced note', <StatusRefresh />]] },
];
