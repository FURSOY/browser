const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

// package.json'ı güvenli şekilde oku
let version = '1.0.0';
try {
    const packagePath = path.join(__dirname, 'package.json');
    const packageData = fs.readFileSync(packagePath, 'utf8');
    const packageJson = JSON.parse(packageData);
    version = packageJson.version;
} catch (error) {
    console.error('Package.json okunamadı:', error);
}

contextBridge.exposeInMainWorld('electronAPI', {
    version: version,

    // Güncelleme ilerlemesi
    onUpdateProgress: (callback) => {
        ipcRenderer.on('update-progress', (_event, data) => callback(data));
    },

    // Güncelleme durumu
    onUpdateStatus: (callback) => {
        ipcRenderer.on('update-status', (_event, status) => callback(status));
    },

    // Manuel güncelleme kontrolü
    checkForUpdates: () => {
        ipcRenderer.send('check-for-updates');
    }
});