// src/engine/logParser.js
const costManager = require('../cost/costManager');

let roundTokens = 0;
let roundCost = 0;
let activeFileTokens = 0;
let activeFileCost = 0;
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
        roundTokens = 0;
        roundCost = 0;
    },
    setWatermark: (tokens, cost) => {
        activeFileTokens = tokens || 0;
        activeFileCost = cost || 0;
    },
    setDayBaseline: (tokens, cost) => {
        dayBaselineTokens = tokens || 0;
        dayBaselineCost = cost || 0;
    },
    getRoundTokens: () => Math.max(0, roundTokens),
    getLiveDayTotal: () => safeAdd(dayBaselineTokens, activeFileTokens),
    getRoundCostStr: () => costManager.formatCost(Math.max(0, roundCost)),
    getLiveDayCostStr: () => costManager.formatCost(safeAdd(dayBaselineCost, activeFileCost)),

    parse: (activeLines, fileStatus = null) => {
        activeFileTokens = fileStatus?.latestFileMaxTokens || activeFileTokens;
        activeFileCost = fileStatus?.latestFileMaxCost || activeFileCost;
        dayBaselineTokens = fileStatus?.dayTokensBaseline || dayBaselineTokens;
        dayBaselineCost = fileStatus?.dayCostBaseline || dayBaselineCost;

        const estimatedTokens = estimateTextTokens(activeLines);
        const taskDeltaTokens = fileStatus?.taskDeltaTokens || 0;
        const taskDeltaCost = fileStatus?.taskDeltaCost || 0;

        roundTokens = taskDeltaTokens > 0 ? taskDeltaTokens : estimatedTokens;
        roundCost = taskDeltaCost > 0 ? taskDeltaCost : costManager.getInterimCost(estimatedTokens);

        return {
            action: 'send',
            state: 'working',
            detail: detectDetail(activeLines),
            tokens: String(Math.max(0, roundTokens)),
            dayTokens: String(safeAdd(dayBaselineTokens, activeFileTokens)),
            costStr: costManager.formatCost(Math.max(0, roundCost)),
            dayCostStr: costManager.formatCost(safeAdd(dayBaselineCost, activeFileCost))
        };
    }
};
