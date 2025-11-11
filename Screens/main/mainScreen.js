// --- START OF FILE mainScreen.js ---

const { app, BrowserWindow, BrowserView, ipcMain } = require("electron");
const path = require("path");
const url = require('url');

const CONTROLS_HEIGHT = 40; // Tarayıcı kontrol çubuğunun yüksekliği

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
            // removeMenu: true, // Menü kaldırılması daha iyi bir kullanıcı deneyimi sunar
            acceptFirstMouse: false,
            autoHideMenuBar: true,
            webPreferences: {
                contextIsolation: true,
                // manager.html için preload script
                preload: path.join(__dirname, "./mainPreload.js"),
            },
        });

        // --- Google Warm-up --- (Performans için iyi bir fikir)
        const warmupView = new BrowserView();
        warmupView.webContents.loadURL('https://www.google.com');
        warmupView.webContents.on('did-finish-load', () => {
            try {
                warmupView.destroy();
            } catch (e) {
                // Ignore if already destroyed
            }
        });

        // BrowserView oluştur (Tarayıcının asıl içeriği için)
        this.view = new BrowserView({
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                webSecurity: true,
            }
        });
        this.window.setBrowserView(this.view);

        // Ana pencereye manager.html'i yükle (Kontroller ve Bildirimler için)
        const managerPagePath = path.join(__dirname, './manager.html');
        this.window.loadFile(managerPagePath);

        // BrowserView'i kontrol çubuğunun altındaki alanı kaplayacak şekilde ayarla
        this.updateViewBounds();

        // BrowserView'e başlangıç sayfasını (search.html) yükle
        const searchPagePath = path.join(__dirname, './search.html');
        this.view.webContents.loadURL(searchPagePath);

        this.window.once("ready-to-show", () => {
            this.window.show();
            if (this.position.maximized) {
                this.window.maximize();
            }
        });

        // manager.html yüklendiğinde callback'i çağır
        this.window.webContents.once('did-finish-load', () => {
            console.log('Manager HTML yüklendi ve tüm JavaScript dosyaları çalıştı.');
            if (this._onLoadCallback) {
                this._onLoadCallback();
            }
        });

        // Pencere boyutu değiştiğinde BrowserView'i güncelle
        this.window.on('resize', () => {
            this.updateViewBounds();
        });

        // BrowserView'de navigasyon olduğunda manager'daki adres çubuğunu güncelle
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

        this.handleMessages();

        // DevTools'u aç (isteğe bağlı)
        this.window.webContents.openDevTools({ mode: "undocked" }); // Ana pencere için
        this.view.webContents.openDevTools({ mode: "right" }); // BrowserView için

        // manager.html yüklendiğinde versiyon bilgisini göndermek için
        this.window.webContents.on('did-finish-load', () => {
            this.window.webContents.send('set-version', app.getVersion());
        });
    }

    // BrowserView boyutlarını güncelle (Kontrol çubuğunun altından başla)
    updateViewBounds() {
        const contentBounds = this.window.getContentBounds();
        this.view.setBounds({
            x: 0,
            y: CONTROLS_HEIGHT, // Kontrol çubuğunun altından başla
            width: contentBounds.width,
            height: contentBounds.height - CONTROLS_HEIGHT // Kontrol çubuğu kadar yüksekliği azalt
        });
    }

    onMainWindowLoad(callback) {
        this._onLoadCallback = callback;
    }

    sendNotification(message, autoHide = true) {
        // Bildirimleri manager.html'in webContents'ine gönder
        this.window.webContents.send("show-notification", { message, autoHide });
    }

    sendProgress(percent) {
        // İlerlemeyi manager.html'in webContents'ine gönder
        this.window.webContents.send('update-progress', percent);
    }

    sendVersion(version) {
        // Versiyonu manager.html'in webContents'ine gönder
        // Zaten did-finish-load içinde gönderildiği için burada tekrar göndermeye gerek olmayabilir
        // Ancak tutmak güvenli olabilir
        this.window.webContents.send('set-version', version);
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
            this.view.webContents.loadURL(searchPagePath);
        });
    }
}

module.exports = MainScreen;
// --- END OF FILE mainScreen.js ---