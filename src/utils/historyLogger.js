// src/utils/historyLogger.js
let logs = [];
let currentLog = null;

const pad = (num) => String(num).padStart(2, '0');
const formatTime = (ts) => {
    const d = new Date(ts); 
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

module.exports = {
    markStart: (ts) => { 
        currentLog = { rawStart: ts, start: formatTime(ts) }; 
    },
    markEnd: (tokens, costStr) => {
        if (!currentLog) return null;
        const now = Date.now();
        const durationSec = Math.floor((now - currentLog.rawStart) / 1000);
        
        currentLog.end = formatTime(now);
        currentLog.duration = `${pad(Math.floor(durationSec / 60))}:${pad(durationSec % 60)}`;
        currentLog.tokens = `${(tokens / 1000).toFixed(1)}K`; 
        currentLog.cost = costStr;
        
        logs.push(currentLog);
        
        const rowHtml = `<tr><td>${currentLog.start}</td><td>${currentLog.duration}</td><td>${currentLog.tokens}</td><td>${currentLog.cost}</td></tr>`;
        currentLog = null; 
        return rowHtml;
    },
    generateCopyText: () => {
        if (logs.length === 0) return '';
        let txt = `=== AI 运行状况审计矩阵报告 ===\n序号 | 启动时间 | 结束时间 | 历时 | Token量 | 开销估算\n---|---|---|---|---|---\n`;
        logs.forEach((l, idx) => { 
            txt += `${idx + 1} | ${l.start} | ${l.end} | ${l.duration} | ${l.tokens} | ${l.cost}\n`; 
        });
        return txt;
    },
    hasLogs: () => logs.length > 0
};