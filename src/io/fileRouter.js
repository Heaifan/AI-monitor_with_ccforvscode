const path = require('path');
const logWatcher = require('./logWatcher');
const fileScanner = require('./fileScanner');
const turnAnalyzer = require('../engine/turnAnalyzer');

let currentActiveFile = null;

module.exports = {
    bindRoute: (onRouteMessage) => {
        console.log(`【日志路由】正在绑定日志目录：${fileScanner.getLogPath()}`);
        const todayFiles = fileScanner.getTodayJsonlFiles();
        console.log(`【日志路由】冷启动扫描到 ${todayFiles.length} 个今日日志文件`);
        if (todayFiles.length > 0) {
            todayFiles.sort((a, b) => b.mtime - a.mtime); currentActiveFile = todayFiles[0].filePath;
            console.log(`【日志路由】当前活跃日志：${path.basename(currentActiveFile)}`);
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
            console.log('【日志路由】暂未发现今日日志，等待监听器捕获新写入');
        }
        logWatcher.watch((filePath) => {
            console.log(`【日志路由】收到文件变更：${path.basename(filePath)}`);
            if (currentActiveFile && filePath !== currentActiveFile) {
                console.log(`【日志路由】活跃日志已切换到：${path.basename(filePath)}`);
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
