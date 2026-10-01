import type { Txn } from './wallex';

export type TxnWithBalance = Txn & { balance: number | null };

// Plaid reports only each account's current balance, not a balance per transaction.
// Walk backwards from it: the newest posted transaction leaves the account at the current
// balance, and undoing each transaction gives the balance after the one before it.
// Expects `txns` newest first. Pending transactions haven't hit the ledger, so they get none.
// Transactions on the same day are ordered as Plaid returned them, so the day-end balance is
// exact but the order within a day is a best guess.
export function withBalances(txns: Txn[], accounts: { id: string; current: number | null }[]): TxnWithBalance[] {
  const running = new Map<string, number | null>(accounts.map((a) => [a.id, a.current]));

  return txns.map((t) => {
    const balance = running.get(t.accountId);
    if (t.pending || balance == null) return { ...t, balance: null };
    running.set(t.accountId, Math.round((balance - t.amount) * 100) / 100);
    return { ...t, balance };
  });
}
