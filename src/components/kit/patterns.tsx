import { useId, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, ArrowLeft, ArrowUp, Check, SlidersHorizontal, Search, X } from 'lucide-react';
import MerchantLogo from '../MerchantLogo';
import { spring, type KitRow } from './shared';

/* ------------------------------------------------------------------------------- view chips */
const VIEWS = [{ n: 'All', c: 4, dot: '#e4e4e7' }, { n: 'Bills', c: 1, dot: '#4fa3ff' }, { n: 'Merchants', c: 3, dot: '#a67cff' }, { n: 'Categories', c: 3, dot: 'var(--accent)' }];

function DotChips() {
  const [i, setI] = useState(0);
  return <div role="tablist" className="flex flex-wrap gap-2">{VIEWS.map((v, n) => <button key={v.n} type="button" role="tab" aria-selected={i === n} onClick={() => setI(n)} className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${i === n ? 'border-accent bg-accent-soft font-semibold' : 'border-line bg-surface text-muted'}`}><span className="h-2.5 w-2.5 rounded-full" style={{ background: v.dot }} />{v.n}<span className="opacity-70">{v.c}</span></button>)}</div>;
}
function UnderChips() {
  const [i, setI] = useState(0);
  const id = useId();
  return <div role="tablist" className="flex w-full gap-4 border-b border-line">{VIEWS.map((v, n) => <button key={v.n} type="button" role="tab" aria-selected={i === n} onClick={() => setI(n)} className={`relative flex cursor-pointer items-baseline gap-1 pb-2 text-sm ${i === n ? 'font-semibold' : 'text-muted'}`}>{v.n}<sup className="text-[10px]">{v.c}</sup>{i === n && <motion.span layoutId={id} className="absolute inset-x-0 -bottom-px h-0.5 bg-accent" transition={spring} />}</button>)}</div>;
}
function BlockChips() {
  const [i, setI] = useState(2);
  return <div role="tablist" className="grid w-full grid-cols-4 gap-1.5">{VIEWS.map((v, n) => <button key={v.n} type="button" role="tab" aria-selected={i === n} onClick={() => setI(n)} className={`cursor-pointer rounded-lg py-2 text-center transition-colors ${i === n ? 'bg-ink text-canvas' : 'bg-surface text-muted'}`}><span className="block text-lg leading-none font-semibold">{v.c}</span><span className="mt-0.5 block font-support text-[10px]">{v.n}</span></button>)}</div>;
}

/* ------------------------------------------------------------------------------- search and filter */
function SearchWithFilter() {
  return (
    <div className="flex w-full items-center gap-2">
      <span className="flex flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 focus-within:border-accent"><Search className="h-4 w-4 text-muted" /><input placeholder="Search recurring transactions…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted" /></span>
      <button type="button" className="flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm hover:border-muted"><SlidersHorizontal className="h-4 w-4" />Filter</button>
    </div>
  );
}
function ExpandingSearch() {
  const [open, setOpen] = useState(false);
  return (
    <motion.div animate={{ width: open ? '100%' : 46 }} transition={spring} className="flex h-[46px] items-center overflow-hidden rounded-full border border-line bg-surface">
      <button type="button" aria-label="Search" onClick={() => setOpen(!open)} className="flex h-[46px] w-[46px] shrink-0 cursor-pointer items-center justify-center text-muted hover:text-accent">{open ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}</button>
      <input placeholder="Search merchants" tabIndex={open ? 0 : -1} className="min-w-0 flex-1 bg-transparent pr-4 text-sm outline-none placeholder:text-muted" />
    </motion.div>
  );
}
function JoinedSearch() {
  const [n, setN] = useState(0);
  return (
    <div className="flex w-full overflow-hidden rounded-xl border border-line focus-within:border-accent">
      <span className="flex flex-1 items-center gap-2 bg-surface px-3"><Search className="h-4 w-4 text-muted" /><input placeholder="Search" className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-muted" /></span>
      <button type="button" onClick={() => setN((c) => (c + 1) % 4)} className="relative flex cursor-pointer items-center gap-2 border-l border-line bg-card px-3.5 text-sm hover:bg-surface"><SlidersHorizontal className="h-4 w-4" />{n > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-canvas">{n}</span>}</button>
    </div>
  );
}

/* ------------------------------------------------------------------------------- bubble */
const ring = '46, 208, 138';
function GlassBubble() {
  return (
    <div className="relative mx-auto flex h-[132px] w-[132px] flex-col items-center justify-center rounded-full text-center transition-transform hover:-translate-y-1 hover:scale-105" style={{ background: `radial-gradient(circle at 30% 18%, rgba(${ring}, 0.3), rgba(${ring}, 0.07) 62%), var(--bubble-base)`, border: `2px solid rgba(${ring}, 0.8)`, boxShadow: `0 14px 34px rgba(0,0,0,0.4), 0 0 30px rgba(${ring}, 0.18)` }}>
      <MerchantLogo name="Rent" sources={[]} className="h-9 w-9 text-xs" /><span className="mt-1 text-sm font-semibold">Rent</span><span className="font-support text-xs">$1,250 · 26%</span>
    </div>
  );
}
function RingBubble() {
  const c = 2 * Math.PI * 54;
  return (
    <div className="relative mx-auto h-[132px] w-[132px]">
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90"><circle cx="60" cy="60" r="54" fill="none" stroke="var(--line)" strokeWidth="6" /><circle cx="60" cy="60" r="54" fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${c * 0.26} ${c}`} /></svg>
      <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-card"><span className="font-support text-[11px] text-muted">Rent</span><span className="text-lg font-semibold">26%</span><span className="font-support text-[11px] text-muted">$1,250</span></div>
    </div>
  );
}
function LogoBubble() {
  return (
    <div className="mx-auto flex w-[132px] flex-col items-center gap-2 text-center">
      <span className="relative"><MerchantLogo name="Starbucks" sources={[]} className="h-[88px] w-[88px] text-2xl shadow-[0_14px_30px_rgba(0,0,0,0.35)]" /><span className="absolute -right-2 -bottom-1 rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-canvas">2%</span></span>
      <span className="text-sm font-semibold">Starbucks<span className="block font-support text-xs font-normal text-muted">$64 a month</span></span>
    </div>
  );
}

