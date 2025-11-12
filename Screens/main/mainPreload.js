const { contextBridge, ipcRenderer } = require("electron");

let bridge = {
    // Bildirimler
    onShowNotification: (callback) => ipcRenderer.on("show-notification", callback),
    onUpdateProgress: (callback) => ipcRenderer.on("update-progress", callback),
    onSetVersion: (callback) => ipcRenderer.on('set-version', callback),

    // Navigasyon
    navigateTo: (url) => ipcRenderer.send('navigate-to', url),
    navBack: () => ipcRenderer.send('nav-back'),
    navForward: () => ipcRenderer.send('nav-forward'),
    navReload: () => ipcRenderer.send('nav-reload'),
    navHome: () => ipcRenderer.send('nav-home'),

    // URL güncellemesi
    onURLUpdate: (callback) => ipcRenderer.on('update-address-bar', callback),

    // DevTools
    toggleDevTools: () => ipcRenderer.send('toggleDevTools'), // Yeni eklendi
};

contextBridge.exposeInMainWorld("bridge", bridge);