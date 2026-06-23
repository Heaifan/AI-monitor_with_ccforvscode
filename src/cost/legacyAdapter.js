// src/cost/legacyAdapter.js
module.exports = {
    bindLegacyMethods: (facade) => {
        facade.getRate = () => 1.0;
        facade.getPrice = () => 0.000001;
        facade.isOpen = () => false;
        facade.togglePanel = () => {};     // 绝杀点击黑色 token 时的踩空
        facade.closePanel = () => {};      // 绝杀关闭配置面板时的爆红
        facade.toggleCurrency = () => {};
        facade.getHistoryCost = () => 0;
        facade.calculateCostString = (tokens) => `¥${((tokens || 0) * 0.000001).toFixed(4)}`;
    }
};