/* ------------------------------------------------------------------------------- centre orb */
function GlowOrb() {
  return <div className="center-orb mx-auto flex h-[132px] w-[132px] flex-col items-center justify-center rounded-full text-center"><span className="font-support text-[11px] text-muted">Monthly income</span><span className="text-xl font-semibold">$4,800</span><span className="font-support text-[11px] text-muted">100%</span></div>;
}
function SpentOrb() {
  return (
    <div className="relative mx-auto h-[132px] w-[132px] overflow-hidden rounded-full border-2 border-accent/60 bg-card text-center">
      <span className="absolute inset-x-0 bottom-0 bg-accent/25" style={{ height: '57%' }} />
      <div className="relative flex h-full flex-col items-center justify-center"><span className="font-support text-[11px] text-muted">Income</span><span className="text-xl font-semibold">$4,800</span><span className="font-support text-[11px] text-accent">57% spent</span></div>
    </div>
  );
}
function FlatOrb() {
  return <div className="mx-auto flex h-[132px] w-[132px] flex-col items-center justify-center rounded-full bg-ink text-center text-canvas"><span className="font-support text-[11px] opacity-70">Every month</span><span className="text-2xl leading-tight font-bold">$4,800</span><span className="font-support text-[11px] opacity-70">comes in</span></div>;
}

/* ------------------------------------------------------------------------------- metric card */
function PlainMetric() {
  return <div className="w-full rounded-2xl border border-line bg-card p-4"><p className="font-support text-xs text-muted">Monthly average</p><p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">$1,250</p><p className="mt-1 font-support text-xs text-muted">per month</p></div>;
}
function DeltaMetric() {
  return <div className="w-full rounded-xl bg-surface p-4"><div className="flex items-center justify-between"><p className="font-support text-xs text-muted">Change vs last period</p><span className="flex items-center gap-0.5 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent"><ArrowDown className="h-3 w-3" />8%</span></div><p className="mt-1.5 text-2xl font-semibold tabular-nums">$1,150</p></div>;
}
function SideMetric() {
  return <div className="flex w-full items-center gap-4 border-l-4 border-accent bg-card py-3 pr-4 pl-4"><span className="flex-1"><span className="block font-support text-[11px] font-semibold tracking-widest text-muted uppercase">Highest month</span><span className="block text-sm">August</span></span><span className="text-xl font-semibold tabular-nums">$1,420</span></div>;
}

