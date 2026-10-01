// The five transaction fields Plaid surfaces most prominently.
const COLUMNS = [
  { key: 'date', label: 'Date', align: 'left' },
  { key: 'merchant', label: 'Merchant', align: 'left' },
  { key: 'category', label: 'Category', align: 'left' },
  { key: 'status', label: 'Status', align: 'left' },
  { key: 'amount', label: 'Amount', align: 'right' },
] as const;

const GRID = 'grid grid-cols-[1fr_2fr_1.5fr_1fr_1fr] gap-4 px-4';

interface Transaction {
  date: string;
  merchant: string;
  category: string;
  pending: boolean;
  amount: number; // negative = money out, positive = money in
}

// Placeholder data until Plaid is connected.
const TRANSACTIONS: Transaction[] = [
  { date: 'Oct 1, 2026', merchant: 'Whole Foods Market', category: 'Groceries', pending: true, amount: -84.32 },
  { date: 'Oct 1, 2026', merchant: 'Starbucks', category: 'Food & Drink', pending: true, amount: -6.45 },
  { date: 'Sep 30, 2026', merchant: 'Shell', category: 'Gas & Fuel', pending: false, amount: -52.18 },
  { date: 'Sep 30, 2026', merchant: 'Payroll Deposit', category: 'Income', pending: false, amount: 2450.0 },
  { date: 'Sep 29, 2026', merchant: 'Netflix', category: 'Subscriptions', pending: false, amount: -15.49 },
  { date: 'Sep 29, 2026', merchant: 'Chipotle', category: 'Food & Drink', pending: false, amount: -12.85 },
  { date: 'Sep 28, 2026', merchant: 'Amazon', category: 'Shopping', pending: false, amount: -63.97 },
  { date: 'Sep 27, 2026', merchant: 'Uber', category: 'Transportation', pending: false, amount: -21.4 },
  { date: 'Sep 27, 2026', merchant: 'Rent Payment', category: 'Housing', pending: false, amount: -1650.0 },
  { date: 'Sep 26, 2026', merchant: 'Spotify', category: 'Subscriptions', pending: false, amount: -11.99 },
  { date: 'Sep 25, 2026', merchant: 'Target', category: 'Shopping', pending: false, amount: -47.26 },
  { date: 'Sep 24, 2026', merchant: 'Venmo Transfer', category: 'Transfer', pending: false, amount: 75.0 },
  { date: 'Sep 24, 2026', merchant: 'Trader Joe’s', category: 'Groceries', pending: false, amount: -58.74 },
  { date: 'Sep 23, 2026', merchant: 'Comcast Internet', category: 'Utilities', pending: false, amount: -79.99 },
  { date: 'Sep 22, 2026', merchant: 'CVS Pharmacy', category: 'Health', pending: false, amount: -18.62 },
  { date: 'Sep 21, 2026', merchant: 'Delta Air Lines', category: 'Travel', pending: false, amount: -342.1 },
  { date: 'Sep 20, 2026', merchant: 'Planet Fitness', category: 'Health', pending: false, amount: -24.99 },
  { date: 'Sep 19, 2026', merchant: 'Doordash', category: 'Food & Drink', pending: false, amount: -33.58 },
  { date: 'Sep 18, 2026', merchant: 'Interest Payment', category: 'Income', pending: false, amount: 1.27 },
  { date: 'Sep 17, 2026', merchant: 'AMC Theatres', category: 'Entertainment', pending: false, amount: -28.0 },
];

const formatAmount = (amount: number) =>
  `${amount < 0 ? '-' : '+'}$${Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function CheckingTab() {
  return (
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

      {TRANSACTIONS.map((t, i) => (
        <div
          key={i}
          role="row"
          className={`${GRID} items-center border-b border-line py-3 text-sm transition-colors hover:bg-surface/50`}
        >
          <div role="cell" className="font-support text-muted">
            {t.date}
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
  );
}
