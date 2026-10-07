import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Pencil, Plus } from 'lucide-react';
import DestructiveAction from '../components/DestructiveAction';
import MerchantLogo from '../components/MerchantLogo';
import SectionTitle from '../components/SectionTitle';
import UnderlineField from '../components/UnderlineField';
import { bankLoanHints, FREQUENCIES, isDate, newLoanId, paymentFor, removeLoan, saveLoan, statusFor, todayIso, useLoans, type BankLoanHint, type Loan, type LoanFrequency } from '../lib/loans';
import { moneyExact } from '../lib/patternFormat';
import type { Load } from '../lib/useTransactions';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dateText = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)}`;
const freqWord = (f: LoanFrequency) => (f === 'weekly' ? 'week' : f === 'biweekly' ? '2 weeks' : 'month');
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const outlineBtn = 'flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-sm font-semibold transition-colors hover:border-muted';
const primaryBtn = 'cursor-pointer rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-canvas capitalize transition-opacity hover:opacity-90';

/* ------------------------------------------------------------------------------------------------- the form */
interface Draft {
  id: string;
  lender: string;
  item: string;
  amount: string;
  apr: string;
  count: string;
  frequency: LoanFrequency;
  firstDate: string;
}
const EMPTY: Draft = { id: '', lender: '', item: '', amount: '', apr: '0', count: '', frequency: 'monthly', firstDate: '' };
const num = (s: string) => Number(s.replace(/[$,\s]/g, ''));

function LoanForm({ initial, hint, onClose }: { initial: Draft; hint?: BankLoanHint; onClose: () => void }) {
  const [d, setD] = useState<Draft>(initial);
  const [tried, setTried] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((c) => ({ ...c, [k]: v }));

  const amount = num(d.amount);
  const count = Number(d.count);
  const apr = d.apr.trim() === '' ? 0 : num(d.apr);
  const errors = {
    lender: d.lender.trim() ? null : 'Enter who the loan is with',
    amount: amount > 0 ? null : 'Enter the amount you borrowed, like 600',
    count: Number.isInteger(count) && count >= 1 && count <= 360 ? null : 'Enter a whole number of payments, like 12',
    apr: apr >= 0 && apr <= 100 ? null : 'Enter a rate between 0 and 100',
    firstDate: isDate(d.firstDate) ? null : 'Pick the date of the first payment',
  };
  const valid = Object.values(errors).every((e) => e === null);
  const show = (k: keyof typeof errors) => (tried ? errors[k] : null);

  // The figures that follow from what has been typed so far.
  const preview = useMemo(() => {
    if (!(amount > 0) || !(count >= 1) || !isDate(d.firstDate)) return null;
    const loan: Loan = { id: 'x', lender: '', item: '', amount, apr: apr || 0, count: Math.round(count), frequency: d.frequency, firstDate: d.firstDate };
    return statusFor(loan);
  }, [amount, count, apr, d.frequency, d.firstDate]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!valid) return;
    saveLoan({ id: d.id || newLoanId(), lender: d.lender.trim(), item: d.item.trim(), amount, apr, count: Math.round(count), frequency: d.frequency, firstDate: d.firstDate });
    onClose();
  };

  return (
    <motion.form
      onSubmit={submit}
      noValidate
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22 }}
      className="mx-4 mb-6 rounded-2xl border border-line bg-card/60 p-5 @3xl:p-6"
    >
      <SectionTitle as="h3" icon="dollar-coin" className="text-base font-semibold">{d.id ? 'Edit Loan' : 'Add A Loan'}</SectionTitle>
      <p className="mt-1 font-support text-sm text-muted">
        {hint
          ? `Your bank shows ${plural(hint.payments, 'payment')} to ${hint.lender} of about ${moneyExact(hint.typical)}. Add the rest from your ${hint.lender} app.`
          : 'Find these in your lender’s app or the email from when you checked out. Wallex works out the rest.'}
      </p>

      <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-6 @3xl:grid-cols-2">
        <UnderlineField label="Lender" icon="government-building-1" value={d.lender} onChange={(e) => set('lender', e.target.value)} placeholder="Affirm, Klarna, a car loan…" error={show('lender')} autoFocus />
        <UnderlineField label="What It Paid For (Optional)" icon="tag-alt" value={d.item} onChange={(e) => set('item', e.target.value)} placeholder="Peloton, flights, laptop…" />
        <UnderlineField label="Amount Borrowed" icon="dollar-coin" inputMode="decimal" value={d.amount} onChange={(e) => set('amount', e.target.value)} placeholder="600.00" hint="After any down payment." error={show('amount')} />
        <UnderlineField label="Number of Payments" icon="circle-clock" inputMode="numeric" value={d.count} onChange={(e) => set('count', e.target.value)} placeholder="12" error={show('count')} />
        <UnderlineField label="Interest Rate (APR %)" icon="graph-bar-increase" inputMode="decimal" value={d.apr} onChange={(e) => set('apr', e.target.value)} placeholder="0" hint="Most pay-in-4 plans are 0%." error={show('apr')} />
        <UnderlineField label="First Payment Date" icon="calendar-check" type="date" value={d.firstDate} onChange={(e) => set('firstDate', e.target.value)} error={show('firstDate')} />
      </div>

      <div className="mt-6">
        <p className="mb-2 font-support text-[10px] font-semibold tracking-[0.2em] text-muted uppercase">How often you pay</p>
        <div role="radiogroup" aria-label="How often you pay" className="flex flex-wrap gap-2">
          {FREQUENCIES.map((f) => {
            const on = d.frequency === f.value;
            return (
              <button key={f.value} type="button" role="radio" aria-checked={on} onClick={() => set('frequency', f.value)} className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm transition-colors ${on ? 'border-ink bg-surface font-semibold' : 'border-line text-muted hover:text-ink'}`}>
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {preview && (
        <div className="mt-6 flex flex-wrap items-center gap-2" aria-live="polite">
          <span className="rounded-full border border-line bg-surface px-4 py-1.5 font-support text-sm text-ink/80"><b className="font-semibold text-accent">{moneyExact(preview.payment)}</b> Each Payment</span>
          <span className="rounded-full border border-line bg-surface px-4 py-1.5 font-support text-sm text-ink/80"><b className="font-semibold text-ink">{moneyExact(preview.totalToPay)}</b> Paid in All</span>
          {preview.totalInterest > 0 && <span className="rounded-full border border-line bg-surface px-4 py-1.5 font-support text-sm text-ink/80"><b className="font-semibold text-amber-300">{moneyExact(preview.totalInterest)}</b> Interest</span>}
          <span className="rounded-full border border-line bg-surface px-4 py-1.5 font-support text-sm text-ink/80">Paid off <b className="font-semibold text-ink">{dateText(preview.payoffDate)}</b></span>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="submit" className={primaryBtn}>{d.id ? 'Save Changes' : 'Save Loan'}</button>
        <button type="button" onClick={onClose} className="cursor-pointer rounded-lg border border-line px-4 py-2.5 text-sm font-semibold transition-colors hover:border-muted">Cancel</button>
      </div>
    </motion.form>
  );
}

