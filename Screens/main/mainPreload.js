const { contextBridge, ipcRenderer } = require("electron");

let bridge = {
    onShowNotification: (callback) => ipcRenderer.on("show-notification", callback),
    onUpdateProgress: (callback) => ipcRenderer.on("update-progress", callback), // Hala burada kalacak, çünkü hem main hem search kullanabilir
    onSetVersion: (callback) => ipcRenderer.on('set-version', callback),

    navigateTo: (url) => ipcRenderer.send('navigate-to', url),
    navBack: () => ipcRenderer.send('nav-back'),
    navForward: () => ipcRenderer.send('nav-forward'),
    navReload: () => ipcRenderer.send('nav-reload'),
    onURLUpdate: (callback) => ipcRenderer.on('update-address-bar', callback),
    navHome: () => ipcRenderer.send('nav-home'),
};
contextBridge.exposeInMainWorld("bridge", bridge);