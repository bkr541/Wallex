import { useState, type ReactNode } from 'react';
import { buildLink, loanLinks, type InstallmentCoverage, type InstallmentLink, type LinkResult, type LinkState, type LinkView } from '../lib/loanLinks';
import { candidatesFor, manualOptions, type Candidate, type Confidence, type MatchResult } from '../lib/loanMatching';
import type { Installment, Loan } from '../lib/loans';
import { moneyExact } from '../lib/patternFormat';
import type { LinkedAccount, Txn } from '../lib/wallex';
import { formatDate } from './TransactionTable';

// Under a pay-later loan's schedule row: the bank transactions linked to that installment, the ones Wallex thinks might
// be it, and a way to pick another. Nothing is linked until the person confirms it.

export interface BankData {
  live: boolean; // the bank's transactions are loaded
  txns: Txn[];
  accounts: LinkedAccount[];
  links: InstallmentLink[];
  views: LinkView[];
  match: MatchResult;
}

const STATE_TEXT: Record<LinkState, string> = {
  posted: 'Confirmed paid',
  pending: 'Pending, counts once it posts',
  reversed: 'Refunded',
  missing: 'No longer in your bank feed',
  unknown: 'Bank not loaded',
};
const STATE_TONE: Record<LinkState, string> = {
  posted: 'bg-accent-soft text-accent',
  pending: 'bg-surface text-ink',
  reversed: 'bg-surface text-amber-300',
  missing: 'bg-surface text-amber-300',
  unknown: 'bg-surface text-muted',
};
const CONFIDENCE_TEXT: Record<Confidence, string> = { high: 'Likely match', medium: 'Possible match', low: 'Weak match' };

const pill = 'rounded-full px-2 py-0.5 text-[10px] font-semibold';
const textBtn = 'cursor-pointer font-support text-xs text-muted underline-offset-2 transition-colors hover:text-ink hover:underline';
const solidBtn = 'cursor-pointer rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-canvas transition-opacity hover:opacity-90';

const accountName = (accounts: LinkedAccount[], id: string) => {
  const a = accounts.find((x) => x.id === id);
  return a ? `${a.name}${a.mask ? ` ••${a.mask}` : ''}` : '';
};

const failure = (r: LinkResult, byLoan: (id: string) => string) =>
  r.ok ? null : r.reason === 'txn-already-linked' ? `That transaction already pays ${r.existing ? `installment ${r.existing.installment} of ${byLoan(r.existing.loanId)}` : 'another installment'}. Remove that link first.` : 'That transaction cannot be linked.';

