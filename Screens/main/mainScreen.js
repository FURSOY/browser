const { app, BrowserWindow, ipcMain, globalShortcut } = require("electron");

const path = require("path");

class MainScreen {
    window;

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
            // autoHideMenuBar: true → Menü çubuğunu otomatik gizle
            // Alt tuşuna basınca görünür
            autoHideMenuBar: true,
            webPreferences: {
                contextIsolation: true,
                preload: path.join(__dirname, "./mainPreload.js"),
            },
        });
        this.window.once("ready-to-show", () => {
            this.window.show();

            if (this.position.maximized) {
                this.window.maximize();
            }
        });

        this.handleMessages();
        let wc = this.window.webContents;

        wc.openDevTools({ mode: "undocked" });

        // wc.on('did-finish-load', () => {
        //     this.sendNotification('Sayfa yüklendi! Bu bildirim MainScreen\'den geldi.');
        // });

        this.window.loadFile("./Screens/main/main.html");
    }

    sendNotification(message) {
        this.window.webContents.send("show-notification", message);
    }

    close() {
        this.window.close();
        ipcMain.removeAllListeners();
    }

    hide() {
        this.window.hide();
    }
    handleMessages() {
    }
}

module.exports = MainScreen;