/* ----------------------------------------------------------------------------------------------- the cards */
function LoanCard({
  loan,
  lenderPosition,
  lenderTotal,
  logos,
  onEdit,
  onAddAnother,
}: {
  loan: Loan;
  lenderPosition: number;
  lenderTotal: number;
  logos: string[];
  onEdit: () => void;
  onAddAnother: () => void;
}) {
  const [open, setOpen] = useState(false);
  const s = statusFor(loan);
  return (
    <div className="rounded-2xl border border-line bg-card/60 p-5">
      <div className="flex flex-wrap items-center gap-4">
        <MerchantLogo name={loan.lender} sources={logos} className="h-11 w-11 text-sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-semibold">{loan.lender}</p>
            <span className="rounded-full border border-line bg-surface px-2 py-0.5 font-support text-[10px] font-semibold text-muted">
              {lenderTotal === 1 ? '1 Loan' : `Loan ${lenderPosition} Of ${lenderTotal}`}
            </span>
          </div>
          <p className="truncate font-support text-sm text-muted">
            {loan.item ? `${loan.item} · ` : ''}{moneyExact(s.payment)} every {freqWord(loan.frequency)}{loan.apr > 0 ? ` · ${loan.apr}% APR` : ' · 0% interest'}
          </p>
        </div>
        <div className="text-right">
          <p className="font-support text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">{s.done ? 'Paid Off' : 'Still Owed'}</p>
          <p className="text-2xl leading-tight font-semibold tracking-tight tabular-nums"><span className="text-accent">$</span>{moneyExact(s.remaining).slice(1)}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(s.paidOff * 100)} aria-label={`${loan.lender} paid off`}>
          <motion.div className="h-full rounded-full bg-accent" initial={{ width: 0 }} animate={{ width: `${s.paidOff * 100}%` }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-support text-sm text-muted">
          <span><span className="font-semibold text-ink">{s.paid}</span> of {loan.count} payments made</span>
          <span>
            {s.done
              ? `Last payment ${dateText(s.payoffDate)}`
              : s.notStarted && s.next
                ? `First payment ${dateText(s.next.date)}`
                : s.next
                  ? <>Next <span className="font-semibold text-ink">{moneyExact(s.next.payment)}</span> on {dateText(s.next.date)}</>
                  : ''}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex cursor-pointer items-center gap-1.5 font-support text-sm text-muted transition-colors hover:text-ink">
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          {open ? 'Hide Schedule' : 'Show Schedule'}
        </button>
        <button type="button" onClick={onEdit} className="flex cursor-pointer items-center gap-1.5 font-support text-sm text-muted transition-colors hover:text-ink"><Pencil className="h-3.5 w-3.5" />Edit</button>
        <button type="button" onClick={onAddAnother} className="flex cursor-pointer items-center gap-1.5 font-support text-sm text-muted transition-colors hover:text-ink"><Plus className="h-3.5 w-3.5" />Add Another</button>
        <span className="ml-auto font-support text-xs text-muted">Paid off {dateText(s.payoffDate)}{s.totalInterest > 0 ? ` · ${moneyExact(s.totalInterest)} interest` : ''}</span>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
            <div role="table" aria-label={`${loan.lender} payment schedule`} className="mt-4 font-support text-sm">
              <div role="row" className="grid grid-cols-[2rem_1fr_auto_auto] gap-3 border-b border-line pb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">
                <span role="columnheader">#</span><span role="columnheader">Date</span><span role="columnheader" className="text-right">Payment</span><span role="columnheader" className="w-24 text-right">Owed After</span>
              </div>
              {s.schedule.map((i) => {
                const paid = i.n <= s.paid;
                return (
                  <div key={i.n} role="row" className={`grid grid-cols-[2rem_1fr_auto_auto] gap-3 border-b border-line/60 py-2 tabular-nums ${paid ? 'text-muted' : 'text-ink'}`}>
                    <span role="cell">{i.n}</span>
                    <span role="cell" className="flex items-center gap-2">{dateText(i.date)}{paid && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">Paid</span>}{!paid && s.next?.n === i.n && <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-ink">Next</span>}</span>
                    <span role="cell" className="text-right">{moneyExact(i.payment)}</span>
                    <span role="cell" className="w-24 text-right">{moneyExact(i.balance)}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 border-t border-line pt-4">
        <DestructiveAction trigger="Delete loan…" title={`Delete the ${loan.lender} loan?`} body="It is removed from Wallex. Nothing changes with the lender." confirm="Delete" onConfirm={() => removeLoan(loan.id)} />
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------------------------------- page */
export default function LoansTab({ load }: { load: Load }) {
  const loans = useLoans();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [hint, setHint] = useState<BankLoanHint | undefined>();

  const hints = useMemo(() => {
    const txns = load.state === 'live' ? load.allTransactions : [];
    return bankLoanHints(txns);
  }, [load]);

  const statuses = loans.map((l) => ({ loan: l, s: statusFor(l) }));
  const owed = statuses.reduce((sum, x) => sum + x.s.remaining, 0);
  const active = statuses.filter((x) => !x.s.done);
  const soonest = active.filter((x) => x.s.next).sort((a, b) => a.s.next!.date.localeCompare(b.s.next!.date))[0];
  const monthly = active.reduce((sum, x) => sum + (x.loan.frequency === 'weekly' ? x.s.payment * 52 / 12 : x.loan.frequency === 'biweekly' ? x.s.payment * 26 / 12 : x.s.payment), 0);

  const openNew = (h?: BankLoanHint) => {
    setHint(h);
    setEditing(h ? { ...EMPTY, lender: h.lender, frequency: h.frequency, firstDate: h.first } : { ...EMPTY, firstDate: todayIso() });
  };
  const openAnother = (lender: string) => {
    setHint(undefined);
    setEditing({ ...EMPTY, lender, firstDate: todayIso() });
  };
  const edit = (l: Loan) => {
    setHint(undefined);
    setEditing({ id: l.id, lender: l.lender, item: l.item, amount: String(l.amount), apr: String(l.apr), count: String(l.count), frequency: l.frequency, firstDate: l.firstDate });
  };
  const close = () => setEditing(null);

  return (
    <div className="w-full pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-4">
        <p className="font-support text-sm text-muted">Pay-later plans and loans you type in. Wallex works out what is left, so you never have to update the balance.</p>
        {!editing && <button type="button" onClick={() => openNew()} className={`${primaryBtn} flex items-center gap-2`}><Plus className="h-4 w-4" />Add Loan</button>}
      </div>

      <AnimatePresence initial={false}>{editing && <LoanForm key={editing.id || 'new'} initial={editing} hint={hint} onClose={close} />}</AnimatePresence>

      {loans.length > 0 && (
        <div className="mx-4 mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-line bg-card/60 p-5 @3xl:grid-cols-3">
          <div>
            <p className="font-support text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">Total Still Owed</p>
            <p className="mt-1 text-3xl leading-none font-semibold tracking-tight tabular-nums"><span className="text-accent">$</span>{moneyExact(owed).slice(1)}</p>
            <p className="mt-1.5 font-support text-sm text-muted">Across {plural(active.length, 'active loan')}</p>
          </div>
          <div>
            <p className="font-support text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">Next Payment</p>
            <p className="mt-1 text-3xl leading-none font-semibold tracking-tight tabular-nums">{soonest?.s.next ? moneyExact(soonest.s.next.payment) : '—'}</p>
            <p className="mt-1.5 font-support text-sm text-muted">{soonest?.s.next ? `${soonest.loan.lender} · ${dateText(soonest.s.next.date)}` : 'Nothing due'}</p>
          </div>
          <div>
            <p className="font-support text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">Per Month</p>
            <p className="mt-1 text-3xl leading-none font-semibold tracking-tight tabular-nums">{moneyExact(monthly)}</p>
            <p className="mt-1.5 font-support text-sm text-muted">What these loans take each month</p>
          </div>
        </div>
      )}

      {hints.length > 0 && !editing && (
        <section className="mx-4 mb-6">
          <SectionTitle as="h3" icon="search-visual" className="text-base font-semibold">Found In Your Bank</SectionTitle>
          <p className="mt-1 mb-3 font-support text-sm text-muted">These payments look like a pay-later plan. Add one to track what is left.</p>
          <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-2">
            {hints.map((h) => (
              <div key={h.lender} className="flex items-center gap-3 rounded-2xl border border-line bg-card/60 p-4">
                <MerchantLogo name={h.lender} sources={h.logos} className="h-10 w-10 text-xs" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{h.lender}</p>
                  <p className="font-support text-xs text-muted">
                    {plural(h.payments, 'payment')} · about {moneyExact(h.typical)} · last {dateText(h.last)}
                    {loans.filter((l) => l.lender.trim().toLowerCase() === h.lender.toLowerCase()).length > 0 &&
                      ` · ${plural(loans.filter((l) => l.lender.trim().toLowerCase() === h.lender.toLowerCase()).length, 'loan')} tracked`}
                  </p>
                </div>
                <button type="button" onClick={() => openNew(h)} className={outlineBtn}>Edit</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {loans.length > 0 && (
        <div className="mx-4 space-y-4">
          {statuses
            .slice()
            .sort((a, b) => Number(a.s.done) - Number(b.s.done) || (a.s.next?.date ?? '9999').localeCompare(b.s.next?.date ?? '9999'))
            .map(({ loan }) => {
              const sameLender = loans.filter((candidate) => candidate.lender.trim().toLowerCase() === loan.lender.trim().toLowerCase());
              const lenderHint = hints.find((candidate) => candidate.lender.toLowerCase() === loan.lender.trim().toLowerCase());
              return (
                <LoanCard
                  key={loan.id}
                  loan={loan}
                  lenderPosition={sameLender.findIndex((candidate) => candidate.id === loan.id) + 1}
                  lenderTotal={sameLender.length}
                  logos={lenderHint?.logos ?? []}
                  onEdit={() => edit(loan)}
                  onAddAnother={() => openAnother(loan.lender)}
                />
              );
            })}
        </div>
      )}
    </div>
  );
}
