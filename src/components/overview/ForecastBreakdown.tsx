import { ArrowLeft } from 'lucide-react';
import MerchantLogo from '../MerchantLogo';
import PlumpIcon from '../PlumpIcon';
import { epochDay } from '../../lib/patterns';
import { ledger, monthEndForecast, safeToSpend, summarize, type Forecast, type LedgerRow } from '../../lib/forecast';
import { moneyExact } from '../../lib/patternFormat';

export type ForecastDetail = 'safe' | 'monthend' | 'week' | 'lowest';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const short = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;
const dateText = (r: LedgerRow) => (r.endDate && r.endDate !== r.date ? `${short(r.date)} to ${short(r.endDate)}` : short(r.date));
const exact = (n: number) => moneyExact(n);
const delta = (n: number) => `${n < 0 ? '-' : '+'}${moneyExact(Math.abs(n))}`;
const tone = (n: number) => (n < 0 ? 'text-red-300' : '');

interface Content {
  title: string;
  lead: string;
  rows: LedgerRow[];
  showBalance: boolean;
  total: { label: string; value: number };
  note?: string;
}

// Bills only, from the events the forecast already holds.
function billRows(f: Forecast, within: (day: number, date: string) => boolean, runningFrom: number | null): LedgerRow[] {
  const rows: LedgerRow[] = [];
  let balance = runningFrom ?? 0;
  for (const e of f.events.filter((x) => x.kind === 'bill' && within(x.day, x.date))) {
    balance -= e.amount;
    rows.push({ id: e.id, kind: 'bill', date: e.date, label: e.name, logos: e.logos, approx: e.approx, amount: -e.amount, balance });
  }
  return rows;
}

function content(detail: ForecastDetail, f: Forecast, days: number): Content {
  if (detail === 'safe') {
    const safe = safeToSpend(f);
    const start: LedgerRow = { id: 'start', kind: 'start', date: f.today, label: 'Cash available today', amount: f.cash, balance: f.cash };
    return {
      title: 'Safe to Spend',
      lead: 'The cash you have now, less every bill expected in the next 30 days. Pay you expect and everyday spending are not counted, so this never promises more than is there.',
      rows: [start, ...billRows(f, (day) => day <= 30, f.cash)],
      showBalance: true,
      total: { label: 'Safe to spend', value: safe.amount },
    };
  }
  if (detail === 'week') {
    const todayDay = epochDay(f.today);
    const rows = billRows(f, (_, date) => epochDay(date) <= todayDay + 6, null);
    return {
      title: 'Expected Next 7 Days',
      lead: 'Every bill expected from today through the next six days. A bill due today or running late is included.',
      rows,
      showBalance: false,
      total: { label: 'Total expected', value: rows.reduce((s, r) => s - r.amount, 0) },
      note: rows.length === 0 ? 'No bills are expected in this stretch.' : undefined,
    };
  }
  if (detail === 'monthend') {
    const month = monthEndForecast(f);
    return {
      title: 'Projected Month-End',
      lead:
        month.daysLeft === 0
          ? 'Today is the last day of the month, so this is today’s cash.'
          : `Starting from today’s cash, every payday and bill expected through ${short(month.point.date)}, plus everyday spending in between. Everyday spending is a daily estimate from your last ${f.everyday.windowDays} days.`,
      rows: ledger(f, month.daysLeft),
      showBalance: true,
      total: { label: `Projected balance on ${short(month.point.date)}`, value: month.point.balance },
    };
  }
  const range = summarize(f, days);
  return {
    title: 'Lowest Balance',
    lead: `The balance dips lowest ${range.lowest.day === 0 ? 'today' : `around ${short(range.lowest.date)}`}. These are all the lines from today until then, which is where the balance bottoms out in the next ${days} days.`,
    rows: ledger(f, days, true),
    showBalance: true,
    total: { label: range.lowest.day === 0 ? 'Lowest balance (today)' : `Lowest balance, ${short(range.lowest.date)}`, value: range.lowest.balance },
  };
}

function RowIcon({ row }: { row: LedgerRow }) {
  if (row.kind === 'bill' || row.kind === 'income') {
    return <MerchantLogo name={row.label} sources={row.logos ?? []} className="h-8 w-8 shrink-0 text-[10px]" />;
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-muted">
      <PlumpIcon name={row.kind === 'start' ? 'wallet' : 'dollar-coin'} className="h-4 w-4" />
    </span>
  );
}

