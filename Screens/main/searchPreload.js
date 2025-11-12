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

    // Versiyon ve Progress (search.html için)
    onUpdateProgress: (callback) => ipcRenderer.on('update-progress', callback),
    onSetVersion: (callback) => ipcRenderer.on('set-version', callback),

    // Güncelleme hazır olduğunda tetiklenecek olay
    onUpdateReadyToInstall: (callback) => ipcRenderer.on('update-ready-to-install', callback),
    // Uygulamayı yeniden başlatmak için main sürecine mesaj gönderme
    restartApp: () => ipcRenderer.send('restart-app'),
};

contextBridge.exposeInMainWorld("bridge", bridge);