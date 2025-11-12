const { contextBridge, ipcRenderer } = require("electron");

let bridge = {
    // Navigasyon
    navigateTo: (url) => ipcRenderer.send('navigate-to', url),
    navBack: () => ipcRenderer.send('nav-back'),
    navForward: () => ipcRenderer.send('nav-forward'),
    navReload: () => ipcRenderer.send('nav-reload'),
    navHome: () => ipcRenderer.send('nav-home'),

    // URL güncellemesi
    onURLUpdate: (callback) => ipcRenderer.on('update-address-bar', callback),

    // Progress ve Version
    onUpdateProgress: (callback) => ipcRenderer.on('update-progress', callback),
    onSetVersion: (callback) => ipcRenderer.on('set-version', callback),

    // DevTools
    toggleDevTools: () => ipcRenderer.send('toggleDevTools'),
};

contextBridge.exposeInMainWorld("bridge", bridge);