const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("bridge", {
    saveBookmark: (url, title) => ipcRenderer.send('bookmark-save-request', { url, title }),
    removeBookmark: (url) => ipcRenderer.send('bookmark-save-request', { url, remove: true }),
    closePopup: () => ipcRenderer.send('bookmark-popup-close'),
});

contextBridge.exposeInMainWorld("electronAPI", {
    receive: (channel, func) => {
        const validChannels = ['set-bookmark-data'];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    }
});
