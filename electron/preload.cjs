const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wallex', {
  platform: process.platform,
  getStatus: () => ipcRenderer.invoke('wallex:status'),
  connect: (payload) => ipcRenderer.invoke('wallex:connect', payload),
  disconnect: () => ipcRenderer.invoke('wallex:disconnect'),
  getTransactions: () => ipcRenderer.invoke('wallex:transactions'),
});
