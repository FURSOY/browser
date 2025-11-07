const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const { autoUpdater } = require("electron-updater");
const path = require('path');
const url = require('url');

let mainWindow;

// Performans için autoUpdater ayarları
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

app.on('ready', () => {
    createMainWindow();
    // Pencere tamamen yüklendikten sonra güncelleme kontrolü yap
    setTimeout(() => {
        checkForUpdates();
    }, 3000);
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
            // Performans iyileştirmeleri
            backgroundThrottling: false,
            enableWebSQL: false,
            v8CacheOptions: 'code'
        },
        show: false // İlk başta gizli, hazır olunca göster
    });

    mainWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, "main.html"),
            protocol: "file:",
            slashes: true
        })
    );

    // Pencere hazır olunca göster (yanıp sönmeyi önler)
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    Menu.setApplicationMenu(null);

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

function checkForUpdates() {
    // Geliştirme modunda çalışmasın
    if (!app.isPackaged) {
        console.log('Geliştirme modunda, güncelleme kontrolü atlanıyor...');
        return;
    }

    console.log('Güncellemeler kontrol ediliyor...');
    autoUpdater.checkForUpdates();

    autoUpdater.on('checking-for-update', () => {
        console.log('Güncelleme aranıyor...');
    });

    autoUpdater.on('update-available', (info) => {
        console.log('Güncelleme bulundu:', info.version);

        dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Güncelleme Bulundu',
            message: `Yeni sürüm mevcut: ${info.version}\n\nŞimdi indirmek ister misiniz?`,
            buttons: ['İndir', 'Daha Sonra'],
            defaultId: 0,
            cancelId: 1
        }).then(result => {
            if (result.response === 0) {
                // Güncellemeyi başlat
                if (mainWindow) {
                    mainWindow.webContents.send('update-status', 'downloading');
                }
                autoUpdater.downloadUpdate();
            }
        });
    });

    autoUpdater.on('update-not-available', () => {
        console.log('Güncelleme yok, en son sürümdesiniz.');
    });

    autoUpdater.on('download-progress', (progressObj) => {
        // Görev çubuğunda ilerleme göster
        if (mainWindow) {
            mainWindow.setProgressBar(progressObj.percent / 100);

            // Renderer'a ilerleme gönder
            mainWindow.webContents.send('update-progress', {
                percent: progressObj.percent,
                transferred: progressObj.transferred,
                total: progressObj.total,
                bytesPerSecond: progressObj.bytesPerSecond
            });
        }

        console.log(`İndiriliyor: ${progressObj.percent.toFixed(1)}% - ${(progressObj.bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s`);
    });

    autoUpdater.on('update-downloaded', (info) => {
        console.log('Güncelleme indirildi:', info.version);

        // İlerleme çubuğunu temizle
        if (mainWindow) {
            mainWindow.setProgressBar(-1);
            mainWindow.webContents.send('update-status', 'downloaded');
        }

        dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Güncelleme Hazır',
            message: `Yeni sürüm (${info.version}) başarıyla indirildi!\n\nŞimdi yeniden başlatmak ister misiniz?`,
            buttons: ['Yeniden Başlat', 'Daha Sonra'],
            defaultId: 0,
            cancelId: 1
        }).then(result => {
            if (result.response === 0) {
                // Uygulamayı kapat ve güncellemeyi yükle
                setImmediate(() => autoUpdater.quitAndInstall(false, true));
            }
        });
    });

    autoUpdater.on('error', (err) => {
        console.error('Güncelleme hatası:', err);

        if (mainWindow) {
            mainWindow.setProgressBar(-1);
            mainWindow.webContents.send('update-status', 'error');
        }

        dialog.showErrorBox('Güncelleme Hatası',
            'Güncelleme sırasında bir hata oluştu:\n' + err.message);
    });
}

// Manuel güncelleme kontrolü için
ipcMain.on('check-for-updates', () => {
    if (app.isPackaged) {
        checkForUpdates();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createMainWindow();
    }
});