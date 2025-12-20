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
    favorites = [];
    favoritesPath = path.join(app.getPath('userData'), 'favorites.json');
    downloadsView = null; // New BrowserView for Popup
    bookmarksView = null; // New BrowserView for Favorites Popup

    position = {
        width: 1200,
        height: 800,
        maximized: false,
    };

    constructor() {
        this.window = new BrowserWindow({
            width: this.position.width,
            height: this.position.height,
            minWidth: 800,
            minHeight: 600,
            title: "FURSOY Browser",
            icon: path.join(__dirname, "../../../assets/icon.ico"),
            show: false,
            frame: false,
            backgroundColor: '#202124',
            acceptFirstMouse: false,
            autoHideMenuBar: true,
            webPreferences: {
                contextIsolation: true,
                preload: path.join(__dirname, "../../preload/main.js"),
                // Performance optimizations
                backgroundThrottling: false,
                offscreen: false,
            },
        });

        // Set modern User-Agent globally for the main window content
        const modernUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        this.window.webContents.setUserAgent(modernUA);

        // Initialize Downloads View
        this.downloadsView = new BrowserView({
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                baseUserAppDataPath: app.getPath('userData'),
                preload: path.join(__dirname, '../../preload/downloads.js')
            }
        });
        this.downloadsView.webContents.loadURL(`file://${path.join(__dirname, '../../renderer/downloads/index.html')}`);
        this.downloadsView.setBackgroundColor('#202124');

        // Initialize Bookmarks View
        this.bookmarksView = new BrowserView({
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, '../../preload/bookmarks.js')
            }
        });
        this.bookmarksView.webContents.loadURL(`file://${path.join(__dirname, '../../renderer/bookmarks/index.html')}`);
        this.bookmarksView.setBackgroundColor('#202124');

        const mainPagePath = path.join(__dirname, '../../renderer/main/index.html');
        this.window.loadFile(mainPagePath);

        this.window.webContents.once('did-finish-load', () => {
            console.log('Main HTML yüklendi.');
            this.loadDownloads();
            this.loadFavorites();
            this.createTab();
            if (this._onLoadCallback) this._onLoadCallback();
        });

        this.window.once("ready-to-show", () => {
            this.window.show();
            if (this.position.maximized) this.window.maximize();
        });

        this.window.webContents.on('focus', () => {
            if (this.isDownloadsPopupOpen) this.toggleDownloadsView(false);
            if (this.isBookmarksPopupOpen) this.toggleBookmarksView(false);
        });

        this.window.on('resize', () => {
            if (this.activeTabId && this.tabs.has(this.activeTabId)) {
                const view = this.tabs.get(this.activeTabId).view;
                this.updateViewBounds(view);
            }
            if (this.isDownloadsPopupOpen) {
                this.updateDownloadsViewBounds();
            }
            if (this.isBookmarksPopupOpen) {
                this.updateBookmarksViewBounds();
            }
        });

        this.window.on('maximize', () => {
            if (this.activeTabId && this.tabs.has(this.activeTabId)) {
                const view = this.tabs.get(this.activeTabId).view;
                this.updateViewBounds(view);
            }
            this.window.webContents.send('window-is-maximized');
        });

        this.window.on('unmaximize', () => {
            if (this.activeTabId && this.tabs.has(this.activeTabId)) {
                const view = this.tabs.get(this.activeTabId).view;
                this.updateViewBounds(view);
            }
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

    isBookmarksPopupOpen = false;

    toggleBookmarksView(forceState = null, data = null) {
        const shouldOpen = forceState !== null ? forceState : !this.isBookmarksPopupOpen;

        if (shouldOpen) {
            // Close other popups
            this.toggleDownloadsView(false);

            this.window.addBrowserView(this.bookmarksView);
            this.updateBookmarksViewBounds();
            this.window.setTopBrowserView(this.bookmarksView);

            // Send current page data to fill input - wait a bit for popup to be ready
            if (data) {
                setTimeout(() => {
                    if (!this.bookmarksView.webContents.isDestroyed()) {
                        this.bookmarksView.webContents.send('set-bookmark-data', data);
                    }
                }, 100);
            }
            this.isBookmarksPopupOpen = true;
        } else {
            this.window.removeBrowserView(this.bookmarksView);
            this.isBookmarksPopupOpen = false;
        }
    }


    updateBookmarksViewBounds() {
        const { width } = this.window.getContentBounds();
        const popupWidth = 260;

        // Address bar is centered with max-width 800px
        const maxBarWidth = 800;
        const availableBarWidth = width - 400; // rough room for side buttons
        const actualBarWidth = Math.min(maxBarWidth, availableBarWidth > 0 ? availableBarWidth : 300);
        const barRight = Math.floor(width / 2) + Math.floor(actualBarWidth / 2);

        this.bookmarksView.setBounds({
            x: barRight - popupWidth + 10,
            y: 92,
            width: popupWidth,
            height: 160
        });
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

    // --- FAVORITES MANAGEMENT ---
    saveFavorites() { try { fs.writeFileSync(this.favoritesPath, JSON.stringify(this.favorites, null, 2)); } catch (e) { } }
    loadFavorites() {
        try {
            if (fs.existsSync(this.favoritesPath)) {
                const data = JSON.parse(fs.readFileSync(this.favoritesPath));
                if (Array.isArray(data)) {
                    // Migrate/Fix old entries: Ensure url exists and normalize
                    this.favorites = data.filter(f => f && (f.url || f.link)).map(f => {
                        return {
                            ...f,
                            url: f.url || f.link // Support old 'link' field if it existed
                        };
                    });
                }
            }
        } catch (e) { this.favorites = []; }
    }

    normalizeUrl(u) {
        if (!u) return '';
        try {
            let parsed = new URL(u);
            let normalized = parsed.origin + parsed.pathname;
            if (normalized.endsWith('/')) normalized = normalized.slice(0, -1);
            return normalized.toLowerCase();
        } catch (e) {
            let res = u.trim();
            if (res.endsWith('/')) res = res.slice(0, -1);
            return res.toLowerCase();
        }
    }

    async toggleFavorite(data) {
        const { url, title, remove } = data;
        if (!url) return;
        const normUrl = this.normalizeUrl(url);
        const index = this.favorites.findIndex(f => this.normalizeUrl(f.url) === normUrl);

        if (remove && index !== -1) {
            this.favorites.splice(index, 1);
        } else if (index !== -1) {
            // Update existing
            this.favorites[index].title = title;
        } else {
            // Add new with cached icon
            let iconUrl = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(url)}`;
            let cachedIcon = iconUrl;

            try {
                const res = await fetch(iconUrl);
                if (res.ok) {
                    const buffer = await res.arrayBuffer();
                    const contentType = res.headers.get('content-type');
                    cachedIcon = `data:${contentType};base64,${Buffer.from(buffer).toString('base64')}`;
                }
            } catch (e) { }

            this.favorites.push({ url, title, icon: cachedIcon });
        }
        this.saveFavorites();
        this.broadcastFavorites();
    }

    broadcastFavorites() {
        this.window.webContents.send('favorites-updated', this.favorites);
        this.tabs.forEach(tab => {
            if (!tab.view.webContents.isDestroyed()) {
                tab.view.webContents.send('favorites-updated', this.favorites);
            }
        });
    }

    createTab(urlToLoad) {
        const view = new BrowserView({
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                webSecurity: true,
                preload: path.join(__dirname, "../../preload/search.js"),
                backgroundThrottling: false,
            }
        });
        view.setBackgroundColor('#202124');
        // view.setAutoResize({ width: true, height: true }); // Manual resizing used instead for header offset precision

        const modernUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        view.webContents.setUserAgent(modernUA);

        const id = Date.now().toString();
        this.tabs.set(id, { view, id });

        this.window.addBrowserView(view);
        // Start hidden
        view.setBounds({ x: 0, y: 0, width: 0, height: 0 });

        view.webContents.on('focus', () => {
            if (this.isDownloadsPopupOpen) this.toggleDownloadsView(false);
        });

        const finalUrl = urlToLoad || `file://${path.join(__dirname, '../../renderer/home/index.html')}`;
        view.webContents.loadURL(finalUrl);
        this.attachViewListeners(view, id);
        this.window.webContents.send('tab-created', { id, title: 'New Tab' });
        this.switchTab(id);
    }

    switchTab(id) {
        if (!this.tabs.has(id)) return;

        const prevId = this.activeTabId;
        if (prevId && this.tabs.has(prevId)) {
            const pv = this.tabs.get(prevId).view;
            if (pv && !pv.webContents.isDestroyed()) {
                // Hide instead of remove
                pv.setBounds({ x: 0, y: 0, width: 0, height: 0 });
            }
        }

        this.activeTabId = id;
        const nv = this.tabs.get(id).view;

        // Ensure it's active and correctly placed
        this.updateViewBounds(nv);
        this.window.setTopBrowserView(nv); // Ensure it's on top of other tabs

        this.window.webContents.send('tab-active-changed', id);

        if (nv && !nv.webContents.isDestroyed()) {
            this.updateAddressBar(nv.webContents.getURL());

            if (nv.webContents.isLoading()) {
                this.window.webContents.send('loading-start');
            } else {
                this.window.webContents.send('loading-stop');
            }
        }

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
                    // Force logo update for home page tab favicon
                    const iconPath = `file://${path.join(__dirname, "../../../assets/icon.ico")}`;
                    this.window.webContents.send('tab-favicon-updated', { id, url: iconPath });
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

    updateViewBounds(view) {
        if (!view || !this.window || this.window.isDestroyed()) return;

        const { width, height } = this.window.getContentBounds();

        if (this.isHtmlFullScreen) {
            view.setBounds({ x: 0, y: 0, width, height });
        } else {
            // Fixed header calculation: tabs (48) + controls (54) = 102
            const headerHeight = 102;
            view.setBounds({
                x: 0,
                y: headerHeight,
                width: width,
                height: Math.max(0, height - headerHeight)
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

        ipcMain.on('toggle-favorite', (e, data) => this.toggleFavorite(data));
        ipcMain.handle('check-favorite', (e, url) => {
            const normUrl = this.normalizeUrl(url);
            return this.favorites.some(f => this.normalizeUrl(f.url) === normUrl);
        });
        ipcMain.handle('get-favorites', () => {
            return this.favorites;
        });

        ipcMain.on('navigate-to', (e, u) => {
            if (this.activeTabId && u) {
                this.tabs.get(this.activeTabId).view.webContents.loadURL(u);
            }
        });
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
            this.toggleDownloadsView(isOpen);
        });

        ipcMain.on('toggle-bookmarks-menu', (event, data) => {
            this.toggleBookmarksView(data.isOpen, data);
        });

        ipcMain.on('bookmark-save-request', (event, data) => {
            this.toggleFavorite(data);
            this.toggleBookmarksView(false);
        });

        ipcMain.on('bookmark-popup-close', () => {
            this.toggleBookmarksView(false);
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

        // Account Status Check
        ipcMain.handle('google-login-status', async () => {
            try {
                const session = this.window.webContents.session;
                const cookies = await session.cookies.get({ domain: '.google.com' });
                const isLogged = cookies.some(c => c.name === 'SID' || c.name === 'HSID');

                if (isLogged) {
                    // Modern User-Agent for the background check to avoid 'old' page detection
                    const modernUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

                    const profileData = await new Promise((resolve) => {
                        const tempView = new BrowserView({
                            webPreferences: {
                                offscreen: true,
                                contextIsolation: true,
                                // Use the same session as the main window
                                session: session
                            }
                        });

                        tempView.webContents.setUserAgent(modernUA);

                        const cleanup = () => {
                            if (!tempView.webContents.isDestroyed()) {
                                tempView.webContents.destroy();
                            }
                        };

                        const timeout = setTimeout(() => {
                            cleanup();
                            resolve({ name: 'Google Hesabı', photo: null });
                        }, 7000); // Slightly longer for stability

                        tempView.webContents.on('did-finish-load', async () => {
                            try {
                                // We wait a bit for dynamic content if necessary
                                const data = await tempView.webContents.executeJavaScript(`
                                    (() => {
                                        // Attempt to find profile picture and name in the new Google UI
                                        const imgEl = document.querySelector('img[src*="googleusercontent.com"], img[src*="google.com/avatar"]');
                                        const nameEl = document.querySelector('h1') || document.querySelector('[role="heading"]') || document.querySelector('.gb_A');
                                        
                                        return {
                                            name: nameEl ? nameEl.innerText.split('\\n')[0].trim() : 'Google Kullanıcısı',
                                            photo: imgEl ? imgEl.src : null
                                        };
                                    })()
                                `);
                                clearTimeout(timeout);
                                cleanup();
                                resolve(data);
                            } catch (e) {
                                clearTimeout(timeout);
                                cleanup();
                                resolve({ name: 'Google Hesabı', photo: null });
                            }
                        });

                        // Avoid triggering unnecessary error logs
                        tempView.webContents.on('did-fail-load', () => {
                            clearTimeout(timeout);
                            cleanup();
                            resolve({ name: 'Google Hesabı', photo: null });
                        });

                        tempView.webContents.loadURL('https://myaccount.google.com/?hl=tr');
                    });

                    return {
                        logged: true,
                        name: profileData.name,
                        email: 'Hesap Bağlı',
                        photo: profileData.photo
                    };
                }
                return { logged: false };
            } catch (e) {
                return { logged: false };
            }
        });
    }
}

module.exports = MainWindow;