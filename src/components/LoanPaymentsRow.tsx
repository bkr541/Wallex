import { useState } from 'react';
import { loanPayments, PAYMENT_SOURCES, sourceLabel, type ManualPayment, type PaymentData, type PaymentSource } from '../lib/loanPayments';
import type { Installment, Loan } from '../lib/loans';
import { isDate, todayIso } from '../lib/loans';
import { moneyExact } from '../lib/patternFormat';
import type { InstallmentRepayment, Repayment } from '../lib/repayment';
import UnderlineField from './UnderlineField';
import { formatDate } from './TransactionTable';

// Under a schedule row: the payments the person recorded for that installment, a way to record one, and a way to waive
// or cancel the installment. These are kept apart from bank payments and labelled as the person's own.

const textBtn = 'cursor-pointer font-support text-xs text-muted underline-offset-2 transition-colors hover:text-ink hover:underline';
const solidBtn = 'cursor-pointer rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-canvas transition-opacity hover:opacity-90';

interface Draft { amount: string; date: string; source: PaymentSource; note: string }

export default function RecordedPayments({ loan, inst, row, repayment, payments }: { loan: Loan; inst: Installment; row: InstallmentRepayment; repayment: Repayment; payments: PaymentData }) {
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>({ amount: '', date: '', source: 'lender-app', note: '' });
  const [more, setMore] = useState(false);
  const [tried, setTried] = useState(false);

  const mine = payments.payments.filter((p) => p.loanId === loan.id && (p.installment === inst.n || row.shares.some((s) => s.kind === 'manual' && s.id === p.id)));
  const replaced = new Set(repayment.superseded.map((s) => s.id));
  const settled = row.status === 'paidBank' || row.status === 'paidManual';
  const marked = row.status === 'waived' || row.status === 'canceled';

  const amount = Number(draft.amount.replace(/[$,\s]/g, ''));
  const errors = { amount: amount > 0 ? null : 'Enter what was paid, like 150', date: isDate(draft.date) ? null : 'Pick the date it was paid' };
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const open = (p?: ManualPayment) => {
    setTried(false);
    setEditing(p ? p.id : 'new');
    setDraft(p
      ? { amount: String(p.amount), date: p.date, source: p.source, note: p.note ?? '' }
      : { amount: String(row.shortfall > 0 ? row.shortfall : inst.payment), date: inst.date <= todayIso() ? inst.date : todayIso(), source: 'lender-app', note: '' });
  };
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (errors.amount || errors.date) return;
    const input = { loanId: loan.id, installment: inst.n, amount, date: draft.date, source: draft.source, note: draft.note };
    if (editing && editing !== 'new') loanPayments.updatePayment(editing, input);
    else loanPayments.addPayment(input);
    setEditing(null);
  };

  return (
    <div className="mt-2">
      {mine.map((p) => (
        <div key={p.id} className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${replaced.has(p.id) ? 'bg-surface text-muted' : 'border border-accent/40 text-accent'}`}>{replaced.has(p.id) ? 'Matched a bank payment' : 'Recorded by you'}</span>
          <span className={`min-w-0 truncate ${replaced.has(p.id) ? 'text-muted' : 'text-ink/90'}`}>
            {moneyExact(p.amount)} · {formatDate(p.date)} · {sourceLabel(p.source)}{p.note ? ` · ${p.note}` : ''}
          </span>
          {replaced.has(p.id) && <span className="text-muted">Not counted twice</span>}
          <button type="button" onClick={() => open(p)} className={textBtn}>Edit</button>
          <button type="button" onClick={() => loanPayments.removePayment(p.id)} className={textBtn}>Remove</button>
        </div>
      ))}
      {row.status === 'partial' && <p className="mt-1 text-muted">{moneyExact(row.applied)} of {moneyExact(row.expected)} paid. {moneyExact(row.shortfall)} still owed.</p>}
      {row.status === 'reversed' && <p className="mt-1 text-amber-300">This payment was refunded, so it does not count.</p>}
      {row.pending > 0 && row.applied === 0 && <p className="mt-1 text-muted">A payment of {moneyExact(row.pending)} is still pending. It counts once it posts.</p>}

      {editing === null ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
          {!marked && !settled && <button type="button" onClick={() => open()} className={textBtn}>Record a payment</button>}
          {settled && <button type="button" onClick={() => open()} className={textBtn}>Record another payment</button>}
          {marked ? (
            <button type="button" onClick={() => loanPayments.markInstallment(loan.id, inst.n, null)} className={textBtn}>Undo {row.status === 'waived' ? 'waived' : 'canceled'}</button>
          ) : (
            !settled && (
              <>
                <button type="button" onClick={() => setMore(!more)} aria-expanded={more} className={textBtn}>{more ? 'Fewer options' : 'Waived or canceled?'}</button>
                {more && (
                  <>
                    <button type="button" onClick={() => loanPayments.markInstallment(loan.id, inst.n, 'waived')} className={textBtn}>Mark waived</button>
                    <button type="button" onClick={() => loanPayments.markInstallment(loan.id, inst.n, 'canceled')} className={textBtn}>Mark canceled</button>
                  </>
                )}
              </>
            )
          )}
        </div>
      ) : (
        <form onSubmit={save} noValidate className="mt-2 rounded-lg border border-line bg-surface/40 p-3">
          <p className="mb-3 font-support text-[10px] font-semibold tracking-[0.2em] text-muted uppercase">{editing === 'new' ? `Record a payment for #${inst.n}` : `Edit payment for #${inst.n}`}</p>
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 @3xl:grid-cols-2">
            <UnderlineField label="Amount Paid" icon="dollar-coin" inputMode="decimal" value={draft.amount} onChange={(e) => set('amount', e.target.value)} error={tried ? errors.amount : null} />
            <UnderlineField label="Date Paid" icon="calendar-check" type="date" value={draft.date} onChange={(e) => set('date', e.target.value)} error={tried ? errors.date : null} />
            <UnderlineField label="Note (Optional)" icon="tag-alt" value={draft.note} onChange={(e) => set('note', e.target.value)} className="@3xl:col-span-2" />
          </div>
          <div role="radiogroup" aria-label="Where it was paid from" className="mt-3 flex flex-wrap gap-2">
            {PAYMENT_SOURCES.map((s) => {
              const on = draft.source === s.value;
              return (
                <button key={s.value} type="button" role="radio" aria-checked={on} onClick={() => set('source', s.value)} className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors ${on ? 'border-ink bg-surface font-semibold' : 'border-line text-muted hover:text-ink'}`}>{s.label}</button>
              );
            })}
          </div>
          <p className="mt-3 text-muted">Recorded payments are marked as yours. If you later link the bank payment for this installment, Wallex counts it once.</p>
          <div className="mt-3 flex items-center gap-3">
            <button type="submit" className={solidBtn}>{editing === 'new' ? 'Save Payment' : 'Save Changes'}</button>
            <button type="button" onClick={() => setEditing(null)} className={textBtn}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
