const { ipcRenderer } = require('electron');
let isDragging = false, startX = 0, startY = 0;

function logToTerminal(msg) { console.log(msg); ipcRenderer.send('terminal-log', msg); }

module.exports = {
    init: (doms, costManager, historyLogger, getTokensCb, getDayTokensCb) => {
        logToTerminal('[PROBE-UI] 独立事件管理芯片通电...');
        
        document.getElementById('cfg-price').value = costManager.getPrice();
        document.getElementById('cfg-rate').value = costManager.getRate();

        doms.timerText.addEventListener('pointerdown', (e) => {
            e.stopPropagation(); const wasOpen = historyLogger.isOpen();
            costManager.closePanel(); doms.settingsPanel.style.display = 'none';
            if (wasOpen) {
                historyLogger.closePanel(); doms.auditPanel.style.display = 'none';
                ipcRenderer.send('resize-window', { width: 280, height: 86 });
            } else {
                historyLogger.togglePanel(); doms.auditPanel.style.display = 'block';
                ipcRenderer.send('resize-window', { width: 280, height: 340 }); 
            }
        });

        doms.tokenText.addEventListener('pointerdown', (e) => {
            e.stopPropagation(); const wasOpen = costManager.isOpen();
            historyLogger.closePanel(); doms.auditPanel.style.display = 'none';
            if (wasOpen) {
                costManager.closePanel(); doms.settingsPanel.style.display = 'none';
                ipcRenderer.send('resize-window', { width: 280, height: 86 });
            } else {
                costManager.togglePanel(); doms.settingsPanel.style.display = 'block';
                ipcRenderer.send('resize-window', { width: 280, height: 165 }); 
            }
        });

        const toggleCurrencyGlobal = (e) => {
            e.stopPropagation(); costManager.toggleCurrency();
            doms.costDisplay.innerText = costManager.calculateCostString(getTokensCb());
            doms.dayCostText.innerText = costManager.calculateCostString(getDayTokensCb());
        };
        doms.costDisplay.addEventListener('pointerdown', toggleCurrencyGlobal);
        doms.dayCostText.addEventListener('pointerdown', toggleCurrencyGlobal);

        document.getElementById('btn-save-cfg').addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            const p = parseFloat(document.getElementById('cfg-price').value) || 0;
            const r = parseFloat(document.getElementById('cfg-rate').value) || 1;
            costManager.setPrice(p); costManager.setRate(r);
            costManager.closePanel(); doms.settingsPanel.style.display = 'none';
            ipcRenderer.send('resize-window', { width: 280, height: 86 });
            doms.costDisplay.innerText = costManager.calculateCostString(getTokensCb());
            doms.dayCostText.innerText = costManager.calculateCostString(getDayTokensCb());
        });

        document.getElementById('rate-sync-status').addEventListener('pointerdown', async (e) => {
            e.stopPropagation(); const statusEl = document.getElementById('rate-sync-status'); statusEl.innerText = '[同步中...]';
            const rate = await costManager.fetchLiveRate();
            if (rate) { document.getElementById('cfg-rate').value = rate.toFixed(2); statusEl.innerText = '[同步成功]'; }
            else statusEl.innerText = '[固化值]';
        });

        document.getElementById('btn-copy-audit').addEventListener('pointerdown', (e) => {
            e.stopPropagation(); const txt = historyLogger.generateCopyText(); if (!txt) return;
            navigator.clipboard.writeText(txt); const btn = document.getElementById('btn-copy-audit'); btn.innerText = '复制成功！';
            setTimeout(() => btn.innerText = '一键复制文本', 1200);
        });

        doms.closeBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); ipcRenderer.send('close-app'); });

        document.body.addEventListener('pointerdown', (e) => {
            if (['close-btn','timer','token-counter','cost-display','day-cost-display','cfg-price','cfg-rate','btn-save-cfg','btn-copy-audit','rate-sync-status'].includes(e.target.id)) return;
            isDragging = true; startX = e.screenX; startY = e.screenY; document.body.setPointerCapture(e.pointerId);
        });
        document.body.addEventListener('pointermove', (e) => { if (!isDragging) return; ipcRenderer.send('window-move', { deltaX: e.screenX - startX, deltaY: e.screenY - startY }); startX = e.screenX; startY = e.screenY; });
        document.body.addEventListener('pointerup', (e) => { if (isDragging) { isDragging = false; document.body.releasePointerCapture(e.pointerId); } });
    }
};