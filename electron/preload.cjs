const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wallex', {
  platform: process.platform,
  getStatus: () => ipcRenderer.invoke('wallex:status'),
  saveSettings: (payload) => ipcRenderer.invoke('wallex:save-settings', payload),
  syncConnections: (authToken, cloudConfig) => ipcRenderer.invoke('wallex:sync-connections', authToken, cloudConfig),
  connect: (payload) => ipcRenderer.invoke('wallex:connect', payload),
  disconnect: (itemId, authToken, cloudConfig) => ipcRenderer.invoke('wallex:disconnect', itemId, authToken, cloudConfig),
  getTransactions: () => ipcRenderer.invoke('wallex:transactions'),
  // The details from a confirmation or password-reset email link, once it has been opened in the browser.
  onAuthCallback: (cb) => {
    ipcRenderer.on('wallex:auth-callback', (_event, payload) => {
      ipcRenderer.invoke('wallex:take-auth-callback');
      cb(payload);
    });
    ipcRenderer.invoke('wallex:take-auth-callback').then((payload) => payload && cb(payload));
  },
});
