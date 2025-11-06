const electron = require('electron');
const url = require('url');
const path = require('path');
const { app, BrowserWindow, Menu } = electron;

let mainWindow;

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: "#000000",
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            webviewTag: true,
        },
    });

    console.log(process.platform);

    mainWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, "main.html"),
            protocol: "file:",
            slashes: true
        })
    )

    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate)

    Menu.setApplicationMenu(null)
})

const mainMenuTemplate = [
    {
        label: "lalla",
        submenu: [
            {
                label: "Yadssa"
            },
            {
                label: "Çıkış",
                role: "quit"
            }
        ]
    }
]