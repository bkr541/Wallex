const { contextBridge, ipcRenderer } = require('electron');

// All the desktop app adds to the page. Banks and transactions are reached through the server, not through here.
contextBridge.exposeInMainWorld('wallex', {
  platform: process.platform,
  // Opens Plaid Link in its own window; resolves with the public token to exchange, or { cancelled: true }.
  runLink: (linkToken, redirectUri) => ipcRenderer.invoke('wallex:run-link', linkToken, redirectUri),
  // The details from a confirmation or password-reset email link, once it has been opened in the browser.
  onAuthCallback: (cb) => {
    ipcRenderer.on('wallex:auth-callback', (_event, payload) => {
      ipcRenderer.invoke('wallex:take-auth-callback');
      cb(payload);
    });
    ipcRenderer.invoke('wallex:take-auth-callback').then((payload) => payload && cb(payload));
  },
});
