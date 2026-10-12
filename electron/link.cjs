const { BrowserWindow, shell } = require('electron');
const crypto = require('crypto');
const http = require('http');

// Plaid Link for the desktop app. The Link token comes from Wallex's server (which holds the Plaid keys); this only opens
// Link in its own window, so a bank that signs in by redirecting (Chase and other OAuth banks) can finish.

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
        return body.error ? finish(reject, new Error(body.error)) : finish(resolve, { cancelled: true });
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

module.exports = { runLink };
