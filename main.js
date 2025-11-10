const { app, BrowserWindow, ipcMain, Notification } = require("electron"); // Notification'ı ekledik
const MainScreen = require("./Screens/main/mainScreen");
const Globals = require("./globals");
const { autoUpdater } = require("electron-updater"); // AppUpdater'ı kaldırdık, autoUpdater yeterli

let curWindow;

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

const createWindow = () => {
    curWindow = new MainScreen();
}

app.whenReady().then(() => {
    createWindow();

    // Uygulama hazır olduğunda versiyon bilgisini ana pencereye gönder
    curWindow.sendVersion(app.getVersion());

    autoUpdater.checkForUpdates();
    curWindow.sendNotification(`Güncelleme kontrol ediliyor...`, false); // Versiyon bilgisini buraya dahil etmeyeceğiz, ayrı bir yerde gösterilecek.
});

app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

/*New Update Available*/
autoUpdater.on("update-available", (info) => {
    curWindow.sendNotification(`Yeni güncelleme bulundu! Versiyon: ${info.version}`, false);
    // İşletim sistemi bildirimi
    new Notification({
        title: 'FURSOY Browser Güncellemesi',
        body: `Yeni versiyon ${info.version} bulundu. İndirme başlatılıyor...`,
        silent: false
    }).show();
    autoUpdater.downloadUpdate();
});

/*Update Not Available*/
autoUpdater.on("update-not-available", (info) => {
    curWindow.sendNotification(`Güncelleme bulunamadı.`, true); // Kısa süreli göster
});

/*Download Progress*/
autoUpdater.on("download-progress", (progressObj) => {
    let log_message = `İndirme hızı: ${(progressObj.bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s`;
    log_message += ` - İndirilen: ${progressObj.percent.toFixed(1)}%`;
    log_message += ` (${(progressObj.transferred / 1024 / 1024).toFixed(2)} MB / ${(progressObj.total / 1024 / 1024).toFixed(2)} MB)`;

    curWindow.sendNotification(`Güncelleme indiriliyor: ${progressObj.percent.toFixed(1)}%`, false); // Kalıcı bildirim
    curWindow.sendProgress(progressObj.percent); // İlerleme çubuğunu güncelle
});


/*Download Completion Message*/
autoUpdater.on("update-downloaded", (info) => {
    curWindow.sendNotification(`Güncelleme indirildi! Uygulama kapandığında yüklenecek.`, false); // Kalıcı bildirim
    curWindow.sendProgress(100); // İlerleme çubuğunu %100 yap
    // İşletim sistemi bildirimi
    new Notification({
        title: 'FURSOY Browser Güncellemesi',
        body: 'Güncelleme başarıyla indirildi. Uygulama bir sonraki kapanışta yüklenecektir.',
        silent: false
    }).show();
    // İndirme bittiğinde ilerlemeyi sıfırlamak için 5 saniye sonra gönderebiliriz (isteğe bağlı)
    setTimeout(() => curWindow.sendProgress(0), 5000);
});

/*Error Handling*/
autoUpdater.on("error", (err) => {
    curWindow.sendNotification(`Güncelleme hatası: ${err.message || err}`, false); // Kalıcı bildirim
    curWindow.sendProgress(0); // İlerleme çubuğunu sıfırla
    new Notification({
        title: 'Güncelleme Hatası',
        body: `Güncelleme sırasında bir hata oluştu: ${err.message || err}`,
        silent: false
    }).show();
});

//Global exception handler
process.on("uncaughtException", function (err) {
    console.error("uncaughtExceptionHatası:", err); // console.log yerine console.error kullanmak daha iyi
});

app.on("window-all-closed", function () {
    if (process.platform !== "darwin") app.quit(); // === yerine !==
});