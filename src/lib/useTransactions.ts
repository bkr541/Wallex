import { useCallback, useEffect, useState } from 'react';
import { wallex, type LinkedAccount, type Txn } from './wallex';

export type Load =
  | { state: 'loading' }
  | { state: 'sample'; note: string; isError?: boolean }
  | { state: 'live'; bank: string; accounts: LinkedAccount[]; transactions: Txn[] };

export function useTransactions() {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const res = await wallex.getTransactions();
    setRefreshing(false);

    if (!res.ok) {
      // Outside the desktop app there is nothing to connect to, so just show the samples.
      return setLoad({
        state: 'sample',
        note: wallex.available() ? res.error : 'Showing sample data. Open the Wallex desktop app to connect your bank.',
        isError: wallex.available(),
      });
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
    setLoad({
      state: 'live',
      bank: data.institutionName ?? 'Bank',
      accounts: data.accounts ?? [],
      transactions: data.transactions ?? [],
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { load, refreshing, refresh };
}

// Text for the Checking tab: the linked account's name and last four digits, e.g. "TOTAL CHECKING ••6201".
export function accountLabel(load: Load): string {
  if (load.state !== 'live' || load.accounts.length === 0) return 'Checking';
  const a = load.accounts[0];
  return a.mask ? `${a.name} ••${a.mask}` : a.name;
}
