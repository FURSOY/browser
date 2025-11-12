// --- START OF FILE mainScreen.js ---

const { app, BrowserWindow, BrowserView, ipcMain } = require("electron");
const path = require("path");
const url = require('url');

// Artık bu sabiti kullanmıyoruz, çünkü alanı HTML'deki yer tutucudan alacağız.
// const CONTROLS_HEIGHT = 40; // Tarayıcı kontrol çubuğunun yüksekliği

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
        // Warm-up view'in main window'dan önce oluşturulması gerekiyor
        const warmupView = new BrowserView();
        warmupView.webContents.loadURL('https://www.google.com');
        warmupView.webContents.on('did-finish-load', () => {
            try {
                warmupView.destroy();
            } catch (e) {
                // Ignore if already destroyed
            }
        });

        // Ana pencereye main.html'i yükle (Kontroller ve Bildirimler için)
        const mainPagePath = path.join(__dirname, './main.html');
        this.window.loadFile(mainPagePath);

        // main.html yüklendiğinde callback'i çağır
        this.window.webContents.once('did-finish-load', () => {
            console.log('Main HTML yüklendi ve tüm JavaScript dosyaları çalıştı.');
            // BrowserView'i ana HTML yüklendikten sonra oluştur ve konumlandır
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
            // Eğer view henüz oluşturulmadıysa hata vermemek için kontrol
            if (this.view) {
                this.updateViewBounds();
            }
        });

        this.handleMessages();

        // SADECE ANA PENCERE (main.html) için DevTools aç
        this.window.webContents.openDevTools({ mode: "detach" });
        console.log("Ana pencere (main.html) DevTools açıldı");

        // main.html yüklendiğinde versiyon bilgisini göndermek için
        this.window.webContents.on('did-finish-load', () => {
            this.window.webContents.send('set-version', app.getVersion());
        });
    }

    setupBrowserView() {
        // BrowserView oluştur (Tarayıcının asıl içeriği için)
        this.view = new BrowserView({
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                webSecurity: true,
                preload: path.join(__dirname, "./searchPreload.js"), // Search için preload
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
                // Eğer BrowserView search.html'e geri döndüyse adres çubuğunu boş bırak
                if (navigatedUrl.startsWith('file://')) {
                    const navigatedPath = path.normalize(url.fileURLToPath(navigatedUrl));
                    if (navigatedPath !== searchFilePath) {
                        finalUrl = navigatedUrl;
                    } else {
                        finalUrl = ''; // search.html ise boş bırak
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
            // did-navigate-in-page olayında da adres çubuğunu güncelle
            this.window.webContents.send('update-address-bar', navigatedUrl);
        });
    }

    // BrowserView boyutlarını güncelle (HTML içindeki yer tutucuya göre)
    async updateViewBounds() {
        if (!this.view || !this.window || !this.window.webContents) {
            return;
        }

        // main.html içindeki #webview-container-placeholder elementinin boyutlarını ve konumunu al
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
            // Tarayıcı görünümünü bu boyutlara ayarla
            this.view.setBounds({
                x: Math.floor(bounds.x),
                y: Math.floor(bounds.y),
                width: Math.floor(bounds.width),
                height: Math.floor(bounds.height)
            });
            console.log("BrowserView bounds updated:", bounds);
        } else {
            console.warn("webview-container-placeholder bulunamadı veya boyutları alınamadı.");
            // Bir fallback olarak varsayılan bir boyut belirleyebiliriz
            const contentBounds = this.window.getContentBounds();
            this.view.setBounds({
                x: 0,
                y: 40, // Varsayılan kontrol çubuğu yüksekliği
                width: contentBounds.width,
                height: contentBounds.height - 40
            });
        }
    }

    onMainWindowLoad(callback) {
        this._onLoadCallback = callback;
    }

    sendNotification(message, autoHide = true) {
        // Bildirimleri main.html'in webContents'ine gönder
        console.log("Bildirim gönderiliyor:", message);
        this.window.webContents.send("show-notification", { message, autoHide });
    }

    sendProgress(percent) {
        // İlerlemeyi hem main.html hem de BrowserView'e gönder
        this.window.webContents.send('update-progress', percent);
        this.view.webContents.send('update-progress', percent);
    }

    sendVersion(version) {
        // Versiyonu hem main.html hem de BrowserView'e gönder
        this.window.webContents.send('set-version', version);
        this.view.webContents.send('set-version', version);
    }

    close() {
        this.window.close();
        ipcMain.removeAllListeners();
    }

    hide() {
        this.window.hide();
    }

    handleMessages() {
        // Navigasyon mesajlarını BrowserView üzerinde işle
        ipcMain.on('navigate-to', (event, url) => {
            this.view.webContents.loadURL(url);
        });

        ipcMain.on('nav-back', () => {
            if (this.view.webContents.canGoBack()) {
                this.view.webContents.goBack();
            }
        });

        ipcMain.on('nav-forward', () => {
            if (this.view.webContents.canGoForward()) {
                this.view.webContents.goForward();
            }
        });

        ipcMain.on('nav-reload', () => {
            this.view.webContents.reload();
        });

        ipcMain.on('nav-home', () => {
            const searchPagePath = path.join(__dirname, './search.html');
            this.view.webContents.loadURL(`file://${searchPagePath}`);
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
// --- END OF FILE mainScreen.js ---