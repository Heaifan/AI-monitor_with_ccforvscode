const { ipcRenderer } = require('electron');

// 【默认单价修改锚点】：若本地无存盘记录，默认降级采用 0.028 (即 DeepSeek V4 Flash 综合加权单价)
let pricePerMillion = parseFloat(localStorage.getItem('cfg_price')) || 0.028;
let usdToCnyRate = parseFloat(localStorage.getItem('cfg_rate')) || 7.25;
let currentCurrency = 'CNY', isPanelOpen = false;

const displayEl = document.getElementById('cost-display');
const panelEl = document.getElementById('settings-panel');

module.exports = {
    setPrice: (p) => { pricePerMillion = p; localStorage.setItem('cfg_price', p); },
    setRate: (r) => { usdToCnyRate = r; localStorage.setItem('cfg_rate', r); },
    getPrice: () => pricePerMillion,
    getRate: () => usdToCnyRate,
    toggleCurrency: () => { currentCurrency = currentCurrency === 'USD' ? 'CNY' : 'USD'; return currentCurrency; },
    calculateCostString: (tokens) => {
        const costInUsd = (tokens / 1000000) * pricePerMillion;
        return currentCurrency === 'USD' ? `$${costInUsd.toFixed(4)}` : `￥${(costInUsd * usdToCnyRate).toFixed(3)}`;
    },
    togglePanel: () => { isPanelOpen = !isPanelOpen; return isPanelOpen; },
    closePanel: () => { isPanelOpen = false; },
    isOpen: () => isPanelOpen,
    fetchLiveRate: async () => {
        try {
            const res = await fetch('https://open.er-api.com/v6/latest/USD');
            const data = await res.json();
            if (data?.rates?.CNY) { 
                usdToCnyRate = parseFloat(data.rates.CNY); 
                localStorage.setItem('cfg_rate', usdToCnyRate); return usdToCnyRate; 
            }
        } catch (e) {}
        return null;
    }
};