const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (event, percent) => callback(percent))
});