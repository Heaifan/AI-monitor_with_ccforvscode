const { ipcRenderer } = require('electron');
const path = require('path');

window.onerror = function(message, source, lineno, colno, error) {
    ipcRenderer.send('terminal-log', `[CRITICAL-RENDERER-ERROR] 线程异常: ${message} 在 ${lineno}行`);
};

const costManager = require(path.join(__dirname, 'src', 'costManager.js'));
const historyLogger = require(path.join(__dirname, 'src', 'historyLogger.js'));
const eventHandler = require(path.join(__dirname, 'src', 'eventHandler.js')); 

let timerId = null, startTime = 0, lastRawTokens = 0, lastDayTokens = 0, lastLoggedToken = -1;

// 【核心修复】：重新全量注入因重构意外遗失的水晶音效芯片，彻底扑灭 playCrystalChime 未定义报错
function playCrystalChime() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)(); const now = ctx.currentTime;
    const strike = (freq, sTime, vol) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, sTime);
        gain.gain.setValueAtTime(vol, sTime); gain.gain.exponentialRampToValueAtTime(0.001, sTime + 0.3);
        osc.connect(gain); gain.connect(ctx.destination); osc.start(sTime); osc.stop(sTime + 0.3);
    };
    strike(2800, now, 0.4); strike(3400, now + 0.06, 0.35); strike(4000, now + 0.12, 0.3);
}

const doms = {
    statusText: document.getElementById('status-text'), logText: document.getElementById('log-text'),
    timerText: document.getElementById('timer'), tokenText: document.getElementById('token-counter'),
    costDisplay: document.getElementById('cost-display'), settingsPanel: document.getElementById('settings-panel'),
    auditPanel: document.getElementById('audit-panel'), tbodyEl: document.getElementById('audit-tbody'),
    closeBtn: document.getElementById('close-btn'),
    dayTokenText: document.getElementById('day-token-counter'), dayCostText: document.getElementById('day-cost-display')
};

eventHandler.init(doms, costManager, historyLogger, () => lastRawTokens, () => lastDayTokens);

(async () => {
    ipcRenderer.send('terminal-log', '[PROBE-INIT] 启动开机全自动汇率校准对齐流...');
    const liveRate = await costManager.fetchLiveRate();
    if (liveRate && document.getElementById('cfg-rate')) document.getElementById('cfg-rate').value = liveRate.toFixed(2);
})();

ipcRenderer.on('status-update', (event, data) => {
    const { state, detail, tokens, dayTokens } = data;
    const rawTokens = parseInt(tokens || 0, 10);
    const dayRawTokens = parseInt(dayTokens || 0, 10);
    lastRawTokens = rawTokens;
    lastDayTokens = dayRawTokens;
    
    doms.tokenText.innerText = `${(rawTokens / 1000).toFixed(1)}K`;
    doms.costDisplay.innerText = costManager.calculateCostString(rawTokens);
    
    doms.dayTokenText.innerText = `${(dayRawTokens / 1000).toFixed(1)}K`;
    doms.dayCostText.innerText = costManager.calculateCostString(dayRawTokens);

    if (state === 'working') {
        document.body.className = 'state-working'; doms.statusText.innerText = 'AI 正在计算'; doms.logText.innerText = detail || '正在执行计算';
        if (!timerId) {
            startTime = data.recoveredStartTime ? data.recoveredStartTime : Date.now();
            timerId = setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                doms.timerText.innerText = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
            }, 1000); historyLogger.markStart(startTime);
        }
    } else if (state === 'attention') { document.body.className = 'state-attention'; doms.statusText.innerText = '等待用户介入'; }
    else if (state === 'done') {
        document.body.className = 'state-done'; doms.statusText.innerText = '任务已完成'; doms.logText.innerText = '输出答案完毕';
        if (timerId) { clearInterval(timerId); timerId = null; }
        if (rawTokens > 0 && rawTokens !== lastLoggedToken) {
            lastLoggedToken = rawTokens;
            const row = historyLogger.markEnd(rawTokens, doms.costDisplay.innerText);
            if (row) doms.tbodyEl.insertAdjacentHTML('beforeend', row);
        }
        playCrystalChime(); // 这里已经满血复活！
    } else { document.body.className = ''; doms.statusText.innerText = '系统待机'; doms.logText.innerText = '等待指令'; if (timerId) { clearInterval(timerId); timerId = null; } doms.timerText.innerText = '00:00'; }
    document.body.offsetHeight;
});