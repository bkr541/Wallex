import type { LinkOutcome } from './wallex';

// Plaid Link in the page, for the web version of the app. The desktop app opens Link in its own window instead.

interface PlaidHandler {
  open(): void;
  destroy(): void;
}
interface PlaidGlobal {
  create(config: {
    token: string;
    receivedRedirectUri?: string;
    onSuccess: (publicToken: string, metadata: { institution?: { institution_id?: string; name?: string } }) => void;
    onExit: (err: { display_message?: string; error_message?: string; error_code?: string } | null) => void;
  }): PlaidHandler;
}

declare global {
  interface Window {
    Plaid?: PlaidGlobal;
  }
}

const SCRIPT = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
let loading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.Plaid) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = SCRIPT;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      loading = null;
      el.remove();
      reject(new Error('Could not load Plaid. Check your connection and try again.'));
    };
    document.head.appendChild(el);
  });
  return loading;
}

// Opens Link with a token from the server. Resolves with the public token to exchange, or { cancelled } if the person
// closed it. `receivedRedirectUri` is the page address a bank sent the person back to, to finish a redirect sign-in.
export async function openPlaidLink(linkToken: string, receivedRedirectUri?: string): Promise<LinkOutcome> {
  await loadScript();
  return new Promise<LinkOutcome>((resolve, reject) => {
    const handler = window.Plaid!.create({
      token: linkToken,
      receivedRedirectUri,
      onSuccess: (publicToken, metadata) => {
        resolve({ publicToken, institution: metadata.institution });
        handler.destroy();
      },
      onExit: (err) => {
        if (err) reject(new Error(err.display_message || err.error_message || err.error_code || 'Plaid Link closed with an error.'));
        else resolve({ cancelled: true });
        handler.destroy();
      },
    });
    handler.open();
  });
}