/* ------------------------------------------------------------------------------- trend chart */
const TREND = [40, 55, 48, 70, 62, 85, 74];
function BarTrend() {
  return <div className="flex h-20 w-full items-end gap-1.5">{TREND.map((v, i) => <span key={i} className="flex-1 rounded-t-sm bg-accent/80 transition-colors hover:bg-accent" style={{ height: `${v}%` }} />)}</div>;
}
function LineTrend() {
  const pts = TREND.map((v, i) => `${(i / 6) * 240},${80 - v * 0.75}`);
  return <svg viewBox="0 0 240 84" className="w-full"><polyline points={pts.join(' ')} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />{pts.map((p, i) => <circle key={i} cx={p.split(',')[0]} cy={p.split(',')[1]} r={i === 6 ? 4.5 : 2.5} fill={i === 6 ? 'var(--accent)' : 'var(--card)'} stroke="var(--accent)" strokeWidth="1.5" />)}</svg>;
}
function SparkArea() {
  const w = 240;
  const pts = TREND.map((v, i) => [(i / 6) * w, 70 - v * 0.7] as const);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
  return <svg viewBox="0 0 240 80" className="w-full"><defs><linearGradient id="spk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity="0.5" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs><path d={`${d} L${w},80 L0,80 Z`} fill="url(#spk)" /><path d={d} fill="none" stroke="var(--accent)" strokeWidth="2" /></svg>;
}

/* ------------------------------------------------------------------------------- detail header */
function BackHeader() {
  return (
    <div className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card p-3">
      <button type="button" aria-label="Back" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-line hover:border-muted"><ArrowLeft className="h-4 w-4" /></button>
      <MerchantLogo name="Rent" sources={[]} className="h-11 w-11 text-sm" />
      <span className="min-w-0 flex-1"><span className="block truncate text-lg font-semibold tracking-tight">Rent</span><span className="block font-support text-xs text-muted">Bill · Monthly</span></span>
      <span className="text-right"><span className="block text-sm font-semibold tabular-nums">$1,250</span><span className="block font-support text-[11px] text-muted">26% of income</span></span>
    </div>
  );
}
function BannerHeader() {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl p-4" style={{ background: `linear-gradient(135deg, rgba(${ring}, 0.35), var(--card) 70%)`, border: `1.5px solid rgba(${ring}, 0.6)` }}>
      <button type="button" className="mb-3 flex cursor-pointer items-center gap-1.5 font-support text-xs text-ink/80 hover:text-ink"><ArrowLeft className="h-3.5 w-3.5" />All patterns</button>
      <div className="flex items-center gap-3"><MerchantLogo name="Rent" sources={[]} className="h-12 w-12" /><span><span className="block text-2xl leading-none font-semibold tracking-tight">Rent</span><span className="mt-1 inline-block rounded-full bg-canvas/40 px-2 py-0.5 font-support text-[11px]">Monthly · 32nd</span></span></div>
    </div>
  );
}
function CompactHeader() {
  return <div className="flex w-full items-center gap-2 border-b border-line pb-3"><button type="button" className="cursor-pointer text-muted hover:text-ink"><ArrowLeft className="h-5 w-5" /></button><MerchantLogo name="Rent" sources={[]} className="h-7 w-7 text-[10px]" /><span className="flex-1 text-base font-semibold">Rent</span><span className="flex items-center gap-1 font-support text-xs text-muted"><ArrowUp className="h-3 w-3 text-amber-400" />4% vs last</span></div>;
}

