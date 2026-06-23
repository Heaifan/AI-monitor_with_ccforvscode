// src/engine/logParser.js
const costManager = require('../cost/costManager');

let roundStartTokens = 0;
let roundStartCost = 0;
let lastAbsoluteTotal = 0;
let lastAbsoluteCost = 0;
let dayBaselineTokens = 0;
let dayBaselineCost = 0;

function safeAdd(a, b) {
    const sum = (a || 0) + (b || 0);
    return Number.isNaN(sum) ? 0 : sum;
}

function estimateTextTokens(activeLines) {
    let interimTokens = 0;
    (activeLines || []).forEach((line) => {
        const textMatches = line.match(/"(text|content|thought|argument|name|stdout|stderr)":"((?:[^"\\]|\\.)*)"/g);
        if (!textMatches) return;
        textMatches.forEach((match) => {
            const val = match.split('":"')[1];
            if (!val || val.length <= 2) return;
            const chineseCount = (val.match(/[\u4e00-\u9fa5]/g) || []).length;
            interimTokens += Math.ceil((chineseCount * 0.6) + ((val.length - chineseCount) * 0.3));
        });
    });
    return interimTokens;
}

function detectDetail(activeLines) {
    const text = (activeLines || []).join('\n');
    if (text.includes('"tool_use"') || text.includes('"tool_result"') || text.includes('"stdout"')) {
        return '正在执行工具';
    }
    return '正在思考';
}

module.exports = {
    resetTurn: () => {
        roundStartTokens = lastAbsoluteTotal;
        roundStartCost = lastAbsoluteCost;
    },
    setWatermark: (tokens, cost, stableTokens = tokens, stableCost = cost) => {
        lastAbsoluteTotal = tokens || 0;
        lastAbsoluteCost = cost || 0;
        roundStartTokens = stableTokens || 0;
        roundStartCost = stableCost || 0;
    },
    setDayBaseline: (tokens, cost) => {
        dayBaselineTokens = tokens || 0;
        dayBaselineCost = cost || 0;
    },
    getRoundTokens: () => Math.max(0, lastAbsoluteTotal - roundStartTokens),
    getLiveDayTotal: () => safeAdd(dayBaselineTokens, lastAbsoluteTotal),
    getRoundCostStr: () => costManager.formatCost(Math.max(0, lastAbsoluteCost - roundStartCost)),
    getLiveDayCostStr: () => costManager.formatCost(safeAdd(dayBaselineCost, lastAbsoluteCost)),

    parse: (activeLines) => {
        const usage = costManager.getUniqueUsage(activeLines || []);
        const usageTokens = usage.totalTokens || 0;
        const usageCost = usage.cost || 0;
        const estimatedTokens = estimateTextTokens(activeLines);

        const liveRoundTokens = usageTokens > 0 ? usageTokens : estimatedTokens;
        const liveRoundCost = usageCost > 0 ? usageCost : costManager.getInterimCost(estimatedTokens);

        lastAbsoluteTotal = safeAdd(roundStartTokens, liveRoundTokens);
        lastAbsoluteCost = safeAdd(roundStartCost, liveRoundCost);

        return {
            action: 'send',
            state: 'working',
            detail: detectDetail(activeLines),
            tokens: String(Math.max(0, liveRoundTokens)),
            dayTokens: String(safeAdd(dayBaselineTokens, lastAbsoluteTotal)),
            costStr: costManager.formatCost(Math.max(0, liveRoundCost)),
            dayCostStr: costManager.formatCost(safeAdd(dayBaselineCost, lastAbsoluteCost))
        };
    }
};
