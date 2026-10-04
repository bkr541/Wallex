// A tiny web server that listens on this computer only (127.0.0.1) while Wallex is open.
//
// Supabase emails contain a link. Wallex is a desktop app with no website, so the link is set up to land here: this
// serves a short "you can go back to Wallex" page, and the page hands the sign-in details in the link over to the
// app. Nothing outside this computer ever sees them.
const http = require('http');

const HOST = '127.0.0.1';
const PORT = 54719; // the same address is set as the Site URL in supabase/config.toml
const FIELDS = ['access_token', 'refresh_token', 'type', 'error', 'error_code', 'error_description'];

const PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Wallex</title>
<style>
  html,body{height:100%;margin:0}
  body{display:flex;align-items:center;justify-content:center;background:#0a0a0a;color:#f4f4f1;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif}
  main{max-width:420px;margin:24px;padding:36px;border:1px solid #2a2a2a;border-radius:24px;background:#141414;text-align:center}
  .mark{width:52px;height:52px;border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:26px;background:#4fb8a5;color:#0a0a0a}
  .bad .mark{background:#f87171}
  h1{font-size:22px;margin:0 0 10px}
  p{margin:0;color:#a3a3a3;line-height:1.55;font-size:15px}
</style></head>
<body><main id="box"><div class="mark" id="mark">…</div><h1 id="title">One moment…</h1><p id="text"></p></main>
<script>
(function () {
  var params = new URLSearchParams(location.hash.replace(/^#/, '') + '&' + location.search.replace(/^\\?/, ''));
  var data = {};
  ${JSON.stringify(FIELDS)}.forEach(function (k) { if (params.get(k)) data[k] = params.get(k); });
  history.replaceState(null, '', location.pathname);
  function show(ok, title, text) {
    document.getElementById('box').className = ok ? '' : 'bad';
    document.getElementById('mark').textContent = ok ? '\\u2713' : '!';
    document.getElementById('title').textContent = title;
    document.getElementById('text').textContent = text;
  }
  if (!data.access_token && !data.error) return show(false, 'Nothing to do here', 'This page is only used by links in Wallex emails. You can close this tab.');
  fetch('/auth-callback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    .then(function (r) { if (!r.ok) throw new Error(); })
    .then(function () {
      if (data.error) return show(false, 'That link has expired', 'It may have been used already. Go back to Wallex and ask for a new email.');
      if (data.type === 'recovery') return show(true, 'Link verified', 'Go back to Wallex to choose your new password. You can close this tab.');
      show(true, 'All set', 'Your email is confirmed. Go back to Wallex. You can close this tab.');
    })
    .catch(function () { show(false, 'Wallex did not get that', 'Open the Wallex app and try the link in your email again.'); });
})();
</script></body></html>`;

function start(onCallback) {
  const origin = (req) => `http://${req.headers.host}`;
  const allowedHost = (req) => req.headers.host === `${HOST}:${PORT}` || req.headers.host === `localhost:${PORT}`;

  const server = http.createServer((req, res) => {
    // Another website could try to post fake details here. Only this server's own page is allowed to.
    if (!allowedHost(req)) {
      res.writeHead(403).end();
      return;
    }

    if (req.method === 'POST' && req.url === '/auth-callback') {
      if (req.headers.origin !== origin(req)) {
        res.writeHead(403).end();
        return;
      }
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 16 * 1024) req.destroy();
      });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          const clean = {};
          for (const k of FIELDS) if (typeof parsed[k] === 'string') clean[k] = parsed[k].slice(0, 4096);
          onCallback(clean);
          res.writeHead(204).end();
        } catch {
          res.writeHead(400).end();
        }
      });
      return;
    }

    if (req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'",
      });
      res.end(PAGE);
      return;
    }

    res.writeHead(405).end();
  });

  // If something else already uses the port, sign-in by email link will not work, but nothing else breaks.
  server.on('error', (err) => console.warn('Auth link server could not start:', err.message));
  server.listen(PORT, HOST);
  return server;
}

module.exports = { start, PORT, HOST };
