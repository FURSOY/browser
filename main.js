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
    // Sadece üretim (build edilmiş exe) sürümünde çalışsın
    if (!app.isPackaged) return;

    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on('update-available', () => {
        dialog.showMessageBox({
            type: 'info',
            title: 'Güncelleme Bulundu',
            message: 'Yeni bir sürüm mevcut. İndiriliyor...',
        });
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

const mainMenuTemplate = [
    {
        label: "Dosya",
        submenu: [
            { label: "Yenile", role: "reload" },
            { label: "Geliştirici Araçları", role: "toggleDevTools" },
            { type: "separator" },
            { label: "Çıkış", role: "quit" }
        ]
    }
];
