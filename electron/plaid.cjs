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
  if (s.products.includes('transactions')) body.transactions = { days_requested: 90 };
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

const titleCase = (s) =>
  s
    .toLowerCase()
    .replace(/_and_/g, ' & ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

async function syncAll(accessToken) {
  const byId = new Map();
  let cursor;
  let accounts = [];
  let hasMore = true;
  while (hasMore) {
    const r = await plaid('/transactions/sync', { access_token: accessToken, cursor, count: 500 });
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

  const transactions = data.transactions
    .filter((t) => shownIds.has(t.account_id))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .map((t) => ({
      id: t.transaction_id,
      date: t.date,
      merchant: t.merchant_name || t.name,
      category: t.personal_finance_category?.primary ? titleCase(t.personal_finance_category.primary) : 'Uncategorized',
      pending: t.pending,
      // Plaid reports money out as positive; the UI shows money out as negative.
      amount: -t.amount,
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
