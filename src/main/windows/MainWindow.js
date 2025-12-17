const { app, BrowserWindow, BrowserView, ipcMain, Notification, shell } = require("electron");
const path = require("path");
const url = require('url');
const fs = require('fs');

class MainWindow {
    window;
    tabs = new Map(); // id -> { view, id }
    activeTabId = null;
    isHtmlFullScreen = false;
    // Removed isDownloadsOpen
    _onLoadCallback;
    downloads = [];
    downloadsPath = path.join(app.getPath('userData'), 'downloads.json');
    downloadsView = null; // New BrowserView for Popup

    position = {
        width: 1200,
        height: 800,
        maximized: false,
    };

    constructor() {
        this.window = new BrowserWindow({
            width: this.position.width,
            height: this.position.height,
            title: "FURSOY Browser",
            icon: path.join(__dirname, "../../../assets/icon.ico"),
            show: false,
            frame: false,
            backgroundColor: '#202124',
            acceptFirstMouse: false,
            autoHideMenuBar: true,
            webPreferences: {
                contextIsolation: true,
                preload: path.join(__dirname, "../../preload/main.js"), // Shared preload is fine
            },
        });

        // Initialize Downloads View
        this.downloadsView = new BrowserView({
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                baseUserAppDataPath: app.getPath('userData'), // Sanity check
                preload: path.join(__dirname, '../../preload/downloads.js')
            }
        });
        this.downloadsView.webContents.loadURL(`file://${path.join(__dirname, '../../renderer/downloads/index.html')}`);
        this.downloadsView.setBackgroundColor('#202124');

        // ... existing constructor ...
        const mainPagePath = path.join(__dirname, '../../renderer/main/index.html');
        this.window.loadFile(mainPagePath);

        this.window.webContents.once('did-finish-load', () => {
            console.log('Main HTML yüklendi.');
            this.loadDownloads();
            this.createTab();
            if (this._onLoadCallback) this._onLoadCallback();
        });

        // ... existing listeners ...
        this.window.once("ready-to-show", () => {
            this.window.show();
            if (this.position.maximized) this.window.maximize();
        });

        // Close downloads if clicks happen on the main chrome (tabs, url bar)
        this.window.webContents.on('focus', () => {
            if (this.isDownloadsPopupOpen) this.toggleDownloadsView(false);
        });

        this.window.on('resize', () => {
            if (this.activeTabId) {
                const view = this.tabs.get(this.activeTabId).view;
                if (this.isHtmlFullScreen) {
                    const { width, height } = this.window.getContentBounds();
                    view.setBounds({ x: 0, y: 0, width, height });
                } else {
                    this.updateViewBounds(view);
                }
            }
            // Reposition downloads if open
            if (this.isDownloadsPopupOpen) {
                this.updateDownloadsViewBounds();
            }
        });

        // ... (max/unmax listeners)
        this.window.on('maximize', () => {
            this.window.webContents.send('window-is-maximized');
        });

        this.window.on('unmaximize', () => {
            this.window.webContents.send('window-is-restored');
        });

        this.setupDownloadManager();
        this.handleMessages();

