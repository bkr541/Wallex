export interface PlaidSettings {
  environment: string;
  clientId: string;
  secret: string; // blank keeps the saved secret
  products: string[];
  countries: string[];
  language: string;
  webhookUrl: string;
  redirectUri: string;
}

export interface Status extends Omit<PlaidSettings, 'secret'> {
  hasSecret: boolean;
  bankId: string;
  connections: { itemId: string; institutionName: string }[]; // every bank linked through Plaid
}

export interface Bank {
  id: string; // Plaid institution_id
  name: string;
  routingNumber?: string; // lets Link pre-select the bank
}

export interface LinkedAccount {
  id: string;
  name: string;
  mask: string | null;
  type: string | null; // depository, credit, ...
  subtype: string | null;
  available: number | null;
  current: number | null;
  itemId?: string; // which linked bank it belongs to
  institution?: string; // that bank's name
}

export interface Txn {
  id: string;
  accountId: string;
  date: string; // YYYY-MM-DD, the day it posted
  authorizedDate: string | null; // YYYY-MM-DD, the day it was made
  merchant: string;
  logos: string[]; // logo image URLs to try in order; empty means show initials
  category: string; // display label, e.g. "Food & Drink › Restaurant"
  categoryKey: string; // Plaid's primary category, e.g. FOOD_AND_DRINK
  categoryDetailKey: string; // Plaid's detailed category, e.g. FOOD_AND_DRINK_RESTAURANT
  channel: string;
  pending: boolean;
  amount: number; // negative = money out, positive = money in
  details: { label: string; value: string }[]; // everything else Plaid knows, shown when a row is expanded
}

// How one linked bank fared on the last load. A bank whose login has expired is reported here without stopping the others.
export interface InstitutionStatus {
  itemId: string;
  name: string;
  notReady: boolean;
  error: string | null;
  needsRelink: boolean;
}

export interface TransactionsResult {
  connected: boolean;
  notReady?: boolean;
  institutionName?: string; // every linked bank's name, joined
  institutions?: InstitutionStatus[];
  accounts?: LinkedAccount[];
  transactions?: Txn[];
}

export interface ConnectResult {
  connected: boolean;
  cancelled?: boolean;
  institutionName?: string;
}

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

interface WallexBridge {
  getStatus(): Promise<Result<Status>>;
  saveSettings(payload: { settings: PlaidSettings; bankId: string }): Promise<Result<void>>;
  syncConnections(authToken?: string, cloudConfig?: { url?: string; key?: string }): Promise<Result<void>>;
  connect(payload: { settings: PlaidSettings; bank?: Bank; authToken?: string; cloudConfig?: { url?: string; key?: string } }): Promise<Result<ConnectResult>>;
  disconnect(itemId?: string, authToken?: string, cloudConfig?: { url?: string; key?: string }): Promise<Result<void>>;
  getTransactions(): Promise<Result<TransactionsResult>>;
  onAuthCallback(cb: (payload: AuthCallback) => void): void;
}

// What a confirmation or password-reset email link carries, handed over by the desktop app.
export interface AuthCallback {
  access_token?: string;
  refresh_token?: string;
  type?: string;
  error?: string;
  error_code?: string;
  error_description?: string;
}

declare global {
  interface Window {
    wallex?: Partial<WallexBridge>;
  }
}

const NOT_DESKTOP = 'Bank linking is only available in the Wallex desktop app.';
const cloudConfig = {
  url: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  key: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
};

// Thin wrappers so the UI works (with a clear message) when opened in a plain browser.
export const wallex = {
  available: () => typeof window !== 'undefined' && Boolean(window.wallex?.getStatus),
  getStatus: (): Promise<Result<Status>> =>
    window.wallex?.getStatus?.() ?? Promise.resolve({ ok: false, error: NOT_DESKTOP }),
  saveSettings: (payload: { settings: PlaidSettings; bankId: string }): Promise<Result<void>> =>
    window.wallex?.saveSettings?.(payload) ?? Promise.resolve({ ok: false, error: NOT_DESKTOP }),
  syncConnections: async (): Promise<Result<void>> => {
    if (!window.wallex?.syncConnections) return { ok: false, error: NOT_DESKTOP };
    const { data } = await supabase!.auth.getSession();
    return window.wallex.syncConnections(data.session?.access_token, cloudConfig);
  },
  connect: async (payload: { settings: PlaidSettings; bank: Bank }): Promise<Result<ConnectResult>> => {
    if (!window.wallex?.connect) return { ok: false, error: NOT_DESKTOP };
    const { data } = await supabase!.auth.getSession();
    await syncPlaidSettings(payload.settings, payload.bank.id);
    return window.wallex.connect({ ...payload, authToken: data.session?.access_token, cloudConfig });
  },
  connectAnother: async (): Promise<Result<ConnectResult>> => {
    if (!window.wallex?.connect) return { ok: false, error: NOT_DESKTOP };
    const status = await wallex.getStatus();
    if (!status.ok) return status;
    if (!status.data.clientId || !status.data.hasSecret) {
      return { ok: false, error: 'Add your Plaid credentials in Settings → Setup before linking another bank.' };
    }
    const settings: PlaidSettings = {
      environment: status.data.environment,
      clientId: status.data.clientId,
      secret: '',
      products: status.data.products,
      countries: status.data.countries,
      language: status.data.language,
      webhookUrl: status.data.webhookUrl,
      redirectUri: status.data.redirectUri,
    };
    const { data } = await supabase!.auth.getSession();
    await syncPlaidSettings(settings, status.data.bankId);
    return window.wallex.connect({ settings, authToken: data.session?.access_token, cloudConfig });
  },
  disconnect: async (itemId?: string): Promise<Result<void>> => {
    if (!window.wallex?.disconnect) return { ok: false, error: NOT_DESKTOP };
    const { data } = await supabase!.auth.getSession();
    return window.wallex.disconnect(itemId, data.session?.access_token, cloudConfig);
  },
  getTransactions: (): Promise<Result<TransactionsResult>> =>
    window.wallex?.getTransactions?.() ?? Promise.resolve({ ok: false, error: NOT_DESKTOP }),
  onAuthCallback: (cb: (payload: AuthCallback) => void) => window.wallex?.onAuthCallback?.(cb),
};
import { supabase } from './supabase';
import { syncPlaidSettings } from './cloud';
