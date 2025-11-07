const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (event, data) => callback(data)),
    onUpdateStatus: (callback) => ipcRenderer.on('update-status', (event, status) => callback(status)),
    version: require('./package.json').version
});
