const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('wallex', {
  platform: process.platform,
});
