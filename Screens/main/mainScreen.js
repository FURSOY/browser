const { app, BrowserWindow, BrowserView, ipcMain, globalShortcut } = require("electron");
const path = require("path");
const url = require('url');

const CONTROLS_HEIGHT = 40; // Define height for the controls area

class MainScreen {
    window;
    view; // Add view property

    position = {
        width: 1000,
        height: 600,
        maximized: false,
    };

    constructor() {
        this.window = new BrowserWindow({
            width: this.position.width,
            height: this.position.height,
            title: "FURSOY Browser",
            icon: path.join(__dirname, "../../assets/icon.ico"),
            show: false,
            removeMenu: true,
            acceptFirstMouse: false,
            autoHideMenuBar: true,
            webPreferences: {
                contextIsolation: true,
                preload: path.join(__dirname, "./mainPreload.js"),
            },
        });

        // --- Google Warm-up ---
        const warmupView = new BrowserView();
        warmupView.webContents.loadURL('https://www.google.com');
        warmupView.webContents.on('did-finish-load', () => {
            try {
                warmupView.destroy();
            } catch (e) {
                // Ignore if already destroyed
            }
        });

        this.view = new BrowserView({
            webPreferences: {
                contextIsolation: true, // BrowserView için de contextIsolation açık olmalı
                preload: path.join(__dirname, "./mainPreload.js"), // Aynı preload script'i kullanılıyor
            }
        });
        this.window.setBrowserView(this.view);

        const searchPagePath = path.join(__dirname, './search.html');
        const contentBounds = this.window.getContentBounds();
        this.view.setBounds({ x: 0, y: CONTROLS_HEIGHT, width: contentBounds.width, height: contentBounds.height - CONTROLS_HEIGHT });
        this.view.webContents.loadURL(searchPagePath);

        this.window.once("ready-to-show", () => {
            this.window.show();
            if (this.position.maximized) {
                this.window.maximize();
            }
        });

        this.window.on('resize', () => {
            const contentBounds = this.window.getContentBounds();
            this.view.setBounds({ x: 0, y: CONTROLS_HEIGHT, width: contentBounds.width, height: contentBounds.height - CONTROLS_HEIGHT });
        });

        this.view.webContents.on('did-navigate', (event, navigatedUrl) => {
            let finalUrl = '';
            try {
                const navigatedPath = path.normalize(url.fileURLToPath(navigatedUrl));
                if (navigatedPath !== path.normalize(searchPagePath)) {
                    finalUrl = navigatedUrl;
                } else {
                    // Eğer search.html'e geri dönüldüyse, URL çubuğunu boşalt
                    finalUrl = '';
                }
            } catch (e) {
                finalUrl = navigatedUrl;
            }
            this.window.webContents.send('update-address-bar', finalUrl);
        });

        this.handleMessages();
        let wc = this.window.webContents;
        // wc.openDevTools({ mode: "undocked" });

        this.window.loadFile("./Screens/main/main.html");

        // BrowserView yüklendiğinde versiyon bilgisini searchView'e gönder
        this.view.webContents.on('did-finish-load', () => {
            this.view.webContents.send('set-version', app.getVersion());
        });
    }

    sendNotification(message, autoHide = true) {
        this.window.webContents.send("show-notification", { message, autoHide });
    }

    sendProgress(percent) {
        this.window.webContents.send("update-progress", percent);
    }

    // Versiyon bilgisini gönderme metodu, artık main.html'e değil, BrowserView'a (search.html) gönderecek
    sendVersion(version) {
        // BrowserView (search.html) yüklendiğinde versiyon bilgisini gönder
        this.view.webContents.once('did-finish-load', () => {
            this.view.webContents.send('set-version', version);
        });
        // Eğer BrowserView zaten yüklüyse doğrudan gönder
        if (!this.view.webContents.isLoading()) {
            this.view.webContents.send('set-version', version);
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
            this.view.webContents.loadURL(url);
        });
        ipcMain.on('nav-back', () => {
            this.view.webContents.goBack();
        });
        ipcMain.on('nav-forward', () => {
            this.view.webContents.goForward();
        });
        ipcMain.on('nav-reload', () => {
            this.view.webContents.reload();
        });
        ipcMain.on('nav-home', () => {
            this.view.webContents.loadURL(path.join(__dirname, './search.html'));
        });
    }
}

module.exports = MainScreen;