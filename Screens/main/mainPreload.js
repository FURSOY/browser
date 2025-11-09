const { contextBridge, ipcRenderer } = require("electron");

let bridge = {
    onShowNotification: (callback) => ipcRenderer.on("show-notification", callback),
};
contextBridge.exposeInMainWorld("bridge", bridge);