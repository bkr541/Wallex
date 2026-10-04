const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const config = require('./config.cjs');
const plaid = require('./plaid.cjs');
const authServer = require('./authServer.cjs');

const RENDERER_URL = process.env.ELECTRON_RENDERER_URL;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'Wallex',
    backgroundColor: '#0a0a0a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once('ready-to-show', () => win.show());

  // Open external links in the system browser, never in-app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (RENDERER_URL) {
    win.loadURL(RENDERER_URL);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

// Errors are returned as data so the renderer gets a readable message instead of an IPC stack trace.
const handle = (channel, fn) =>
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      return { ok: true, data: await fn(...args) };
    } catch (err) {
      return { ok: false, error: err.message || 'Something went wrong.' };
    }
  });

handle('wallex:status', () => plaid.getStatus());
handle('wallex:connect', ({ settings, bank }) => {
  config.saveSettings({ ...settings, bankId: bank.id });
  return plaid.connect(bank);
});
handle('wallex:disconnect', () => plaid.disconnect());
handle('wallex:transactions', () => plaid.getTransactions());

// An email link was opened in the browser: hand what it carried to the app and bring the window forward. If the
// window is not ready yet, keep it until the app asks.
let pendingAuthCallback = null;
function deliverAuthCallback(payload) {
  const wins = BrowserWindow.getAllWindows();
  if (wins.length === 0) {
    pendingAuthCallback = payload;
    return;
  }
  pendingAuthCallback = payload;
  for (const w of wins) {
    w.webContents.send('wallex:auth-callback', payload);
    if (w.isMinimized()) w.restore();
    w.show();
    w.focus();
  }
}
ipcMain.handle('wallex:take-auth-callback', () => {
  const p = pendingAuthCallback;
  pendingAuthCallback = null;
  return p;
});

app.whenReady().then(() => {
  authServer.start(deliverAuthCallback);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