function TxnDetails({ txn }: { txn: Txn }) {
  return (
    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg border border-line bg-surface/60 p-3 text-xs">
      {[{ label: 'Merchant', value: txn.merchant }, { label: 'Posted', value: `${formatDate(txn.date)}${txn.pending ? ' (pending)' : ''}` }, ...(txn.authorizedDate ? [{ label: 'Made', value: formatDate(txn.authorizedDate) }] : []), ...txn.details].map((d, i) => (
        <div key={`${d.label}-${i}`} className="contents">
          <dt className="text-muted">{d.label}</dt>
          <dd className="min-w-0 break-words text-ink/90">{d.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function InstallmentMatches({ loan, inst, cover, bank, loanName, extra }: { loan: Loan; inst: Installment; cover: InstallmentCoverage; bank: BankData; loanName: (id: string) => string; extra?: ReactNode }) {
  const [picking, setPicking] = useState(false);
  const [open, setOpen] = useState<string | null>(null); // a txn id whose details are showing
  const [message, setMessage] = useState<string | null>(null);

  const candidates = bank.live ? candidatesFor(bank.match, loan.id, inst.n).slice(0, 3) : [];
  const options = picking && bank.live ? manualOptions({ loan, installment: inst.n, links: bank.links, txns: bank.txns, duplicateTxnIds: bank.match.duplicateTxnIds }) : [];
  const settle = (r: LinkResult) => {
    setMessage(failure(r, loanName));
    if (r.ok) setPicking(false);
  };

  const confirm = (c: Candidate) => settle(loanLinks.link(buildLink(loan, inst, c.txn, 'suggestion')));
  const reject = (c: Candidate) => loanLinks.reject(buildLink(loan, inst, c.txn, 'suggestion'));
  const choose = (t: Txn) => settle(loanLinks.link(buildLink(loan, inst, t, 'manual')));

  const nothing = cover.views.length === 0 && candidates.length === 0;
  if (nothing && !bank.live && !extra) return null;

  return (
    <div className="border-b border-line/60 pb-3 pl-9 font-support text-xs">
      {cover.views.map((v) => (
        <div key={v.link.id} className="mt-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={`${pill} ${STATE_TONE[v.state]}`}>{STATE_TEXT[v.state]}</span>
            <span className="min-w-0 truncate text-ink/90">
              {v.txn?.merchant ?? v.link.lender} · {moneyExact(v.link.actualAmount)} · {formatDate(v.txn?.date ?? v.link.actualDate)}
              {accountName(bank.accounts, v.link.accountId) && ` · ${accountName(bank.accounts, v.link.accountId)}`}
            </span>
            {v.refunded > 0 && <span className="text-amber-300">{moneyExact(v.refunded)} refunded</span>}
            {v.txn && <button type="button" onClick={() => setOpen(open === v.link.txnId ? null : v.link.txnId)} aria-expanded={open === v.link.txnId} className={textBtn}>{open === v.link.txnId ? 'Hide transaction' : 'View transaction'}</button>}
            <button type="button" onClick={() => loanLinks.unlink(v.link.id)} className={textBtn}>Remove link</button>
          </div>
          {open === v.link.txnId && v.txn && <TxnDetails txn={v.txn} />}
        </div>
      ))}
      {cover.state === 'partial' && <p className="mt-1 text-muted">{moneyExact(cover.paid)} of {moneyExact(cover.expected)} linked so far.</p>}

      {candidates.map((c) => (
        <div key={c.txn.id} className="mt-2 rounded-lg border border-line bg-surface/40 p-2.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={`${pill} ${c.confidence === 'high' ? 'bg-accent-soft text-accent' : 'bg-surface text-muted'}`}>{CONFIDENCE_TEXT[c.confidence]}</span>
            <span className="min-w-0 truncate text-ink/90">
              {c.txn.merchant} · {moneyExact(-c.txn.amount)} · {formatDate(c.txn.date)}{c.txn.pending ? ' · Pending' : ''}
              {accountName(bank.accounts, c.txn.accountId) && ` · ${accountName(bank.accounts, c.txn.accountId)}`}
            </span>
            <span className="ml-auto flex items-center gap-3">
              <button type="button" onClick={() => confirm(c)} className={solidBtn}>{c.txn.pending ? 'Link (pending)' : 'Confirm'}</button>
              <button type="button" onClick={() => reject(c)} className={textBtn}>Not this one</button>
            </span>
          </div>
          {c.ambiguous && <p className="mt-1 text-amber-300">More than one payment or installment could fit. Check the details before confirming.</p>}
          {c.kind === 'partial' && <p className="mt-1 text-muted">Less than the {moneyExact(c.txn.amount * -1 - c.amountDiff)} still due. It could be one part of a split payment.</p>}
          <button type="button" onClick={() => setOpen(open === `c${c.txn.id}` ? null : `c${c.txn.id}`)} aria-expanded={open === `c${c.txn.id}`} className={`${textBtn} mt-1`}>{open === `c${c.txn.id}` ? 'Hide details' : 'Why this match'}</button>
          {open === `c${c.txn.id}` && (
            <>
              <ul className="mt-1 list-disc pl-5 text-muted">{c.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
              <TxnDetails txn={c.txn} />
            </>
          )}
        </div>
      ))}

      {message && <p role="alert" className="mt-2 text-red-300">{message}</p>}

      {bank.live && loan.type === 'bnpl' && (
        <div className="mt-2">
          <button type="button" onClick={() => { setPicking(!picking); setMessage(null); }} aria-expanded={picking} className={textBtn}>
            {picking ? 'Close list' : cover.views.length ? 'Link another transaction' : 'Choose a transaction'}
          </button>
          {picking && (
            <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto" aria-label="Transactions near this payment date">
              {options.length === 0 && <li className="text-muted">No payments out of your accounts within a month of {formatDate(inst.date)}.</li>}
              {options.map((o) => (
                <li key={o.txn.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line px-2.5 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-ink/90">
                    {o.txn.merchant} · {moneyExact(-o.txn.amount)} · {formatDate(o.txn.date)}{o.txn.pending ? ' · Pending' : ''}
                    {accountName(bank.accounts, o.txn.accountId) && ` · ${accountName(bank.accounts, o.txn.accountId)}`}
                  </span>
                  {o.linkedTo ? (
                    <span className="text-muted">Pays installment {o.linkedTo.installment} of {loanName(o.linkedTo.loanId)}</span>
                  ) : (
                    <button type="button" onClick={() => choose(o.txn)} className={solidBtn}>Use this</button>
                  )}
                  {o.possibleDuplicate && <span className="text-amber-300">May be a duplicate</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {extra}
    </div>
  );
}
