import { ArrowUpRight, CalendarDays, ChevronUp, CircleDollarSign, ReceiptText, Sparkles, TrendingUp } from 'lucide-react';
import MerchantLogo from '../components/MerchantLogo';
import SectionTitle from '../components/SectionTitle';

const metrics = [
  ['Average Purchase', '$21.76'],
  ['Frequency', 'About 5× / week'],
  ['Of Monthly Income', '6.9%'],
  ['Change', 'New'],
] as const;

function Identity({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <MerchantLogo name="North Coast" sources={[]} className={compact ? 'h-10 w-10 text-xs' : 'h-14 w-14 text-sm'} />
      <div className="min-w-0">
        <p className={`${compact ? 'text-base' : 'text-xl'} truncate font-semibold tracking-tight`}>North Coast</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 font-support text-xs text-muted">
          <span>Merchant</span><span>·</span><span>20 Charges</span>
        </p>
      </div>
    </div>
  );
}

function CollapseButton() {
  return (
    <button type="button" aria-label="Collapse detail" className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-muted hover:text-ink">
      <ChevronUp className="h-4 w-4" />
    </button>
  );
}

function TransactionLead() {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-4">
      <ReceiptText className="h-5 w-5 text-accent" />
      <span className="font-semibold">Transactions</span>
      <span className="font-support text-xs text-muted">20 Charges · $435 in the last 30 days</span>
    </div>
  );
}

function Bars({ slim = false }: { slim?: boolean }) {
  const values = [28, 52, 35, 70, 44, 86, 58, 100];
  return (
    <div className={`flex items-end gap-1.5 ${slim ? 'h-10' : 'h-16'}`} aria-label="Recent spending trend">
      {values.map((value, index) => (
        <span key={index} className="min-w-1 flex-1 rounded-t-sm bg-accent/25" style={{ height: `${value}%`, opacity: 0.55 + index * 0.05 }} />
      ))}
    </div>
  );
}

function Concept({ number, name, note, children }: { number: string; name: string; note: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 px-1">
        <span className="font-support text-xs tracking-[0.2em] text-accent">{number}</span>
        <h3 className="text-base font-semibold">{name}</h3>
        <p className="font-support text-sm text-muted">{note}</p>
      </div>
      {children}
    </section>
  );
}

