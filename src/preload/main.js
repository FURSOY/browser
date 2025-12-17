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

    // Tab Management
    newTab: (url) => ipcRenderer.send('tab-new', url),
    switchTab: (id) => ipcRenderer.send('tab-switch', id),
    closeTab: (id) => ipcRenderer.send('tab-close', id),

    // Tab Events
    onTabCreated: (callback) => ipcRenderer.on('tab-created', callback),
    onTabRemoved: (callback) => ipcRenderer.on('tab-removed', callback),
    onTabUpdated: (callback) => ipcRenderer.on('tab-updated', callback),
    onActiveTabChanged: (callback) => ipcRenderer.on('tab-active-changed', callback),

    // Window Controls
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    onWindowMaximized: (callback) => ipcRenderer.on('window-is-maximized', callback),
    onWindowRestored: (callback) => ipcRenderer.on('window-is-restored', callback),
    onFullscreenToggle: (callback) => ipcRenderer.on('fullscreen-toggle', callback),
};

contextBridge.exposeInMainWorld("bridge", bridge);