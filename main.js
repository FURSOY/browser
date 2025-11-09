const { app, BrowserWindow, ipcMain, ipcRenderer } = require("electron");
const MainScreen = require("./Screens/main/mainScreen");
const Globals = require("./globals");
const { autoUpdater, AppUpdater } = require("electron-updater");

let curWindow;

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

const createWindow = () => {
    curWindow = new MainScreen();
}

app.whenReady().then(() => {
    createWindow();
    autoUpdater.checkForUpdates();
    curWindow.sendNotification(`Checking for updates. Current version ${app.getVersion()}`);
});

autoUpdater.on("update-available", (info) => {
    curWindow.sendNotification(`Update available. Current version ${app.getVersion()}`);
    autoUpdater.downloadUpdate();
});

autoUpdater.on("update-not-available", (info) => {
    curWindow.sendNotification(`No update available. Current version ${app.getVersion()}`);
});

autoUpdater.on("update-downloaded", (info) => {
    curWindow.sendNotification(`Güncelleme indirildi.Kurmak için uygulamayı kapatıp açabilirsiniz Current version ${app.getVersion()}`);
});

autoUpdater.on("error", (info) => {
    curWindow.sendNotification(`Güncelemehatasi ${info}`);
});

process.on("uncaughtException", function (err) {
    console.log("uncaughtExceptionHatası:", err);
});

app.on("window-all-closed", function () {
    if (process.platform != "darwin") app.quit();
});