/* ------------------------------------------------------------------------------- filter panel */
const FIELDS = ['Last 30 days', 'All accounts', 'Min $0'];
function PopoverPanel() {
  const [a, setA] = useState(0);
  return (
    <div className="w-full rounded-2xl border border-line bg-card p-4 shadow-[0_24px_60px_rgba(0,0,0,0.3)]">
      <p className="mb-2 font-support text-xs font-semibold tracking-wider text-muted uppercase">Period</p>
      <div className="flex gap-1">{['30', '60', '90'].map((d, i) => <button key={d} type="button" onClick={() => setA(i)} className={`flex-1 cursor-pointer rounded-lg py-1.5 text-sm ${a === i ? 'bg-accent text-canvas' : 'bg-surface text-muted'}`}>{d} days</button>)}</div>
      <p className="mt-4 mb-2 font-support text-xs font-semibold tracking-wider text-muted uppercase">Minimum per month</p>
      <input type="number" placeholder="$0" className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent" />
    </div>
  );
}
function SheetPanel() {
  return (
    <div className="w-full overflow-hidden rounded-t-[28px] border border-b-0 border-line bg-card px-4 pt-3 pb-4">
      <span className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-line" />
      <p className="text-lg font-semibold">Filter</p>
      <div className="mt-3 flex flex-wrap gap-1.5">{FIELDS.map((f) => <span key={f} className="rounded-full border border-line bg-surface px-3 py-1 text-xs">{f}</span>)}</div>
      <button type="button" className="mt-4 w-full cursor-pointer rounded-xl bg-accent py-2.5 text-sm font-bold text-canvas capitalize">Show results</button>
    </div>
  );
}
function InlinePanel() {
  const [o, setO] = useState(true);
  return (
    <div className="w-full">
      <button type="button" onClick={() => setO(!o)} className="flex w-full cursor-pointer items-center justify-between border-b border-line pb-2 text-sm font-semibold"><span className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" />Filters</span><span className="font-support text-xs font-normal text-accent">{o ? 'Hide' : 'Show'}</span></button>
      <AnimatePresence initial={false}>{o && <motion.ul initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">{FIELDS.map((f) => <li key={f} className="flex items-center justify-between border-b border-line py-2.5 text-sm"><span className="text-muted">{f.split(' ')[0]}</span><span className="flex items-center gap-1">{f}<Check className="h-3.5 w-3.5 text-accent" /></span></li>)}</motion.ul>}</AnimatePresence>
    </div>
  );
}

export const patternsRows: KitRow[] = [
  { name: 'View chips', used: 'Patterns: All, Bills, Merchants, Categories (and the type filters on Recurring)', items: [['Dot and count chips', <DotChips />], ['Underline tabs', <UnderChips />], ['Count blocks', <BlockChips />]] },
  { name: 'Search and filter', used: 'Patterns and Recurring: search box with a Filter button', items: [['Search and button', <SearchWithFilter />], ['Expanding search', <ExpandingSearch />], ['Joined bar with count', <JoinedSearch />]] },
  { name: 'Spending bubble', used: 'Patterns: the circles', items: [['Glass bubble', <GlassBubble />], ['Ring gauge', <RingBubble />], ['Logo with badge', <LogoBubble />]] },
  { name: 'Centre circle', used: 'Patterns: Monthly income in the middle', items: [['Glowing orb', <GlowOrb />], ['Filling orb', <SpentOrb />], ['Flat disc', <FlatOrb />]] },
  { name: 'Metric card', used: 'Patterns: detail view metrics', items: [['Plain card', <PlainMetric />], ['With change chip', <DeltaMetric />], ['Side bar', <SideMetric />]] },
  { name: 'Trend chart', used: 'Patterns: detail view trend', items: [['Bars', <BarTrend />], ['Line with dots', <LineTrend />], ['Soft area', <SparkArea />]] },
  { name: 'Detail header', used: 'Patterns: after you pick a circle', items: [['Back, logo and share', <BackHeader />], ['Tinted banner', <BannerHeader />], ['Compact bar', <CompactHeader />]] },
  { name: 'Filter panel', used: 'Patterns: the Filter popover and phone sheet', items: [['Popover card', <PopoverPanel />], ['Bottom sheet', <SheetPanel />], ['Inline list', <InlinePanel />]] },
];
