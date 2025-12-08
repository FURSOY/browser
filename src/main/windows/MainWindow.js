// --- START OF FILE mainScreen.js ---

const { app, BrowserWindow, BrowserView, ipcMain, Notification } = require("electron");
const path = require("path");
const url = require('url');

class MainWindow {
    window;
    tabs = new Map(); // id -> { view, id }
    activeTabId = null;
    _onLoadCallback;

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
            acceptFirstMouse: false,
            autoHideMenuBar: true,
            webPreferences: {
                contextIsolation: true,
                preload: path.join(__dirname, "../../preload/main.js"),
            },
        });

        // Ana pencereye main.html'i yükle
        const mainPagePath = path.join(__dirname, '../../renderer/main/index.html');
        this.window.loadFile(mainPagePath);

        // main.html yüklendiğinde callback'i çağır
        this.window.webContents.once('did-finish-load', () => {
            console.log('Main HTML yüklendi ve tüm JavaScript dosyaları çalıştı.');
            this.createTab(); // Start with one tab

            if (this._onLoadCallback) {
                this._onLoadCallback();
            }
        });

        this.window.once("ready-to-show", () => {
            this.window.show();
            if (this.position.maximized) {
                this.window.maximize();
            }
        });

        // Pencere boyutu değiştiğinde Aktif BrowserView'i güncelle
        this.window.on('resize', () => {
            if (this.activeTabId) {
                this.updateViewBounds(this.tabs.get(this.activeTabId).view);
            }
        });

        this.handleMessages();
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

        const id = Date.now().toString();
        this.tabs.set(id, { view, id });

        // Default or specific URL
        const searchPagePath = path.join(__dirname, '../../renderer/home/index.html');
        const finalUrl = urlToLoad || `file://${searchPagePath}`;

        view.webContents.loadURL(finalUrl);

        // Attach listeners
        this.attachViewListeners(view, id);

        // Inform renderer about new tab
        this.window.webContents.send('tab-created', { id, title: 'New Tab' });

        this.switchTab(id);
    }

    switchTab(id) {
        if (!this.tabs.has(id)) return;

        const prevTabId = this.activeTabId;
        if (prevTabId) {
            const prevView = this.tabs.get(prevTabId).view;
            if (prevView && !prevView.webContents.isDestroyed()) {
                this.window.removeBrowserView(prevView);
            }
        }

        this.activeTabId = id;
        const newView = this.tabs.get(id).view;

        this.window.setBrowserView(newView);
        this.updateViewBounds(newView);

        // Notify Renderer active tab changed
        this.window.webContents.send('tab-active-changed', id);

        // Update address bar for the new active tab
        if (newView && !newView.webContents.isDestroyed()) {
            const currentURL = newView.webContents.getURL();
            this.updateAddressBar(currentURL);
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

    handleMessages() {
        // Tab Management
        ipcMain.on('tab-new', (event, url) => {
            this.createTab(url);
        });

        ipcMain.on('tab-switch', (event, id) => {
            this.switchTab(id);
        });

        ipcMain.on('tab-close', (event, id) => {
            this.closeTab(id);
        });

        // Navigation for ACTIVE tab
        ipcMain.on('navigate-to', (event, url) => {
            if (this.activeTabId) {
                const view = this.tabs.get(this.activeTabId).view;
                view.webContents.loadURL(url);
            }
        });

        ipcMain.on('nav-back', () => {
            if (this.activeTabId) {
                const view = this.tabs.get(this.activeTabId).view;
                if (view.webContents.canGoBack()) view.webContents.goBack();
            }
        });

        ipcMain.on('nav-forward', () => {
            if (this.activeTabId) {
                const view = this.tabs.get(this.activeTabId).view;
                if (view.webContents.canGoForward()) view.webContents.goForward();
            }
        });

        ipcMain.on('nav-reload', () => {
            if (this.activeTabId) {
                const view = this.tabs.get(this.activeTabId).view;
                view.webContents.reload();
            }
        });

        ipcMain.on('nav-home', () => {
            if (this.activeTabId) {
                const view = this.tabs.get(this.activeTabId).view;
                const searchPagePath = path.join(__dirname, '../../renderer/home/index.html');
                view.webContents.loadURL(`file://${searchPagePath}`);
            }
        });

        ipcMain.on('toggleDevTools', () => {
            if (this.activeTabId) {
                const view = this.tabs.get(this.activeTabId).view;
                if (view.webContents.isDevToolsOpened()) {
                    view.webContents.closeDevTools();
                } else {
                    view.webContents.openDevTools({ mode: "detach" });
                }
            }
        });
    }
}

module.exports = MainWindow;