        // Close downloads on focus loss (click on main or tab)
        // We can attach a listener to window blur, but clicking active tab is 'focus' on tab
        // logic handled in switchTab or generic focus listener? 
        // Simple hack: listen to 'focus' on all tab views.
    }

    isDownloadsPopupOpen = false;

    toggleDownloadsView(forceState = null) {
        const shouldOpen = forceState !== null ? forceState : !this.isDownloadsPopupOpen;

        if (shouldOpen) {
            this.window.addBrowserView(this.downloadsView);
            this.updateDownloadsViewBounds();
            this.window.setTopBrowserView(this.downloadsView);

            // Validate downloads: Remove completed ones that don't exist anymore
            this.downloads = this.downloads.filter(d => {
                if (d.status === 'completed') {
                    return fs.existsSync(d.path);
                }
                return true; // Keep active or failed ones in memory
            });
            this.saveDownloads();

            // Send current list
            this.downloadsView.webContents.send('set-downloads', this.downloads);
            this.isDownloadsPopupOpen = true;
        } else {
            this.window.removeBrowserView(this.downloadsView);
            this.isDownloadsPopupOpen = false;
        }
    }

    updateDownloadsViewBounds() {
        const { width } = this.window.getContentBounds();
        // Top right, below header (moved down to 90px as requested)
        this.downloadsView.setBounds({
            x: width - 340,
            y: 105,
            width: 320,
            height: 450
        });
    }

    setupDownloadManager() {
        // Store active download items for pause/resume/cancel
        this.activeDownloads = new Map();
        this.window.webContents.session.on('will-download', (event, item, webContents) => {
            const id = Date.now().toString();
            const filename = item.getFilename();

            // Find available filename (add (1), (2) etc. if file exists)
            const downloadsPath = app.getPath('downloads');
            let finalPath = path.join(downloadsPath, filename);
            let counter = 1;

            const ext = path.extname(filename);
            const nameWithoutExt = path.basename(filename, ext);

            while (fs.existsSync(finalPath)) {
                const newName = `${nameWithoutExt} (${counter})${ext}`;
                finalPath = path.join(downloadsPath, newName);
                counter++;
            }

            // Add .fursoydw extension for temp file
            const tempPath = finalPath + '.fursoydw';
            item.setSavePath(tempPath);

            const actualFilename = path.basename(finalPath);
            const downloadItem = { id, filename: actualFilename, path: finalPath, status: 'progressing', total: item.getTotalBytes(), downloaded: 0 };

            // Store item reference for control
            this.activeDownloads.set(id, item);

            // Add to memory immediately
            this.updateOrAddDownload(downloadItem, false);

            // Open popup automatically
            if (!this.isDownloadsPopupOpen) this.toggleDownloadsView(true);

            // Send to Downloads View
            this.downloadsView.webContents.send('download-started', { id, filename, canResume: item.canResume() });

            let lastTime = Date.now();
            let lastBytes = 0;

            let lastSpeedStr = '';

            item.on('updated', (event, state) => {
                // Always update total in case it wasn't known initially
                downloadItem.total = item.getTotalBytes();

                if (state === 'progressing' && !item.isPaused()) {
                    const receivedBytes = item.getReceivedBytes();
                    downloadItem.downloaded = receivedBytes;

                    const progress = downloadItem.total > 0 ? (receivedBytes / downloadItem.total) * 100 : 0;
                    downloadItem.progress = progress;

                    // Speed calc
                    const now = Date.now();
                    const duration = (now - lastTime) / 1000;

                    if (duration >= 1) {
                        const speed = (receivedBytes - lastBytes) / duration;
                        // Format speed
                        if (speed < 1024) lastSpeedStr = speed.toFixed(0) + ' B/s';
                        else if (speed < 1024 * 1024) lastSpeedStr = (speed / 1024).toFixed(1) + ' KB/s';
                        else lastSpeedStr = (speed / 1024 / 1024).toFixed(1) + ' MB/s';

                        lastTime = now;
                        lastBytes = receivedBytes;
                    }
                    downloadItem.speed = lastSpeedStr;

                    this.updateOrAddDownload(downloadItem, false);
                    this.downloadsView.webContents.send('download-progress', { id, progress, downloaded: receivedBytes, total: downloadItem.total, speed: lastSpeedStr });
                }
            });

            item.on('done', (event, state) => {
                // Remove from active downloads
                this.activeDownloads.delete(id);

                if (state === 'completed') {
                    // Get temp path with .fursoydw
                    const tempPath = item.getSavePath();

                    // Remove .fursoydw extension to get final path
                    // downloadItem.path already has the final path without .fursoydw
                    const finalPath = downloadItem.path;

                    // Rename from temp to final
                    try {
                        if (fs.existsSync(tempPath)) {
                            fs.renameSync(tempPath, finalPath);
                        }
                    } catch (e) {
                        console.error("Failed to rename temp file", e);
                    }

                    // Get actual file size from disk
                    try {
                        if (fs.existsSync(finalPath)) {
                            const stats = fs.statSync(finalPath);
                            downloadItem.total = stats.size;
                            downloadItem.downloaded = stats.size;
                        }
                    } catch (e) {
                        console.error("Failed to get file size", e);
                        if (downloadItem.total === 0) {
                            downloadItem.total = downloadItem.downloaded || 0;
                        }
                    }

                    downloadItem.status = 'completed';
                    downloadItem.progress = 100;
                    this.downloadsView.webContents.send('download-completed', downloadItem);
                    this.updateOrAddDownload(downloadItem, true);
                } else {
                    downloadItem.status = 'failed';
                    this.downloadsView.webContents.send('download-failed', { id, state });
                    this.updateOrAddDownload(downloadItem, false);

                    // Cleanup temp file
                    const tempPath = item.getSavePath();
                    try {
                        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                    } catch (e) { }
                }
            });
        });
    }

    pauseDownload(id) {
        const item = this.activeDownloads.get(id);
        if (item && !item.isPaused()) {
            item.pause();
            const downloadItem = this.downloads.find(d => d.id === id);
            if (downloadItem) {
                downloadItem.paused = true;
                this.updateOrAddDownload(downloadItem, false);
            }
            this.downloadsView.webContents.send('download-paused', { id });
        }
    }

    resumeDownload(id) {
        const item = this.activeDownloads.get(id);
        if (item && item.isPaused() && item.canResume()) {
            item.resume();
            const downloadItem = this.downloads.find(d => d.id === id);
            if (downloadItem) {
                downloadItem.paused = false;
                this.updateOrAddDownload(downloadItem, false);
            }
            this.downloadsView.webContents.send('download-resumed', { id });
        }
    }

    cancelDownload(id) {
        const item = this.activeDownloads.get(id);
        if (item) {
            item.cancel();
            this.activeDownloads.delete(id);
            // Remove from downloads list
            this.downloads = this.downloads.filter(d => d.id !== id);
            this.saveDownloads();
            this.downloadsView.webContents.send('download-cancelled', { id });
        }
    }

    deleteDownload(id) {
        const downloadItem = this.downloads.find(d => d.id === id);
        if (downloadItem && downloadItem.status === 'completed') {
            // Delete file from disk
            try {
                if (fs.existsSync(downloadItem.path)) {
                    fs.unlinkSync(downloadItem.path);
                }
            } catch (e) {
                console.error("Failed to delete file", e);
            }
            // Remove from list
            this.downloads = this.downloads.filter(d => d.id !== id);
            this.saveDownloads();
            this.downloadsView.webContents.send('download-deleted', { id });
        }
    }

    showInFolder(id) {
        const downloadItem = this.downloads.find(d => d.id === id);
        if (downloadItem && fs.existsSync(downloadItem.path)) {
            shell.showItemInFolder(downloadItem.path);
        }
    }

    updateOrAddDownload(item, saveToDisk = true) {
        const index = this.downloads.findIndex(d => d.id === item.id);
        if (index !== -1) {
            this.downloads[index] = item;
        } else {
            this.downloads.unshift(item);
        }
        if (this.downloads.length > 20) this.downloads = this.downloads.slice(0, 20);

        if (saveToDisk) this.saveDownloads();
    }
    saveDownloads() { try { fs.writeFileSync(this.downloadsPath, JSON.stringify(this.downloads, null, 2)); } catch (e) { } }
    loadDownloads() {
        try {
            if (fs.existsSync(this.downloadsPath)) {
                this.downloads = JSON.parse(fs.readFileSync(this.downloadsPath));
                this.downloads = this.downloads.filter(d => d.status === 'completed' ? fs.existsSync(d.path) : false);
            }
        } catch (e) { this.downloads = []; }
    }
    openDownload(id) {
        const item = this.downloads.find(d => d.id === id);
        if (item && fs.existsSync(item.path)) shell.openPath(item.path);
        else {
            this.downloads = this.downloads.filter(d => d.id !== id);
            this.saveDownloads();
            this.downloadsView.webContents.send('set-downloads', this.downloads);
        }
    }

    createTab(urlToLoad) {
        const view = new BrowserView({
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                webSecurity: true,
                preload: path.join(__dirname, "../../preload/search.js"),
            }
        });
        view.setBackgroundColor('#202124');
        const id = Date.now().toString();
        this.tabs.set(id, { view, id });

        view.webContents.on('focus', () => {
            // If user clicks a tab, close downloads
            if (this.isDownloadsPopupOpen) this.toggleDownloadsView(false);
        });

        // ... existing loading logic ...
        const finalUrl = urlToLoad || `file://${path.join(__dirname, '../../renderer/home/index.html')}`;
        view.webContents.loadURL(finalUrl);
        this.attachViewListeners(view, id);
        this.window.webContents.send('tab-created', { id, title: 'New Tab' });
        this.switchTab(id);
    }

    // ... SwitchTab needs to check overlap? 
    switchTab(id) {
        // ... standard logic ...
        if (!this.tabs.has(id)) return;
        const prevId = this.activeTabId;
        if (prevId) {
            const pv = this.tabs.get(prevId).view;
            if (pv && !pv.webContents.isDestroyed()) this.window.removeBrowserView(pv); // Standard remove
        }
        this.activeTabId = id;
        const nv = this.tabs.get(id).view;
        this.window.addBrowserView(nv); // Use add instead of set to stack
        this.updateViewBounds(nv);
        this.window.webContents.send('tab-active-changed', id);
        // ... (address bar update)
        if (nv && !nv.webContents.isDestroyed()) {
            this.updateAddressBar(nv.webContents.getURL());

            // Sync loading state
            if (nv.webContents.isLoading()) {
                this.window.webContents.send('loading-start');
            } else {
                this.window.webContents.send('loading-stop');
            }
        }

        // Ensure downloads is on top if open
        if (this.isDownloadsPopupOpen) {
            this.window.setTopBrowserView(this.downloadsView);
        }
    }

    closeTab(id) {
        if (!this.tabs.has(id)) return;

        const tab = this.tabs.get(id);
        const view = tab.view;

        // If closing active tab, switch to another one first if possible
        if (this.activeTabId === id) {
            const iterator = this.tabs.keys();
            let nextId = null;
            for (const key of iterator) {
                if (key !== id) {
                    nextId = key;
                    break; // Just pick the first available one for simplicity
                }
            }

            if (nextId) {
                this.switchTab(nextId);
            } else {
                // Last tab being closed, create a new one
                this.createTab();
                // Then continue to close the current one as the function proceeds
            }
        }

        // Cleanup
        if (view && !view.webContents.isDestroyed()) {
            // this.window.removeBrowserView(view); // Already handled in switchTab logic if active
            view.webContents.destroy();
        }
        this.tabs.delete(id);
        this.window.webContents.send('tab-removed', id);
    }

    attachViewListeners(view, id) {
        // 1. Handle "Open in New Tab" (target="_blank" links)
        view.webContents.setWindowOpenHandler((details) => {
            this.createTab(details.url);
            return { action: 'deny' };
        });

        // 2. Handle HTML Fullscreen (e.g. YouTube videos)
        view.webContents.on('enter-html-full-screen', () => {
            this.isHtmlFullScreen = true;
            this.window.webContents.send('fullscreen-toggle', true);

            // Adding a small delay to ensure UI toggle and layout shift completes
            setTimeout(() => {
                const { width, height } = this.window.getContentBounds();
                view.setBounds({ x: 0, y: 0, width, height });
            }, 100);
        });

        view.webContents.on('leave-html-full-screen', () => {
            this.isHtmlFullScreen = false;
            this.window.webContents.send('fullscreen-toggle', false);
            this.updateViewBounds(view);
        });

        view.webContents.on('did-navigate', (event, url) => {
            if (this.activeTabId === id) {
                this.updateAddressBar(url);
            }
        });

        view.webContents.on('did-navigate-in-page', (event, url) => {
            if (this.activeTabId === id) {
                this.updateAddressBar(url);
            }
        });

        view.webContents.on('page-title-updated', (event, title) => {
            this.window.webContents.send('tab-updated', { id, title });
        });

        // Version info logic (legacy support for search.html)
        view.webContents.on('did-finish-load', () => {
            const currentURL = view.webContents.getURL();
            if (currentURL.startsWith('file://')) {
                const searchPagePath = path.join(__dirname, '../../renderer/home/index.html');
                const currentPath = url.fileURLToPath(currentURL);
                const searchPath = path.resolve(searchPagePath);

                if (path.normalize(currentPath) === path.normalize(searchPath)) {
                    this.sendVersion(app.getVersion(), view);
                }
            }
        });

        // Loading Events
        view.webContents.on('did-start-loading', () => {
            if (this.activeTabId === id) {
                this.window.webContents.send('loading-start');
            }
        });

        view.webContents.on('did-stop-loading', () => {
            if (this.activeTabId === id) {
                this.window.webContents.send('loading-stop');
            }
        });

        // Favicon
        view.webContents.on('page-favicon-updated', (event, favicons) => {
            if (favicons && favicons.length > 0) {
                this.window.webContents.send('tab-favicon-updated', { id, url: favicons[0] });
            }
        });
    }

    updateAddressBar(currentUrl) {
        const searchPagePath = path.join(__dirname, '../../renderer/home/index.html');
        // Check if we are on the home page
        try {
            const currentPath = url.fileURLToPath(currentUrl);
            const searchPath = path.resolve(searchPagePath);
            if (path.normalize(currentPath) === path.normalize(searchPath)) {
                this.window.webContents.send('update-address-bar', '');
                return;
            }
        } catch (e) { }

        this.window.webContents.send('update-address-bar', currentUrl);
    }

    async updateViewBounds(view) {
        if (!view || !this.window || !this.window.webContents || this.window.isDestroyed()) {
            return;
        }

        const bounds = await this.window.webContents.executeJavaScript(`
                (function() {
                    const placeholder = document.getElementById('webview-container-placeholder');
                    if (placeholder) {
                        const rect = placeholder.getBoundingClientRect();
                        return {
                            x: rect.left,
                            y: rect.top,
                            width: rect.width,
                            height: rect.height
                        };
                    }
                    return null;
                })();
            `);

        if (bounds) {
            view.setBounds({
                x: Math.floor(bounds.x),
                y: Math.floor(bounds.y),
                width: Math.floor(bounds.width),
                height: Math.floor(bounds.height)
            });
        }
    }

    onMainWindowLoad(callback) {
        this._onLoadCallback = callback;
    }

    // Windows Native Notification kullan
    sendNotification(message, autoHide = true) {
        if (Notification.isSupported()) {
            const notification = new Notification({
                title: 'FURSOY Browser',
                body: message,
                icon: path.join(__dirname, "../../../assets/icon.ico"),
                silent: false,
                timeoutType: autoHide ? 'default' : 'never'
            });
            notification.show();
        }
    }

    sendProgress(percent) {
        // Send to active tab's view
        if (this.activeTabId) {
            const view = this.tabs.get(this.activeTabId).view;
            if (view && !view.webContents.isDestroyed()) {
                view.webContents.send('update-progress', percent);
            }
        }
    }

    sendVersion(version, targetView = null) {
        // Send to main window
        if (this.window && !this.window.isDestroyed()) {
            this.window.webContents.send('set-version', version);
        }

        // Send to specific view or active view
        const viewToSend = targetView || (this.activeTabId ? this.tabs.get(this.activeTabId).view : null);
        if (viewToSend && !viewToSend.webContents.isDestroyed()) {
            viewToSend.webContents.send('set-version', version);
        }
    }

    sendUpdateReady() {
        if (this.activeTabId) {
            const view = this.tabs.get(this.activeTabId).view;
            if (view && !view.webContents.isDestroyed()) {
                view.webContents.send('update-ready-to-install');
            }
        }
    }

    close() {
        if (this.window && !this.window.isDestroyed()) {
            this.window.close();
        }
        ipcMain.removeAllListeners();
    }

    hide() {
        if (this.window && !this.window.isDestroyed()) {
            this.window.hide();
        }
    }

    // HandleMessages update
    handleMessages() {
        // ... standard tabs/nav ...
        ipcMain.on('tab-new', (e, u) => this.createTab(u));
        ipcMain.on('tab-switch', (e, i) => this.switchTab(i));
        ipcMain.on('tab-close', (e, i) => this.closeTab(i));
        ipcMain.on('navigate-to', (e, u) => { if (this.activeTabId) this.tabs.get(this.activeTabId).view.webContents.loadURL(u); });
        ipcMain.on('nav-back', () => { if (this.activeTabId) { const v = this.tabs.get(this.activeTabId).view; if (v.webContents.canGoBack()) v.webContents.goBack(); } });
        ipcMain.on('nav-forward', () => { if (this.activeTabId) { const v = this.tabs.get(this.activeTabId).view; if (v.webContents.canGoForward()) v.webContents.goForward(); } });
        ipcMain.on('nav-reload', () => { if (this.activeTabId) this.tabs.get(this.activeTabId).view.webContents.reload(); });
        ipcMain.on('nav-home', () => {
            if (this.activeTabId) {
                const v = this.tabs.get(this.activeTabId).view;
                v.webContents.loadURL(`file://${path.join(__dirname, '../../renderer/home/index.html')}`);
            }
        });
        ipcMain.on('toggleDevTools', () => {
            if (this.activeTabId) {
                const v = this.tabs.get(this.activeTabId).view;
                v.webContents.isDevToolsOpened() ? v.webContents.closeDevTools() : v.webContents.openDevTools({ mode: "detach" });
            }
        });
        ipcMain.on('window-minimize', () => this.window.minimize());
        ipcMain.on('window-maximize', () => this.window.isMaximized() ? this.window.unmaximize() : this.window.maximize());
        ipcMain.on('window-close', () => this.window.close());

        // Downloads Toggle (Updated)
        // IPC from renderer button
        ipcMain.on('set-downloads-menu', (event, isOpen) => {
            // renderer sends true/false based on its toggle logic? 
            // Actually, renderer button just clicks. We can control state here mostly.
            // If we rely on renderer to say 'open', we treat it as toggle request.
            // But simpler: Renderer sends 'toggle-downloads'.
            // Renderer code is: window.bridge.setDownloadsMenuState(isActive).
            // Let's interpret 'isActive' as desired state.
            this.toggleDownloadsView(isOpen);
        });

        ipcMain.on('open-download', (event, id) => {
            this.openDownload(id);
        });

        ipcMain.on('pause-download', (event, id) => {
            this.pauseDownload(id);
        });

        ipcMain.on('resume-download', (event, id) => {
            this.resumeDownload(id);
        });

        ipcMain.on('cancel-download', (event, id) => {
            this.cancelDownload(id);
        });

        ipcMain.on('delete-download', (event, id) => {
            this.deleteDownload(id);
        });

        ipcMain.on('show-in-folder', (event, id) => {
            this.showInFolder(id);
        });

        ipcMain.on('clear-downloads', () => {
            this.downloads = [];
            this.saveDownloads();
            if (this.downloadsView && !this.downloadsView.webContents.isDestroyed()) {
                this.downloadsView.webContents.send('set-downloads', []);
            }
        });
    }
}

module.exports = MainWindow;