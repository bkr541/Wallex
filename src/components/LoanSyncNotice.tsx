import { useEffect, useState } from 'react';
import { countLegacy, importLegacy, readLegacy, type ImportOutcome, type LegacyData } from '../lib/loanMigration';
import { loanSync, useLoanSync } from '../lib/loanSync';
import type { Conflict } from '../lib/loanSyncEngine';

// What the person needs to know about loans and their account, and nothing more: that loans saved on this device before
// accounts can be added to the account, that changes are waiting because the account cannot be reached, and when a
// change they made was set aside because a newer one arrived from another device.

const box = 'fixed top-4 left-1/2 z-40 w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-line bg-card px-4 py-3 font-support text-sm shadow-[0_12px_30px_rgba(0,0,0,0.5)]';
const solid = 'cursor-pointer rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-50';
const quiet = 'cursor-pointer rounded-lg border border-line px-3 py-1.5 text-xs font-semibold transition-colors hover:border-muted';

const storage = {
  get: (k: string) => localStorage.getItem(k),
  set: (k: string, v: string) => localStorage.setItem(k, v),
  remove: (k: string) => localStorage.removeItem(k),
};

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

function why(c: Conflict) {
  if (c.reason === 'deleted-elsewhere') return `${c.label} was deleted on another device, so your change to it was not saved.`;
  if (c.reason === 'rejected') return `${c.label} could not be saved${c.message ? `: ${c.message}` : '.'}`;
  return `Your change to ${c.label} was set aside because a newer change came from another device. The newer one is showing.`;
}

export default function LoanSyncNotice({ email }: { email: string }) {
  const sync = useLoanSync();
  const [legacy, setLegacy] = useState<LegacyData | null>(null);
  const [later, setLater] = useState(false);
  const [working, setWorking] = useState(false);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);

  // Loans saved before accounts: looked for once the account has been read, so the offer names who they would go to.
  useEffect(() => {
    if (sync.phase === 'ready') {
      try {
        setLegacy(readLegacy(storage));
      } catch {
        setLegacy(null);
      }
    }
  }, [sync.phase, sync.owner]);
  useEffect(() => {
    setLater(false);
    setOutcome(null);
  }, [sync.owner]);

  const run = async () => {
    setWorking(true);
    const result = await importLegacy(loanSync, storage);
    setWorking(false);
    setOutcome(result);
    if (result.status === 'done') setLegacy(null);
  };

  if (sync.phase === 'signed-out') return null;

  if (outcome && outcome.status !== 'none') {
    return (
      <div role="status" className={box}>
        {outcome.status === 'done' && (
          <p>
            Added {plural(outcome.imported, 'record')} to your account{outcome.plan.already ? `; ${plural(outcome.plan.already, 'record')} ${outcome.plan.already === 1 ? 'was' : 'were'} already there` : ''}.
            {outcome.plan.differs.length > 0 && ` ${plural(outcome.plan.differs.length, 'record')} differ from what your account has and were left as the account has them.`} A backup of the device’s copy was kept.
          </p>
        )}
        {outcome.status === 'incomplete' && <p>{plural(outcome.missing, 'record')} could not be confirmed in your account yet. Nothing was removed from this device, and it will be tried again.</p>}
        {outcome.status === 'failed' && <p className="text-red-300">{outcome.error}</p>}
        {outcome.status === 'not-ready' && <p>Your account is not ready yet. Try again in a moment.</p>}
        <div className="mt-2 flex gap-2">
          {outcome.status !== 'done' && <button type="button" onClick={run} className={solid}>Try Again</button>}
          <button type="button" onClick={() => setOutcome(null)} className={quiet}>Dismiss</button>
        </div>
      </div>
    );
  }

  if (legacy && !later && sync.phase === 'ready') {
    return (
      <div role="dialog" aria-label="Add the loans on this device to your account" className={box}>
        <p className="font-semibold">Add the loans saved on this device to your account?</p>
        <p className="mt-1 text-muted">
          This device has {plural(legacy.loans.length, 'loan')} ({plural(countLegacy(legacy) - legacy.loans.length, 'attached record')}) saved from before accounts. Nothing says who they belong to, so they are not added unless you say so. Adding them to <b className="font-semibold text-ink">{email}</b> keeps this device’s copy as a backup.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={working} onClick={run} className={solid}>{working ? 'Adding…' : 'Add To My Account'}</button>
          <button type="button" disabled={working} onClick={() => setLater(true)} className={quiet}>Not Now</button>
        </div>
      </div>
    );
  }

  const conflict = sync.conflicts[0];
  if (conflict) {
    return (
      <div role="alert" className={box}>
        <p>{why(conflict)}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {conflict.reason === 'changed-elsewhere' && conflict.mine !== null && <button type="button" onClick={() => loanSync.resolve(conflict.id, 'reapply')} className={solid}>Apply Mine Again</button>}
          {conflict.reason === 'rejected' && conflict.mine !== null && <button type="button" onClick={() => loanSync.resolve(conflict.id, 'reapply')} className={solid}>Try Again</button>}
          {conflict.reason === 'deleted-elsewhere' && conflict.entity === 'loan' && conflict.mine !== null && <button type="button" onClick={() => loanSync.resolve(conflict.id, 'restore')} className={solid}>Save As A New Loan</button>}
          <button type="button" onClick={() => loanSync.resolve(conflict.id, 'dismiss')} className={quiet}>Dismiss</button>
          {sync.conflicts.length > 1 && <span className="self-center text-xs text-muted">{sync.conflicts.length - 1} more</span>}
        </div>
      </div>
    );
  }

  if (sync.deviceCopyFailed) {
    return <div role="alert" className={`${box} text-amber-300`}>This device could not keep a copy of your latest loan changes. Keep Wallex open until they are saved to your account.</div>;
  }

  if (sync.phase === 'offline') {
    return (
      <div role="status" className={box}>
        <p>
          Wallex could not reach your account. {sync.pending > 0 ? `${plural(sync.pending, 'loan change')} ${sync.pending === 1 ? 'is' : 'are'} kept on this device and will be saved automatically.` : 'Your loans may not be up to date.'}
        </p>
        <div className="mt-2"><button type="button" onClick={() => void loanSync.refresh().then(() => loanSync.flush())} className={quiet}>Try Now</button></div>
      </div>
    );
  }

  return null;
}

// A short line for the Loans page: loading the first time, or what is being saved.
export function SyncLine() {
  const s = useLoanSync();
  const text = s.phase === 'loading' ? 'Loading your loans…' : s.phase === 'offline' ? '' : s.busy && s.pending > 0 ? 'Saving to your account…' : '';
  return text ? <span role="status" className="font-support text-xs text-muted">{text}</span> : null;
}
