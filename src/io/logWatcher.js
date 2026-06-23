const chokidar = require('chokidar');
let changeThrottleTimer = null;
const logPath = require('path').join(process.env.USERPROFILE, '.claude', 'projects');

module.exports = {
    watch: (onRawChange) => {
        console.log(`[PROBE-WATCHER] starting chokidar on ${logPath}`);
        const watcher = chokidar.watch(logPath, { ignoreInitial: true });
        watcher.on('ready', () => {
            console.log('[PROBE-WATCHER] chokidar ready');
        });
        watcher.on('add', (filePath) => {
            if (filePath.endsWith('.jsonl')) console.log(`[PROBE-WATCHER] jsonl added: ${filePath}`);
        });
        watcher.on('error', (err) => {
            console.log(`[PROBE-WATCHER:ERROR] ${err.message}`);
        });
        watcher.on('change', (filePath) => {
            if (!filePath.endsWith('.jsonl')) return;
            console.log(`[PROBE-WATCHER] jsonl changed: ${filePath}`);
            if (changeThrottleTimer) return;
            changeThrottleTimer = setTimeout(() => {
                changeThrottleTimer = null;
                onRawChange(filePath); // 【消除盲区】：只传递路径，把完整行扫描权移交下游
            }, 60);
        });
    }
};
