import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import TransactionTable, { formatAmount, formatDate } from '../components/TransactionTable';
import type { Load } from '../lib/useTransactions';
import { transactionRows } from '../lib/transactionRows';
import { useBnpl } from '../lib/useBnpl';
import type { TxFilter } from '../lib/txFilter';

export default function CheckingTab({
  bank,
  load,
  filter,
  onClearFilter,
}: {
  bank?: string; // which linked bank to list; every account in it
  load: Load;
  filter?: TxFilter | null;
  onClearFilter?: () => void;
}) {
  const rows = useMemo(() => transactionRows(load, bank), [load, bank]);
  const { ledger } = useBnpl(load);

  // What the person typed in the search box; each word has to be found somewhere in a transaction.
  const [query, setQuery] = useState('');
  useEffect(() => setQuery(''), [bank]);

  // Balances are worked out over every transaction first, so a filtered row still shows the real balance after it.
  const listed = useMemo(() => {
    if (!filter) return rows;
    const ids = new Set(filter.ids);
    return rows.filter((r) => ids.has(r.id));
  }, [rows, filter]);

  const shown = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return listed;
    return listed.filter((t) => {
      const text = [
        t.merchant,
        t.category,
        t.channel,
        t.pending ? 'pending' : 'posted',
        t.date,
        t.authorizedDate ?? '',
        t.amount.toFixed(2),
        formatAmount(t.amount),
        formatDate(t.date),
        ...t.details.map((d) => d.value),
      ]
        .join(' ')
        .toLowerCase();
      return words.every((w) => text.includes(w));
    });
  }, [listed, query]);
  const searching = query.trim() !== '';

  return (
    <div className="w-full">
      {filter && (
        <div className="mx-0 mb-3 flex flex-wrap items-center gap-3 @3xl:mx-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent py-1 pr-1.5 pl-3 text-sm font-semibold text-canvas">
            {filter.name} · {listed.length} of {rows.length}
            <button
              type="button"
              aria-label="Clear filter"
              onClick={onClearFilter}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-canvas/25 hover:bg-canvas/40"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
          {listed.length === 0 && <span className="font-support text-sm text-muted">None were found in this account</span>}
        </div>
      )}
      <div className="flex items-center justify-between gap-4 px-0 pb-3 @3xl:px-4">
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

      </div>

      {/* Search sits under the tabs and above the column headings. */}
      <div className="px-0 pb-3 @3xl:px-4">
        <label className="flex h-11 items-center gap-3 rounded-full border border-line bg-surface px-4 transition-colors focus-within:border-accent">
          <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
            placeholder="Search transactions"
            aria-label="Search transactions"
            className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none select-text placeholder:text-muted/60 [&::-webkit-search-cancel-button]:hidden"
          />
          {searching && (
            <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        {searching && <p className="mt-2 pl-4 font-support text-xs text-muted" aria-live="polite">{shown.length} of {listed.length} {listed.length === 1 ? 'transaction' : 'transactions'}</p>}
      </div>

      <TransactionTable rows={shown} showEmpty={load.state === 'live'} emptyText={searching ? 'No transactions match your search.' : undefined} bnpl={ledger} />
    </div>
  );
}
