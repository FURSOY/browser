const { app, BrowserWindow, ipcMain } = require("electron");
const MainScreen = require("./Screens/main/mainScreen");
const Globals = require("./globals");
const { autoUpdater } = require("electron-updater");

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
        console.log("Ana pencere yüklendi, bildirimler gönderiliyor...");
        curWindow.sendVersion(app.getVersion());
        // Uygulama açıldığında güncelleme kontrolü yap
        autoUpdater.checkForUpdates();
    });
});

app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

autoUpdater.on("update-available", (info) => {
    curWindow.sendNotification(`Yeni güncelleme bulundu!`, false);
    curWindow.sendNotification(`Yeni versiyon ${info.version} indiriliyor...`, false);
    autoUpdater.downloadUpdate();
});

// autoUpdater.on("update-not-available", (info) => {
//     curWindow.sendNotification(`Güncelleme bulunamadı.`, true);
// });

/*Download Progress*/
autoUpdater.on("download-progress", (progressObj) => {
    let log_message = `İndirme hızı: ${(progressObj.bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s`;
    log_message += ` - İndirilen: ${progressObj.percent.toFixed(1)}%`;
    log_message += ` (${(progressObj.transferred / 1024 / 1024).toFixed(2)} MB / ${(progressObj.total / 1024 / 1024).toFixed(2)} MB)`;

    curWindow.sendNotification(`Güncelleme indiriliyor: ${progressObj.percent.toFixed(1)}%`, false);
    curWindow.sendProgress(progressObj.percent);
});

/*Download Completion Message*/
autoUpdater.on("update-downloaded", (info) => {
    curWindow.sendNotification(`Güncelleme indirildi! Yeniden başlatılıyor...`, false);
    curWindow.sendProgress(100); // İlerleme çubuğunu doldur
    // search.html'e yeniden başlatma isteğini gönder
    curWindow.sendUpdateReady();

    // Uygulama tamamen kapandığında otomatik olarak güncellemeyi kurup yeniden başlayacak.
    // Kullanıcıya buton ile yeniden başlatma seçeneği sunulacağı için burada manuel olarak quitAndInstall çağırmıyoruz.
    // Kullanıcı butona bastığında çağıracağız.
});

/*Error Handling*/
autoUpdater.on("error", (err) => {
    curWindow.sendNotification(`Güncelleme hatası: ${err.message || err}`, false);
    curWindow.sendProgress(0);
});

// Global exception handler
process.on("uncaughtException", function (err) {
    console.error("uncaughtExceptionHatası:", err);
});

app.on("window-all-closed", function () {
    if (process.platform !== "darwin") app.quit();
});

// "restart-app" mesajını dinle, bu mesaj searchView.js'den gelecek
ipcMain.on('restart-app', () => {
    console.log('Restarting app for update...');
    autoUpdater.quitAndInstall(); // Uygulamayı kapat, güncellemeyi kur ve yeniden başlat
});