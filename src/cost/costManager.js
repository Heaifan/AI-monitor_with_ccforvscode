// src/cost/costManager.js
const billingEngine = require('./billingEngine');
const legacyAdapter = require('./legacyAdapter');

const facade = {
    fetchLiveRate: async () => 1.0,
    getLineUsage: (line) => billingEngine.parseLineUsage(line),
    getUniqueUsage: (lines) => billingEngine.computeUniqueUsage(lines),
    getUniqueUsageMap: (lines) => billingEngine.collectUniqueUsages(lines),
    getUsageDelta: (lines, baselineKeys) => billingEngine.computeUsageDelta(lines, baselineKeys),
    getLineTokens: (line) => billingEngine.computeLineTokens(line),
    getLineCost: (line) => billingEngine.computeLineCost(line),
    getInterimCost: (tokens) => billingEngine.getInterimCost(tokens),
    formatCost: (val) => `¥${(val || 0).toFixed(4)}`
};

legacyAdapter.bindLegacyMethods(facade);

module.exports = facade;
