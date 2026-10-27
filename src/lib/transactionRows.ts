import type { Txn } from './wallex';
import { withBalances } from './balances';
import { bankOf, type Load } from './useTransactions';
import type { TxFilter } from './txFilter';

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

export function transactionRows(load: Load, bank?: string) {
  if (load.state === 'sample') return withBalances(SAMPLES, [SAMPLE_ACCOUNT]);
  if (load.state !== 'live') return [];
  const accounts = bank ? load.allAccounts.filter((a) => bankOf(a) === bank) : load.accounts;
  const ids = new Set(accounts.map((a) => a.id));
  return withBalances(load.allTransactions.filter((t) => ids.has(t.accountId)), accounts);
}

export function filteredTransactionRows(load: Load, bank?: string, filter?: TxFilter | null) {
  const rows = transactionRows(load, bank);
  if (!filter) return rows;
  const ids = new Set(filter.ids);
  return rows.filter((row) => ids.has(row.id));
}
