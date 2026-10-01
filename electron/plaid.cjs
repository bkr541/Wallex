const { BrowserWindow, shell } = require('electron');
const crypto = require('crypto');
const http = require('http');
const config = require('./config.cjs');

class PlaidError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

// All Plaid calls happen here in the main process so the secret never reaches the renderer.
async function plaid(endpoint, body) {
  const s = config.getSettings();
  if (!s.clientId || !s.secret) {
    throw new PlaidError('Add your Plaid client ID and secret in Settings → Setup.');
  }
  const res = await fetch(`https://${s.environment}.plaid.com${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: s.clientId, secret: s.secret, ...body }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new PlaidError(data.error_message || `Plaid request failed (${res.status}).`, data.error_code);
  }
  return data;
}

async function createLinkToken(s, routingNumber) {
  const body = {
    client_name: 'Wallex',
    language: s.language,
    country_codes: s.countries,
    user: { client_user_id: config.getUserId() },
    products: s.products,
  };
  if (s.products.includes('transactions')) body.transactions = { days_requested: 730 };
  if (s.redirectUri) body.redirect_uri = s.redirectUri;
  if (s.webhookUrl) body.webhook = s.webhookUrl;

  // Pre-selects the bank in Link when we know its routing number; fall back to the full list.
  if (routingNumber) {
    try {
      return (await plaid('/link/token/create', { ...body, institution_data: { routing_number: routingNumber } }))
        .link_token;
    } catch (err) {
      if (err.code !== 'INVALID_INPUT' && err.code !== 'INVALID_FIELD') throw err;
    }
  }
  return (await plaid('/link/token/create', body)).link_token;
}

function linkPage(nonce) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Connect your bank</title>
<style>
  body { margin: 0; height: 100vh; display: flex; align-items: center; justify-content: center;
         background: #0a0a0a; color: #8a8a8a; font-family: system-ui, sans-serif; }
</style>
</head>
<body>
<p id="status">Opening secure connection…</p>
<script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>
<script>
  const base = '/${nonce}';
  const received = new URLSearchParams(location.search).get('received');
  const post = (path, body) =>
    fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });

  (async () => {
    const { link_token } = await (await fetch(base + '/token')).json();
    const config = {
      token: link_token,
      onSuccess: async (public_token, metadata) => {
        document.getElementById('status').textContent = 'Finishing up…';
        await post('/success', { public_token, institution: metadata.institution });
      },
      onExit: async (err) => {
        await post('/exit', { error: err ? err.display_message || err.error_message || err.error_code : null });
      },
    };
    if (received) config.receivedRedirectUri = received;
    Plaid.create(config).open();
  })().catch((e) => post('/exit', { error: String(e) }));
</script>
</body>
</html>`;
}

// Opens Plaid Link in its own window, served from a throwaway local server.
// Resolves with { publicToken, institution } or { cancelled: true } / rejects on failure.
function runLink(linkToken, redirectUri) {
  return new Promise((resolve, reject) => {
    const nonce = crypto.randomBytes(16).toString('hex');
    let win = null;
    let settled = false;

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      server.close();
      if (win && !win.isDestroyed()) win.destroy();
      fn(value);
    };

    const readBody = (req) =>
      new Promise((ok) => {
        let raw = '';
        req.on('data', (chunk) => (raw += chunk));
        req.on('end', () => {
          try {
            ok(JSON.parse(raw || '{}'));
          } catch {
            ok({});
          }
        });
      });

    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, 'http://localhost');
      const send = (status, type, body) => {
        res.writeHead(status, { 'Content-Type': type });
        res.end(body);
      };

      if (req.method === 'GET' && url.pathname === `/${nonce}/link`) return send(200, 'text/html', linkPage(nonce));
      if (req.method === 'GET' && url.pathname === `/${nonce}/token`) {
        return send(200, 'application/json', JSON.stringify({ link_token: linkToken }));
      }
      if (req.method === 'POST' && url.pathname === `/${nonce}/success`) {
        const body = await readBody(req);
        send(200, 'application/json', '{}');
        return finish(resolve, { publicToken: body.public_token, institution: body.institution });
      }
      if (req.method === 'POST' && url.pathname === `/${nonce}/exit`) {
        const body = await readBody(req);
        send(200, 'application/json', '{}');
        return body.error ? finish(reject, new PlaidError(body.error)) : finish(resolve, { cancelled: true });
      }
      send(404, 'text/plain', 'Not found');
    });

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const linkUrl = `http://localhost:${port}/${nonce}/link`;

      win = new BrowserWindow({
        width: 480,
        height: 720,
        title: 'Connect your bank',
        backgroundColor: '#0a0a0a',
        webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
      });

      // OAuth banks (Chase included) finish by redirecting to the registered redirect URI.
      // Catch that navigation and hand it back to Link so no page needs to be hosted there.
      if (redirectUri) {
        const onNavigate = (details, legacyUrl) => {
          const target = typeof legacyUrl === 'string' ? legacyUrl : details.url;
          if (target && target.startsWith(redirectUri)) {
            details.preventDefault();
            win.loadURL(`${linkUrl}?received=${encodeURIComponent(target)}`);
          }
        };
        win.webContents.on('will-navigate', onNavigate);
        win.webContents.on('will-redirect', onNavigate);
      }

      win.webContents.setWindowOpenHandler(({ url: popup }) => {
        shell.openExternal(popup);
        return { action: 'deny' };
      });
      win.on('closed', () => finish(resolve, { cancelled: true }));
      win.loadURL(linkUrl).catch((err) => finish(reject, err));
    });
  });
}

