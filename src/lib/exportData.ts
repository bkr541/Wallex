import type { Load } from './useTransactions';

// The "Download my data" files. All of them are JSON: the settings saved on this device, the transactions and accounts from the linked
// banks, or both together.

export function settingsData(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith('wallex-')) continue;
    try {
      out[k] = JSON.parse(localStorage.getItem(k) ?? 'null');
    } catch {
      out[k] = localStorage.getItem(k);
    }
  }
  if (out['wallex-profile'] && typeof out['wallex-profile'] === 'object') (out['wallex-profile'] as Record<string, unknown>).photo = '(picture left out)';
  return out;
}

// Every account and every transaction loaded from the linked banks, from all of them, newest first.
export function transactionalData(load: Load) {
  if (load.state !== 'live') return { accounts: [], transactions: [] };
  const transactions = [...load.allTransactions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return { accounts: load.allAccounts, transactions };
}

export type DataKind = 'settings' | 'transactions' | 'all';

export function dataFor(kind: DataKind, load: Load): Record<string, unknown> {
  const exportedAt = new Date().toISOString();
  if (kind === 'settings') return { exportedAt, settings: settingsData() };
  if (kind === 'transactions') return { exportedAt, ...transactionalData(load) };
  return { exportedAt, settings: settingsData(), ...transactionalData(load) };
}

export function downloadJson(kind: DataKind, load: Load) {
  const day = new Date().toISOString().slice(0, 10);
  const name = `wallex-${kind === 'all' ? 'all-data' : kind === 'settings' ? 'settings' : 'transactions'}-${day}.json`;
  const url = URL.createObjectURL(new Blob([JSON.stringify(dataFor(kind, load), null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
