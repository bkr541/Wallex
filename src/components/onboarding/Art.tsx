import { motion } from 'motion/react';
import { ArrowDown, ArrowUp, KeyRound, Lock, Repeat2, TrendingUp, Wallet } from 'lucide-react';
import { asset } from '../../assets';
import ChaseLogo from '../ChaseLogo';
import MerchantLogo from '../MerchantLogo';
import { HomeIcon, PatternsIcon, ReceiptIcon } from '../NavIcons';
import { item } from './motion';

// Small drawings of the real screens, used by the onboarding mockups. The figures are samples and say so.

const card = 'rounded-2xl border border-line bg-card';
const label = 'font-support text-[10px] font-semibold tracking-[0.18em] text-ink/80 uppercase';

export function WelcomeArt() {
  const logo = asset('logos/logo2.png');
  const tiles = [
    { Icon: HomeIcon, name: 'Overview', line: 'Where you stand' },
    { Icon: PatternsIcon, name: 'Patterns', line: 'Where it goes' },
    { Icon: ReceiptIcon, name: 'Transactions', line: 'Every purchase' },
    { Icon: null, name: 'Recurring', line: 'What repeats' },
  ];
  return (
    <div className="mx-auto flex w-full max-w-[340px] flex-col items-center gap-4">
      <motion.div variants={item} className={`flex h-20 w-20 items-center justify-center rounded-3xl shadow-[0_14px_34px_rgba(0,0,0,0.25)] ${card}`}>
        {logo && <img src={logo} alt="" draggable={false} className="h-14 w-14 object-contain" />}
      </motion.div>
      <div className="grid w-full grid-cols-2 gap-3">
        {tiles.map(({ Icon, name, line }) => (
          <motion.div key={name} variants={item} className={`flex items-center gap-3 p-3 text-left ${card}`}>
            {Icon ? <Icon className="h-8 w-8 shrink-0" /> : <Repeat2 className="h-8 w-8 shrink-0 text-accent" strokeWidth={1.7} />}
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{name}</span>
              <span className="block truncate font-support text-xs text-muted">{line}</span>
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function ConnectArt() {
  const logo = asset('logos/logo2.png');
  const Node = ({ name, line, children }: { name: string; line: string; children: React.ReactNode }) => (
    <motion.div variants={item} className="flex w-[88px] flex-col items-center gap-2 text-center">
      <span className={`flex h-16 w-16 items-center justify-center ${card}`}>{children}</span>
      <span>
        <span className="block text-sm font-semibold">{name}</span>
        <span className="block font-support text-[11px] text-muted">{line}</span>
      </span>
    </motion.div>
  );
  const Link = () => (
    <motion.span variants={item} className="mb-8 h-px flex-1 border-t-2 border-dashed border-accent/60" />
  );
  const Pill = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
    <motion.div variants={item} className="flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-2 font-support text-xs">
      <span className="text-accent">{icon}</span>
      {text}
    </motion.div>
  );
  return (
    <div className="mx-auto flex w-full max-w-[340px] flex-col items-center gap-5">
      <div className="flex w-full items-center justify-between">
        <Node name="Chase" line="Your bank">
          <ChaseLogo className="h-8 w-8" />
        </Node>
        <Link />
        <Node name="Plaid" line="Secure link">
          <Lock className="h-7 w-7 text-accent" strokeWidth={1.7} />
        </Node>
        <Link />
        <Node name="Wallex" line="This computer">
          {logo && <img src={logo} alt="" draggable={false} className="h-10 w-10 object-contain" />}
        </Node>
      </div>
      <div className="flex flex-col items-center gap-2.5">
        <Pill icon={<Lock className="h-3.5 w-3.5" />} text="Read-only: balances and transactions" />
        <Pill icon={<KeyRound className="h-3.5 w-3.5" />} text="Keys saved encrypted on this computer" />
      </div>
    </div>
  );
}

export function OverviewArt() {
  return (
    <div className="mx-auto w-full max-w-[340px] text-left">
      <motion.div variants={item} className="mb-3 flex gap-2">
        {['30 days', '60 days', '90 days'].map((d, i) => (
          <span
            key={d}
            className={`rounded-lg border px-3 py-1.5 font-support text-xs ${i === 0 ? 'border-accent bg-accent font-semibold text-canvas' : 'border-line text-ink/80'}`}
          >
            {d}
          </span>
        ))}
      </motion.div>
      <motion.div variants={item} className="rounded-[22px] border border-line bg-card p-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            { l: 'Money in', v: '$4,800', I: ArrowDown, c: 'text-accent' },
            { l: 'Money out', v: '$3,120', I: ArrowUp, c: 'text-muted' },
            { l: 'Net flow', v: '+$1,680', I: TrendingUp, c: 'text-accent' },
          ].map(({ l, v, I, c }) => (
            <div key={l} className="min-w-0">
              <I className={`h-4 w-4 ${c}`} strokeWidth={2} />
              <p className="mt-1.5 font-support text-[9px] font-semibold tracking-[0.14em] whitespace-nowrap text-ink/80 uppercase">{l}</p>
              <p className={`mt-1 text-lg leading-none font-semibold tracking-tight ${l === 'Net flow' ? 'text-accent' : ''}`}>{v}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 font-support text-[11px] text-muted">+35% savings rate over the last 30 days</p>
        <div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
          <Wallet className="h-6 w-6 text-accent/80" strokeWidth={1.7} />
          <div>
            <p className={label}>Cash available</p>
            <p className="mt-1 text-2xl leading-none font-semibold tracking-tight">$5,240</p>
          </div>
        </div>
      </motion.div>
      <motion.p variants={item} className="mt-2 text-center font-support text-[11px] text-muted">
        Sample figures
      </motion.p>
    </div>
  );
}

// Circle area follows the share of income, as it does on the Patterns screen.
const CIRCLES = [
  { name: 'Rent', pct: '26%', d: 104, x: 96, y: 14, rgb: '46, 208, 138' },
  { name: 'Chase Loan', pct: '10%', d: 70, x: -96, y: -6, rgb: '90, 170, 255' },
  { name: 'Georgia Power', pct: '4%', d: 46, x: -34, y: 84, rgb: '186, 124, 255' },
  { name: 'Starbucks', pct: '2%', d: 42, x: 40, y: -86, rgb: '18, 181, 174' },
  { name: 'Spotify', pct: '<1%', d: 40, x: -78, y: -82, rgb: '255, 107, 122' },
];

export function PatternsArt() {
  return (
    <div className="relative mx-auto h-[240px] w-[320px] max-w-full">
      {CIRCLES.map((c) => (
        <motion.div
          key={c.name}
          variants={item}
          className="absolute top-1/2 left-1/2 flex flex-col items-center justify-center rounded-full text-center"
          style={{
            width: c.d,
            height: c.d,
            marginLeft: c.x - c.d / 2,
            marginTop: c.y - c.d / 2,
            background: `radial-gradient(circle at 30% 18%, rgba(${c.rgb}, 0.32), rgba(${c.rgb}, 0.08) 65%), var(--bubble-base)`,
            border: `2px solid rgba(${c.rgb}, 0.75)`,
            boxShadow: `0 10px 26px rgba(0,0,0,0.3), 0 0 22px rgba(${c.rgb}, 0.16)`,
          }}
        >
          {c.d >= 60 && <span className="px-1 font-support text-[10px] leading-tight">{c.name}</span>}
          <span className={`font-semibold ${c.d >= 60 ? 'text-sm' : 'text-[11px]'}`}>{c.pct}</span>
        </motion.div>
      ))}
      <motion.div
        variants={item}
        className="center-orb absolute top-1/2 left-1/2 -mt-[46px] -ml-[46px] flex h-[92px] w-[92px] flex-col items-center justify-center rounded-full text-center"
      >
        <span className="font-support text-[9px] text-muted">Monthly income</span>
        <span className="text-base leading-tight font-semibold">$4,800</span>
        <span className="font-support text-[9px] text-muted">100%</span>
      </motion.div>
    </div>
  );
}

const ROWS = [
  { name: 'Rent', cadence: 'Monthly', next: 'Nov 1', amount: '$1,250', chip: 'Confirmed', tone: 'text-accent bg-accent-soft' },
  { name: 'Chase Loan', cadence: 'Monthly', next: 'Oct 15', amount: '$500', chip: 'Confirmed', tone: 'text-accent bg-accent-soft' },
  { name: 'Verizon', cadence: 'Monthly', next: 'Oct 22', amount: '$34', chip: 'Price up from $30', tone: 'text-amber-400 bg-amber-400/15' },
  { name: 'Spotify', cadence: 'Monthly', next: 'Oct 26', amount: '$11.99', chip: 'Needs review', tone: 'text-red-300 bg-red-400/15' },
];

export function RecurringArt() {
  return (
    <div className="mx-auto w-full max-w-[340px] text-left">
      <motion.div variants={item} className="overflow-hidden rounded-[22px] border border-line bg-card">
        {ROWS.map((r, i) => (
          <div key={r.name} className={`flex items-center gap-3 px-4 py-3 ${i ? 'border-t border-line' : ''}`}>
            <MerchantLogo name={r.name} sources={[]} className="h-8 w-8 text-[10px]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{r.name}</p>
              <p className="truncate font-support text-[11px] text-muted">
                {r.cadence} · next {r.next}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums">{r.amount}</p>
              <p className={`mt-0.5 inline-block rounded-full px-2 py-px font-support text-[9px] font-semibold ${r.tone}`}>{r.chip}</p>
            </div>
          </div>
        ))}
      </motion.div>
      <motion.p variants={item} className="mt-2 text-center font-support text-[11px] text-muted">
        Sample payments
      </motion.p>
    </div>
  );
}
