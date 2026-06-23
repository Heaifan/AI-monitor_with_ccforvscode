// src/io/fileRouter.js
const path = require('path');
const logWatcher = require('./logWatcher');
const fileScanner = require('./fileScanner');
const turnAnalyzer = require('../engine/turnAnalyzer');

let currentActiveFile = null;
let taskBaselineKeys = null;

function getTodayFilePaths() {
    const todayFiles = fileScanner.getTodayJsonlFiles();
    return {
        todayFiles,
        filePaths: todayFiles.map((file) => file.filePath)
    };
}

function getDayBaselineForActive(activeFilePath) {
    const { todayFiles, filePaths } = getTodayFilePaths();
    const dayUsage = turnAnalyzer.computeFilesMaxTokensAndCost(filePaths);
    const activeUsage = turnAnalyzer.computeFileMaxTokensAndCost(activeFilePath);

    return {
        tokens: Math.max(0, dayUsage.maxTokens - activeUsage.maxTokens),
        cost: Math.max(0, dayUsage.maxCost - activeUsage.maxCost),
        todayFiles
    };
}

function resetTaskBaseline() {
    const { filePaths } = getTodayFilePaths();
    taskBaselineKeys = turnAnalyzer.getUsageKeysFromFiles(filePaths);
}

function getTaskDelta() {
    if (!taskBaselineKeys) return { maxTokens: 0, maxCost: 0 };
    const { filePaths } = getTodayFilePaths();
    return turnAnalyzer.computeUsageDeltaFromFiles(filePaths, taskBaselineKeys);
}

function routeFile(filePath, isColdStart, onRouteMessage) {
    const baseline = getDayBaselineForActive(filePath);
    const result = turnAnalyzer.analyzeActiveFile(filePath, baseline.tokens, baseline.cost);
    if (result) {
        result.taskDeltaTokens = getTaskDelta().maxTokens;
        result.taskDeltaCost = getTaskDelta().maxCost;
        onRouteMessage(result.activeLines, isColdStart, result);
    }
}

module.exports = {
    bindRoute: (onRouteMessage) => {
        console.log(`【日志路由】正在绑定日志目录：${fileScanner.getLogPath()}`);
        const todayFiles = fileScanner.getTodayJsonlFiles();
        console.log(`【日志路由】冷启动扫描到 ${todayFiles.length} 个今日日志文件`);

        if (todayFiles.length > 0) {
            todayFiles.sort((a, b) => b.mtime - a.mtime);
            currentActiveFile = todayFiles[0].filePath;
            console.log(`【日志路由】当前活跃日志：${path.basename(currentActiveFile)}`);
            resetTaskBaseline();
            routeFile(currentActiveFile, true, onRouteMessage);
        } else {
            console.log('【日志路由】暂未发现今日日志，等待监听器捕获新写入');
        }

        logWatcher.watch((filePath) => {
            console.log(`【日志路由】收到文件变更：${path.basename(filePath)}`);
            const isSwitchingActiveFile = currentActiveFile && filePath !== currentActiveFile;

            if (isSwitchingActiveFile) {
                console.log(`【日志路由】活跃日志已切换到：${path.basename(filePath)}`);
                currentActiveFile = filePath;
            }

            if (!taskBaselineKeys) resetTaskBaseline();
            routeFile(filePath, Boolean(isSwitchingActiveFile), onRouteMessage);
        });
    },
    resetTaskBaseline
};
