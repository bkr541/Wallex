import { useId, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Minus, Plus } from 'lucide-react';
import MerchantLogo from '../MerchantLogo';
import PlumpIcon from '../PlumpIcon';
import { Collapse, sample, spring, usd, type KitRow } from './shared';

/* ------------------------------------------------------------------------------- period switch */
const PERIODS = ['30 days', '60 days', '90 days', '6 months', '1 year'];

function PillSwitch() {
  const [i, setI] = useState(0);
  const id = useId();
  return (
    <div role="tablist" className="flex w-full rounded-full border border-line bg-[var(--switch-track)] p-1">
      {PERIODS.map((p, n) => (
        <button key={p} type="button" role="tab" aria-selected={i === n} onClick={() => setI(n)} className={`relative z-10 flex-1 cursor-pointer rounded-full px-1 py-2 text-xs whitespace-nowrap ${i === n ? 'font-semibold text-ink' : 'text-muted hover:text-ink'}`}>
          {i === n && <motion.span layoutId={id} className="absolute inset-0 -z-10 rounded-full border border-line bg-[var(--switch-thumb)] shadow" transition={spring} />}
          {p}
        </button>
      ))}
    </div>
  );
}
function UnderlineSwitch() {
  const [i, setI] = useState(0);
  const id = useId();
  return (
    <div role="tablist" className="flex w-full border-b border-line">
      {PERIODS.map((p, n) => (
        <button key={p} type="button" role="tab" aria-selected={i === n} onClick={() => setI(n)} className={`relative flex-1 cursor-pointer px-1 pb-2.5 text-xs whitespace-nowrap ${i === n ? 'font-semibold text-ink' : 'text-muted hover:text-ink'}`}>
          {p}
          {i === n && <motion.span layoutId={id} className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-accent" transition={spring} />}
        </button>
      ))}
    </div>
  );
}
function BoxedSwitch() {
  const [i, setI] = useState(0);
  return (
    <div role="tablist" className="flex w-full divide-x divide-line overflow-hidden rounded-lg border border-line">
      {PERIODS.map((p, n) => (
        <button key={p} type="button" role="tab" aria-selected={i === n} onClick={() => setI(n)} className={`flex-1 cursor-pointer px-1 py-2 text-xs whitespace-nowrap transition-colors ${i === n ? 'bg-accent font-semibold text-canvas' : 'bg-card/40 text-muted hover:text-ink'}`}>{p}</button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------------------- section header */
const Body = () => <p className="pb-4 font-support text-sm text-muted">Recurring payments expected in the next 30 days.</p>;

function LineHeader() {
  const [o, setO] = useState(true);
  return (
    <div className="w-full border-t border-line">
      <button type="button" aria-expanded={o} onClick={() => setO(!o)} className="flex w-full cursor-pointer items-center justify-between py-4">
        <span className="flex items-center gap-3 font-support text-sm font-semibold tracking-[0.2em] uppercase"><PlumpIcon name="calendar-check" className="h-6 w-6 text-muted" />Commitments</span>
        <ChevronRight className={`h-5 w-5 text-muted transition-transform ${o ? 'rotate-90' : ''}`} />
      </button>
      <Collapse open={o}><Body /></Collapse>
    </div>
  );
}
function CardHeader() {
  const [o, setO] = useState(false);
  return (
    <div className="w-full rounded-2xl border border-line bg-card">
      <button type="button" aria-expanded={o} onClick={() => setO(!o)} className="flex w-full cursor-pointer items-center gap-3 p-3.5 text-left">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><PlumpIcon name="calendar-check" className="h-5 w-5" /></span>
        <span className="flex-1"><span className="block text-sm font-semibold">Commitments</span><span className="block font-support text-xs text-muted">4 groups</span></span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-full bg-surface transition-transform ${o ? 'rotate-180' : ''}`}><ChevronDown className="h-4 w-4" /></span>
      </button>
      <Collapse open={o}><div className="px-4"><Body /></div></Collapse>
    </div>
  );
}
function PlusHeader() {
  const [o, setO] = useState(true);
  return (
    <div className="w-full">
      <button type="button" aria-expanded={o} onClick={() => setO(!o)} className="group flex w-full cursor-pointer items-center gap-3 py-2">
        <motion.span animate={{ rotate: o ? 180 : 0 }} className="flex h-7 w-7 items-center justify-center rounded-md border border-ink/40 text-ink">{o ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</motion.span>
        <span className="text-lg font-semibold tracking-tight">Commitments</span>
        <span className="h-px flex-1 bg-line" />
        <span className="font-support text-xs text-muted group-hover:text-ink">{o ? 'Hide' : 'Show'}</span>
      </button>
      <Collapse open={o}><div className="pl-10 pt-2"><Body /></div></Collapse>
    </div>
  );
}

/* ------------------------------------------------------------------------------- money flow bar */
const IN = 4800;
const OUT = 3120;
const share = IN / (IN + OUT);

function GradientBar() {
  return (
    <div className="w-full">
      <div className="relative h-3.5 rounded-full bg-line">
        <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${share * 100}%`, background: 'linear-gradient(90deg, color-mix(in srgb, var(--accent) 55%, transparent), var(--accent))' }} />
        <span className="absolute inset-y-0 right-0 rounded-full" style={{ left: `${share * 100}%`, background: 'linear-gradient(90deg, #f87171, color-mix(in srgb, #f87171 12%, transparent))' }} />
        <span className="absolute top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-ink/80 bg-canvas" style={{ left: `${share * 100}%` }}><span className="h-3 w-3 rounded-full bg-accent" /></span>
      </div>
      <div className="mt-2 flex justify-between font-support text-sm text-muted tabular-nums"><span>{usd(IN)}</span><span>{usd(OUT)}</span></div>
    </div>
  );
}
function TwoBars() {
  const row = (label: string, n: number, color: string) => (
    <div className="flex items-center gap-3">
      <span className="w-12 font-support text-xs text-muted">{label}</span>
      <span className="h-2.5 flex-1 overflow-hidden rounded-sm bg-line"><motion.span className="block h-full rounded-sm" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${(n / IN) * 100}%` }} transition={{ duration: 0.8 }} /></span>
      <span className="w-14 text-right text-sm font-semibold tabular-nums">{usd(n)}</span>
    </div>
  );
  return <div className="w-full space-y-2.5">{row('In', IN, 'var(--accent)')}{row('Out', OUT, '#f87171')}</div>;
}
function DonutFlow() {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-4">
      <svg width="92" height="92" viewBox="0 0 92 92" className="-rotate-90">
        <circle cx="46" cy="46" r={r} fill="none" stroke="#f87171" strokeWidth="10" />
        <circle cx="46" cy="46" r={r} fill="none" stroke="var(--accent)" strokeWidth="10" strokeDasharray={`${c * share} ${c}`} strokeLinecap="butt" />
      </svg>
      <div>
        <p className="font-support text-xs text-muted">Net cash flow</p>
        <p className="text-2xl font-semibold tracking-tight text-accent">+{usd(IN - OUT)}</p>
        <p className="font-support text-xs text-muted">{Math.round(share * 100)}% of money in kept</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------- stat figure */
function PlainStat() {
  return <div><p className="font-support text-sm text-ink/80">Money out</p><p className="mt-2 text-4xl leading-none font-semibold tracking-tight">{usd(OUT)}</p></div>;
}
function IconStat() {
  return (
    <div className="flex items-center gap-4">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-muted"><ArrowUp className="h-6 w-6" /></span>
      <div><p className="font-support text-xs text-muted">Money out</p><p className="text-2xl leading-tight font-semibold tracking-tight">{usd(OUT)}</p><span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 font-support text-[11px] font-semibold text-accent"><ArrowDown className="h-3 w-3" />12% less than last month</span></div>
    </div>
  );
}
function BarStat() {
  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between"><p className="font-support text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">Money out</p><p className="font-support text-xs text-muted">65% of in</p></div>
      <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{usd(OUT)}</p>
      <div className="mt-2 h-1 rounded-full bg-line"><div className="h-full rounded-full bg-[#f87171]" style={{ width: '65%' }} /></div>
    </div>
  );
}

/* ------------------------------------------------------------------------------- commitment tile */
function PlainCommit() {
  return (
    <button type="button" className="group w-full cursor-pointer text-left">
      <span className="flex items-center justify-between font-support text-xs text-muted">Subscriptions<ChevronRight className="h-4 w-4 opacity-60 transition-transform group-hover:translate-x-0.5" /></span>
      <span className="mt-2 block text-2xl leading-none font-semibold tracking-tight">3 active</span>
      <span className="mt-1.5 block font-support text-sm text-muted">1 more unidentified</span>
    </button>
  );
}
function BoxCommit() {
  return (
    <button type="button" className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-line bg-card p-4 text-left transition-colors hover:border-accent">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent"><PlumpIcon name="tag-alt" className="h-6 w-6" /></span>
      <span className="min-w-0 flex-1"><span className="block font-support text-xs text-muted">Subscriptions</span><span className="block text-lg font-semibold">3 active</span></span>
      <ChevronRight className="h-4 w-4 text-muted" />
    </button>
  );
}
function PillCommit() {
  return (
    <button type="button" className="flex w-full cursor-pointer items-center justify-between rounded-full border border-line bg-surface py-2 pr-2 pl-5 text-left transition-colors hover:bg-card">
      <span><span className="font-support text-xs text-muted">Subscriptions </span><span className="text-sm font-semibold">3 active</span></span>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-canvas"><ChevronRight className="h-4 w-4" /></span>
    </button>
  );
}

/* ------------------------------------------------------------------------------- spending breakdown */
const SLICES = [
  { name: 'Loans', pct: 39, color: 'var(--accent)' },
  { name: 'Transfers', pct: 22, color: '#6cc4ff' },
  { name: 'Entertainment', pct: 13, color: '#b9a2ff' },
  { name: 'Transport', pct: 6, color: '#f5c542' },
  { name: 'Other', pct: 20, color: 'repeating-linear-gradient(135deg, color-mix(in srgb, var(--muted) 45%, transparent) 0 3px, transparent 3px 6px)' },
];
function SegmentedBreakdown() {
  return (
    <div className="w-full">
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">{SLICES.map((s) => <span key={s.name} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${s.pct}%`, background: s.color }} />)}</div>
      <ul className="mt-4 space-y-2">{SLICES.map((s) => <li key={s.name} className="flex items-center gap-3"><span className="h-4 w-4 rounded" style={{ background: s.color }} /><span className="font-support text-sm">{s.name}</span><span className="h-px flex-1 bg-line" /><span className="text-sm font-semibold tabular-nums">{s.pct}%</span></li>)}</ul>
    </div>
  );
}
function DonutBreakdown() {
  const r = 32;
  const c = 2 * Math.PI * r;
  let off = 0;
  return (
    <div className="flex items-center gap-5">
      <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90 shrink-0">
        {SLICES.filter((s) => !s.color.startsWith('repeating')).concat([{ name: 'Other', pct: 20, color: 'var(--muted)' }]).map((s) => {
          const len = (s.pct / 100) * c;
          const el = <circle key={s.name} cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth="14" strokeDasharray={`${len - 1.5} ${c}`} strokeDashoffset={-off} />;
          off += len;
          return el;
        })}
      </svg>
      <ul className="space-y-1.5">{SLICES.slice(0, 4).map((s) => <li key={s.name} className="flex items-center gap-2 font-support text-xs"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.name}<span className="ml-auto pl-3 font-semibold tabular-nums">{s.pct}%</span></li>)}</ul>
    </div>
  );
}
function RowBreakdown() {
  return (
    <ul className="w-full space-y-2.5">
      {SLICES.map((s) => (
        <li key={s.name}>
          <div className="mb-1 flex justify-between font-support text-xs"><span>{s.name}</span><span className="font-semibold tabular-nums">{s.pct}%</span></div>
          <div className="h-2 overflow-hidden rounded-sm bg-line"><motion.div className="h-full rounded-sm" style={{ background: s.color }} initial={{ width: 0 }} animate={{ width: `${s.pct * 2.2}%` }} transition={{ duration: 0.8 }} /></div>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------------------- payment record */
const MONTHS = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
const PAID = [7, 8, 9, 10];

function MonthTextRecord() {
  return (
    <div className="w-full border-b border-line pb-3">
      <div className="flex items-center gap-3"><span className="w-12 font-support text-sm text-muted">Oct 24</span><MerchantLogo name="Publix" sources={[]} /><span className="flex-1"><span className="block text-sm font-medium">Publix</span><span className="block font-support text-xs text-muted">Expected Oct 23–25</span></span><span className="text-sm font-medium">$88</span></div>
      <div className="mt-3 flex justify-between font-support text-[11px]">{MONTHS.map((m, i) => <span key={m} className={PAID.includes(i) ? 'font-semibold text-accent' : 'text-muted'}>{m}</span>)}</div>
    </div>
  );
}
function MonthDotRecord() {
  return (
    <div className="w-full rounded-2xl border border-line bg-card p-3.5">
      <div className="flex items-center gap-3"><MerchantLogo name="Spotify" sources={[]} className="h-9 w-9 text-xs" /><span className="flex-1"><span className="block text-sm font-semibold">Spotify</span><span className="block font-support text-xs text-muted">Due in 6 days</span></span><span className="rounded-full bg-surface px-2.5 py-1 text-sm font-semibold tabular-nums">$11.99</span></div>
      <div className="mt-3 flex gap-1" aria-label="Paid in 4 of the last 12 months">{MONTHS.map((m, i) => <span key={m} title={m} className={`h-5 flex-1 rounded-[4px] ${PAID.includes(i) ? 'bg-accent' : 'bg-line'}`} />)}</div>
      <p className="mt-1.5 font-support text-[11px] text-muted">Paid 4 of the last 12 months</p>
    </div>
  );
}
function CompactRecord() {
  return (
    <div className="flex w-full items-center gap-3 rounded-xl bg-surface px-3 py-2.5">
      <span className="flex h-9 w-9 flex-col items-center justify-center rounded-lg bg-card text-center leading-none"><span className="font-support text-[9px] text-muted uppercase">Oct</span><span className="text-sm font-bold">31</span></span>
      <MerchantLogo name="Rent" sources={[]} className="h-8 w-8 text-[10px]" />
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">Rent</span><span className="mt-1 block h-1 rounded-full bg-line"><span className="block h-full w-3/4 rounded-full bg-accent" /></span></span>
      <span className="text-sm font-semibold tabular-nums">$1,250</span>
    </div>
  );
}

/* ------------------------------------------------------------------------------- cash flow chart */
const maxV = Math.max(...sample.moneyIn, ...sample.moneyOut);
function PairedBars() {
  return (
    <div className="flex h-28 w-full items-end justify-between gap-2 border-b border-line">
      {sample.months.map((m, i) => (
        <div key={m} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex h-24 items-end gap-0.5"><span className="w-2.5 rounded-t-sm bg-accent" style={{ height: `${(sample.moneyIn[i] / maxV) * 100}%` }} /><span className="w-2.5 rounded-t-sm bg-[#f87171]" style={{ height: `${(sample.moneyOut[i] / maxV) * 100}%` }} /></div>
          <span className="font-support text-[10px] text-muted">{m}</span>
        </div>
      ))}
    </div>
  );
}
function NetBars() {
  const net = sample.moneyIn.map((v, i) => v - sample.moneyOut[i]);
  const m = Math.max(...net.map(Math.abs));
  return (
    <div className="relative h-28 w-full">
      <span className="absolute inset-x-0 top-[44%] h-px bg-line" />
      <div className="absolute inset-x-0 top-0 bottom-4 flex justify-between gap-2">
        {net.map((n, i) => {
          const h = `${(Math.abs(n) / m) * 44}%`;
          return (
            <span key={i} className="relative flex-1">
              <span className="absolute left-1/2 w-4 -translate-x-1/2 rounded-sm" style={n >= 0 ? { bottom: '56%', height: h, background: 'var(--accent)' } : { top: '44%', height: h, background: '#f87171' }} />
            </span>
          );
        })}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex justify-between gap-2">{sample.months.map((m) => <span key={m} className="flex-1 text-center font-support text-[10px] text-muted">{m}</span>)}</div>
    </div>
  );
}
function AreaChart() {
  const w = 280;
  const h = 90;
  const pts = (arr: number[]) => arr.map((v, i) => `${(i / (arr.length - 1)) * w},${h - (v / maxV) * (h - 8)}`);
  const inn = pts(sample.moneyIn);
  return (
    <svg viewBox={`0 0 ${w} ${h + 16}`} className="w-full">
      <polygon points={`0,${h} ${inn.join(' ')} ${w},${h}`} fill="color-mix(in srgb, var(--accent) 16%, transparent)" />
      <polyline points={inn.join(' ')} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />
      <polyline points={pts(sample.moneyOut).join(' ')} fill="none" stroke="#f87171" strokeWidth="2" strokeDasharray="4 4" />
      {sample.months.map((m, i) => <text key={m} x={(i / 5) * w} y={h + 13} fontSize="9" textAnchor={i === 0 ? 'start' : i === 5 ? 'end' : 'middle'} fill="var(--muted)">{m}</text>)}
    </svg>
  );
}

/* ------------------------------------------------------------------------------- cash buffer */
function ListBuffer() {
  return (
    <div className="w-full font-support text-sm">
      <dl className="space-y-2.5">
        <div className="flex justify-between"><dt className="text-muted">Cash available</dt><dd className="tabular-nums">$5,240</dd></div>
        <div className="flex justify-between"><dt className="text-muted">Expected payments</dt><dd className="tabular-nums">-$1,356</dd></div>
        <div className="flex justify-between border-t border-line pt-2.5"><dt>Remaining buffer</dt><dd className="text-xl font-semibold tabular-nums">$3,884</dd></div>
      </dl>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full w-1/4 rounded-full bg-accent/80" /></div>
    </div>
  );
}
function GaugeBuffer() {
  const r = 52;
  const arc = Math.PI * r;
  return (
    <div className="relative mx-auto w-[148px]">
      <svg viewBox="0 0 120 70" className="w-full"><path d="M 8 62 A 52 52 0 0 1 112 62" fill="none" stroke="var(--line)" strokeWidth="10" strokeLinecap="round" /><path d="M 8 62 A 52 52 0 0 1 112 62" fill="none" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${arc * 0.74} ${arc}`} /></svg>
      <div className="absolute inset-x-0 bottom-0 text-center"><p className="text-xl leading-none font-semibold">$3,884</p><p className="font-support text-[11px] text-muted">74% left</p></div>
    </div>
  );
}
function StackBuffer() {
  return (
    <div className="w-full">
      <p className="font-support text-xs text-muted">Left after the next 30 days</p>
      <p className="text-3xl font-semibold tracking-tight tabular-nums">$3,884</p>
      <div className="mt-2 flex h-5 overflow-hidden rounded-md"><span className="flex w-3/4 items-center bg-accent pl-2 font-support text-[10px] font-bold text-canvas">KEEP</span><span className="flex flex-1 items-center justify-center bg-[#f87171]/80 font-support text-[10px] font-bold text-canvas">DUE</span></div>
      <p className="mt-1.5 font-support text-[11px] text-muted">$1,356 of $5,240 is already spoken for</p>
    </div>
  );
}

/* ------------------------------------------------------------------------------- opportunity row */
function TextOpportunity() {
  return (
    <div className="flex w-full items-center justify-between gap-4 border-b border-line py-3">
      <div><p className="text-sm font-medium">Reduce dining 20%</p><p className="mt-1 font-support text-xs text-muted">$210 / month now · 14 charges</p></div>
      <div className="text-right"><p className="text-base font-semibold tabular-nums">~$42 / month</p><p className="mt-1 font-support text-xs text-muted">~$504 / year</p></div>
    </div>
  );
}
function StepOpportunity() {
  const [p, setP] = useState(20);
  return (
    <div className="w-full rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center justify-between"><p className="text-sm font-semibold">Dining out</p><span className="text-lg font-semibold text-accent tabular-nums">+${Math.round((210 * p) / 100)}/mo</span></div>
      <div className="mt-3 flex gap-1.5">{[10, 20, 30].map((n) => <button key={n} type="button" onClick={() => setP(n)} className={`flex-1 cursor-pointer rounded-lg py-1.5 text-xs ${p === n ? 'bg-accent font-semibold text-canvas' : 'bg-surface text-muted'}`}>Cut {n}%</button>)}</div>
    </div>
  );
}
function MeterOpportunity() {
  const [on, setOn] = useState(true);
  return (
    <button type="button" onClick={() => setOn(!on)} className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-surface px-3 py-3 text-left">
      <span className={`flex h-5 w-5 items-center justify-center rounded-md border-2 ${on ? 'border-accent bg-accent text-canvas' : 'border-line'}`}>{on && <span className="text-[11px] font-bold">✓</span>}</span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-medium">Cancel unused streaming</span><span className="mt-1.5 block h-1.5 rounded-full bg-line"><span className="block h-full rounded-full bg-accent" style={{ width: on ? '70%' : '0%', transition: 'width 0.4s' }} /></span></span>
      <span className="text-sm font-semibold tabular-nums">$27/mo</span>
    </button>
  );
}

export const overviewRows: KitRow[] = [
  { name: 'Period switch', used: 'Overview header', items: [['Sliding pill', <PillSwitch />], ['Underline tabs', <UnderlineSwitch />], ['Boxed segments', <BoxedSwitch />]] },
  { name: 'Section header', used: 'Overview: Commitments, Cash flow and the other folding groups', items: [['Line with chevron', <LineHeader />], ['Card with icon tile', <CardHeader />], ['Plus and minus', <PlusHeader />]] },
  { name: 'Money flow bar', used: 'Overview position card', items: [['Gradient bar with marker', <GradientBar />], ['Two bars', <TwoBars />], ['Donut', <DonutFlow />]] },
  { name: 'Stat figure', used: 'Overview position card: Money in, Money out, Net cash flow', items: [['Label over number', <PlainStat />], ['Icon with change chip', <IconStat />], ['Number with bar', <BarStat />]] },
  { name: 'Commitment tile', used: 'Overview: Bills, Debt, Subscriptions, Bank fees', items: [['Plain with chevron', <PlainCommit />], ['Card with icon', <BoxCommit />], ['Pill with arrow', <PillCommit />]] },
  { name: 'Spending breakdown', used: 'Overview: Spending breakdown', items: [['Segmented bar and legend', <SegmentedBreakdown />], ['Donut and legend', <DonutBreakdown />], ['Bar per category', <RowBreakdown />]] },
  { name: 'Upcoming payment record', used: 'Overview: Upcoming payments', items: [['Date, logo and month text', <MonthTextRecord />], ['Card with month blocks', <MonthDotRecord />], ['Compact with progress', <CompactRecord />]] },
  { name: 'Cash flow chart', used: 'Overview: Cash flow', items: [['Paired bars', <PairedBars />], ['Net up and down', <NetBars />], ['Area and line', <AreaChart />]] },
  { name: 'Cash buffer', used: 'Overview: Cash buffer', items: [['List and bar', <ListBuffer />], ['Gauge', <GaugeBuffer />], ['Stacked bar', <StackBuffer />]] },
  { name: 'Opportunity', used: 'Overview: Opportunities', items: [['Text row', <TextOpportunity />], ['Card with percent choice', <StepOpportunity />], ['Checklist with meter', <MeterOpportunity />]] },
];
