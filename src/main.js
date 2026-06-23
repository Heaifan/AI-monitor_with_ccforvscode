const { app, BrowserWindow, ipcMain } = require('electron');
const telemetryHub = require('./engine/telemetryHub');
const httpGateway = require('./io/httpGateway');

let win = null;

function createWindow() {
    console.log('【启动探针】正在创建 Electron 悬浮窗');
    win = new BrowserWindow({
        width: 280, height: 86, x: Math.round((require('electron').screen.getPrimaryDisplay().workAreaSize.width / 2) - 140), y: 15,
        transparent: true, frame: false, alwaysOnTop: true, resizable: false,
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });
    win.webContents.on('console-message', (event, level, message, line, sourceId) => {
        if (message.includes('Electron Security Warning')) return;
        console.log(`【渲染探针:${level}】${message} (${sourceId}:${line})`);
    });
    win.loadFile('renderer.html');
    win.webContents.on('did-finish-load', () => {
        console.log('【启动探针】renderer.html 已加载，开始初始化遥测枢纽与 HTTP 网关');
        const sendFn = (channel, payload) => { if (win) win.webContents.send(channel, payload); };
        telemetryHub.initialize(sendFn);
        httpGateway.start(sendFn);
        console.log('【启动探针】启动链路初始化完成');
    });
}

ipcMain.on('resize-window', (e, { width, height }) => { if (win) { win.setResizable(true); win.setSize((width === 220 || width === 250) ? 280 : width, (height === 80 || height === 96) ? 86 : height); win.setResizable(false); } });
ipcMain.on('terminal-log', (e, msg) => { console.log(msg); });
ipcMain.on('window-move', (e, { deltaX, deltaY }) => { if (win) { const [x, y] = win.getPosition(); win.setPosition(x + deltaX, y + deltaY); } });
ipcMain.on('close-app', () => app.quit());
app.whenReady().then(() => {
    console.log('【启动探针】Electron 应用已就绪');
    createWindow();
});
