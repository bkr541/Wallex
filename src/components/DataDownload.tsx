import { useRef } from 'react';
import { Database, Download, Receipt, Settings, X } from 'lucide-react';
import { downloadJson, type DataKind } from '../lib/exportData';
import type { Load } from '../lib/useTransactions';

// "Download my data": a pop-up with three choices, settings, transactions or everything, all saved as JSON.
export default function DataDownload({ load, className }: { load: Load; className: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const count = load.state === 'live' ? load.allTransactions.length : 0;

  const choose = (kind: DataKind) => {
    downloadJson(kind, load);
    dialog.current?.close();
  };

  const options: { kind: DataKind; title: string; note: string; Icon: typeof Settings; needsBank: boolean }[] = [
    { kind: 'settings', title: 'Download Settings Data', note: 'Your profile, appearance, rules, goals and Recurring corrections.', Icon: Settings, needsBank: false },
    { kind: 'transactions', title: 'Download Transactional Data', note: count ? `Your ${count.toLocaleString('en-US')} transactions and accounts from every linked bank.` : 'Link a bank to download its transactions.', Icon: Receipt, needsBank: true },
    { kind: 'all', title: 'Download All Data', note: 'Settings, accounts and transactions together in one file.', Icon: Database, needsBank: false },
  ];

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} aria-haspopup="dialog" className={className}>
        <Download className="h-4 w-4" />
        Download
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="data-download-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
        className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md rounded-3xl border border-line bg-card p-6 text-ink shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id="data-download-title" className="text-xl font-semibold tracking-tight">Download My Data</h2>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 font-support text-sm text-muted">Each option saves a JSON file.</p>
        <div className="mt-5 space-y-3">
          {options.map(({ kind, title, note, Icon, needsBank }) => (
            <button
              key={kind}
              type="button"
              disabled={needsBank && !count}
              onClick={() => choose(kind)}
              className="flex w-full cursor-pointer items-center gap-4 rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-accent disabled:cursor-default disabled:opacity-50 disabled:hover:border-line"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{title}</span>
                <span className="mt-0.5 block font-support text-xs text-muted">{note}</span>
              </span>
            </button>
          ))}
        </div>
      </dialog>
    </>
  );
}
