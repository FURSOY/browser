const { app, BrowserWindow, Menu, dialog } = require('electron');
const { autoUpdater } = require("electron-updater");
const path = require('path');
const url = require('url');

let mainWindow;

app.on('ready', () => {
    createMainWindow();
    checkForUpdates();
});

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: "#000000",
        icon: path.join(__dirname, "assets", "icon.png"),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            webviewTag: true,
        },
    });

    mainWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, "main.html"),
            protocol: "file:",
            slashes: true
        })
    );

    Menu.setApplicationMenu(null);

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

function checkForUpdates() {
    if (!app.isPackaged) return;

    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on('update-available', () => {
        dialog.showMessageBox({
            type: 'info',
            title: 'Güncelleme Bulundu',
            message: 'Yeni bir sürüm bulundu, indiriliyor...',
        });
    });

    // 🔥 BURADA yüzde ilerlemesini yakalıyoruz
    autoUpdater.on('download-progress', (progressObj) => {
        let log_message = `İndiriliyor: ${progressObj.percent.toFixed(1)}%`;
        if (mainWindow) {
            mainWindow.setProgressBar(progressObj.percent / 100); // görev çubuğunda bar gösterir
            mainWindow.webContents.send('update-progress', progressObj.percent); // render'a gönder
        }
        console.log(log_message);
    });

    autoUpdater.on('update-downloaded', () => {
        dialog.showMessageBox({
            type: 'info',
            title: 'Güncelleme Hazır',
            message: 'Yeni sürüm indirildi. Şimdi yeniden başlatmak ister misiniz?',
            buttons: ['Evet', 'Hayır']
        }).then(result => {
            if (result.response === 0) autoUpdater.quitAndInstall();
        });
    });

    autoUpdater.on('error', (err) => {
        console.error('Güncelleme hatası:', err);
    });
}