function EditorialSummary() {
  return (
    <div className="rounded-2xl border border-line bg-card/45 p-5 @2xl:p-6">
      <div className="flex items-start justify-between gap-5">
        <Identity />
        <CollapseButton />
      </div>
      <div className="mt-6 grid gap-5 @2xl:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="font-support text-xs font-semibold tracking-[0.18em] text-muted uppercase">Monthly Average</p>
          <p className="mt-1 text-5xl leading-none font-semibold tracking-tight"><span className="text-accent">$</span>435</p>
          <p className="mt-2 font-support text-sm text-muted">$435 total in the last 30 days</p>
        </div>
        <div className="grid grid-cols-2 border-y border-line @2xl:border-y-0 @2xl:border-l @2xl:pl-5">
          {metrics.map(([label, value]) => (
            <div key={label} className="border-line py-3 odd:pr-3 even:border-l even:pl-3 [&:nth-child(n+3)]:border-t">
              <p className="font-support text-[10px] font-semibold tracking-wider text-muted uppercase">{label}</p>
              <p className="mt-1 text-sm font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </div>
      <TransactionLead />
    </div>
  );
}

function InsightRail() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card/45">
      <div className="grid @2xl:grid-cols-[15rem_1fr]">
        <div className="relative border-b border-line p-5 @2xl:border-r @2xl:border-b-0">
          <span className="absolute inset-y-0 left-0 w-1 bg-accent" />
          <Identity />
          <div className="mt-7">
            <p className="font-support text-xs text-muted">Monthly Average</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight">$435</p>
            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 font-support text-xs font-semibold text-accent"><Sparkles className="h-3.5 w-3.5" />New Pattern</span>
          </div>
        </div>
        <div className="p-5">
          <div className="flex justify-end"><CollapseButton /></div>
          <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-5">
            {metrics.slice(0, 3).map(([label, value]) => (
              <div key={label}>
                <p className="font-support text-xs text-muted">{label}</p>
                <p className="mt-1 text-lg font-semibold">{value}</p>
              </div>
            ))}
            <div><Bars slim /></div>
          </div>
          <TransactionLead />
        </div>
      </div>
    </div>
  );
}

function CenterStage() {
  return (
    <div className="rounded-3xl border border-line bg-surface/70 p-5 text-center @2xl:p-7">
      <div className="flex justify-between"><Identity compact /><CollapseButton /></div>
      <div className="mx-auto mt-7 max-w-md">
        <p className="font-support text-xs font-semibold tracking-[0.2em] text-muted uppercase">Average Monthly Spend</p>
        <p className="mt-2 text-6xl leading-none font-semibold tracking-tight"><span className="text-accent">$</span>435</p>
        <p className="mt-2 font-support text-sm text-muted">20 purchases across the last 30 days</p>
      </div>
      <div className="mx-auto mt-7 flex max-w-2xl flex-wrap justify-center gap-2">
        {metrics.slice(0, 3).map(([label, value]) => (
          <span key={label} className="rounded-full border border-line bg-card px-4 py-2 font-support text-sm text-muted"><b className="mr-1.5 font-semibold text-ink">{value}</b>{label}</span>
        ))}
      </div>
      <div className="text-left"><TransactionLead /></div>
    </div>
  );
}

function StatementSummary() {
  return (
    <div className="rounded-2xl border border-line bg-card/40 p-5 @2xl:p-6">
      <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
        <Identity compact />
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-accent-soft px-3 py-1.5 font-support text-xs font-semibold text-accent">Merchant Pattern</span>
          <CollapseButton />
        </div>
      </div>
      <div className="grid @2xl:grid-cols-[1fr_17rem]">
        <dl className="divide-y divide-line @2xl:pr-6">
          {[
            ['Total · Last 30 Days', '$435'],
            ['Monthly Average', '$435 / month'],
            ['Average Purchase', '$21.76'],
            ['Frequency', 'About 5× / week'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 py-3">
              <dt className="font-support text-sm text-muted">{label}</dt><dd className="font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="border-t border-line pt-5 @2xl:border-t-0 @2xl:border-l @2xl:pl-6">
          <p className="font-support text-xs text-muted">Recent Activity</p>
          <Bars />
          <p className="mt-2 flex items-center gap-1 font-support text-xs text-muted"><TrendingUp className="h-3.5 w-3.5 text-accent" />Intermittent · every few days</p>
        </div>
      </div>
      <TransactionLead />
    </div>
  );
}

function ActivityBrief() {
  return (
    <div className="rounded-2xl border border-line bg-card/45 p-5 @2xl:p-6">
      <div className="flex items-start justify-between gap-5">
        <Identity />
        <CollapseButton />
      </div>
      <div className="mt-6 grid gap-3 @2xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-xl border border-line bg-surface p-4">
          <div className="flex items-start justify-between gap-4">
            <div><p className="font-support text-xs text-muted">Last 30 Days</p><p className="mt-1 text-3xl font-semibold">$435</p></div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent"><CircleDollarSign className="h-5 w-5" /></span>
          </div>
          <div className="mt-5"><Bars slim /></div>
        </div>
        <div className="rounded-xl bg-accent p-4 text-canvas">
          <CalendarDays className="h-5 w-5 opacity-70" />
          <p className="mt-5 font-support text-xs opacity-70">Monthly Average</p>
          <p className="mt-1 text-3xl font-semibold">$435</p>
          <p className="mt-1 font-support text-xs opacity-70">About 5 purchases each week</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 @2xl:grid-cols-4">
        {metrics.map(([label, value], index) => (
          <div key={label} className="rounded-xl border border-line px-3 py-3">
            <div className="flex items-center justify-between gap-2"><p className="font-support text-[10px] text-muted uppercase">{label}</p>{index === 3 && <ArrowUpRight className="h-3.5 w-3.5 text-accent" />}</div>
            <p className="mt-1 text-sm font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <TransactionLead />
    </div>
  );
}

export default function PatternDetailTab() {
  return (
    <div className="space-y-12 px-1 pb-12">
      <div className="px-1">
        <SectionTitle icon="search-visual">Pattern Detail</SectionTitle>
        <p className="mt-1 font-support text-sm text-muted">Five directions for the summary shown above a pattern’s transactions.</p>
      </div>
      <Concept number="01" name="Editorial Summary" note="Large value, quiet supporting grid."><EditorialSummary /></Concept>
      <Concept number="02" name="Insight Rail" note="Identity and status stay anchored at the left."><InsightRail /></Concept>
      <Concept number="03" name="Center Stage" note="A focused hero with compact supporting badges."><CenterStage /></Concept>
      <Concept number="04" name="Statement" note="A restrained financial-summary treatment."><StatementSummary /></Concept>
      <Concept number="05" name="Activity Brief" note="Modular cards using the app’s existing visual language."><ActivityBrief /></Concept>
    </div>
  );
}
