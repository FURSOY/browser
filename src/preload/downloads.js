const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('downloadsAPI', {
    onSetDownloads: (callback) => ipcRenderer.on('set-downloads', (event, data) => callback(data)),
    onDownloadStarted: (callback) => ipcRenderer.on('download-started', (event, data) => callback(data)),
    onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (event, data) => callback(data)),
    onDownloadCompleted: (callback) => ipcRenderer.on('download-completed', (event, data) => callback(data)),
    onDownloadFailed: (callback) => ipcRenderer.on('download-failed', (event, data) => callback(data)),
    onDownloadPaused: (callback) => ipcRenderer.on('download-paused', (event, data) => callback(data)),
    onDownloadResumed: (callback) => ipcRenderer.on('download-resumed', (event, data) => callback(data)),
    onDownloadCancelled: (callback) => ipcRenderer.on('download-cancelled', (event, data) => callback(data)),
    onDownloadDeleted: (callback) => ipcRenderer.on('download-deleted', (event, data) => callback(data)),
    requestClearDownloads: () => ipcRenderer.send('clear-downloads'),
    requestOpenDownload: (id) => ipcRenderer.send('open-download', id),
    requestPauseDownload: (id) => ipcRenderer.send('pause-download', id),
    requestResumeDownload: (id) => ipcRenderer.send('resume-download', id),
    requestCancelDownload: (id) => ipcRenderer.send('cancel-download', id),
    requestDeleteDownload: (id) => ipcRenderer.send('delete-download', id),
    requestShowInFolder: (id) => ipcRenderer.send('show-in-folder', id)
});
