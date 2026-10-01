import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { wallex, type LinkedAccount, type Txn } from '../lib/wallex';

// The five transaction fields Plaid surfaces most prominently.
const COLUMNS = [
  { key: 'date', label: 'Date', align: 'left' },
  { key: 'merchant', label: 'Merchant', align: 'left' },
  { key: 'category', label: 'Category', align: 'left' },
  { key: 'status', label: 'Status', align: 'left' },
  { key: 'amount', label: 'Amount', align: 'right' },
] as const;

const GRID = 'grid grid-cols-[1fr_2fr_1.5fr_1fr_1fr] gap-4 px-4';

// Sample data shown until a bank is connected in Settings → Setup.
const SAMPLE_TRANSACTIONS: Omit<Txn, 'id'>[] = [
  { date: '2026-10-01', merchant: 'Whole Foods Market', category: 'Groceries', pending: true, amount: -84.32 },
  { date: '2026-10-01', merchant: 'Starbucks', category: 'Food & Drink', pending: true, amount: -6.45 },
  { date: '2026-09-30', merchant: 'Shell', category: 'Gas & Fuel', pending: false, amount: -52.18 },
  { date: '2026-09-30', merchant: 'Payroll Deposit', category: 'Income', pending: false, amount: 2450.0 },
  { date: '2026-09-29', merchant: 'Netflix', category: 'Subscriptions', pending: false, amount: -15.49 },
  { date: '2026-09-29', merchant: 'Chipotle', category: 'Food & Drink', pending: false, amount: -12.85 },
  { date: '2026-09-28', merchant: 'Amazon', category: 'Shopping', pending: false, amount: -63.97 },
  { date: '2026-09-27', merchant: 'Uber', category: 'Transportation', pending: false, amount: -21.4 },
  { date: '2026-09-27', merchant: 'Rent Payment', category: 'Housing', pending: false, amount: -1650.0 },
  { date: '2026-09-26', merchant: 'Spotify', category: 'Subscriptions', pending: false, amount: -11.99 },
  { date: '2026-09-25', merchant: 'Target', category: 'Shopping', pending: false, amount: -47.26 },
  { date: '2026-09-24', merchant: 'Venmo Transfer', category: 'Transfer', pending: false, amount: 75.0 },
  { date: '2026-09-24', merchant: 'Trader Joe’s', category: 'Groceries', pending: false, amount: -58.74 },
  { date: '2026-09-23', merchant: 'Comcast Internet', category: 'Utilities', pending: false, amount: -79.99 },
  { date: '2026-09-22', merchant: 'CVS Pharmacy', category: 'Health', pending: false, amount: -18.62 },
  { date: '2026-09-21', merchant: 'Delta Air Lines', category: 'Travel', pending: false, amount: -342.1 },
  { date: '2026-09-20', merchant: 'Planet Fitness', category: 'Health', pending: false, amount: -24.99 },
  { date: '2026-09-19', merchant: 'Doordash', category: 'Food & Drink', pending: false, amount: -33.58 },
  { date: '2026-09-18', merchant: 'Interest Payment', category: 'Income', pending: false, amount: 1.27 },
  { date: '2026-09-17', merchant: 'AMC Theatres', category: 'Entertainment', pending: false, amount: -28.0 },
];

const SAMPLES: Txn[] = SAMPLE_TRANSACTIONS.map((t, i) => ({ ...t, id: `sample-${i}` }));

const formatAmount = (amount: number) =>
  `${amount < 0 ? '-' : '+'}$${Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Plaid dates are plain YYYY-MM-DD; format them without going through a timezone-shifting Date.
const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};

type Load =
  | { state: 'loading' }
  | { state: 'sample'; note: string; isError?: boolean }
  | { state: 'live'; bank: string; accounts: LinkedAccount[]; transactions: Txn[] };

export default function CheckingTab() {
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

  const rows = load.state === 'live' ? load.transactions : load.state === 'sample' ? SAMPLES : [];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-4 px-4 pb-3">
        <p
          className={`font-support text-sm ${load.state === 'sample' && load.isError ? 'text-red-400' : 'text-muted'}`}
        >
          {load.state === 'loading' && 'Loading transactions…'}
          {load.state === 'sample' && load.note}
          {load.state === 'live' &&
            `${load.bank} · ${load.accounts.map((a) => `${a.name}${a.mask ? ` ••${a.mask}` : ''}`).join(', ')}`}
        </p>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          aria-label="Refresh transactions"
          className="flex cursor-pointer items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div role="table" aria-label="Checking transactions" className="w-full">
        <div role="row" className={`${GRID} border-b border-line py-3`}>
          {COLUMNS.map((col) => (
            <div
              key={col.key}
              role="columnheader"
              className={`text-xs font-semibold tracking-wider text-muted uppercase ${
                col.align === 'right' ? 'text-right' : 'text-left'
              }`}
            >
              {col.label}
            </div>
          ))}
        </div>

        {load.state === 'live' && rows.length === 0 && (
          <p className="px-4 py-6 font-support text-sm text-muted">No transactions yet for this account.</p>
        )}

        {rows.map((t) => (
          <div
            key={t.id}
            role="row"
            className={`${GRID} items-center border-b border-line py-3 text-sm transition-colors hover:bg-surface/50`}
          >
            <div role="cell" className="font-support text-muted">
              {formatDate(t.date)}
            </div>
            <div role="cell" className="font-medium">
              {t.merchant}
            </div>
            <div role="cell" className="font-support text-muted">
              {t.category}
            </div>
            <div role="cell">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  t.pending ? 'bg-surface text-muted' : 'bg-accent-soft text-accent'
                }`}
              >
                {t.pending ? 'Pending' : 'Posted'}
              </span>
            </div>
            <div role="cell" className={`text-right font-medium tabular-nums ${t.amount > 0 ? 'text-accent' : ''}`}>
              {formatAmount(t.amount)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
