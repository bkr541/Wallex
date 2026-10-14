import { useCallback, useEffect, useState } from 'react';
import { wallex, type InstitutionStatus, type LinkedAccount, type Txn } from './wallex';

export type Load =
  | { state: 'loading' }
  | { state: 'sample'; note: string; isError?: boolean }
  | {
      state: 'live';
      bank: string; // every linked bank's name, joined
      // Banks that could not be refreshed (a login that expired, say). The rest still load.
      problems: InstitutionStatus[];
      // The Checking and Recurring tabs work on the checking account(s) only.
      accounts: LinkedAccount[];
      transactions: Txn[];
      // Everything linked, including credit cards. Patterns uses all of it.
      allAccounts: LinkedAccount[];
      allTransactions: Txn[];
    };

export function useTransactions() {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const res = await wallex.getTransactions();
    setRefreshing(false);

    if (!res.ok) {
      return setLoad({ state: 'sample', note: res.error, isError: true });
    }
    const data = res.data;
    if (!data.connected) {
      return setLoad({ state: 'sample', note: 'Showing sample data. Connect your bank in Settings → Setup.' });
    }
    if (data.notReady) {
      return setLoad({
        state: 'sample',
        note: `${data.institutionName ?? 'Your bank'} is connected, but Plaid is still preparing your transactions. Try again in a minute.`,
      });
    }
    const allAccounts = data.accounts ?? [];
    const allTransactions = data.transactions ?? [];
    // Prefer checking accounts when there are any; otherwise fall back to everything.
    const checking = allAccounts.filter((a) => a.subtype === 'checking');
    const shown = checking.length ? checking : allAccounts;
    const shownIds = new Set(shown.map((a) => a.id));
    setLoad({
      state: 'live',
      bank: data.institutionName ?? 'Bank',
      problems: (data.institutions ?? []).filter((i) => i.error),
      accounts: shown,
      transactions: allTransactions.filter((t) => shownIds.has(t.accountId)),
      allAccounts,
      allTransactions,
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { load, refreshing, refresh };
}

// The name of the bank an account belongs to, and the banks that are linked, in the order they were found.
export const bankOf = (a: LinkedAccount) => a.institution || 'Bank';
export function bankNames(load: Load): string[] {
  return load.state === 'live' ? [...new Set(load.allAccounts.map(bankOf))] : [];
}

// Text for the Checking tab: the linked account's name and last four digits, e.g. "TOTAL CHECKING ••6201".
export function accountLabel(load: Load): string {
  if (load.state !== 'live' || load.accounts.length === 0) return 'Checking';
  const a = load.accounts[0];
  return a.mask ? `${a.name} ••${a.mask}` : a.name;
}
