const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');

let changeThrottleTimer = null; // 流式数据重绘节流拦截器

function getLinesTokens(line) {
    if (!line || !line.includes('"usage"')) return 0;
    const inM = line.match(/"input_tokens":\s*(\d+)/);
    const outM = line.match(/"output_tokens":\s*(\d+)/);
    const caM = line.match(/"cache_read_input_tokens":\s*(\d+)/);
    return (inM ? parseInt(inM[1],10) : 0) + (outM ? parseInt(outM[1],10) : 0) + (caM ? parseInt(caM[1],10) : 0);
}

function getTodayJsonlFiles(dir) {
    const todayStr = new Date().toDateString(); let filesList = [];
    try {
        const subdirs = fs.readdirSync(dir);
        for (const subdir of subdirs) {
            const subdirPath = path.join(dir, subdir);
            if (fs.statSync(subdirPath).isDirectory()) {
                fs.readdirSync(subdirPath).forEach(file => {
                    if (file.endsWith('.jsonl')) {
                        const filePath = path.join(subdirPath, file); const stat = fs.statSync(filePath);
                        if (stat.mtime.toDateString() === todayStr) filesList.push({ filePath, mtime: stat.mtime.getTime() });
                    }
                });
            }
        }
    } catch (e) {}
    return filesList;
}

function computeFileMaxTokens(filePath) {
    try {
        let max = 0;
        fs.readFileSync(filePath, 'utf-8').split('\n').forEach(line => { const t = getLinesTokens(line); if (t > max) max = t; });
        return max;
    } catch (e) { return 0; }
}

function analyzeActiveFile(filePath, dayTokensBaseline) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8').trim(); if (!content) return null;
        const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
        let lastEndTurnIdx = -1, latestFileMaxTokens = 0;
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].includes('"stop_reason":"end_turn"') && lastEndTurnIdx === -1) lastEndTurnIdx = i;
            const t = getLinesTokens(lines[i]); if (t > latestFileMaxTokens) latestFileMaxTokens = t;
        }
        let watermark = 0;
        for (let i = 0; i <= lastEndTurnIdx; i++) { const t = getLinesTokens(lines[i]); if (t > watermark) watermark = t; }
        const activeLines = lines.slice(lastEndTurnIdx + 1);
        if (activeLines.length === 0) return { isMidTurnActive: false, watermark, latestFileMaxTokens, dayTokensBaseline, lastLine: lines[lines.length - 1] };
        let totalTokens = 0, startTimestamp = null;
        activeLines.forEach(line => {
            if (line.includes('"timestamp"') && !startTimestamp) { const m = line.match(/"timestamp":"([^"]+)"/); if (m) startTimestamp = new Date(m[1]).getTime(); }
            const t = getLinesTokens(line); if (t > totalTokens) totalTokens = t;
        });
        return { isMidTurnActive: true, startTimestamp, totalTokens, watermark, latestFileMaxTokens, dayTokensBaseline, lastLine: activeLines[activeLines.length - 1] };
    } catch (e) {}
    return null;
}

function startWatching(onLogMessage) {
    const logPath = path.join(process.env.USERPROFILE, '.claude', 'projects');
    const todayFiles = getTodayJsonlFiles(logPath); if (todayFiles.length === 0) return;
    todayFiles.sort((a, b) => b.mtime - a.mtime); const latestFile = todayFiles[0].filePath;
    let dayTokensBaseline = 0;
    todayFiles.forEach(f => { if (f.filePath !== latestFile) dayTokensBaseline += computeFileMaxTokens(f.filePath); });
    const recoveryData = analyzeActiveFile(latestFile, dayTokensBaseline);
    if (recoveryData) onLogMessage(recoveryData.lastLine, true, recoveryData);
    
    chokidar.watch(logPath).on('change', (filePath) => {
        if (!filePath.endsWith('.jsonl')) return;
        // 【I/O 降频节流阀】：将流式高频刷写强制合并，防止微秒级重绘引发 CPU 发生不必要抖动
        if (changeThrottleTimer) return;
        changeThrottleTimer = setTimeout(() => {
            changeThrottleTimer = null;
            const content = fs.readFileSync(filePath, 'utf-8').trim(); if (!content) return;
            const lines = content.split('\n'), lastLine = lines[lines.length - 1]?.trim();
            if (lastLine) onLogMessage(lastLine, false, recoveryData);
        }, 60);
    });
}

module.exports = { startWatching };