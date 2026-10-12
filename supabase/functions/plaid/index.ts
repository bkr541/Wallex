// Wallex's Plaid gateway. The Plaid client ID and secret live here, as function secrets, and each person's bank access
// tokens live in Supabase Vault. The app (desktop or web) only ever talks to this function with the signed-in person's
// session, and never sees a secret or a token.
//
// Secrets (set with `supabase secrets set`, see supabase/functions/.env.example):
//   PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV (sandbox | production)
//   PLAID_REDIRECT_URI_WEB, PLAID_REDIRECT_URI_DESKTOP (OAuth banks such as Chase), PLAID_WEBHOOK_URL (optional)

import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

class HttpError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/* ---------------------------------------------------------------------------------------------- Plaid */

const env = (name: string) => Deno.env.get(name) ?? '';
const PLAID_ENV = env('PLAID_ENV') || 'sandbox';

function configured() {
  return Boolean(env('PLAID_CLIENT_ID') && env('PLAID_SECRET'));
}

async function plaid(endpoint: string, body: Record<string, unknown>) {
  if (!configured()) throw new HttpError('Bank linking is not set up on the server yet.', 503, 'NOT_CONFIGURED');
  const res = await fetch(`https://${PLAID_ENV}.plaid.com${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: env('PLAID_CLIENT_ID'), secret: env('PLAID_SECRET'), ...body }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(data.error_message || `Plaid request failed (${res.status}).`, 502, data.error_code);
  return data;
}

/* ------------------------------------------------------------------------------------------- shaping */

const titleCase = (s: string) =>
  s
    .toLowerCase()
    .replace(/_and_/g, ' & ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

// "FOOD_AND_DRINK" + "FOOD_AND_DRINK_RESTAURANT" -> "Food & Drink › Restaurant"
const categoryLabel = (pfc: any) => {
  if (!pfc?.primary) return 'Uncategorized';
  const primary = titleCase(pfc.primary);
  const detail = pfc.detailed?.startsWith(pfc.primary + '_') ? pfc.detailed.slice(pfc.primary.length + 1) : '';
  return detail ? `${primary} › ${titleCase(detail)}` : primary;
};

function detailsFor(t: any, account: any) {
  const loc = t.location || {};
  const meta = t.payment_meta || {};
  const address = [loc.address, loc.city, [loc.region, loc.postal_code].filter(Boolean).join(' '), loc.country].filter(Boolean).join(', ');
  const counterparties = (t.counterparties || []).map((c: any) => (c.type ? `${c.name} (${titleCase(c.type)})` : c.name)).join(', ');
  const confidence = t.personal_finance_category?.confidence_level;
  return [
    ['Bank Description', t.original_description || t.name],
    ['Account', account ? `${account.name}${account.mask ? ` ••${account.mask}` : ''}` : ''],
    ['Location', address],
    ['Store Number', loc.store_number],
    ['Website', t.website],
    ['Counterparties', counterparties],
    ['Payee', meta.payee],
    ['Payer', meta.payer],
    ['Reference Number', meta.reference_number],
    ['Payment Method', meta.payment_method],
    ['Payment Processor', meta.payment_processor],
    ['Reason', meta.reason],
    ['By Order Of', meta.by_order_of],
    ['PPD ID', meta.ppd_id],
    ['Check Number', t.check_number],
    ['Transaction Code', t.transaction_code ? titleCase(t.transaction_code) : ''],
    ['Currency', t.iso_currency_code || t.unofficial_currency_code],
    ['Category Confidence', confidence ? titleCase(confidence) : ''],
    ['Transaction ID', t.transaction_id],
  ]
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([label, value]) => ({ label, value: String(value) }));
}

const favicon = (domain: string) => `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=128`;

// Payment processors and banks print their own name on statements, so a domain found in the text is only useful when
// it belongs to the merchant.
const NOT_THE_MERCHANT = /^(paypal|venmo|squareup|stripe|jpmorgan|jpmorganchase|chase|zellepay|cash\.app)\./;

function domainsInText(text: string) {
  const found: string[] = [];
  const re = /\b((?:[a-z0-9-]+\.)+(?:com|net|org|io|ai|app|dev|tv|gg))\b/gi;
  for (const m of (text || '').matchAll(re)) {
    const domain = m[1].toLowerCase().replace(/^www\./, '');
    if (!NOT_THE_MERCHANT.test(domain)) found.push(domain);
  }
  return found;
}

function guessDomain(brand: string) {
  const slug = (brand || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return slug.length >= 3 ? `${slug}.com` : '';
}

// Logo candidates for any merchant, best first; the app falls through the list as images fail to load.
function logosFor(t: any): string[] {
  const counterparties = t.counterparties || [];
  const site = t.website || counterparties.find((c: any) => c.website)?.website || '';
  const siteDomain = site.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '');
  const textDomain = domainsInText(`${t.original_description || ''} ${t.name || ''}`)[0];
  const brand = t.merchant_name || counterparties.find((c: any) => c.type === 'merchant')?.name;
  const urls = [
    t.logo_url,
    ...counterparties.map((c: any) => c.logo_url),
    siteDomain && favicon(siteDomain),
    textDomain && favicon(textDomain),
    brand && favicon(guessDomain(brand)),
    t.personal_finance_category_icon_url,
  ];
  return [...new Set(urls.filter(Boolean))] as string[];
}

async function syncAll(accessToken: string) {
  const byId = new Map<string, any>();
  let cursor: string | undefined;
  let accounts: any[] = [];
  let hasMore = true;
  while (hasMore) {
    const r = await plaid('/transactions/sync', { access_token: accessToken, cursor, count: 500, options: { include_original_description: true } });
    accounts = r.accounts;
    for (const t of [...r.added, ...r.modified]) byId.set(t.transaction_id, t);
    for (const t of r.removed) byId.delete(t.transaction_id);
    cursor = r.next_cursor;
    hasMore = r.has_more;
  }
  return { accounts, transactions: [...byId.values()] };
}

// One linked bank. One that cannot be reached (its login expired, say) is reported on its own and does not stop the others.
async function loadItem(item: Item) {
  try {
    let data;
    try {
      data = await syncAll(item.access_token);
    } catch (err) {
      // A page changed while paging through; starting over fixes it.
      if ((err as HttpError).code !== 'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION') throw err;
      data = await syncAll(item.access_token);
    }
    return { item, data };
  } catch (err) {
    if ((err as HttpError).code === 'PRODUCT_NOT_READY') return { item, notReady: true };
    return { item, error: err as HttpError };
  }
}

/* ------------------------------------------------------------------------------------------- storage */

interface Item {
  item_id: string;
  institution_id: string | null;
  institution_name: string | null;
  access_token: string;
}

function clients(req: Request) {
  const url = env('SUPABASE_URL');
  const service = createClient(url, env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  return { service, token: (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '') };
}

async function itemsFor(service: ReturnType<typeof createClient>, userId: string): Promise<Item[]> {
  const { data, error } = await service.rpc('plaid_items_for_user', { p_user_id: userId });
  if (error) throw new HttpError(`Could not read linked banks: ${error.message}`, 500);
  return (data ?? []) as Item[];
}

/* ------------------------------------------------------------------------------------------- actions */

type Body = Record<string, any>;

async function status(service: ReturnType<typeof createClient>, userId: string) {
  const items = await itemsFor(service, userId);
  return {
    configured: configured(),
    environment: PLAID_ENV,
    connections: items.map((i) => ({ itemId: i.item_id, institutionName: i.institution_name ?? '' })),
  };
}

// Production: a Link token for the app to open Plaid Link with. Sandbox: the bank is linked right here, with no Link window.
async function start(service: ReturnType<typeof createClient>, userId: string, body: Body) {
  const bank = body.bank as { id?: string; name?: string; routingNumber?: string } | undefined;

  if (PLAID_ENV === 'sandbox') {
    const institutionId = bank?.id || 'ins_56';
    const { public_token } = await plaid('/sandbox/public_token/create', { institution_id: institutionId, initial_products: ['transactions'] });
    const item = await exchange(service, userId, public_token, { institution_id: institutionId, name: bank?.name || 'Sandbox bank' });
    return { mode: 'done', connected: true, institutionName: item.institutionName };
  }

  const client = body.client === 'desktop' ? 'desktop' : 'web';
  const redirectUri = env(client === 'desktop' ? 'PLAID_REDIRECT_URI_DESKTOP' : 'PLAID_REDIRECT_URI_WEB') || undefined;
  const request: Record<string, unknown> = {
    client_name: 'Wallex',
    language: 'en',
    country_codes: ['US'],
    user: { client_user_id: userId },
    products: ['transactions'],
    transactions: { days_requested: 730 },
  };
  if (redirectUri) request.redirect_uri = redirectUri;
  if (env('PLAID_WEBHOOK_URL')) request.webhook = env('PLAID_WEBHOOK_URL');

  // Pre-selects the bank in Link when its routing number is known; falls back to the full list.
  if (bank?.routingNumber) {
    try {
      const r = await plaid('/link/token/create', { ...request, institution_data: { routing_number: bank.routingNumber } });
      return { mode: 'link', linkToken: r.link_token, redirectUri };
    } catch (err) {
      const code = (err as HttpError).code;
      if (code !== 'INVALID_INPUT' && code !== 'INVALID_FIELD') throw err;
    }
  }
  const r = await plaid('/link/token/create', request);
  return { mode: 'link', linkToken: r.link_token, redirectUri };
}

async function exchange(service: ReturnType<typeof createClient>, userId: string, publicToken: string, institution?: { institution_id?: string; name?: string }) {
  if (!publicToken) throw new HttpError('Missing the public token.');
  const { access_token, item_id } = await plaid('/item/public_token/exchange', { public_token: publicToken });
  const name = institution?.name || '';

  // Linking the same bank again replaces the old connection, so the old one is closed at Plaid.
  const existing = await itemsFor(service, userId);
  const replaced = existing.find((i) => i.item_id !== item_id && ((institution?.institution_id && i.institution_id === institution.institution_id) || (!i.institution_id && name && i.institution_name === name)));

  const { error } = await service.rpc('store_plaid_item_for', {
    p_user_id: userId,
    p_item_id: item_id,
    p_institution_id: institution?.institution_id ?? '',
    p_institution_name: name,
    p_access_token: access_token,
  });
  if (error) throw new HttpError(`Could not save the bank connection: ${error.message}`, 500);

  if (replaced) {
    try {
      await plaid('/item/remove', { access_token: replaced.access_token });
    } catch {
      // Best effort.
    }
    await service.rpc('delete_plaid_item_for', { p_user_id: userId, p_item_id: replaced.item_id });
  }
  return { itemId: item_id, institutionName: name };
}

async function disconnect(service: ReturnType<typeof createClient>, userId: string, itemId?: string) {
  const items = await itemsFor(service, userId);
  for (const i of itemId ? items.filter((x) => x.item_id === itemId) : items) {
    try {
      await plaid('/item/remove', { access_token: i.access_token });
    } catch {
      // Removing at Plaid is best effort; the connection is always cleared here.
    }
    await service.rpc('delete_plaid_item_for', { p_user_id: userId, p_item_id: i.item_id });
  }
  return {};
}

async function transactions(service: ReturnType<typeof createClient>, userId: string) {
  const items = await itemsFor(service, userId);
  if (items.length === 0) return { connected: false };

  const results = await Promise.all(items.map(loadItem));
  const loaded = results.filter((r) => 'data' in r && r.data) as { item: Item; data: { accounts: any[]; transactions: any[] } }[];
  const institutions = results.map((r) => ({
    itemId: r.item.item_id,
    name: r.item.institution_name ?? '',
    notReady: Boolean((r as any).notReady),
    error: (r as any).error ? (r as any).error.message || 'Could not reach this bank.' : null,
    needsRelink: (r as any).error?.code === 'ITEM_LOGIN_REQUIRED',
  }));
  const names = items.map((i) => i.institution_name).filter(Boolean).join(', ');

  if (loaded.length === 0) {
    if (results.every((r) => (r as any).notReady)) return { connected: true, notReady: true, institutionName: names, institutions };
    throw (results.find((r) => (r as any).error) as any)?.error ?? new HttpError('Could not load your banks.', 502);
  }

  const accountsById = new Map<string, any>();
  for (const { item, data } of loaded) for (const a of data.accounts) accountsById.set(a.account_id, { ...a, itemId: item.item_id, institution: item.institution_name });

  const txns = loaded
    .flatMap(({ data }) => data.transactions)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .map((t) => ({
      id: t.transaction_id,
      accountId: t.account_id,
      date: t.date,
      merchant: t.merchant_name || t.name,
      logos: logosFor(t),
      authorizedDate: t.authorized_date || null,
      category: categoryLabel(t.personal_finance_category),
      categoryKey: t.personal_finance_category?.primary || '',
      categoryDetailKey: t.personal_finance_category?.detailed || '',
      channel: t.payment_channel ? titleCase(t.payment_channel) : '',
      pending: t.pending,
      // Plaid reports money out as positive; the app shows money out as negative.
      amount: -t.amount,
      details: detailsFor(t, accountsById.get(t.account_id)),
    }));

  return {
    connected: true,
    institutionName: names,
    institutions,
    accounts: [...accountsById.values()].map((a) => ({
      id: a.account_id,
      name: a.name,
      mask: a.mask,
      type: a.type,
      subtype: a.subtype,
      available: a.balances.available,
      current: a.balances.current,
      itemId: a.itemId,
      institution: a.institution,
    })),
    transactions: txns,
  };
}

/* ---------------------------------------------------------------------------------------------- entry */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  try {
    const { service, token } = clients(req);
    // The gateway accepts any valid key, including the public one, so check that this is a signed-in person.
    const { data: auth, error: authError } = await service.auth.getUser(token);
    if (authError || !auth.user) return json({ error: 'Sign in again to use your banks.' }, 401);
    const userId = auth.user.id;

    const body: Body = await req.json().catch(() => ({}));
    switch (body.action) {
      case 'status':
        return json(await status(service, userId));
      case 'start':
        return json(await start(service, userId, body));
      case 'exchange':
        return json(await exchange(service, userId, String(body.publicToken ?? ''), body.institution));
      case 'disconnect':
        return json(await disconnect(service, userId, body.itemId ? String(body.itemId) : undefined));
      case 'transactions':
        return json(await transactions(service, userId));
      default:
        return json({ error: 'Unknown action.' }, 400);
    }
  } catch (err) {
    const e = err as HttpError;
    console.error('plaid function error:', e.code ?? '', e.message);
    return json({ error: e.message || 'Something went wrong.', code: e.code }, e.status || 500);
  }
});
