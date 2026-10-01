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
  connection: { institutionName: string } | null;
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
  subtype: string | null;
  available: number | null;
  current: number | null;
}

export interface Txn {
  id: string;
  date: string; // YYYY-MM-DD
  merchant: string;
  category: string;
  pending: boolean;
  amount: number; // negative = money out, positive = money in
}

export interface TransactionsResult {
  connected: boolean;
  notReady?: boolean;
  institutionName?: string;
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
  connect(payload: { settings: PlaidSettings; bank: Bank }): Promise<Result<ConnectResult>>;
  disconnect(): Promise<Result<void>>;
  getTransactions(): Promise<Result<TransactionsResult>>;
}

declare global {
  interface Window {
    wallex?: Partial<WallexBridge>;
  }
}

const NOT_DESKTOP = 'Bank linking is only available in the Wallex desktop app.';

// Thin wrappers so the UI works (with a clear message) when opened in a plain browser.
export const wallex = {
  available: () => typeof window !== 'undefined' && Boolean(window.wallex?.getStatus),
  getStatus: (): Promise<Result<Status>> =>
    window.wallex?.getStatus?.() ?? Promise.resolve({ ok: false, error: NOT_DESKTOP }),
  connect: (payload: { settings: PlaidSettings; bank: Bank }): Promise<Result<ConnectResult>> =>
    window.wallex?.connect?.(payload) ?? Promise.resolve({ ok: false, error: NOT_DESKTOP }),
  disconnect: (): Promise<Result<void>> =>
    window.wallex?.disconnect?.() ?? Promise.resolve({ ok: false, error: NOT_DESKTOP }),
  getTransactions: (): Promise<Result<TransactionsResult>> =>
    window.wallex?.getTransactions?.() ?? Promise.resolve({ ok: false, error: NOT_DESKTOP }),
};
