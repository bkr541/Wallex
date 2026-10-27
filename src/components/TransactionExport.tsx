import { useMemo, useRef, useState } from 'react';
import { Check, Download, FileSpreadsheet, FileText, X } from 'lucide-react';

import type { Load } from '../lib/useTransactions';
import type { TxFilter } from '../lib/txFilter';
import { filteredTransactionRows } from '../lib/transactionRows';

export default function TransactionExport({ load, bank, filter }: { load: Load; bank?: string; filter?: TxFilter | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [format, setFormat] = useState<'excel' | 'pdf' | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rows = useMemo(() => filteredTransactionRows(load, bank, filter), [load, bank, filter]);
  const exportExcel = async () => {
    setBusy(true);
    setError(null);
    try {
      const { downloadTransactions } = await import('../lib/exportTransactions');
      await downloadTransactions(rows, load.state === 'live' ? load.allAccounts : [], load.state === 'sample');
      dialog.current?.close();
    } catch {
      setError('The export could not be created. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-label="Export transactions"
        aria-haspopup="dialog"
        title="Export"
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line bg-card/80 text-ink backdrop-blur transition-colors hover:border-accent hover:text-accent"
      >
        <Download className="h-5 w-5" />
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="transaction-export-title"
        aria-describedby="transaction-export-description"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
        className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-sm rounded-3xl border border-line bg-card p-6 text-ink shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id="transaction-export-title" className="text-xl font-semibold tracking-tight">Export transactions</h2>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Close export" className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p id="transaction-export-description" className="mt-2 font-support text-sm text-muted">{rows.length.toLocaleString()} {load.state === 'sample' ? 'sample ' : ''}transactions from {bank ?? 'the current account'}{filter ? ` · ${filter.name}` : ''}.</p>
        <div className="mt-5 grid grid-cols-2 gap-3" role="group" aria-label="Export format">
          {([
            { id: 'excel', label: 'Excel', extension: '.xlsx', Icon: FileSpreadsheet, color: 'text-emerald-500' },
            { id: 'pdf', label: 'PDF', extension: '.pdf', Icon: FileText, color: 'text-red-400' },
          ] as const).map(({ id, label, extension, Icon, color }) => (
            <button
              key={id}
              type="button"
              disabled={id === 'pdf' || busy}
              aria-pressed={format === id}
              onClick={() => setFormat(id)}
              className={`relative flex cursor-pointer disabled:cursor-default disabled:opacity-50 flex-col items-center gap-2 rounded-2xl border p-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${format === id ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-accent'}`}
            >
              {format === id && <Check aria-hidden="true" className="absolute top-3 right-3 h-4 w-4 text-accent" />}
              <Icon aria-hidden="true" className={`h-10 w-10 ${color}`} />
              <span className="font-semibold">{label}</span>
              <span className="font-support text-xs text-muted">{id === 'pdf' ? 'Coming soon' : extension}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 font-support text-xs text-muted">Excel includes all transaction fields, filterable columns, and frozen headings.</p>
        {error && <p role="alert" className="mt-3 font-support text-sm text-red-400">{error}</p>}
        <button
          type="button"
          onClick={exportExcel}
          disabled={format !== 'excel' || busy || rows.length === 0}
          className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-canvas disabled:cursor-default disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {busy ? 'Preparing Excel…' : 'Download Excel'}
        </button>
      </dialog>
    </>
  );
}
