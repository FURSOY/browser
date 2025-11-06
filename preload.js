const { contextBridge, ipcRenderer } = require('electron');
const packageJson = require('../package.json');

contextBridge.exposeInMainWorld('electronAPI', {
    version: packageJson.version,
    onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (_event, value) => callback(value))
});