async function exchange(publicToken, institution) {
  const { access_token, item_id } = await plaid('/item/public_token/exchange', { public_token: publicToken });
  config.setConnection({
    accessToken: access_token,
    itemId: item_id,
    institutionId: institution?.institution_id || '',
    institutionName: institution?.name || '',
  });
}

// Links the chosen bank. Sandbox skips the Link UI; production runs the real Link flow.
async function connect(bank) {
  const s = config.getSettings();

  if (s.environment === 'sandbox') {
    const { public_token } = await plaid('/sandbox/public_token/create', {
      institution_id: bank.id,
      initial_products: s.products,
    });
    await exchange(public_token, { institution_id: bank.id, name: bank.name });
    return { connected: true, institutionName: bank.name };
  }

  const linkToken = await createLinkToken(s, bank.routingNumber);
  const result = await runLink(linkToken, s.redirectUri);
  if (result.cancelled) return { connected: false, cancelled: true };
  await exchange(result.publicToken, result.institution);
  return { connected: true, institutionName: result.institution?.name || bank.name };
}

async function disconnect() {
  const c = config.getConnection();
  if (c) {
    try {
      await plaid('/item/remove', { access_token: c.accessToken });
    } catch {
      // Removing the item at Plaid is best effort; always clear the local connection.
    }
  }
  config.clearConnection();
}

// "FOOD_AND_DRINK" + "FOOD_AND_DRINK_RESTAURANT" -> "Food & Drink › Restaurant"
const categoryLabel = (pfc) => {
  if (!pfc?.primary) return 'Uncategorized';
  const primary = titleCase(pfc.primary);
  const detail = pfc.detailed?.startsWith(pfc.primary + '_') ? pfc.detailed.slice(pfc.primary.length + 1) : '';
  return detail ? `${primary} › ${titleCase(detail)}` : primary;
};

const titleCase = (s) =>
  s
    .toLowerCase()
    .replace(/_and_/g, ' & ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

// Fields without their own column; the UI shows these when a transaction is expanded.
// Anything Plaid leaves empty is dropped.
function detailsFor(t, account) {
  const loc = t.location || {};
  const meta = t.payment_meta || {};
  const address = [loc.address, loc.city, [loc.region, loc.postal_code].filter(Boolean).join(' '), loc.country]
    .filter(Boolean)
    .join(', ');
  const counterparties = (t.counterparties || [])
    .map((c) => (c.type ? `${c.name} (${titleCase(c.type)})` : c.name))
    .join(', ');
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

// Logo candidates, best first: Plaid's merchant logo, a counterparty logo, the merchant site's icon,
// then Plaid's generic category icon. The UI falls through the list and ends on initials.
function logosFor(t) {
  const counterparties = t.counterparties || [];
  const site = t.website || counterparties.find((c) => c.website)?.website || '';
  const domain = site.replace(/^https?:\/\//, '').split('/')[0];
  const urls = [
    t.logo_url,
    ...counterparties.map((c) => c.logo_url),
    domain && `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=64`,
    t.personal_finance_category_icon_url,
  ];
  return [...new Set(urls.filter(Boolean))];
}

async function syncAll(accessToken) {
  const byId = new Map();
  let cursor;
  let accounts = [];
  let hasMore = true;
  while (hasMore) {
    const r = await plaid('/transactions/sync', {
      access_token: accessToken,
      cursor,
      count: 500,
      options: { include_original_description: true },
    });
    accounts = r.accounts;
    for (const t of [...r.added, ...r.modified]) byId.set(t.transaction_id, t);
    for (const t of r.removed) byId.delete(t.transaction_id);
    cursor = r.next_cursor;
    hasMore = r.has_more;
  }
  return { accounts, transactions: [...byId.values()] };
}

async function getTransactions() {
  const c = config.getConnection();
  if (!c) return { connected: false };

  let data;
  try {
    try {
      data = await syncAll(c.accessToken);
    } catch (err) {
      // A page changed while we were paging through; starting over fixes it.
      if (err.code !== 'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION') throw err;
      data = await syncAll(c.accessToken);
    }
  } catch (err) {
    if (err.code === 'PRODUCT_NOT_READY') return { connected: true, notReady: true, institutionName: c.institutionName };
    throw err;
  }

  // The Transactions screen is the Checking tab, so prefer checking accounts when there are any.
  const checking = data.accounts.filter((a) => a.subtype === 'checking');
  const shown = checking.length ? checking : data.accounts;
  const shownIds = new Set(shown.map((a) => a.account_id));
  const accountsById = new Map(data.accounts.map((a) => [a.account_id, a]));

  const transactions = data.transactions
    .filter((t) => shownIds.has(t.account_id))
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
      // Plaid reports money out as positive; the UI shows money out as negative.
      amount: -t.amount,
      details: detailsFor(t, accountsById.get(t.account_id)),
    }));

  return {
    connected: true,
    institutionName: c.institutionName,
    accounts: shown.map((a) => ({
      id: a.account_id,
      name: a.name,
      mask: a.mask,
      subtype: a.subtype,
      available: a.balances.available,
      current: a.balances.current,
    })),
    transactions,
  };
}

function getStatus() {
  const s = config.getSettings();
  const c = config.getConnection();
  return {
    environment: s.environment,
    clientId: s.clientId,
    hasSecret: Boolean(s.secret),
    products: s.products,
    countries: s.countries,
    language: s.language,
    webhookUrl: s.webhookUrl,
    redirectUri: s.redirectUri,
    bankId: s.bankId,
    connection: c ? { institutionName: c.institutionName } : null,
  };
}

module.exports = { connect, disconnect, getTransactions, getStatus };
