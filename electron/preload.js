const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe, minimal API to the renderer (index.html / app.js)
contextBridge.exposeInMainWorld('electronAPI', {
  load: ()       => ipcRenderer.invoke('data:load'),
  save: (data)   => ipcRenderer.invoke('data:save', data),
  dataPath: ()   => ipcRenderer.invoke('data:path'),
});
