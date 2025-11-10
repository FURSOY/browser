const { contextBridge, ipcRenderer } = require("electron");

let bridge = {
    // onShowNotification artık bir obje alacak: { message: string, autoHide: boolean }
    onShowNotification: (callback) => ipcRenderer.on("show-notification", callback),
    onUpdateProgress: (callback) => ipcRenderer.on("update-progress", callback), // Yeni eklendi
    onSetVersion: (callback) => ipcRenderer.on('set-version', callback), // main.html için taşındı (şimdilik bu preload'da kalacak, searchView kullanacak)

    navigateTo: (url) => ipcRenderer.send('navigate-to', url),
    navBack: () => ipcRenderer.send('nav-back'),
    navForward: () => ipcRenderer.send('nav-forward'),
    navReload: () => ipcRenderer.send('nav-reload'),
    onURLUpdate: (callback) => ipcRenderer.on('update-address-bar', callback),
    navHome: () => ipcRenderer.send('nav-home'),
};
contextBridge.exposeInMainWorld("bridge", bridge);