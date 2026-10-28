import { useMemo, useState } from 'react';
import { daysBetween, providerMatch } from '../lib/loanMatching';
import { loanRoles, roleLabel, ROLE_OPTIONS, type LoanRole, type LoanRoleKind } from '../lib/loanRoles';
import { isRepresented, purchaseCategory, type LoanReport } from '../lib/bnpl';
import type { Loan } from '../lib/loans';
import { moneyExact } from '../lib/patternFormat';
import { formatDate } from './TransactionTable';
import type { BankData } from './LoanMatches';

// Under a pay-later loan: what it was for, and the bank transactions the person ties to it besides its installments.
// Wallex counts a purchase once, so it needs to know which bank charge (if any) was the purchase, which was the down
// payment, and which were fees or refunds. It never works that out from a merchant name.

const textBtn = 'cursor-pointer font-support text-xs text-muted underline-offset-2 transition-colors hover:text-ink hover:underline';
const solidBtn = 'cursor-pointer rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-canvas transition-opacity hover:opacity-90';

export default function LoanRelated({ loan, bank, roles, report }: { loan: Loan; bank: BankData; roles: LoanRole[]; report?: LoanReport }) {
  const [adding, setAdding] = useState(false);
  const [role, setRole] = useState<LoanRoleKind>('purchase');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const mine = roles.filter((r) => r.loanId === loan.id);
  const txnById = useMemo(() => new Map(bank.txns.map((t) => [t.id, t])), [bank.txns]);
  const b = loan.bnpl;
  const cat = purchaseCategory(b?.category);

  const taken = useMemo(() => new Set([...bank.links.filter((l) => l.status === 'linked').map((l) => l.txnId), ...roles.map((r) => r.txnId)]), [bank.links, roles]);
  const anchor = b?.purchaseDate ?? loan.firstDate;
  const options = useMemo(() => {
    if (!adding) return [];
    const q = query.trim().toLowerCase();
    return bank.txns
      .filter((t) => !taken.has(t.id) && (role === 'refund' ? t.amount > 0 : t.amount < 0) && (!q || t.merchant.toLowerCase().includes(q)))
      .map((t) => ({ t, near: providerMatch(loan.lender, t) !== null, days: Math.abs(daysBetween(t.date, anchor)) }))
      .sort((x, y) => Number(y.near) - Number(x.near) || x.days - y.days)
      .slice(0, 20);
  }, [adding, bank.txns, taken, role, query, loan.lender, anchor]);

  const assign = (txnId: string) => {
    const t = txnById.get(txnId)!;
    const r = loanRoles.assign(loan.id, t, role);
    setMessage(r.ok ? null : r.reason === 'txn-has-role' ? 'That transaction already has a role. Remove it first.' : 'A refund is money in; the other roles are money out.');
    if (r.ok) setAdding(false);
  };

  return (
    <div className="mt-4 rounded-xl border border-line bg-surface/40 p-3 font-support text-xs">
      <p className="text-[10px] font-semibold tracking-[0.2em] text-muted uppercase">Purchase and Related Payments</p>
      <p className="mt-2 text-muted">
        {isRepresented(loan)
          ? <>Counted as spending: <b className="font-semibold text-ink">{moneyExact(b!.purchaseAmount!)}</b> on {formatDate(b!.purchaseDate!)}{cat.key !== 'UNCATEGORIZED' ? ` in ${cat.label}` : ''}. The installments' principal is not counted again; their interest and any fees are.</>
          : 'No purchase price and date recorded, so each installment counts as spending when it is paid. Add them by editing the loan to count the purchase when it was made instead.'}
      </p>
      {report?.notes.map((n) => <p key={n} className="mt-1 text-amber-300">{n}</p>)}

      {mine.map((r) => {
        const t = txnById.get(r.txnId);
        return (
          <div key={r.id} className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="rounded-full bg-violet-300/15 px-2 py-0.5 text-[10px] font-semibold text-violet-200">{roleLabel(r.role)}</span>
            <span className="min-w-0 truncate text-ink/90">{t ? t.merchant : 'No longer in your bank feed'} · {moneyExact(Math.abs(r.amount))} · {formatDate(r.date)}</span>
            <button type="button" onClick={() => loanRoles.remove(r.id)} className={textBtn}>Remove</button>
          </div>
        );
      })}

      {bank.live && (
        <div className="mt-2">
          <button type="button" onClick={() => { setAdding(!adding); setMessage(null); }} aria-expanded={adding} className={textBtn}>{adding ? 'Close list' : 'Link a purchase, fee or refund'}</button>
          {adding && (
            <div className="mt-2">
              <div role="radiogroup" aria-label="What it is" className="flex flex-wrap gap-2">
                {ROLE_OPTIONS.map((o) => (
                  <button key={o.value} type="button" role="radio" aria-checked={role === o.value} title={o.hint} onClick={() => setRole(o.value)} className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors ${role === o.value ? 'border-ink bg-surface font-semibold' : 'border-line text-muted hover:text-ink'}`}>{o.label}</button>
                ))}
              </div>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by merchant" aria-label="Search by merchant" className="mt-2 w-full rounded-lg border border-line bg-transparent px-3 py-1.5 text-xs text-ink outline-none select-text placeholder:text-muted/60 focus:border-muted" />
              <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto" aria-label="Transactions to choose from">
                {options.length === 0 && <li className="text-muted">{role === 'refund' ? 'No money-in transactions to choose from.' : 'No payments out of your accounts to choose from.'}</li>}
                {options.map(({ t, near }) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line px-2.5 py-1.5">
                    <span className="min-w-0 flex-1 truncate text-ink/90">{t.merchant} · {moneyExact(Math.abs(t.amount))} · {formatDate(t.date)}{near ? ` · from ${loan.lender}` : ''}</span>
                    <button type="button" onClick={() => assign(t.id)} className={solidBtn}>Use this</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {message && <p role="alert" className="mt-2 text-red-300">{message}</p>}
    </div>
  );
}
