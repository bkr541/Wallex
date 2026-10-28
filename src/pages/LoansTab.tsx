import { Fragment, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Pencil, Plus } from 'lucide-react';
import DestructiveAction from '../components/DestructiveAction';
import InstallmentMatches, { type BankData } from '../components/LoanMatches';
import RecordedPayments from '../components/LoanPaymentsRow';
import LoanRelated from '../components/LoanRelated';
import { SyncLine } from '../components/LoanSyncNotice';
import MerchantLogo from '../components/MerchantLogo';
import SectionTitle from '../components/SectionTitle';
import UnderlineField from '../components/UnderlineField';
import { addPeriods, bankLoanHints, FREQUENCIES, isDate, LOAN_TYPES, loanTypeLabel, newLoanId, removeLoan, saveLoan, statusFor, suggestedLoanType, todayIso, useLoans, type BankLoanHint, type BnplDetails, type Loan, type LoanFrequency, type LoanType } from '../lib/loans';
import { coverageFor, loanLinks, reconcileLinks, useLoanLinks } from '../lib/loanLinks';
import { matchInstallments } from '../lib/loanMatching';
import { loanPayments, useLoanPayments, type PaymentData } from '../lib/loanPayments';
import { loanRoles, useLoanRoles, type LoanRole } from '../lib/loanRoles';
import { useBnpl } from '../lib/useBnpl';
import type { BnplLedger } from '../lib/bnpl';
import { bankEvidenceFromViews, repaymentFor, STATUS_LABEL, type InstallmentStatus, type Repayment } from '../lib/repayment';
import { BILL_CATEGORY_OPTIONS } from '../lib/rules';
import { moneyExact } from '../lib/patternFormat';
import type { Load } from '../lib/useTransactions';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dateText = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)}`;
const freqWord = (f: LoanFrequency) => (f === 'weekly' ? 'week' : f === 'biweekly' ? '2 weeks' : 'month');
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const outlineBtn = 'flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-sm font-semibold transition-colors hover:border-muted';
const primaryBtn = 'cursor-pointer rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-canvas capitalize transition-opacity hover:opacity-90';

// How each installment status looks as a badge. Bank-confirmed and recorded-by-you differ so the two are never confused.
const STATUS_TONE: Record<InstallmentStatus, string> = {
  scheduled: 'bg-surface text-muted',
  upcoming: 'bg-surface text-ink',
  due: 'bg-surface text-ink',
  pastDue: 'bg-red-300/15 text-red-300',
  unverified: 'bg-surface text-amber-300',
  partial: 'bg-surface text-amber-300',
  paidBank: 'bg-accent-soft text-accent',
  paidManual: 'border border-accent/40 text-accent',
  reversed: 'bg-surface text-amber-300',
  waived: 'bg-surface text-muted',
  canceled: 'bg-surface text-muted',
};
const STATUS_TITLE: Partial<Record<InstallmentStatus, string>> = {
  unverified: 'No payment is recorded for this one, so Wallex cannot tell whether it was made.',
  pastDue: 'Payments were recorded before this date, but none for this one.',
  paidBank: 'Confirmed by a transaction in your bank.',
  paidManual: 'Recorded by you.',
};

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
  type: LoanType | ''; // empty until the person picks one
  merchant: string;
  category: string;
  purchaseDate: string;
  purchaseAmount: string;
  downPayment: string;
  planId: string;
}
const EMPTY: Draft = { id: '', lender: '', item: '', amount: '', apr: '0', count: '', frequency: 'monthly', firstDate: '', type: '', merchant: '', category: '', purchaseDate: '', purchaseAmount: '', downPayment: '', planId: '' };
const num = (s: string) => Number(s.replace(/[$,\s]/g, ''));
const optNum = (n: number | undefined) => (n === undefined ? '' : String(n));

const draftFromLoan = (l: Loan): Draft => ({
  id: l.id,
  lender: l.lender,
  item: l.item,
  amount: String(l.amount),
  apr: String(l.apr),
  count: String(l.count),
  frequency: l.frequency,
  firstDate: l.firstDate,
  type: l.type ?? '',
  merchant: l.bnpl?.merchant ?? '',
  category: l.bnpl?.category ?? '',
  purchaseDate: l.bnpl?.purchaseDate ?? '',
  purchaseAmount: optNum(l.bnpl?.purchaseAmount),
  downPayment: optNum(l.bnpl?.downPayment),
  planId: l.bnpl?.planId ?? '',
});

// Only what was typed is kept: an empty box stays empty rather than being filled with a guess.
function bnplFrom(d: Draft): BnplDetails | undefined {
  const out: BnplDetails = {};
  if (d.merchant.trim()) out.merchant = d.merchant.trim();
  if (d.category.trim()) out.category = d.category.trim();
  if (d.purchaseDate) out.purchaseDate = d.purchaseDate;
  if (d.purchaseAmount.trim()) out.purchaseAmount = num(d.purchaseAmount);
  if (d.downPayment.trim()) out.downPayment = num(d.downPayment);
  if (d.planId.trim()) out.planId = d.planId.trim();
  return Object.keys(out).length ? out : undefined;
}

function LoanForm({ initial, hint, onClose }: { initial: Draft; hint?: BankLoanHint; onClose: () => void }) {
  const [d, setD] = useState<Draft>(initial);
  const [tried, setTried] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((c) => ({ ...c, [k]: v }));

  const amount = num(d.amount);
  const count = Number(d.count);
  const apr = d.apr.trim() === '' ? 0 : num(d.apr);
  const isBnpl = d.type === 'bnpl';
  const purchase = d.purchaseAmount.trim() ? num(d.purchaseAmount) : undefined;
  const down = d.downPayment.trim() ? num(d.downPayment) : undefined;
  const suggestion = d.type === '' ? suggestedLoanType(d.lender) : undefined;
  const errors = {
    type: d.type ? null : 'Pick what kind of loan this is',
    lender: d.lender.trim() ? null : 'Enter who the loan is with',
    amount: amount > 0 ? null : 'Enter the amount you borrowed, like 600',
    count: Number.isInteger(count) && count >= 1 && count <= 360 ? null : 'Enter a whole number of payments, like 12',
    apr: apr >= 0 && apr <= 100 ? null : 'Enter a rate between 0 and 100',
    firstDate: isDate(d.firstDate) ? null : 'Pick the date of the first payment',
    purchaseAmount: !isBnpl || purchase === undefined || purchase > 0 ? null : 'Enter the full price, like 800',
    downPayment: !isBnpl || down === undefined || (down >= 0 && (purchase === undefined || down < purchase)) ? null : 'Enter an amount of 0 or more, less than the price',
    purchaseDate: !isBnpl || !d.purchaseDate || isDate(d.purchaseDate) ? null : 'Pick a valid date',
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
    if (!d.type) return;
    const bnpl = bnplFrom(d);
    saveLoan({ id: d.id || newLoanId(), lender: d.lender.trim(), item: d.item.trim(), amount, apr, count: Math.round(count), frequency: d.frequency, firstDate: d.firstDate, type: d.type, ...(bnpl ? { bnpl } : {}) });
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
      className="mx-0 mb-6 @3xl:mx-4 rounded-2xl border border-line bg-card/60 p-5 @3xl:p-6"
    >
      <SectionTitle as="h3" icon="dollar-coin" className="text-base font-semibold">{d.id ? 'Edit Loan' : 'Add A Loan'}</SectionTitle>
      <p className="mt-1 font-support text-sm text-muted">
        {hint
          ? `Your bank shows ${plural(hint.payments, 'payment')} to ${hint.lender} of about ${moneyExact(hint.typical)}. Add the rest from your ${hint.lender} app.`
          : 'Find these in your lender’s app or the email from when you checked out. Wallex works out the rest.'}
      </p>

      <div className="mt-5">
        <p className="mb-2 font-support text-[10px] font-semibold tracking-[0.2em] text-muted uppercase">Type of loan</p>
        <div role="radiogroup" aria-label="Type of loan" className="flex flex-wrap gap-2">
          {LOAN_TYPES.map((t) => {
            const on = d.type === t.value;
            return (
              <button key={t.value} type="button" role="radio" aria-checked={on} onClick={() => set('type', t.value)} className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm transition-colors ${on ? 'border-ink bg-surface font-semibold' : 'border-line text-muted hover:text-ink'}`}>
                {t.label}
              </button>
            );
          })}
        </div>
        {suggestion && (
          <p className="mt-2 font-support text-sm text-muted">
            {d.lender.trim()} is a pay-later provider.{' '}
            <button type="button" onClick={() => set('type', suggestion)} className="cursor-pointer font-semibold text-accent underline-offset-2 hover:underline">Use {loanTypeLabel(suggestion)}</button>
          </p>
        )}
        {show('type') && <p role="alert" className="mt-2 font-support text-xs text-red-300">{show('type')}</p>}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-6 @3xl:grid-cols-2">
        <UnderlineField label={isBnpl ? 'Provider' : 'Lender'} icon="government-building-1" value={d.lender} onChange={(e) => set('lender', e.target.value)} placeholder={isBnpl ? 'Affirm, Klarna, Afterpay…' : 'Affirm, Klarna, a car loan…'} error={show('lender')} autoFocus />
        <UnderlineField label={isBnpl ? 'Purchase Description (Optional)' : 'What It Paid For (Optional)'} icon="tag-alt" value={d.item} onChange={(e) => set('item', e.target.value)} placeholder="Peloton, flights, laptop…" />
        <UnderlineField label="Amount Borrowed" icon="dollar-coin" inputMode="decimal" value={d.amount} onChange={(e) => set('amount', e.target.value)} placeholder="600.00" hint={isBnpl && purchase && purchase > 0 && down !== undefined && down >= 0 && down < purchase ? `Price minus down payment: ${moneyExact(purchase - down)}.` : 'After any down payment.'} error={show('amount')} />
        <UnderlineField label="Number of Payments" icon="circle-clock" inputMode="numeric" value={d.count} onChange={(e) => set('count', e.target.value)} placeholder="12" error={show('count')} />
        <UnderlineField label="Interest Rate (APR %)" icon="graph-bar-increase" inputMode="decimal" value={d.apr} onChange={(e) => set('apr', e.target.value)} placeholder="0" hint="Most pay-in-4 plans are 0%." error={show('apr')} />
        <UnderlineField label="First Payment Date" icon="calendar-check" type="date" value={d.firstDate} onChange={(e) => set('firstDate', e.target.value)} error={show('firstDate')} />
      </div>

      {isBnpl && (
        <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-6 @3xl:grid-cols-2">
          <UnderlineField label="Purchased At (Optional)" icon="wallet" value={d.merchant} onChange={(e) => set('merchant', e.target.value)} placeholder="Peloton, Best Buy…" />
          <UnderlineField label="Purchase Category (Optional)" icon="tag-alt" list="loan-purchase-categories" value={d.category} onChange={(e) => set('category', e.target.value)} placeholder="Shopping, Travel…" />
          <UnderlineField label="Purchase Date (Optional)" icon="calendar-check" type="date" value={d.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)} error={show('purchaseDate')} />
          <UnderlineField label="Purchase Amount (Optional)" icon="dollar-coin" inputMode="decimal" value={d.purchaseAmount} onChange={(e) => set('purchaseAmount', e.target.value)} placeholder="800.00" hint="The full price." error={show('purchaseAmount')} />
          <UnderlineField label="Down Payment (Optional)" icon="dollar-coin" inputMode="decimal" value={d.downPayment} onChange={(e) => set('downPayment', e.target.value)} placeholder="200.00" error={show('downPayment')} />
          <UnderlineField label="Plan ID (Optional)" icon="tag-alt" value={d.planId} onChange={(e) => set('planId', e.target.value)} placeholder="From your provider’s app" />
          <datalist id="loan-purchase-categories">{BILL_CATEGORY_OPTIONS.map((c) => <option key={c.key} value={c.label} />)}</datalist>
        </div>
      )}

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
  bank,
  loanName,
  repayment: r,
  payments,
  roles,
  ledger,
  onEdit,
  onAddAnother,
}: {
  loan: Loan;
  lenderPosition: number;
  lenderTotal: number;
  logos: string[];
  bank: BankData;
  loanName: (id: string) => string;
  repayment: Repayment;
  payments: PaymentData;
  roles: LoanRole[];
  ledger: BnplLedger;
  onEdit: () => void;
  onAddAnother: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState(false);
  // The schedule only: payment, interest and dates. What has been paid comes from the repayment.
  const s = statusFor(loan);
  const today = todayIso();
  const soon = addPeriods(todayIso(), 'weekly', 1);
  const b = loan.type === 'bnpl' ? loan.bnpl : undefined;
  const purchaseLine = b
    ? [
        b.merchant && `Bought at ${b.merchant}`,
        b.purchaseDate && dateText(b.purchaseDate),
        b.purchaseAmount !== undefined && `${moneyExact(b.purchaseAmount)} price`,
        b.downPayment !== undefined && b.downPayment > 0 && `${moneyExact(b.downPayment)} down`,
        b.category,
      ].filter(Boolean).join(' · ')
    : '';
  const unverifiedRows = r.rows.filter((x) => x.status === 'unverified' && x.date <= today && x.pending === 0);
  const recordAll = () => {
    for (const x of unverifiedRows) loanPayments.addPayment({ loanId: loan.id, installment: x.n, amount: x.expected, date: x.date, source: 'other', note: 'Recorded from the schedule' });
    setConfirmBulk(false);
  };
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
            <span className="rounded-full border border-line bg-surface px-2 py-0.5 font-support text-[10px] font-semibold text-muted">{loan.type ? loanTypeLabel(loan.type) : 'Needs A Type'}</span>
          </div>
          <p className="truncate font-support text-sm text-muted">
            {loan.item ? `${loan.item} · ` : ''}{moneyExact(s.payment)} every {freqWord(loan.frequency)}{loan.apr > 0 ? ` · ${loan.apr}% APR` : ' · 0% interest'}
          </p>
          {purchaseLine && <p className="truncate font-support text-sm text-muted">{purchaseLine}</p>}
        </div>
        <div className="text-right">
          <p className="font-support text-[11px] font-semibold tracking-[0.18em] text-muted uppercase" title="Worked out from the payments recorded, not a figure from the lender.">{r.done ? 'Paid Off' : 'Est. Still Owed'}</p>
          <p className="text-2xl leading-tight font-semibold tracking-tight tabular-nums"><span className="text-accent">$</span>{moneyExact(r.principalRemaining).slice(1)}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(r.progress * 100)} aria-label={`${loan.lender} paid off, estimated from recorded payments`}>
          <motion.div className="h-full rounded-full bg-accent" initial={{ width: 0 }} animate={{ width: `${r.progress * 100}%` }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-support text-sm text-muted">
          <span>
            <span className="font-semibold text-ink">{r.confirmedCount}</span> of {loan.count} payments confirmed
            {r.unverifiedCount > 0 && <span className="text-amber-300"> · {r.unverifiedCount} unverified</span>}
            {r.overdueCount > 0 && <span className="text-red-300"> · {r.overdueCount} past due</span>}
          </span>
          <span>
            {r.done
              ? `Last payment ${dateText(r.completion)}`
              : r.nextUnpaid
                ? <>Next unpaid <span className="font-semibold text-ink">{moneyExact(r.nextUnpaid.shortfall)}</span> {r.nextUnpaid.date < today ? 'due' : 'on'} {dateText(r.nextUnpaid.date)}</>
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
        <span className="ml-auto font-support text-xs text-muted">{r.done ? 'Paid off' : r.completionLate ? 'Was due to finish' : 'Est. paid off'} {dateText(r.completion)}{s.totalInterest > 0 ? ` · ${moneyExact(s.totalInterest)} interest in all` : ''}</span>
      </div>

      {unverifiedRows.length > 0 && (
        <div className="mt-3 rounded-xl border border-line bg-surface/60 p-3 font-support text-sm text-muted">
          <p>
            {plural(unverifiedRows.length, 'past payment')} ({moneyExact(r.unverifiedAmount)}) {unverifiedRows.length === 1 ? 'has' : 'have'} nothing recorded. Wallex cannot tell if {unverifiedRows.length === 1 ? 'it was' : 'they were'} made, so the balance has not gone down for {unverifiedRows.length === 1 ? 'it' : 'them'}.
            {' '}If every one was paid on time, about <b className="font-semibold text-ink">{moneyExact(r.scheduledRemainingPrincipal)}</b> would be left.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            {!open && <button type="button" onClick={() => setOpen(true)} className="cursor-pointer underline-offset-2 transition-colors hover:text-ink hover:underline">Open the schedule to check them</button>}
            {confirmBulk ? (
              <>
                <span className="text-ink">Record {unverifiedRows.length === 1 ? 'it' : `all ${unverifiedRows.length}`} as paid on the due date?</span>
                <button type="button" onClick={recordAll} className="cursor-pointer font-semibold text-accent underline-offset-2 hover:underline">Yes, record {unverifiedRows.length === 1 ? 'it' : 'them'}</button>
                <button type="button" onClick={() => setConfirmBulk(false)} className="cursor-pointer underline-offset-2 hover:text-ink hover:underline">Cancel</button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmBulk(true)} className="cursor-pointer underline-offset-2 transition-colors hover:text-ink hover:underline">I paid {unverifiedRows.length === 1 ? 'it' : 'these'} on schedule</button>
            )}
          </div>
        </div>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
            {loan.type === 'bnpl' && <LoanRelated loan={loan} bank={bank} roles={roles} report={ledger.loans.get(loan.id)} />}
            <div role="table" aria-label={`${loan.lender} payment schedule`} className="mt-4 font-support text-sm">
              <div role="row" className="grid grid-cols-[2rem_1fr_auto_auto] gap-3 border-b border-line pb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">
                <span role="columnheader">#</span><span role="columnheader">Date</span><span role="columnheader" className="text-right">Payment</span><span role="columnheader" className="w-24 text-right">Owed After</span>
              </div>
              {s.schedule.map((i) => {
                const row = r.rows[i.n - 1];
                const paid = row.status === 'paidBank' || row.status === 'paidManual' || row.status === 'waived' || row.status === 'canceled';
                const cover = coverageFor(loan.id, i, bank.views);
                // Linking and recording are offered for payments that are due soon, or that already have something on record.
                const hasRecords = cover.views.length > 0 || row.applied > 0 || row.pending > 0 || row.reversed > 0 || payments.payments.some((p) => p.loanId === loan.id && p.installment === i.n);
                const showArea = hasRecords || row.status === 'waived' || row.status === 'canceled' || (!paid && i.date <= soon);
                return (
                  <Fragment key={i.n}>
                  <div role="row" className={`grid grid-cols-[2rem_1fr_auto_auto] gap-3 border-b border-line/60 py-2 tabular-nums ${paid ? 'text-muted' : 'text-ink'}`}>
                    <span role="cell">{i.n}</span>
                    <span role="cell" className="flex flex-wrap items-center gap-2">{dateText(i.date)}<span title={STATUS_TITLE[row.status]} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_TONE[row.status]}`}>{STATUS_LABEL[row.status]}</span>{r.nextUnpaid?.n === i.n && <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-ink">Next</span>}</span>
                    <span role="cell" className="text-right">{moneyExact(i.payment)}</span>
                    <span role="cell" className="w-24 text-right">{moneyExact(i.balance)}</span>
                  </div>
                  {showArea && <InstallmentMatches loan={loan} inst={i} cover={cover} bank={bank} loanName={loanName} extra={<RecordedPayments loan={loan} inst={i} row={row} repayment={r} payments={payments} />} />}
                  </Fragment>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 border-t border-line pt-4">
        <DestructiveAction trigger="Delete loan…" title={`Delete the ${loan.lender} loan?`} body="It is removed from Wallex. Nothing changes with the lender." confirm="Delete" onConfirm={() => { removeLoan(loan.id); loanLinks.removeForLoan(loan.id); loanPayments.removeForLoan(loan.id); loanRoles.removeForLoan(loan.id); }} />
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------------------------------- page */
export default function LoansTab({ load }: { load: Load }) {
  const loans = useLoans();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [hint, setHint] = useState<BankLoanHint | undefined>();
  const [typeFilter, setTypeFilter] = useState<LoanType | 'unset' | 'all'>('all');

  const hints = useMemo(() => {
    const txns = load.state === 'live' ? load.allTransactions : [];
    return bankLoanHints(txns);
  }, [load]);

  const links = useLoanLinks();
  const live = load.state === 'live';
  const txns = load.state === 'live' ? load.allTransactions : [];
  const accounts = load.state === 'live' ? load.allAccounts : [];
  const views = useMemo(() => reconcileLinks(links, live ? txns : null, { knownAccountIds: new Set(accounts.map((a) => a.id)) }), [links, load]);
  const match = useMemo(() => matchInstallments({ loans, links, txns }), [loans, links, load]);
  const bank: BankData = { live, txns, accounts, links, views, match };
  const loanName = (id: string) => {
    const l = loans.find((x) => x.id === id);
    return l ? `${l.lender}${l.item ? ` (${l.item})` : ''}` : 'a loan that was removed';
  };

  // A pending charge that has settled under a new id, with one clear successor, stays linked to the same payment.
  useEffect(() => {
    for (const v of views) if (v.replacement && v.link.pendingAtLink) loanLinks.replaceTxn(v.link.id, v.replacement);
  }, [views]);

  const payments = useLoanPayments();
  const roles = useLoanRoles();
  const { ledger } = useBnpl(load);
  const today = todayIso();
  const repayments = useMemo(
    () => new Map(loans.map((l) => [l.id, repaymentFor({ loan: l, asOf: today, bank: bankEvidenceFromViews(views, l.id), manual: payments.payments, adjustments: payments.adjustments })])),
    [loans, views, payments, today],
  );

  const statuses = loans.map((l) => ({ loan: l, s: statusFor(l), r: repayments.get(l.id)! }));
  const owed = statuses.reduce((sum, x) => sum + x.r.principalRemaining, 0);
  const active = statuses.filter((x) => !x.r.done);
  const unverified = active.reduce((sum, x) => sum + x.r.unverifiedCount, 0);
  const overdue = active.reduce((sum, x) => sum + x.r.overdueCount, 0);
  const soonest = active.filter((x) => x.r.nextScheduled).sort((a, b) => a.r.nextScheduled!.date.localeCompare(b.r.nextScheduled!.date))[0];
  const monthly = active.reduce((sum, x) => sum + (x.loan.frequency === 'weekly' ? x.s.payment * 52 / 12 : x.loan.frequency === 'biweekly' ? x.s.payment * 26 / 12 : x.s.payment), 0);

  const typeCounts = new Map<LoanType | 'unset', number>();
  for (const l of loans) typeCounts.set(l.type ?? 'unset', (typeCounts.get(l.type ?? 'unset') ?? 0) + 1);
  // A filter whose last loan was deleted or retyped falls back to showing everything.
  const filter = typeFilter === 'all' || typeCounts.has(typeFilter) ? typeFilter : 'all';
  const filterOptions: { value: LoanType | 'unset' | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    ...LOAN_TYPES,
    ...(typeCounts.has('unset') ? [{ value: 'unset' as const, label: 'Needs A Type' }] : []),
  ];
  const shown = statuses.filter(({ loan }) => filter === 'all' || (loan.type ?? 'unset') === filter);

  const openNew = (h?: BankLoanHint) => {
    setHint(h);
    setEditing(h ? { ...EMPTY, lender: h.lender, frequency: h.frequency, firstDate: h.first, type: 'bnpl' } : { ...EMPTY, firstDate: todayIso() });
  };
  const openAnother = (l: Loan) => {
    setHint(undefined);
    setEditing({ ...EMPTY, lender: l.lender, type: l.type ?? '', firstDate: todayIso() });
  };
  const edit = (l: Loan) => {
    setHint(undefined);
    setEditing(draftFromLoan(l));
  };
  const close = () => setEditing(null);

  return (
    <div className="w-full pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3 px-0 pb-4 @3xl:px-4">
        <p className="font-support text-sm text-muted">Pay-later plans and loans you type in. Link your bank payments or record them yourself, and Wallex works out what is left. <SyncLine /></p>
        {!editing && <button type="button" onClick={() => openNew()} className={`${primaryBtn} flex items-center gap-2`}><Plus className="h-4 w-4" />Add Loan</button>}
      </div>

      <AnimatePresence initial={false}>{editing && <LoanForm key={editing.id || 'new'} initial={editing} hint={hint} onClose={close} />}</AnimatePresence>

      {loans.length > 0 && (
        <div className="mx-0 mb-6 @3xl:mx-4 grid grid-cols-1 gap-3 rounded-2xl border border-line bg-card/60 p-5 @3xl:grid-cols-3">
          <div>
            <p className="font-support text-[11px] font-semibold tracking-[0.18em] text-muted uppercase" title="Worked out from the payments recorded, not a figure from the lenders.">Est. Total Still Owed</p>
            <p className="mt-1 text-3xl leading-none font-semibold tracking-tight tabular-nums"><span className="text-accent">$</span>{moneyExact(owed).slice(1)}</p>
            <p className="mt-1.5 font-support text-sm text-muted">
              Across {plural(active.length, 'active loan')}
              {unverified > 0 && <span className="text-amber-300"> · {unverified} unverified</span>}
              {overdue > 0 && <span className="text-red-300"> · {overdue} past due</span>}
            </p>
          </div>
          <div>
            <p className="font-support text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">Next Payment</p>
            <p className="mt-1 text-3xl leading-none font-semibold tracking-tight tabular-nums">{soonest?.r.nextScheduled ? moneyExact(soonest.r.nextScheduled.expected) : '—'}</p>
            <p className="mt-1.5 font-support text-sm text-muted">{soonest?.r.nextScheduled ? `${soonest.loan.lender} · ${dateText(soonest.r.nextScheduled.date)}` : 'Nothing due'}</p>
          </div>
          <div>
            <p className="font-support text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">Per Month</p>
            <p className="mt-1 text-3xl leading-none font-semibold tracking-tight tabular-nums">{moneyExact(monthly)}</p>
            <p className="mt-1.5 font-support text-sm text-muted">What these loans take each month</p>
          </div>
        </div>
      )}

      {hints.length > 0 && !editing && (
        <section className="mx-0 mb-6 @3xl:mx-4">
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

      {loans.length > 1 && (
        <div role="radiogroup" aria-label="Filter by loan type" className="mx-0 mb-4 flex flex-wrap gap-2 @3xl:mx-4">
          {filterOptions.map((o) => {
            const on = filter === o.value;
            const n = o.value === 'all' ? loans.length : (typeCounts.get(o.value) ?? 0);
            return (
              <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => setTypeFilter(o.value)} className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm transition-colors ${on ? 'border-ink bg-surface font-semibold' : 'border-line text-muted hover:text-ink'}`}>
                {o.label} <span className="font-support text-xs text-muted">{n}</span>
              </button>
            );
          })}
        </div>
      )}

      {loans.length > 0 && (
        <div className="mx-0 space-y-4 @3xl:mx-4">
          {shown
            .slice()
            .sort((a, b) => Number(a.r.done) - Number(b.r.done) || (a.r.nextUnpaid?.date ?? '9999').localeCompare(b.r.nextUnpaid?.date ?? '9999'))
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
                  bank={bank}
                  loanName={loanName}
                  repayment={repayments.get(loan.id)!}
                  payments={payments}
                  roles={roles}
                  ledger={ledger}
                  onEdit={() => edit(loan)}
                  onAddAnother={() => openAnother(loan)}
                />
              );
            })}
        </div>
      )}
    </div>
  );
}
