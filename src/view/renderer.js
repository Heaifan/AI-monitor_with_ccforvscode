// src/view/renderer.js
const { ipcRenderer } = require('electron');

window.onerror = function(message, source, lineno, colno, error) {
    ipcRenderer.send('terminal-log', `【渲染进程:严重错误】线程异常：${message}`);
};

const costManager = require('./src/cost/costManager.js');
const historyLogger = require('./src/utils/historyLogger.js');
const eventHandler = require('./src/view/eventHandler.js');
const uiTimer = require('./src/view/uiTimer.js');
const domTruncator = require('./src/utils/domTruncator.js');
const audioChime = require('./src/utils/audioChime.js');

let lastRawTokens = 0, lastDayTokens = 0, lastLoggedToken = -1;
let lastProbeState = null;
let activeTurnStarted = false;

function formatTokenCount(tokens) {
    const value = tokens || 0;
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return String(value);
}

const doms = {
    statusText: document.getElementById('status-text'),
    logText: document.getElementById('log-text'),
    timerText: document.getElementById('timer'),
    tokenText: document.getElementById('token-counter'),
    costDisplay: document.getElementById('cost-display'),
    settingsPanel: document.getElementById('settings-panel'),
    auditPanel: document.getElementById('audit-panel'),
    tbodyEl: document.getElementById('audit-tbody'),
    closeBtn: document.getElementById('close-btn'),
    dayTokenText: document.getElementById('day-token-counter'),
    dayCostText: document.getElementById('day-cost-display')
};

eventHandler.init(doms, costManager, historyLogger, () => lastRawTokens, () => lastDayTokens);
console.log('【渲染探针】渲染进程已启动，DOM 事件已绑定');

ipcRenderer.on('status-update', (event, data) => {
    const { state, detail, tokens, dayTokens, costStr, dayCostStr, recoveredStartTime } = data;
    const rawTokens = parseInt(tokens || 0, 10);

    if (state !== lastProbeState) {
        console.log(`【渲染探针】收到状态更新：状态=${state || '未知'}，详情=${detail || ''}`);
        lastProbeState = state;
    }

    lastRawTokens = rawTokens;
    lastDayTokens = parseInt(dayTokens || 0, 10);

    if (doms.tokenText) doms.tokenText.innerText = formatTokenCount(rawTokens);
    if (doms.dayTokenText) doms.dayTokenText.innerText = formatTokenCount(lastDayTokens);
    if (doms.costDisplay) doms.costDisplay.innerText = costStr || '¥0.0000';
    if (doms.dayCostText) doms.dayCostText.innerText = dayCostStr || '¥0.0000';

    if (doms.statusText) doms.statusText.innerText = detail || '';
    const container = document.querySelector('.window-container') || document.body;
    if (container) {
        container.setAttribute('data-state', state);
        container.classList.remove('state-working', 'state-attention', 'state-done');
        if (state) container.classList.add(`state-${state}`);
    }

    if (state === 'working') {
        if (!activeTurnStarted) {
            activeTurnStarted = true;
            historyLogger.markStart(recoveredStartTime || Date.now());
            uiTimer.start(doms.timerText, recoveredStartTime);
        }
    } else if (state === 'done') {
        uiTimer.stop(doms.timerText);
        if (rawTokens > 0 && rawTokens !== lastLoggedToken) {
            lastLoggedToken = rawTokens;
            const row = historyLogger.markEnd(rawTokens, costStr || '¥0.0000');
            if (row && doms.tbodyEl) doms.tbodyEl.insertAdjacentHTML('beforeend', row);
            domTruncator.truncate(doms.tbodyEl, 50);
        }
        audioChime.play();
        activeTurnStarted = false;
    } else if (state !== 'attention') {
        uiTimer.stop(doms.timerText, true);
        activeTurnStarted = false;
    }

    document.body.offsetHeight;
});
