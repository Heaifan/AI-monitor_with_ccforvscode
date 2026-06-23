// src/engine/turnAnalyzer.js
const fs = require('fs');
const costManager = require('../cost/costManager');

function readJsonlLines(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf-8')
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
    } catch (e) {
        return [];
    }
}

function isTodayLine(line) {
    const match = line.match(/"timestamp":"([^"]+)"/);
    if (!match) return true;
    const timestamp = new Date(match[1]);
    const today = new Date();
    return timestamp.getFullYear() === today.getFullYear() &&
        timestamp.getMonth() === today.getMonth() &&
        timestamp.getDate() === today.getDate();
}

function getTodayLines(filePath) {
    return readJsonlLines(filePath).filter(isTodayLine);
}

function computeUsageFromLines(lines) {
    const usage = costManager.getUniqueUsage(lines);
    return {
        maxTokens: usage.totalTokens || 0,
        maxCost: usage.cost || 0,
        usage
    };
}

function computeFileMaxTokensAndCost(filePath) {
    return computeUsageFromLines(getTodayLines(filePath));
}

function computeFilesMaxTokensAndCost(filePaths) {
    const lines = [];
    (filePaths || []).forEach((filePath) => {
        lines.push(...getTodayLines(filePath));
    });
    return computeUsageFromLines(lines);
}

function findTurnBoundary(lines) {
    let lastEndIdx = -1;
    let prevEndIdx = -1;

    for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].includes('"stop_reason":"end_turn"')) {
            if (lastEndIdx === -1) lastEndIdx = i;
            else if (prevEndIdx === -1) {
                prevEndIdx = i;
                break;
            }
        }
    }

    return { lastEndIdx, prevEndIdx };
}

function analyzeActiveFile(filePath, dayTokensBaseline, dayCostBaseline) {
    const lines = getTodayLines(filePath);
    if (lines.length === 0) return null;

    const { lastEndIdx, prevEndIdx } = findTurnBoundary(lines);
    let activeLines = [];
    let isMidTurnActive = false;
    let stableEndIdx = lastEndIdx;

    if (lastEndIdx !== -1 && lastEndIdx === lines.length - 1) {
        activeLines = lines.slice(prevEndIdx + 1, lastEndIdx + 1);
        stableEndIdx = prevEndIdx;
    } else {
        activeLines = lines.slice(lastEndIdx + 1);
        isMidTurnActive = activeLines.length > 0;
        stableEndIdx = lastEndIdx;
    }

    const stableLines = stableEndIdx >= 0 ? lines.slice(0, stableEndIdx + 1) : [];
    const stableUsage = computeUsageFromLines(stableLines);
    const fileUsage = computeUsageFromLines(lines);

    let startTs = null;
    for (const line of activeLines) {
        if (!line.includes('"timestamp"')) continue;
        const match = line.match(/"timestamp":"([^"]+)"/);
        if (match) {
            startTs = new Date(match[1]).getTime();
            break;
        }
    }

    return {
        isMidTurnActive,
        watermarkTokens: stableUsage.maxTokens,
        watermarkCost: stableUsage.maxCost,
        latestFileMaxTokens: fileUsage.maxTokens,
        latestFileMaxCost: fileUsage.maxCost,
        dayTokensBaseline: dayTokensBaseline || 0,
        dayCostBaseline: dayCostBaseline || 0,
        activeLines,
        startTimestamp: startTs
    };
}

module.exports = { computeFileMaxTokensAndCost, computeFilesMaxTokensAndCost, analyzeActiveFile };
