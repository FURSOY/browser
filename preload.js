const { contextBridge } = require('electron');
const packageJson = require('../package.json');

contextBridge.exposeInMainWorld('appInfo', {
    version: packageJson.version
});
