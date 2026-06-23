// src/view/eventHandler.js
const { ipcRenderer } = require('electron');

let isDragging = false;
let startX = 0;
let startY = 0;
let openPanel = null;

const collapsedSize = { width: 280, height: 86 };
const settingsSize = { width: 280, height: 165 };
const auditSize = { width: 280, height: 340 };

function resizeWindow(size) {
    ipcRenderer.send('resize-window', size);
}

function setPanelVisible(panel, visible) {
    if (!panel) return;
    panel.style.display = visible ? 'block' : 'none';
    panel.classList.toggle('active', visible);
    panel.classList.toggle('visible', visible);
}

function collapsePanels(doms) {
    setPanelVisible(doms.settingsPanel, false);
    setPanelVisible(doms.auditPanel, false);
    openPanel = null;
    resizeWindow(collapsedSize);
}

function showSettings(doms) {
    setPanelVisible(doms.auditPanel, false);
    setPanelVisible(doms.settingsPanel, true);
    openPanel = 'settings';
    resizeWindow(settingsSize);
}

function showAudit(doms) {
    setPanelVisible(doms.settingsPanel, false);
    setPanelVisible(doms.auditPanel, true);
    openPanel = 'audit';
    resizeWindow(auditSize);
}

function bindPointer(el, handler) {
    if (!el) return;
    el.addEventListener('pointerdown', handler);
}

module.exports = {
    init: (doms, costManager, historyLogger, getTokensFn, getDayTokensFn) => {
        if (!doms) return;

        const cfgPrice = document.getElementById('cfg-price');
        const cfgRate = document.getElementById('cfg-rate');
        const rateStatus = document.getElementById('rate-sync-status');
        const saveBtn = document.getElementById('btn-save-cfg');
        const copyBtn = document.getElementById('btn-copy-audit');

        if (cfgPrice && costManager.getPrice) cfgPrice.value = costManager.getPrice();
        if (cfgRate && costManager.getRate) cfgRate.value = costManager.getRate();

        bindPointer(doms.timerText, (e) => {
            e.stopPropagation();
            if (openPanel === 'audit') collapsePanels(doms);
            else showAudit(doms);
        });

        bindPointer(doms.tokenText, (e) => {
            e.stopPropagation();
            if (openPanel === 'settings') collapsePanels(doms);
            else showSettings(doms);
        });

        const refreshCostText = () => {
            if (doms.costDisplay && costManager.calculateCostString) {
                doms.costDisplay.innerText = costManager.calculateCostString(getTokensFn());
            }
            if (doms.dayCostText && costManager.calculateCostString) {
                doms.dayCostText.innerText = costManager.calculateCostString(getDayTokensFn());
            }
        };

        const toggleCurrency = (e) => {
            e.stopPropagation();
            if (costManager.toggleCurrency) costManager.toggleCurrency();
            refreshCostText();
        };
        bindPointer(doms.costDisplay, toggleCurrency);
        bindPointer(doms.dayCostText, toggleCurrency);

        bindPointer(saveBtn, (e) => {
            e.stopPropagation();
            if (costManager.setPrice && cfgPrice) costManager.setPrice(parseFloat(cfgPrice.value) || 0);
            if (costManager.setRate && cfgRate) costManager.setRate(parseFloat(cfgRate.value) || 1);
            collapsePanels(doms);
            refreshCostText();
        });

        bindPointer(rateStatus, async (e) => {
            e.stopPropagation();
            if (!rateStatus || !cfgRate || !costManager.fetchLiveRate) return;
            rateStatus.innerText = '[同步中...]';
            const rate = await costManager.fetchLiveRate();
            if (rate) {
                cfgRate.value = rate.toFixed(2);
                rateStatus.innerText = '[同步成功]';
            } else {
                rateStatus.innerText = '[固化值]';
            }
        });

        bindPointer(copyBtn, (e) => {
            e.stopPropagation();
            const txt = historyLogger.generateCopyText();
            if (!txt) return;
            navigator.clipboard.writeText(txt);
            copyBtn.innerText = '复制成功！';
            setTimeout(() => { copyBtn.innerText = '一键复制文本'; }, 1200);
        });

        bindPointer(doms.closeBtn, (e) => {
            e.stopPropagation();
            ipcRenderer.send('close-app');
        });

        [doms.settingsPanel, doms.auditPanel].forEach((panel) => {
            if (!panel) return;
            panel.addEventListener('pointerdown', (e) => e.stopPropagation());
        });

        document.body.addEventListener('pointerdown', (e) => {
            const blockedIds = [
                'close-btn', 'timer', 'token-counter', 'cost-display', 'day-cost-display',
                'cfg-price', 'cfg-rate', 'btn-save-cfg', 'btn-copy-audit', 'rate-sync-status'
            ];
            if (blockedIds.includes(e.target.id)) return;
            isDragging = true;
            startX = e.screenX;
            startY = e.screenY;
            document.body.setPointerCapture(e.pointerId);
        });

        document.body.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            ipcRenderer.send('window-move', {
                deltaX: e.screenX - startX,
                deltaY: e.screenY - startY
            });
            startX = e.screenX;
            startY = e.screenY;
        });

        document.body.addEventListener('pointerup', (e) => {
            if (!isDragging) return;
            isDragging = false;
            document.body.releasePointerCapture(e.pointerId);
        });

        console.log('【交互探针】点击、拖动、复制与面板事件已绑定');
    }
};
