import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RefreshCw } from 'lucide-react';
import type { Txn } from '../lib/wallex';
import MerchantLogo from '../components/MerchantLogo';
import { withBalances } from '../lib/balances';
import type { Load } from '../lib/useTransactions';

// Transaction fields from Plaid's /transactions/sync response.
const COLUMNS = [
  { key: 'status', label: 'Status', align: 'left' },
  { key: 'merchant', label: 'Merchant', align: 'left' },
  { key: 'category', label: 'Category', align: 'left' },
  { key: 'channel', label: 'Type', align: 'left' },
  { key: 'date', label: 'Posted Date', align: 'left' },
  { key: 'authorized', label: 'Auth Date', align: 'left' },
  { key: 'amount', label: 'Amount', align: 'right' },
  { key: 'balance', label: 'Balance', align: 'right' },
] as const;

const GRID = 'grid grid-cols-[0.9fr_1.6fr_2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4';

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

const formatAmount = (amount: number) =>
  `${amount < 0 ? '-' : '+'}$${Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatBalance = (n: number) =>
  `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Plaid dates are plain YYYY-MM-DD; format them without going through a timezone-shifting Date.
const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};

export default function CheckingTab({
  load,
  refreshing,
  onRefresh,
}: {
  load: Load;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      load.state === 'live'
        ? withBalances(load.transactions, load.accounts)
        : load.state === 'sample'
          ? withBalances(SAMPLES, [SAMPLE_ACCOUNT])
          : [],
    [load],
  );

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-4 px-4 pb-3">
        <p
          className={`font-support text-sm ${load.state === 'sample' && load.isError ? 'text-red-400' : 'text-muted'}`}
        >
          {load.state === 'loading' && 'Loading transactions…'}
          {load.state === 'sample' && load.note}
        </p>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh transactions"
          className="ml-auto flex cursor-pointer items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink disabled:opacity-50"
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

        {rows.map((t) => {
          const expanded = expandedId === t.id;
          const toggle = () => setExpandedId(expanded ? null : t.id);
          // One line by default (cut off with "..."); the full text wraps once the row is clicked.
          const text = expanded ? 'break-words' : 'truncate';
          return (
            <div key={t.id} role="rowgroup" className="border-b border-line">
            <div
              role="row"
              tabIndex={0}
              aria-expanded={expanded}
              onClick={toggle}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggle();
                }
              }}
              className={`${GRID} ${expanded ? 'items-start bg-surface/50' : 'items-center'} cursor-pointer py-3 text-sm transition-colors hover:bg-surface/50`}
            >
              <div role="cell" className="min-w-0">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    t.pending ? 'bg-surface text-muted' : 'bg-accent-soft text-accent'
                  }`}
                >
                  {t.pending ? 'Pending' : 'Posted'}
                </span>
              </div>
              <div role="cell" className="flex min-w-0 items-center gap-2.5 font-medium">
                <MerchantLogo key={t.id} name={t.merchant} sources={t.logos} />
                <span className={`min-w-0 ${text}`}>{t.merchant}</span>
              </div>
              <div role="cell" className={`min-w-0 font-support text-muted ${text}`}>
                {t.category}
              </div>
              <div role="cell" className={`min-w-0 font-support text-muted ${text}`}>
                {t.channel || '—'}
              </div>
              <div role="cell" className={`min-w-0 font-support text-muted ${text}`}>
                {formatDate(t.date)}
              </div>
              <div role="cell" className={`min-w-0 font-support text-muted ${text}`}>
                {t.authorizedDate ? formatDate(t.authorizedDate) : '—'}
              </div>
              <div
                role="cell"
                className={`min-w-0 text-right font-medium tabular-nums ${text} ${t.amount > 0 ? 'text-accent' : ''}`}
              >
                {formatAmount(t.amount)}
              </div>
              <div role="cell" className={`min-w-0 text-right font-support tabular-nums text-muted ${text}`}>
                {t.balance == null ? '—' : formatBalance(t.balance)}
              </div>
            </div>

            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  key="details"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <dl className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-x-8 gap-y-4 border-t border-line bg-surface/30 px-4 py-4">
                    {t.details.map((d) => (
                      <div key={d.label} className="min-w-0">
                        <dt className="text-xs font-semibold tracking-wider text-muted uppercase">{d.label}</dt>
                        <dd className="mt-1 font-support text-sm break-words select-text">{d.value}</dd>
                      </div>
                    ))}
                  </dl>
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
