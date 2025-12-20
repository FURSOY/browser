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

    // Download Events
    onDownloadStarted: (callback) => ipcRenderer.on('download-started', callback),
    onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback),
    onDownloadCompleted: (callback) => ipcRenderer.on('download-completed', callback),

    // IPC Send
    setDownloadsMenuState: (isOpen) => ipcRenderer.send('set-downloads-menu', isOpen),
    openDownload: (id) => ipcRenderer.send('open-download', id),

    // Downloads List Init
    onSetDownloads: (callback) => ipcRenderer.on('set-downloads', callback),

    // Loading Events
    onLoadingStart: (callback) => ipcRenderer.on('loading-start', callback),
    onLoadingStop: (callback) => ipcRenderer.on('loading-stop', callback),

    // Favicon
    onTabFaviconUpdated: (callback) => ipcRenderer.on('tab-favicon-updated', callback),

    // Favorites
    toggleFavorite: (url, title) => ipcRenderer.send('toggle-favorite', { url, title }),
    checkFavorite: (url) => ipcRenderer.invoke('check-favorite', url),
    getFavorites: () => ipcRenderer.invoke('get-favorites'),
    onFavoritesUpdated: (callback) => ipcRenderer.on('favorites-updated', callback),
    toggleBookmarksMenu: (data) => ipcRenderer.send('toggle-bookmarks-menu', data),
};

contextBridge.exposeInMainWorld("bridge", bridge);