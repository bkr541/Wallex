const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('downbeat', {
  platform: process.platform,
  scanVstFolder: (folder) => ipcRenderer.invoke('vst:scan', folder),
  getVstCache: () => ipcRenderer.invoke('vst:get-cache'),
  selectDirectory: (defaultPath) => ipcRenderer.invoke('dialog:selectDirectory', defaultPath),
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
});
