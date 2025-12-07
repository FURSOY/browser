const { app, BrowserWindow, ipcMain } = require("electron");
const MainWindow = require("./windows/MainWindow"); // Renamed class
const AppUpdater = require("./utils/AppUpdater");
const path = require('path');

if (!app.isPackaged) {
    require('electron-reload')(__dirname, {
        electron: path.join(__dirname, '..', '..', 'node_modules', '.bin', 'electron' + (process.platform === 'win32' ? '.cmd' : ''))
    });
}

let curWindow;
let appUpdater;

const createWindow = () => {
    curWindow = new MainWindow();
    appUpdater = new AppUpdater(curWindow);
}

app.whenReady().then(() => {
    createWindow();

    // MainScreen penceresi tamamen yüklendikten sonra otomatik güncelleyiciyi başlat
    // ve ilk bildirimleri gönder.
    curWindow.onMainWindowLoad(() => {
        appUpdater.checkForUpdates();
    });
});

app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Windows'ta tüm pencereler kapandığında uygulamayı sonlandır
app.on("window-all-closed", function () {
    if (process.platform !== "darwin") app.quit();
});

// Global exception handler
process.on("uncaughtException", function (err) {
    console.error("uncaughtExceptionHatası:", err);
});

// "restart-app" mesajını dinle
ipcMain.on('restart-app', () => {
    console.log('Restarting app for update...');
    if (appUpdater) {
        appUpdater.quitAndInstall();
    }
});