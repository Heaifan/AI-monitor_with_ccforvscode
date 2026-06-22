const { app, BrowserWindow, ipcMain } = require('electron');
const express = require('express');
const { startWatching } = require('./logWatcher');
const logParser = require('./logParser');

let win, httpTimer = null;
const server = express();
server.use(express.json());

function createWindow() {
    // 【架构加宽拉长】：标准外壳全面拓展至 280px 宽、86px 高，为大字体横摆提供充沛空间
    win = new BrowserWindow({
        width: 280, height: 86, x: Math.round((require('electron').screen.getPrimaryDisplay().workAreaSize.width / 2) - 140), y: 15,
        transparent: true, frame: false, alwaysOnTop: true, resizable: false,
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });
    win.loadFile('renderer.html');
    console.log('[PROBE-MAIN] 280x86 宽幅工业视窗外壳就绪。');

    win.webContents.on('did-finish-load', () => {
        startWatching((effectiveLine, isColdStart, recoveryData) => {
            if (!win) return;
            if (isColdStart && recoveryData) {
                logParser.setWatermark(recoveryData.watermark);
                const initialDayTotal = recoveryData.dayTokensBaseline + recoveryData.latestFileMaxTokens;
                const turnDelta = recoveryData.isMidTurnActive ? Math.max(0, recoveryData.totalTokens - recoveryData.watermark) : 0;
                win.webContents.send('status-update', { 
                    state: recoveryData.isMidTurnActive ? 'working' : 'done',
                    detail: recoveryData.isMidTurnActive ? '多维内核深度思考' : '输出答案完毕', 
                    tokens: String(turnDelta), dayTokens: String(initialDayTotal),
                    recoveredStartTime: recoveryData.isMidTurnActive ? recoveryData.startTimestamp : null 
                });
                return;
            }
            const result = logParser.parse(effectiveLine, isColdStart);
            if (result && result.action === 'send') {
                const liveDayTotal = (recoveryData ? recoveryData.dayTokensBaseline : 0) + parseInt(result.dayTokens || 0, 10);
                win.webContents.send('status-update', { state: result.state, detail: result.detail, tokens: result.tokens, dayTokens: String(liveDayTotal) });
            }
        });
    });
}

server.post('/status', (req, res) => {
    const { state, detail } = req.body;
    if (state === 'working') logParser.resetTurn();
    if (win) win.webContents.send('status-update', { state, detail, tokens: '0', dayTokens: '0' });
    if (httpTimer) clearTimeout(httpTimer);
    if (state === 'working') {
        httpTimer = setTimeout(() => { if (win) win.webContents.send('status-update', { state: 'done', detail: '输出答案完毕', tokens: '0', dayTokens: '0' }); }, 3000);
    }
    res.sendStatus(200);
});
server.listen(8080);

ipcMain.on('resize-window', (e, { width, height }) => {
    if (!win) return; win.setResizable(true);
    // 对齐 280 物理基准线变形变换
    const targetW = (width === 220 || width === 250) ? 280 : width;
    const targetH = (height === 80 || height === 96) ? 86 : height;
    win.setSize(targetW, targetH); win.setResizable(false);
});
ipcMain.on('terminal-log', (e, msg) => { console.log(msg); });
ipcMain.on('window-move', (e, { deltaX, deltaY }) => { if (win) { const [x, y] = win.getPosition(); win.setPosition(x + deltaX, y + deltaY); } });
ipcMain.on('close-app', () => app.quit());
app.whenReady().then(createWindow);