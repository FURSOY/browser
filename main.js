// --- START OF FILE main.js ---

const { app, BrowserWindow, ipcMain } = require("electron");
const MainScreen = require("./Screens/main/mainScreen");
const Globals = require("./globals");
const { autoUpdater } = require("electron-updater");

let curWindow;

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

const createWindow = () => {
    curWindow = new MainScreen();
}

app.whenReady().then(() => {
    createWindow();

    // MainScreen penceresi tamamen yüklendikten sonra otomatik güncelleyiciyi başlat
    // ve ilk bildirimleri gönder.
    curWindow.onMainWindowLoad(() => {
        curWindow.sendVersion(app.getVersion());

        // Test bildirimleri buraya taşındı, main window yüklendikten sonra gönderilecek.
        setTimeout(() => {
            curWindow.sendNotification('Bu ilk test bildiriminiz. 5 saniye sonra kaybolacak.', true);
            console.log("İlk test bildirimi gönderildi.");
        }, 8000); // 2 saniye sonra ilk bildirimi gönder

        setTimeout(() => {
            curWindow.sendNotification('Bu ikinci test bildiriminiz. Kapatana kadar kalıcı olacak.', false);
            console.log("İkinci test bildirimi gönderildi.");
        }, 10000); // 4 saniye sonra ikinci bildirimi gönder (ilkten 2 saniye sonra)

        autoUpdater.checkForUpdates();
        curWindow.sendNotification(`Güncelleme kontrol ediliyor...`, true); // Kısa süreli göster
    });
});

app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

/*New Update Available*/
autoUpdater.on("update-available", (info) => {
    // Bu bildirimlerin de pencere yüklendikten sonra gitmesi garantilendi.
    curWindow.sendNotification(`Yeni güncelleme bulundu! Versiyon: ${info.version}`, false);
    curWindow.sendNotification(`Yeni versiyon ${info.version} indiriliyor...`, false);
    autoUpdater.downloadUpdate();
});

/*Update Not Available*/
autoUpdater.on("update-not-available", (info) => {
    curWindow.sendNotification(`Güncelleme bulunamadı.`, true);
});

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
    curWindow.sendNotification(`Güncelleme indirildi! Uygulama kapandığında yüklenecek.`, false);
    curWindow.sendProgress(100);
    setTimeout(() => curWindow.sendProgress(0), 5000);
});

/*Error Handling*/
autoUpdater.on("error", (err) => {
    curWindow.sendNotification(`Güncelleme hatası: ${err.message || err}`, false);
    curWindow.sendProgress(0);
});

//Global exception handler
process.on("uncaughtException", function (err) {
    console.error("uncaughtExceptionHatası:", err);
});

app.on("window-all-closed", function () {
    if (process.platform !== "darwin") app.quit();
});
// --- END OF FILE main.js ---