const electron = require('electron');
const url = require('url');
const path = require('path');
const { app, BrowserWindow, Menu } = electron;

let mainWindow;

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: false, // güvenlik için
            contextIsolation: true, // güvenlik için
            webviewTag: true,       // <webview> aktif et!
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