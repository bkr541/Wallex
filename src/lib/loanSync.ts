import { useSyncExternalStore } from 'react';
import { supabaseRemote, type ClientLike, type RemoteApi } from './loanCloud';
import { loanLinks } from './loanLinks';
import { loanPayments } from './loanPayments';
import { setLoanSink } from './loanRepo';
import { loanRoles } from './loanRoles';
import { createSyncEngine, type KeyValue, type SyncStatus, type View } from './loanSyncEngine';
import { hydrateLoans } from './loans';
import { supabase } from './supabase';

// The sync engine for this app: wired to the account (Supabase), to this device's storage and to the four loan stores.
// The logic is in loanSyncEngine.ts; this file only connects it.

// Which device this is, so a record deleted here can be told from one deleted somewhere else. Not tied to any account.
function deviceId(): string {
  const fresh = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);
  try {
    let id = localStorage.getItem('wallex-device-id');
    if (!id) {
      id = fresh();
      localStorage.setItem('wallex-device-id', id);
    }
    return id;
  } catch {
    return fresh();
  }
}

const storage: KeyValue = {
  get: (k) => localStorage.getItem(k),
  set: (k, v) => localStorage.setItem(k, v),
  remove: (k) => localStorage.removeItem(k),
};

const notConnected = async (): Promise<never> => {
  throw new Error('Wallex is not connected to its server.');
};
const remote: RemoteApi = supabase ? supabaseRemote(supabase as unknown as ClientLike, deviceId()) : { fetch: notConnected, apply: notConnected };

function show(view: View) {
  hydrateLoans(view.loan as never);
  loanLinks.hydrate(view.link as never);
  loanPayments.hydrate({ payments: view.payment as never, adjustments: view.adjustment as never });
  loanRoles.hydrate(view.role as never);
}

export const loanSync = createSyncEngine({ remote, storage, show, claim: setLoanSink });

export const useLoanSync = (): SyncStatus => useSyncExternalStore(loanSync.subscribe, loanSync.status, loanSync.status);

// Someone else signing in, or signing out, clears the screen at once: their loans must never be there for the next person.
if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    const id = session?.user.id ?? null;
    if (id !== loanSync.owner()) loanSync.stop();
  });
}

if (typeof window !== 'undefined') {
  // Coming back online sends what waited. Coming back to the app reads what changed on other devices.
  window.addEventListener('online', () => void loanSync.flush());
  window.addEventListener('focus', () => void loanSync.refresh());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void loanSync.refresh();
  });
  window.setInterval(() => void loanSync.refresh(), 60_000);
}
