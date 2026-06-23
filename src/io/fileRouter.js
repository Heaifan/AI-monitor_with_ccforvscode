const path = require('path');
const logWatcher = require('./logWatcher');
const fileScanner = require('./fileScanner');
const turnAnalyzer = require('../engine/turnAnalyzer');

let currentActiveFile = null;

module.exports = {
    bindRoute: (onRouteMessage) => {
        console.log(`[PROBE-ROUTER] binding log route from ${fileScanner.getLogPath()}`);
        const todayFiles = fileScanner.getTodayJsonlFiles();
        console.log(`[PROBE-ROUTER] cold scan found ${todayFiles.length} jsonl file(s) for today`);
        if (todayFiles.length > 0) {
            todayFiles.sort((a, b) => b.mtime - a.mtime); currentActiveFile = todayFiles[0].filePath;
            console.log(`[PROBE-ROUTER] active log file: ${path.basename(currentActiveFile)}`);
            let baselineT = 0, baselineC = 0;
            todayFiles.forEach(f => {
                if (f.filePath !== currentActiveFile) {
                    const res = turnAnalyzer.computeFileMaxTokensAndCost(f.filePath);
                    baselineT += res.maxTokens; baselineC += res.maxCost;
                }
            });
            const res = turnAnalyzer.analyzeActiveFile(currentActiveFile, baselineT, baselineC);
            if (res) onRouteMessage(res.activeLines, true, res);
        } else {
            console.log('[PROBE-ROUTER] no current-day jsonl files yet; waiting for watcher events');
        }
        logWatcher.watch((filePath) => {
            console.log(`[PROBE-ROUTER] routed change from ${path.basename(filePath)}`);
            if (currentActiveFile && filePath !== currentActiveFile) {
                console.log(`[PROBE-ROUTER] active log switched to ${path.basename(filePath)}`);
                console.log(`[PROBE-ROUTER] 检测到工作空间跨项目横转: ${path.basename(filePath)}`);
                let liveT = 0, liveC = 0;
                fileScanner.getTodayJsonlFiles().forEach(f => {
                    if (f.filePath !== filePath) {
                        const res = turnAnalyzer.computeFileMaxTokensAndCost(f.filePath);
                        liveT += res.maxTokens; liveC += res.maxCost;
                    }
                });
                const liveRes = turnAnalyzer.analyzeActiveFile(filePath, liveT, liveC); currentActiveFile = filePath;
                if (liveRes) onRouteMessage(liveRes.activeLines, true, liveRes);
                return;
            }
            let liveT = 0, liveC = 0;
            fileScanner.getTodayJsonlFiles().forEach(f => {
                if (f.filePath !== filePath) {
                    const res = turnAnalyzer.computeFileMaxTokensAndCost(f.filePath);
                    liveT += res.maxTokens; liveC += res.maxCost;
                }
            });
            const res = turnAnalyzer.analyzeActiveFile(filePath, liveT, liveC);
            if (res) onRouteMessage(res.activeLines, false, res);
        });
    }
};
