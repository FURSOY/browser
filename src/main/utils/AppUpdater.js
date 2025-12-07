const { autoUpdater } = require("electron-updater");
const { dialog } = require("electron");

class AppUpdater {
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
        this.init();
    }

    init() {
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = true;

        this.attachEvents();
    }

    checkForUpdates() {
        autoUpdater.checkForUpdates();
    }

    attachEvents() {
        autoUpdater.on("update-available", (info) => {
            if (this.mainWindow) {
                this.mainWindow.sendNotification(`Update available: ${info.version}`, false);
            }
            autoUpdater.downloadUpdate();
        });

        autoUpdater.on("download-progress", (progressObj) => {
            if (this.mainWindow) {
                this.mainWindow.sendProgress(progressObj.percent);
            }
        });

        autoUpdater.on("update-downloaded", (info) => {
            if (this.mainWindow) {
                this.mainWindow.sendProgress(100);
                this.mainWindow.sendUpdateReady();
            }
        });

        autoUpdater.on("error", (err) => {
            if (this.mainWindow) {
                this.mainWindow.sendNotification(`Update error: ${err.message || err}`, false);
                this.mainWindow.sendProgress(0);
            }
        });
    }

    quitAndInstall() {
        autoUpdater.quitAndInstall();
    }
}

module.exports = AppUpdater;
