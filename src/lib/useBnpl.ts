import { useMemo } from 'react';
import { buildBnplLedger, NO_BNPL, spendingView, type BnplLedger } from './bnpl';
import { todayIso } from './loans';
import type { LoanObligationData } from './obligations';
import type { Load } from './useTransactions';
import { useLoanObligationData } from './useLoanObligations';
import type { Txn } from './wallex';

// The pay-later view of the bank's transactions, for the screens that report spending. `spending` is the list a spending
// report should read: the same transactions with the principal in pay-later installments taken out and each pay-later
// purchase put on its own day. Money in and out, balances and the forecast read the bank's own list, which is unchanged.
export function useBnpl(load: Load): { data: LoanObligationData; ledger: BnplLedger; spending: Txn[] } {
  const data = useLoanObligationData(load);
  return useMemo(() => {
    if (load.state !== 'live') return { data, ledger: NO_BNPL, spending: [] };
    const ledger = buildBnplLedger(load.allTransactions, data, todayIso());
    return { data, ledger, spending: spendingView(load.allTransactions, ledger) };
  }, [load, data]);
}
