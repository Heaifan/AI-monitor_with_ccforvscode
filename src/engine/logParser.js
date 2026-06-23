const costManager = require('../cost/costManager');

let roundStartTokens = 0, roundStartCost = 0;
let lastAbsoluteTotal = 0, lastAbsoluteCost = 0;
let dayBaselineTokens = 0, dayBaselineCost = 0;

function safeAdd(a, b) { const sum = (a || 0) + (b || 0); return Number.isNaN(sum) ? 0 : sum; }

module.exports = {
    resetTurn: () => { roundStartTokens = lastAbsoluteTotal; roundStartCost = lastAbsoluteCost; },
    setWatermark: (tokens, cost) => { lastAbsoluteTotal = tokens || 0; roundStartTokens = tokens || 0; lastAbsoluteCost = cost || 0; roundStartCost = cost || 0; },
    setDayBaseline: (tokens, cost) => { dayBaselineTokens = tokens || 0; dayBaselineCost = cost || 0; },
    getRoundTokens: () => Math.max(0, lastAbsoluteTotal - roundStartTokens),
    getLiveDayTotal: () => safeAdd(dayBaselineTokens, lastAbsoluteTotal),
    getRoundCostStr: () => costManager.formatCost(Math.max(0, lastAbsoluteCost - roundStartCost)),
    getLiveDayCostStr: () => costManager.formatCost(safeAdd(dayBaselineCost, lastAbsoluteCost)),
    
    parse: (activeLines) => {
        let roundTokens = Math.max(0, lastAbsoluteTotal - roundStartTokens);
        let roundCost = Math.max(0, lastAbsoluteCost - roundStartCost);
        if (!activeLines || activeLines.length === 0) {
            return { action: 'send', detail: '多维内核深度思考', tokens: String(roundTokens), dayTokens: String(safeAdd(dayBaselineTokens, lastAbsoluteTotal)), costStr: costManager.formatCost(roundCost), dayCostStr: costManager.formatCost(safeAdd(dayBaselineCost, lastAbsoluteCost)) };
        }
        let interimTokens = 0, detailText = '多维内核深度思考';
        activeLines.forEach(line => {
            const t = costManager.getLineTokens(line); if (t > 0) lastAbsoluteTotal = t;
            const c = costManager.getLineCost(line); if (c > 0) lastAbsoluteCost = c;
            if (line.includes('"tool_use"') || line.includes('"tool_result"') || line.includes('"stdout"')) detailText = '正在执行沙箱工具';
            const textMatches = line.match(/"(text|content|thought|argument|name|stdout|stderr)":"((?:[^"\\\\]|\\\\.)*)"/g);
            if (textMatches) {
                textMatches.forEach(m => {
                    const val = m.split('":"')[1];
                    if (val && val.length > 2) {
                        const chineseCount = (val.match(/[\u4e00-\u9fa5]/g) || []).length;
                        interimTokens += Math.ceil((chineseCount * 0.6) + ((val.length - chineseCount) * 0.3));
                    }
                });
            }
        });
        const finalInterimTokens = Math.max(interimTokens, lastAbsoluteTotal - roundStartTokens);
        let liveRoundCost = Math.max(costManager.getInterimCost(interimTokens), lastAbsoluteCost - roundStartCost);
        if (lastAbsoluteCost > 0 && (lastAbsoluteCost - roundStartCost) > liveRoundCost) liveRoundCost = lastAbsoluteCost - roundStartCost;
        return { action: 'send', state: 'working', detail: detailText, tokens: String(finalInterimTokens), dayTokens: String(safeAdd(safeAdd(dayBaselineTokens, roundStartTokens), finalInterimTokens)), costStr: costManager.formatCost(liveRoundCost), dayCostStr: costManager.formatCost(safeAdd(dayBaselineCost, safeAdd(roundStartCost, liveRoundCost))) };
    }
};