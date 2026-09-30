const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('spendtrail', {
  platform: process.platform,
});
