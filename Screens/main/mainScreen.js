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
        // Create a hidden BrowserView to pre-load Google and speed up the first search.
        const warmupView = new BrowserView();
        warmupView.webContents.loadURL('https://www.google.com');
        warmupView.webContents.on('did-finish-load', () => {
            // Once loaded, we don't need it anymore. Destroy it to free up resources.
            try {
                warmupView.destroy();
            } catch (e) {
                // It might already be destroyed, which is fine.
            }
        });
        // We don't attach this view to any window, it just lives in the background.

        // Create and set the BrowserView
        this.view = new BrowserView({
            webPreferences: {
                preload: path.join(__dirname, "./mainPreload.js"),
            }
        });
        this.window.setBrowserView(this.view);
        
        const searchPagePath = path.join(__dirname, './search.html');
        // Set initial bounds and load URL
        const contentBounds = this.window.getContentBounds();
        this.view.setBounds({ x: 0, y: CONTROLS_HEIGHT, width: contentBounds.width, height: contentBounds.height - CONTROLS_HEIGHT });
        this.view.webContents.loadURL(searchPagePath);

        this.window.once("ready-to-show", () => {
            this.window.show();
            if (this.position.maximized) {
                this.window.maximize();
            }
        });

        // Handle window resizing
        this.window.on('resize', () => {
            const contentBounds = this.window.getContentBounds();
            this.view.setBounds({ x: 0, y: CONTROLS_HEIGHT, width: contentBounds.width, height: contentBounds.height - CONTROLS_HEIGHT });
        });

        // Sync address bar on navigation
        this.view.webContents.on('did-navigate', (event, navigatedUrl) => {
            let finalUrl = '';
            try {
                const navigatedPath = path.normalize(url.fileURLToPath(navigatedUrl));
                // If the path is not our search page, show the URL.
                if (navigatedPath !== path.normalize(searchPagePath)) {
                    finalUrl = navigatedUrl;
                }
            } catch (e) {
                // If it's not a file URL, it's a regular web page, so show the URL.
                finalUrl = navigatedUrl;
            }
            this.window.webContents.send('update-address-bar', finalUrl);
        });

        this.handleMessages();
        let wc = this.window.webContents;
        wc.openDevTools({ mode: "undocked" });

        // Send app version to renderer once the main window loads
        wc.on('did-finish-load', () => {
            wc.send('set-version', app.getVersion());
        });

        this.view.webContents.on('did-finish-load', () => {
            this.view.webContents.send('set-version', app.getVersion());
        });

        this.window.loadFile("./Screens/main/main.html");
    }

    sendNotification(message) {
        if (this.window.webContents.isLoading()) {
            this.window.webContents.once('did-finish-load', () => {
                this.window.webContents.send("show-notification", message);
            });
        } else {
            this.window.webContents.send("show-notification", message);
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