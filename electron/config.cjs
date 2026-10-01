const { app, safeStorage } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Credentials can be supplied through a git-ignored .env.local at the project root
// (PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV). Anything saved from Settings → Setup wins.
function loadDotEnv() {
  const out = {};
  for (const name of ['.env', '.env.local']) {
    const file = path.join(__dirname, '..', name);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      if (line.trim().startsWith('#')) continue;
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
  return out;
}

const DEFAULTS = {
  environment: 'sandbox',
  products: ['transactions'],
  countries: ['US'],
  language: 'en',
  webhookUrl: '',
  redirectUri: '',
  bankId: 'ins_56',
};

const file = () => path.join(app.getPath('userData'), 'wallex-config.json');

function encrypt(value) {
  if (!value) return '';
  if (safeStorage.isEncryptionAvailable()) return 'enc:' + safeStorage.encryptString(value).toString('base64');
  return 'raw:' + value;
}

function decrypt(value) {
  if (!value) return '';
  if (value.startsWith('enc:')) return safeStorage.decryptString(Buffer.from(value.slice(4), 'base64'));
  return value.replace(/^raw:/, '');
}

function read() {
  try {
    return JSON.parse(fs.readFileSync(file(), 'utf8'));
  } catch {
    return {};
  }
}

function write(data) {
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  fs.writeFileSync(file(), JSON.stringify(data, null, 2), { mode: 0o600 });
}

function getSettings() {
  const stored = read();
  const env = loadDotEnv();
  return {
    ...DEFAULTS,
    environment: stored.environment || env.PLAID_ENV || DEFAULTS.environment,
    clientId: stored.clientId || env.PLAID_CLIENT_ID || '',
    secret: decrypt(stored.secret) || env.PLAID_SECRET || '',
    products: stored.products || DEFAULTS.products,
    countries: stored.countries || DEFAULTS.countries,
    language: stored.language || DEFAULTS.language,
    webhookUrl: stored.webhookUrl ?? DEFAULTS.webhookUrl,
    redirectUri: stored.redirectUri ?? DEFAULTS.redirectUri,
    bankId: stored.bankId || DEFAULTS.bankId,
  };
}

// Persists the settings form. A blank secret keeps whatever is already saved.
// Changing environment or client ID invalidates the existing bank connection.
function saveSettings(next) {
  const before = getSettings();
  const stored = read();
  const clientId = (next.clientId || '').trim() || before.clientId;
  const secret = (next.secret || '').trim();

  const credentialsChanged =
    clientId !== before.clientId || next.environment !== before.environment || (secret && secret !== before.secret);

  const updated = {
    ...stored,
    environment: next.environment,
    clientId,
    secret: secret ? encrypt(secret) : stored.secret,
    products: next.products,
    countries: next.countries,
    language: next.language,
    webhookUrl: next.webhookUrl,
    redirectUri: next.redirectUri,
    bankId: next.bankId,
  };
  if (credentialsChanged) delete updated.connection;
  write(updated);
}

function getUserId() {
  const stored = read();
  if (stored.userId) return stored.userId;
  const userId = crypto.randomUUID();
  write({ ...stored, userId });
  return userId;
}

function getConnection() {
  const c = read().connection;
  if (!c) return null;
  return { ...c, accessToken: decrypt(c.accessToken) };
}

function setConnection(connection) {
  const stored = read();
  write({ ...stored, connection: { ...connection, accessToken: encrypt(connection.accessToken) } });
}

function clearConnection() {
  const stored = read();
  delete stored.connection;
  write(stored);
}

module.exports = { getSettings, saveSettings, getUserId, getConnection, setConnection, clearConnection };
