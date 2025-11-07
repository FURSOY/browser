const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: "#000",
        icon: path.join(__dirname, "assets", "icon.png"),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            webviewTag: true,
            allowRunningInsecureContent: false,
            webSecurity: true
        }
    });

    mainWindow.loadFile("main.html");
    Menu.setApplicationMenu(null);

    // Geliştirici araçlarını aç (isteğe bağlı)
    // mainWindow.webContents.openDevTools();

    mainWindow.on("closed", () => mainWindow = null);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Otomatik güncelleme (opsiyonel)
autoUpdater.checkForUpdatesAndNotify();