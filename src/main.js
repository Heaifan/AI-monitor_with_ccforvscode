const { app, BrowserWindow, ipcMain } = require('electron');
const express = require('express');
const { startWatching } = require('./logWatcher');
const logParser = require('./logParser');
const sessionManager = require('./sessionManager');

let win = null;
const server = express();
server.use(express.json());

function createWindow() {
    win = new BrowserWindow({
        width: 280, height: 86, x: Math.round((require('electron').screen.getPrimaryDisplay().workAreaSize.width / 2) - 140), y: 15,
        transparent: true, frame: false, alwaysOnTop: true, resizable: false,
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });
    win.loadFile('renderer.html');

    win.webContents.on('did-finish-load', () => {
        startWatching((effectiveLine, isColdStart, recoveryData) => {
            if (!win) return;
            if (isColdStart && recoveryData) {
                logParser.setWatermark(recoveryData.latestFileMaxTokens);
                logParser.setDayBaseline(recoveryData.dayTokensBaseline);
                return;
            }
            const result = logParser.parse(effectiveLine, isColdStart);
            if (result && result.action === 'send' && sessionManager.isActive()) {
                win.webContents.send('status-update', { 
                    state: 'working', detail: result.detail, tokens: result.tokens, dayTokens: result.dayTokens 
                });
            }
        });
    });
}

server.post('/status', (req, res) => {
    const { state, detail } = req.body;
    const sendFn = (payload) => { if (win) win.webContents.send('status-update', payload); };
    sessionManager.updateStatus(state, detail, sendFn);
    res.sendStatus(200);
});
server.listen(8080);

ipcMain.on('resize-window', (e, { width, height }) => { if (win) { win.setResizable(true); win.setSize((width === 220 || width === 250) ? 280 : width, (height === 80 || height === 96) ? 86 : height); win.setResizable(false); } });
ipcMain.on('terminal-log', (e, msg) => { console.log(msg); });
ipcMain.on('window-move', (e, { deltaX, deltaY }) => { if (win) { const [x, y] = win.getPosition(); win.setPosition(x + deltaX, y + deltaY); } });
ipcMain.on('close-app', () => app.quit());
app.whenReady().then(createWindow);