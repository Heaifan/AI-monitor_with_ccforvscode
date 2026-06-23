const chokidar = require('chokidar');
let changeThrottleTimer = null;
const logPath = require('path').join(process.env.USERPROFILE, '.claude', 'projects');

module.exports = {
    watch: (onRawChange) => {
        console.log(`【文件监听】正在启动 chokidar：${logPath}`);
        const watcher = chokidar.watch(logPath, { ignoreInitial: true });
        watcher.on('ready', () => {
            console.log('【文件监听】chokidar 已就绪');
        });
        watcher.on('add', (filePath) => {
            if (filePath.endsWith('.jsonl')) console.log(`【文件监听】新增 JSONL：${filePath}`);
        });
        watcher.on('error', (err) => {
            console.log(`【文件监听:错误】${err.message}`);
        });
        watcher.on('change', (filePath) => {
            if (!filePath.endsWith('.jsonl')) return;
            console.log(`【文件监听】JSONL 已变更：${filePath}`);
            if (changeThrottleTimer) return;
            changeThrottleTimer = setTimeout(() => {
                changeThrottleTimer = null;
                onRawChange(filePath); // 【消除盲区】：只传递路径，把完整行扫描权移交下游
            }, 60);
        });
    }
};
