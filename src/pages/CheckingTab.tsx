import { useMemo } from 'react';
import { RefreshCw, X } from 'lucide-react';
import type { Txn } from '../lib/wallex';
import TransactionTable from '../components/TransactionTable';
import { withBalances } from '../lib/balances';
import type { Load } from '../lib/useTransactions';
import type { TxFilter } from '../lib/txFilter';

// Sample data shown until a bank is connected in Settings → Setup.
const SAMPLE_TRANSACTIONS: Omit<Txn, 'id' | 'accountId' | 'details' | 'logos' | 'categoryKey' | 'categoryDetailKey'>[] = [
  { date: '2026-10-01', authorizedDate: '2026-10-01', merchant: 'Whole Foods Market', category: 'Food & Drink › Groceries', channel: 'In Store', pending: true, amount: -84.32 },
  { date: '2026-10-01', authorizedDate: '2026-10-01', merchant: 'Starbucks', category: 'Food & Drink › Coffee', channel: 'In Store', pending: true, amount: -6.45 },
  { date: '2026-09-30', authorizedDate: '2026-09-29', merchant: 'Shell', category: 'Transportation › Gas', channel: 'In Store', pending: false, amount: -52.18 },
  { date: '2026-09-30', authorizedDate: '2026-09-29', merchant: 'Payroll Deposit', category: 'Income › Wages', channel: 'Other', pending: false, amount: 2450.0 },
  { date: '2026-09-29', authorizedDate: '2026-09-28', merchant: 'Netflix', category: 'Entertainment › Streaming', channel: 'Online', pending: false, amount: -15.49 },
  { date: '2026-09-29', authorizedDate: '2026-09-28', merchant: 'Chipotle', category: 'Food & Drink › Restaurant', channel: 'In Store', pending: false, amount: -12.85 },
  { date: '2026-09-28', authorizedDate: '2026-09-27', merchant: 'Amazon', category: 'General Merchandise › Online Marketplaces', channel: 'Online', pending: false, amount: -63.97 },
  { date: '2026-09-27', authorizedDate: '2026-09-26', merchant: 'Uber', category: 'Transportation › Taxis And Rideshare', channel: 'Online', pending: false, amount: -21.4 },
  { date: '2026-09-27', authorizedDate: '2026-09-26', merchant: 'Rent Payment', category: 'Rent And Utilities › Rent', channel: 'Online', pending: false, amount: -1650.0 },
  { date: '2026-09-26', authorizedDate: '2026-09-25', merchant: 'Spotify', category: 'Entertainment › Streaming', channel: 'Online', pending: false, amount: -11.99 },
  { date: '2026-09-25', authorizedDate: '2026-09-24', merchant: 'Target', category: 'General Merchandise › Online', channel: 'In Store', pending: false, amount: -47.26 },
  { date: '2026-09-24', authorizedDate: '2026-09-23', merchant: 'Venmo Transfer', category: 'Transfer In › Account Transfer', channel: 'Online', pending: false, amount: 75.0 },
  { date: '2026-09-24', authorizedDate: '2026-09-23', merchant: 'Trader Joe’s', category: 'Food & Drink › Groceries', channel: 'In Store', pending: false, amount: -58.74 },
  { date: '2026-09-23', authorizedDate: '2026-09-22', merchant: 'Comcast Internet', category: 'Rent And Utilities › Internet', channel: 'Online', pending: false, amount: -79.99 },
  { date: '2026-09-22', authorizedDate: '2026-09-21', merchant: 'CVS Pharmacy', category: 'Medical › Pharmacies', channel: 'In Store', pending: false, amount: -18.62 },
  { date: '2026-09-21', authorizedDate: '2026-09-20', merchant: 'Delta Air Lines', category: 'Travel › Flights', channel: 'Online', pending: false, amount: -342.1 },
  { date: '2026-09-20', authorizedDate: '2026-09-19', merchant: 'Planet Fitness', category: 'Medical › Pharmacies', channel: 'Other', pending: false, amount: -24.99 },
  { date: '2026-09-19', authorizedDate: '2026-09-18', merchant: 'Doordash', category: 'Food & Drink › Restaurant', channel: 'Online', pending: false, amount: -33.58 },
  { date: '2026-09-18', authorizedDate: '2026-09-17', merchant: 'Interest Payment', category: 'Income › Wages', channel: 'Other', pending: false, amount: 1.27 },
  { date: '2026-09-17', authorizedDate: '2026-09-16', merchant: 'AMC Theatres', category: 'Entertainment › Movies', channel: 'In Store', pending: false, amount: -28.0 },
];

// Pretend ending balance for the sample rows; each row's balance is worked out from it.
const SAMPLE_ACCOUNT = { id: 'sample', current: 6200.55 };

const SAMPLES: Txn[] = SAMPLE_TRANSACTIONS.map((t, i) => ({
  ...t,
  id: `sample-${i}`,
  accountId: SAMPLE_ACCOUNT.id,
  logos: [],
  categoryKey: '',
  categoryDetailKey: '',
  details: [
    { label: 'Bank Description', value: `${t.merchant.toUpperCase()} #${String(100 + i * 7).padStart(4, '0')}` },
    { label: 'Account', value: 'TOTAL CHECKING ••6201' },
    { label: 'Currency', value: 'USD' },
    { label: 'Category Confidence', value: 'Very High' },
    { label: 'Transaction ID', value: `sample-${i}` },
  ],
}));

export default function CheckingTab({
  load,
  refreshing,
  onRefresh,
  filter,
  onClearFilter,
}: {
  load: Load;
  refreshing: boolean;
  onRefresh: () => void;
  filter?: TxFilter | null;
  onClearFilter?: () => void;
}) {
  const rows = useMemo(
    () =>
      load.state === 'live'
        ? withBalances(load.transactions, load.accounts)
        : load.state === 'sample'
          ? withBalances(SAMPLES, [SAMPLE_ACCOUNT])
          : [],
    [load],
  );

  // Balances are worked out over every transaction first, so a filtered row still shows the real balance after it.
  const shown = useMemo(() => {
    if (!filter) return rows;
    const ids = new Set(filter.ids);
    return rows.filter((r) => ids.has(r.id));
  }, [rows, filter]);

  return (
    <div className="w-full">
      {filter && (
        <div className="mx-4 mb-3 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent py-1 pr-1.5 pl-3 text-sm font-semibold text-canvas">
            {filter.name} · {shown.length} of {rows.length}
            <button
              type="button"
              aria-label="Clear filter"
              onClick={onClearFilter}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-canvas/25 hover:bg-canvas/40"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
          {shown.length === 0 && <span className="font-support text-sm text-muted">None were found in this account</span>}
        </div>
      )}
      <div className="flex items-center justify-between gap-4 px-4 pb-3">
        <p
          className={`font-support text-sm ${load.state === 'sample' && load.isError ? 'text-red-400' : 'text-muted'}`}
        >
          {load.state === 'sample' && load.note}
          {load.state === 'live' && load.problems.length > 0 && (
            <span className="text-amber-300">
              {load.problems.map((p) => `${p.name}: ${p.needsRelink ? 'its login has expired, so link it again in Settings → Setup' : p.error}`).join(' · ')}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh transactions"
          title="Refresh"
          className="ml-auto flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-default disabled:opacity-60"
        >
          <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <TransactionTable rows={shown} showEmpty={load.state === 'live'} />
    </div>
  );
}
