const { app, BrowserWindow, ipcMain } = require("electron");
const MainScreen = require("./Screens/main/mainScreen");
const Globals = require("./globals"); // Bu dosyayı kullanmıyorsanız kaldırabilirsiniz.
const { autoUpdater } = require("electron-updater");
require('electron-reload')(__dirname, {
    electron: require('path').join(__dirname, 'node_modules', '.bin', 'electron' + (process.platform === 'win32' ? '.cmd' : ''))
});

let curWindow;

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true; // Bu satır, uygulama kapandığında güncellemeyi otomatik kurmayı sağlar.

const createWindow = () => {
    curWindow = new MainScreen();
}

app.whenReady().then(() => {
    createWindow();

    // MainScreen penceresi tamamen yüklendikten sonra otomatik güncelleyiciyi başlat
    // ve ilk bildirimleri gönder.
    curWindow.onMainWindowLoad(() => {
        autoUpdater.checkForUpdates();
    });
});

app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Windows'ta tüm pencereler kapandığında uygulamayı sonlandır
app.on("window-all-closed", function () {
    if (process.platform !== "darwin") app.quit();
});


autoUpdater.on("update-available", (info) => {
    curWindow.sendNotification(`Yeni güncelleme bulundu! Versiyon: ${info.version}`, false);
    autoUpdater.downloadUpdate();
});

autoUpdater.on("download-progress", (progressObj) => {
    let log_message = `İndirme hızı: ${(progressObj.bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s`;
    log_message += ` - İndirilen: ${progressObj.percent.toFixed(1)}%`;
    log_message += ` (${(progressObj.transferred / 1024 / 1024).toFixed(2)} MB / ${(progressObj.total / 1024 / 1024).toFixed(2)} MB)`;

    curWindow.sendProgress(progressObj.percent);
});

autoUpdater.on("update-downloaded", (info) => {
    curWindow.sendProgress(100); // search.html'deki ilerleme çubuğunu doldur
    curWindow.sendUpdateReady(); // search.html'e butonu göstermesi için mesaj gönder
});

/*Error Handling*/
autoUpdater.on("error", (err) => {
    curWindow.sendNotification(`Güncelleme hatası: ${err.message || err}`, false);
    curWindow.sendProgress(0); // search.html'deki barı sıfırla
    // Hata durumunda da butonları sıfırla/gizle
    if (curWindow && curWindow.view && curWindow.view.webContents) {
        curWindow.view.webContents.send('update-progress', 0); // İlerleme çubuğunu sıfırla
        curWindow.view.webContents.send('update-ready-to-install', false); // Butonu gizle (false değeri ile)
    }
});

// Global exception handler
process.on("uncaughtException", function (err) {
    console.error("uncaughtExceptionHatası:", err);
});

// "restart-app" mesajını dinle, bu mesaj searchView.js'den gelecek
ipcMain.on('restart-app', () => {
    console.log('Restarting app for update...');
    autoUpdater.quitAndInstall(); // Uygulamayı kapat, güncellemeyi kur ve yeniden başlat
});