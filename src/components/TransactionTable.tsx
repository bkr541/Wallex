import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import MerchantLogo from './MerchantLogo';
import type { TxnWithBalance } from '../lib/balances';
import { useMobile } from '../lib/viewMode';

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
// On a phone only the essentials fit in the row; the rest are shown when a row is opened.
const GRID_MOBILE = 'grid grid-cols-[5.5rem_1fr_6rem] gap-3 px-1';
const MOBILE_COLUMNS = new Set(['status', 'merchant', 'amount']);

export const formatAmount = (amount: number) =>
  `${amount < 0 ? '-' : '+'}$${Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const formatBalance = (n: number) =>
  `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Plaid dates are plain YYYY-MM-DD; format them without going through a timezone-shifting Date.
export const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};

// Rows fade up one after another when a parent animates this table in with the "hidden" and
// "show" variants, and back out the same way. Without such a parent they simply appear.
const rowVariants = {
  hidden: { opacity: 0, y: 12, transition: { duration: 0.18 } },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const, delay: 0.2 + Math.min(i, 12) * 0.035 },
  }),
};

export default function TransactionTable({
  rows,
  emptyText = 'No transactions yet for this account.',
  showEmpty = true,
}: {
  rows: TxnWithBalance[];
  emptyText?: string;
  showEmpty?: boolean;
}) {
  const mobile = useMobile();
  const grid = mobile ? GRID_MOBILE : GRID;
  const columns = mobile ? COLUMNS.filter((c) => MOBILE_COLUMNS.has(c.key)) : COLUMNS;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto">
      <div role="table" aria-label="Transactions" className={`w-full ${mobile ? '' : 'min-w-[960px]'}`}>
        <motion.div variants={rowVariants} custom={0} role="row" className={`${grid} border-b border-line py-3`}>
          {columns.map((col) => (
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
        </motion.div>

        {showEmpty && rows.length === 0 && (
          <p className="px-4 py-6 font-support text-sm text-muted">{emptyText}</p>
        )}

        {rows.map((t, index) => {
          const expanded = expandedId === t.id;
          const toggle = () => setExpandedId(expanded ? null : t.id);
          // One line by default (cut off with "..."); the full text wraps once the row is clicked.
          const text = expanded ? 'break-words' : 'truncate';
          return (
            <motion.div key={t.id} variants={rowVariants} custom={index + 1} role="rowgroup" className="border-b border-line">
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
                className={`${grid} ${expanded ? 'items-start bg-surface/50' : 'items-center'} cursor-pointer py-3 text-sm transition-colors hover:bg-surface/50`}
              >
                <div role="cell" className="min-w-0">
                  <span className={`flex items-center gap-1.5 font-support text-xs ${t.pending ? 'text-muted' : ''}`}>
                    <span className={`h-2 w-2 rounded-full ${t.pending ? 'animate-pulse bg-amber-400' : 'bg-accent'}`} />
                    {t.pending ? 'Pending' : 'Posted'}
                  </span>
                </div>
                <div role="cell" className="flex min-w-0 items-center gap-2.5 font-medium">
                  <MerchantLogo key={t.id} name={t.merchant} sources={t.logos} />
                  <span className={`min-w-0 ${text}`}>{t.merchant}</span>
                </div>
                {!mobile && (
                  <>
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
                  </>
                )}
                <div
                  role="cell"
                  className={`min-w-0 text-right font-medium tabular-nums ${text} ${t.amount > 0 ? 'text-accent' : ''}`}
                >
                  {formatAmount(t.amount)}
                </div>
                {!mobile && (
                  <div role="cell" className={`min-w-0 text-right font-support tabular-nums text-muted ${text}`}>
                    {t.balance == null ? '—' : formatBalance(t.balance)}
                  </div>
                )}
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
                      {[
                        ...(mobile
                          ? [
                              { label: 'Category', value: t.category },
                              { label: 'Type', value: t.channel || '—' },
                              { label: 'Posted Date', value: formatDate(t.date) },
                              { label: 'Auth Date', value: t.authorizedDate ? formatDate(t.authorizedDate) : '—' },
                              { label: 'Balance', value: t.balance == null ? '—' : formatBalance(t.balance) },
                            ]
                          : []),
                        ...t.details,
                      ].map((d) => (
                        <div key={d.label} className="min-w-0">
                          <dt className="text-xs font-semibold tracking-wider text-muted uppercase">{d.label}</dt>
                          <dd className="mt-1 font-support text-sm break-words select-text">{d.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
