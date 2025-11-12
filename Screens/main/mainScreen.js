// --- START OF FILE mainScreen.js ---

const { app, BrowserWindow, BrowserView, ipcMain, Notification } = require("electron");
const path = require("path");
const url = require('url');

class MainScreen {
    window;
    view;
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
            icon: path.join(__dirname, "../../assets/icon.ico"),
            show: false,
            acceptFirstMouse: false,
            autoHideMenuBar: true,
            webPreferences: {
                contextIsolation: true,
                preload: path.join(__dirname, "./mainPreload.js"),
            },
        });

        // --- Google Warm-up ---
        // Uygulama açılışında BrowserView'lerin daha hızlı yüklenmesi için Google'ı önceden yükle
        // Bu, kullanıcı ilk kez bir sayfayı ziyaret ettiğinde yaşanan gecikmeyi azaltır.
        const warmupView = new BrowserView();
        this.window.setBrowserView(warmupView); // Geçici olarak view'ı ayarla
        const { width, height } = this.window.getBounds();
        // Gizli bir alanda yükle
        warmupView.setBounds({ x: -width, y: -height, width, height });
        warmupView.webContents.loadURL('https://www.google.com').then(() => {
            console.log("Google warmup successful.");
            // Yükleme bittikten sonra view'ı kaldır ve yok et
            if (this.window && !this.window.isDestroyed()) {
                this.window.removeBrowserView(warmupView);
            }
            try {
                warmupView.destroy();
            } catch (e) {
                // Ignore if already destroyed
                console.warn("Warmup view already destroyed or unable to destroy:", e);
            }
        }).catch(err => {
            console.error("Google warmup failed:", err);
            // Hata durumunda da view'ı temizle
            if (this.window && !this.window.isDestroyed()) {
                this.window.removeBrowserView(warmupView);
            }
            try {
                warmupView.destroy();
            } catch (e) { /* ignore */ }
        });


        // Ana pencereye main.html'i yükle
        const mainPagePath = path.join(__dirname, './main.html');
        this.window.loadFile(mainPagePath);

        // main.html yüklendiğinde callback'i çağır
        this.window.webContents.once('did-finish-load', () => {
            console.log('Main HTML yüklendi ve tüm JavaScript dosyaları çalıştı.');
            this.setupBrowserView();

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

        // Pencere boyutu değiştiğinde BrowserView'i güncelle
        this.window.on('resize', () => {
            if (this.view) {
                this.updateViewBounds();
            }
        });

        this.handleMessages();

        // main.html yüklendiğinde versiyon bilgisini göndermek için
        this.window.webContents.on('did-finish-load', () => {
            this.window.webContents.send('set-version', app.getVersion());
        });
    }

    setupBrowserView() {
        // BrowserView oluştur
        this.view = new BrowserView({
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                webSecurity: true,
                preload: path.join(__dirname, "./searchPreload.js"),
            }
        });
        this.window.setBrowserView(this.view);

        // BrowserView'i kontrol çubuğunun altındaki alanı kaplayacak şekilde ayarla
        this.updateViewBounds();

        // BrowserView'e başlangıç sayfasını (search.html) yükle
        const searchPagePath = path.join(__dirname, './search.html');
        this.view.webContents.loadURL(`file://${searchPagePath}`);

        // BrowserView'de navigasyon olduğunda main'daki adres çubuğunu güncelle
        this.view.webContents.on('did-navigate', (event, navigatedUrl) => {
            let finalUrl = '';
            try {
                const searchFilePath = path.normalize(searchPagePath);
                if (navigatedUrl.startsWith('file://')) {
                    const navigatedPath = path.normalize(url.fileURLToPath(navigatedUrl));
                    if (navigatedPath !== searchFilePath) {
                        finalUrl = navigatedUrl;
                    } else {
                        finalUrl = ''; // Eğer search.html ise adres çubuğunu boş bırak
                    }
                } else {
                    finalUrl = navigatedUrl;
                }
            } catch (e) {
                console.error("URL parse error:", e);
                finalUrl = navigatedUrl;
            }
            this.window.webContents.send('update-address-bar', finalUrl);
        });

        this.view.webContents.on('did-navigate-in-page', (event, navigatedUrl) => {
            this.window.webContents.send('update-address-bar', navigatedUrl);
        });
    }

    async updateViewBounds() {
        if (!this.view || !this.window || !this.window.webContents) {
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
            this.view.setBounds({
                x: Math.floor(bounds.x),
                y: Math.floor(bounds.y),
                width: Math.floor(bounds.width),
                height: Math.floor(bounds.height)
            });
            console.log("BrowserView bounds updated:", bounds);
        } else {
            console.warn("webview-container-placeholder bulunamadı.");
            // Eğer placeholder bulunamazsa, varsayılan bir değer kullan
            const contentBounds = this.window.getContentBounds();
            this.view.setBounds({
                x: 0,
                y: 40, // Kontrol çubuğu yüksekliği varsayımı
                width: contentBounds.width,
                height: contentBounds.height - 40
            });
        }
    }

    onMainWindowLoad(callback) {
        this._onLoadCallback = callback;
    }

    // Windows Native Notification kullan
    sendNotification(message, autoHide = true) {
        console.log("Windows bildirimi gönderiliyor:", message);

        // Notification izni kontrolü
        if (Notification.isSupported()) {
            const notification = new Notification({
                title: 'FURSOY Browser',
                body: message,
                icon: path.join(__dirname, "../../assets/icon.ico"),
                silent: false,
                timeoutType: autoHide ? 'default' : 'never'
            });

            notification.show();

            notification.on('click', () => {
                // Bildirime tıklandığında pencereyi ön plana getir
                if (this.window) {
                    if (this.window.isMinimized()) this.window.restore();
                    this.window.focus();
                }
            });
        } else {
            console.warn("Bildirimler desteklenmiyor.");
        }
    }

    sendProgress(percent) {
        // main.html'e de ilerleme bilgisini gönderilebilir, ancak şu anlık sadece BrowserView'e gidiyor.
        // this.window.webContents.send('update-progress', percent);
        if (this.view && this.view.webContents) {
            this.view.webContents.send('update-progress', percent);
        }
    }

    sendVersion(version) {
        this.window.webContents.send('set-version', version);
        if (this.view && this.view.webContents) {
            this.view.webContents.send('set-version', version);
        }
    }

    // Güncelleme hazır olduğunda search.html'e bildirim gönderen metod
    sendUpdateReady() {
        if (this.view && this.view.webContents) {
            this.view.webContents.send('update-ready-to-install');
        }
    }

    close() {
        this.window.close();
        ipcMain.removeAllListeners();
    }

    hide() {
        this.window.hide();
    }

    handleMessages() {
        ipcMain.on('navigate-to', (event, url) => {
            if (this.view && this.view.webContents) {
                this.view.webContents.loadURL(url);
            }
        });

        ipcMain.on('nav-back', () => {
            if (this.view && this.view.webContents && this.view.webContents.canGoBack()) {
                this.view.webContents.goBack();
            }
        });

        ipcMain.on('nav-forward', () => {
            if (this.view && this.view.webContents && this.view.webContents.canGoForward()) {
                this.view.webContents.goForward();
            }
        });

        ipcMain.on('nav-reload', () => {
            if (this.view && this.view.webContents) {
                this.view.webContents.reload();
            }
        });

        ipcMain.on('nav-home', () => {
            const searchPagePath = path.join(__dirname, './search.html');
            if (this.view && this.view.webContents) {
                this.view.webContents.loadURL(`file://${searchPagePath}`);
            }
        });

        ipcMain.on('toggleDevTools', () => {
            if (this.view && this.view.webContents) {
                if (this.view.webContents.isDevToolsOpened()) {
                    this.view.webContents.closeDevTools();
                } else {
                    this.view.webContents.openDevTools({ mode: "detach" });
                }
            }
        });
    }
}

module.exports = MainScreen;