// src/cost/costManager.js
const billingEngine = require('./billingEngine');
const legacyAdapter = require('./legacyAdapter');

const facade = {
    fetchLiveRate: async () => 1.0,
    getLineTokens: (line) => billingEngine.computeLineTokens(line),
    getLineCost: (line) => billingEngine.computeLineCost(line),
    getInterimCost: (tokens) => billingEngine.getInterimCost(tokens),
    formatCost: (val) => `¥${(val || 0).toFixed(4)}`
};

// 一口气无损熔断注入老代码所急需的全部兼容垫片，死锁前台图形主循环
legacyAdapter.bindLegacyMethods(facade);

module.exports = facade;