// The working behind one of the forecast's figures: each line, in date order, with what it adds or takes away.
export default function ForecastBreakdown({ detail, forecast, days, onBack }: { detail: ForecastDetail; forecast: Forecast; days: number; onBack: () => void }) {
  const c = content(detail, forecast, days);
  const sum = (kind: LedgerRow['kind']) => c.rows.filter((r) => r.kind === kind).reduce((s, r) => s + r.amount, 0);
  const parts = [
    { label: 'Cash today', value: c.rows.find((r) => r.kind === 'start')?.amount ?? null, sign: false },
    { label: 'Pay', value: c.rows.some((r) => r.kind === 'income') ? sum('income') : null, sign: true },
    { label: 'Bills', value: c.rows.some((r) => r.kind === 'bill') ? sum('bill') : null, sign: true },
    { label: 'Everyday spending', value: c.rows.some((r) => r.kind === 'everyday') ? sum('everyday') : null, sign: true },
  ].filter((p) => p.value !== null && c.showBalance);

  return (
    <div>
      <button type="button" onClick={onBack} className="flex cursor-pointer items-center gap-2 rounded-lg py-1 pr-3 font-support text-sm text-muted transition-colors hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        Back to forecast
      </button>

      <div className="mt-3 rounded-2xl border border-line bg-card/60 p-4 @3xl:p-6">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
          <div className="min-w-0">
            <h3 className="text-xl font-semibold tracking-tight">{c.title}</h3>
            <p className="mt-1.5 max-w-2xl font-support text-sm leading-relaxed text-muted">{c.lead}</p>
          </div>
          <p className={`text-3xl font-semibold tracking-tight tabular-nums @3xl:text-4xl ${tone(c.total.value)}`}>{exact(c.total.value)}</p>
        </div>

        {parts.length > 1 && (
          <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2 font-support text-sm">
            {parts.map((p, i) => (
              <span key={p.label} className="flex items-center gap-2">
                {i > 0 && <span className="text-muted">{p.value! < 0 ? '−' : '+'}</span>}
                <span className="rounded-full border border-line bg-surface px-3 py-1">
                  <span className="text-muted">{p.label} </span>
                  <span className="font-semibold tabular-nums">{exact(i > 0 ? Math.abs(p.value!) : p.value!)}</span>
                </span>
              </span>
            ))}
            <span className="flex items-center gap-2">
              <span className="text-muted">=</span>
              <span className={`rounded-full bg-accent-soft px-3 py-1 font-semibold tabular-nums ${tone(c.total.value)}`}>{exact(c.total.value)}</span>
            </span>
          </div>
        )}

        <div className="mt-5 overflow-hidden rounded-xl border border-line">
          <div className={`grid items-center gap-3 border-b border-line bg-surface/60 px-4 py-2 font-support text-xs text-muted ${c.showBalance ? 'grid-cols-[1fr_auto_auto]' : 'grid-cols-[1fr_auto]'} @3xl:grid-cols-[7.5rem_1fr_auto_auto]`}>
            <span className="hidden @3xl:block">Date</span>
            <span>Line</span>
            <span className="text-right">Amount</span>
            {c.showBalance && <span className="w-24 text-right @3xl:w-28">Balance</span>}
          </div>
          <ul className="divide-y divide-line">
            {c.rows.map((r) => (
              <li
                key={r.id}
                className={`grid items-center gap-3 px-4 py-2.5 ${c.showBalance ? 'grid-cols-[1fr_auto_auto]' : 'grid-cols-[1fr_auto]'} @3xl:grid-cols-[7.5rem_1fr_auto_auto] ${r.lowest ? 'bg-accent-soft' : ''}`}
              >
                <span className="hidden font-support text-sm text-muted tabular-nums @3xl:block">{r.kind === 'start' ? 'Today' : dateText(r)}</span>
                <span className="flex min-w-0 items-center gap-3">
                  <RowIcon row={r} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{r.label}</span>
                    <span className="block truncate font-support text-xs text-muted">
                      <span className="@3xl:hidden">{r.kind === 'start' ? 'Today' : dateText(r)}</span>
                      {r.kind === 'everyday' && <span className="@3xl:hidden"> · </span>}
                      {r.kind === 'everyday' && `${r.span} ${r.span === 1 ? 'day' : 'days'}, about ${exact(-r.amount / (r.span ?? 1))} a day`}
                      {r.kind === 'bill' && <span className="@3xl:hidden"> · </span>}
                      {r.kind === 'bill' && (r.approx ? 'Amount varies' : 'Bill due')}
                      {r.kind === 'income' && <span className="@3xl:hidden"> · </span>}
                      {r.kind === 'income' && (r.approx ? 'Pay, amount varies' : 'Pay expected')}
                      {r.lowest && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 font-semibold text-canvas">Lowest point</span>}
                    </span>
                  </span>
                </span>
                <span className={`text-right text-sm font-semibold tabular-nums ${r.kind === 'income' ? 'text-accent' : r.kind === 'start' ? '' : 'text-ink'}`}>
                  {r.kind === 'start' ? exact(r.amount) : c.showBalance ? delta(r.amount) : exact(-r.amount)}
                </span>
                {c.showBalance && <span className={`w-24 text-right font-support text-sm tabular-nums @3xl:w-28 ${r.balance < 0 ? 'text-red-300' : 'text-muted'}`}>{exact(r.balance)}</span>}
              </li>
            ))}
          </ul>
          <div className="flex items-baseline justify-between gap-4 border-t border-line bg-surface/60 px-4 py-3">
            <span className="text-sm font-semibold">{c.total.label}</span>
            <span className={`text-lg font-semibold tabular-nums ${tone(c.total.value)}`}>{exact(c.total.value)}</span>
          </div>
        </div>
        {c.note && <p className="mt-3 font-support text-xs text-muted">{c.note}</p>}
        <p className="mt-3 font-support text-xs text-muted">Amounts marked as varying use the usual figure, so the real one may differ.</p>
      </div>
    </div>
  );
}
