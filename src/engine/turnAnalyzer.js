const fs = require('fs');
const path = require('path');
const costManager = require('../cost/costManager');

function computeFileMaxTokensAndCost(filePath) {
    let maxTokens = 0, maxCost = 0;
    try {
        fs.readFileSync(filePath, 'utf-8').split('\n').forEach(l => {
            const t = costManager.getLineTokens(l); if (t > maxTokens) maxTokens = t;
            // 【算法拉正】：开机底账扫描时，必须严格解构历史落盘行里的 usage 真实加权数据，断开与 Token 的纯乘积脱轨
            const c = costManager.getLineCost(l); if (c > maxCost) maxCost = c;
        });
    } catch (e) {}
    return { maxTokens: maxTokens || 0, maxCost: maxCost || 0 };
}

function analyzeActiveFile(filePath, dayTokensBaseline, dayCostBaseline) {
    try {
        const lines = fs.readFileSync(filePath, 'utf-8').trim().split('\n').map(l => l.trim()).filter(Boolean);
        let lastEndIdx = -1, prevEndIdx = -1;
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].includes('"stop_reason":"end_turn"')) {
                if (lastEndIdx === -1) lastEndIdx = i;
                else if (prevEndIdx === -1) { prevEndIdx = i; break; }
            }
        }
        let activeLines = [], isMidTurnActive = false, stableEndIdx = lastEndIdx;
        if (lastEndIdx !== -1 && lastEndIdx === lines.length - 1) {
            activeLines = lines.slice(prevEndIdx + 1, lastEndIdx + 1); isMidTurnActive = false; stableEndIdx = prevEndIdx;
        } else {
            activeLines = lines.slice(lastEndIdx + 1); isMidTurnActive = activeLines.length > 0; stableEndIdx = lastEndIdx;
        }
        let maxW = 0, maxC = 0, fileMaxT = 0, fileMaxC = 0;
        for (let i = 0; i <= stableEndIdx; i++) {
            const t = costManager.getLineTokens(lines[i]); if (t > maxW) maxW = t;
            const c = costManager.getLineCost(lines[i]); if (c > maxC) maxC = c;
        }
        for (let i = 0; i < lines.length; i++) {
            const t = costManager.getLineTokens(lines[i]); if (t > fileMaxT) fileMaxT = t;
            const c = costManager.getLineCost(lines[i]); if (c > fileMaxC) fileMaxC = c;
        }
        let startTs = null;
        for (let i = 0; i < activeLines.length; i++) {
            if (activeLines[i].includes('"timestamp"')) {
                const m = activeLines[i].match(/"timestamp":"([^"]+)"/); if (m) { startTs = new Date(m[1]).getTime(); break; }
            }
        }
        return { isMidTurnActive, watermarkTokens: maxW, watermarkCost: maxC, latestFileMaxTokens: fileMaxT, latestFileMaxCost: fileMaxC, dayTokensBaseline: dayTokensBaseline || 0, dayCostBaseline: dayCostBaseline || 0, activeLines, startTimestamp: startTs };
    } catch (e) {}
    return null;
}

module.exports = { computeFileMaxTokensAndCost, analyzeActiveFile };