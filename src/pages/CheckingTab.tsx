import { useMemo } from 'react';
import { X } from 'lucide-react';
import TransactionTable from '../components/TransactionTable';
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

  // Balances are worked out over every transaction first, so a filtered row still shows the real balance after it.
  const shown = useMemo(() => {
    if (!filter) return rows;
    const ids = new Set(filter.ids);
    return rows.filter((r) => ids.has(r.id));
  }, [rows, filter]);

  return (
    <div className="w-full">
      {filter && (
        <div className="mx-0 mb-3 flex flex-wrap items-center gap-3 @3xl:mx-4">
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

      <TransactionTable rows={shown} showEmpty={load.state === 'live'} bnpl={ledger} />
    </div>
  );
}
