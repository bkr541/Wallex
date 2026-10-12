// What the server says about the person's bank connections. Nothing secret ever reaches the app: the Plaid keys and
// each bank's access token live on the server.
export interface Status {
  configured: boolean; // the server has its Plaid keys
  environment: string; // sandbox or production
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

// What a confirmation or password-reset email link carries.
export interface AuthCallback {
  access_token?: string;
  refresh_token?: string;
  type?: string;
  error?: string;
  error_code?: string;
  error_description?: string;
}

// The few things only the desktop app can do. Everything else (banks, transactions) goes through the server.
interface DesktopBridge {
  platform: string;
  // Opens Plaid Link in its own window, for banks that sign in by redirecting (OAuth).
  runLink(linkToken: string, redirectUri?: string): Promise<Result<LinkOutcome>>;
  onAuthCallback(cb: (payload: AuthCallback) => void): void;
}

export type LinkOutcome = { cancelled: true } | { cancelled?: false; publicToken: string; institution?: { institution_id?: string; name?: string } };

declare global {
  interface Window {
    wallex?: Partial<DesktopBridge>;
  }
}

export const isDesktop = () => typeof window !== 'undefined' && Boolean(window.wallex?.platform);

const NOT_SIGNED_IN = 'Sign in to use your banks.';

// Calls the `plaid` function on the server as the signed-in person. Errors come back as readable sentences.
async function call<T>(body: Record<string, unknown>): Promise<Result<T>> {
  if (!supabase) return { ok: false, error: NOT_SIGNED_IN };
  const { data, error } = await supabase.functions.invoke('plaid', { body });
  if (error) {
    let message = 'Wallex could not reach its bank service. Try again in a moment.';
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const detail = await ctx.json();
        if (detail?.error) message = detail.error;
      } catch {
        // Keep the general message.
      }
    }
    return { ok: false, error: message };
  }
  if (data?.error) return { ok: false, error: data.error };
  return { ok: true, data: data as T };
}

const PENDING_LINK = 'wallex-plaid-link';

// Starting a link: on the server, a sandbox bank is linked straight away; otherwise it hands back a Link token, which is
// opened here (a window of the desktop app, or Plaid Link in the page), and the result is exchanged on the server.
async function linkBank(bank?: Bank): Promise<Result<ConnectResult>> {
  const started = await call<{ mode: 'done' | 'link'; connected?: boolean; institutionName?: string; linkToken?: string; redirectUri?: string }>({
    action: 'start',
    bank,
    client: isDesktop() ? 'desktop' : 'web',
  });
  if (!started.ok) return started;
  if (started.data.mode === 'done') return { ok: true, data: { connected: Boolean(started.data.connected), institutionName: started.data.institutionName } };

  const { linkToken, redirectUri } = started.data;
  if (!linkToken) return { ok: false, error: 'The bank service did not return a link.' };

  let outcome: LinkOutcome;
  if (isDesktop() && window.wallex?.runLink) {
    const r = await window.wallex.runLink(linkToken, redirectUri);
    if (!r.ok) return r;
    outcome = r.data;
  } else {
    // A bank that signs in elsewhere sends the person back to this page; the token is kept so Link can pick up where it left off.
    try {
      localStorage.setItem(PENDING_LINK, JSON.stringify({ linkToken, at: Date.now() }));
    } catch {
      // Without storage, OAuth banks cannot resume; others still work.
    }
    try {
      outcome = await openPlaidLink(linkToken);
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Could not open Plaid Link.' };
    }
  }
  return finishLink(outcome);
}

async function finishLink(outcome: LinkOutcome): Promise<Result<ConnectResult>> {
  try {
    localStorage.removeItem(PENDING_LINK);
  } catch {
    // Nothing to clear.
  }
  if (outcome.cancelled) return { ok: true, data: { connected: false, cancelled: true } };
  const done = await call<{ itemId: string; institutionName: string }>({ action: 'exchange', publicToken: outcome.publicToken, institution: outcome.institution });
  if (!done.ok) return done;
  return { ok: true, data: { connected: true, institutionName: done.data.institutionName } };
}

export const wallex = {
  // Banks are reached through the server, so this is true wherever the app can sign in.
  available: () => Boolean(supabase),
  getStatus: (): Promise<Result<Status>> => call<Status>({ action: 'status' }),
  connect: (payload: { bank: Bank }): Promise<Result<ConnectResult>> => linkBank(payload.bank),
  // Link another bank: Plaid starts at its own list of institutions.
  connectAnother: (): Promise<Result<ConnectResult>> => linkBank(),
  disconnect: (itemId?: string): Promise<Result<void>> => call<void>({ action: 'disconnect', itemId }),
  getTransactions: (): Promise<Result<TransactionsResult>> => call<TransactionsResult>({ action: 'transactions' }),

  // Picks up a bank sign-in that sent the person back to the page (the URL carries oauth_state_id). Returns null when
  // there is nothing to resume.
  resumeLink: async (): Promise<Result<ConnectResult> | null> => {
    if (typeof window === 'undefined' || isDesktop() || !new URLSearchParams(window.location.search).has('oauth_state_id')) return null;
    let pending: { linkToken?: string; at?: number } | null = null;
    try {
      pending = JSON.parse(localStorage.getItem(PENDING_LINK) ?? 'null');
    } catch {
      pending = null;
    }
    const clean = () => window.history.replaceState({}, '', window.location.pathname);
    if (!pending?.linkToken || !pending.at || Date.now() - pending.at > 30 * 60_000) {
      clean();
      return { ok: false, error: 'That bank sign-in took too long. Start linking again.' };
    }
    const received = window.location.href;
    clean();
    try {
      return finishLink(await openPlaidLink(pending.linkToken, received));
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Could not finish linking.' };
    }
  },

  // The details from a confirmation or password-reset email link. The desktop app hands them over; on the web the
  // link lands on the page itself, with the details in the address.
  onAuthCallback: (cb: (payload: AuthCallback) => void) => {
    if (isDesktop()) return window.wallex?.onAuthCallback?.(cb);
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (!params.has('access_token') && !params.has('error')) return;
    window.history.replaceState({}, '', window.location.pathname + window.location.search);
    cb({
      access_token: params.get('access_token') ?? undefined,
      refresh_token: params.get('refresh_token') ?? undefined,
      type: params.get('type') ?? undefined,
      error: params.get('error') ?? undefined,
      error_code: params.get('error_code') ?? undefined,
      error_description: params.get('error_description') ?? undefined,
    });
  },
};

import { supabase } from './supabase';
import { openPlaidLink } from './plaidLink';
