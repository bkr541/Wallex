const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { scanVstFolders } = require('./vstScanner.cjs');

const RENDERER_URL = process.env.ELECTRON_RENDERER_URL;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'Downbeat',
    backgroundColor: '#121315',
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

// Native folder picker for the renderer. Resolves to the chosen path, or null if cancelled.
ipcMain.handle('dialog:selectDirectory', async (event, defaultPath) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: typeof defaultPath === 'string' && defaultPath ? defaultPath : undefined,
  });
  return result.canceled ? null : result.filePaths[0];
});

// ── VST library (local only) ─────────────────────────────────────────────────
// The last scan is cached as JSON in the app's user-data folder so the VST page can show it instantly.
const vstCachePath = () => path.join(app.getPath('userData'), 'vst-library.json');
const vstScansInFlight = new Map();

ipcMain.handle('vst:scan', (_event, folders) => {
  const list = Array.isArray(folders) ? [...new Set(folders.filter((f) => typeof f === 'string' && f.trim()))] : [];
  if (list.length === 0) {
    return { folders: [], scannedAt: new Date().toISOString(), plugins: [], warnings: [], error: 'No VST directory set' };
  }
  // Setup's Rescan button and the VST page can fire together; share one scan per folder set.
  const key = JSON.stringify(list);
  if (vstScansInFlight.has(key)) return vstScansInFlight.get(key);

  const scan = (async () => {
    const result = await scanVstFolders(list);
    if (!result.error) {
      try {
        const tmp = `${vstCachePath()}.tmp`;
        await fs.promises.writeFile(tmp, JSON.stringify(result));
        await fs.promises.rename(tmp, vstCachePath());
      } catch (err) {
        console.error('Could not write VST cache:', err);
      }
    }
    return result;
  })().finally(() => vstScansInFlight.delete(key));

  vstScansInFlight.set(key, scan);
  return scan;
});

ipcMain.handle('vst:get-cache', async () => {
  try {
    return JSON.parse(await fs.promises.readFile(vstCachePath(), 'utf8'));
  } catch {
    return null;
  }
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
