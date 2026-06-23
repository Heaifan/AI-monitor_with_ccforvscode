const fs = require('fs');
const path = require('path');
const logPath = path.join(process.env.USERPROFILE, '.claude', 'projects');

module.exports = {
    getLogPath: () => logPath,
    getTodayJsonlFiles: () => {
        const todayStr = new Date().toDateString(); let list = [];
        try {
            fs.readdirSync(logPath).forEach(subdir => {
                const subPath = path.join(logPath, subdir);
                if (fs.statSync(subPath).isDirectory()) {
                    fs.readdirSync(subPath).forEach(file => {
                        if (file.endsWith('.jsonl')) {
                            const fp = path.join(subPath, file); const stat = fs.statSync(fp);
                            if (stat.mtime.toDateString() === todayStr) list.push({ filePath: fp, mtime: stat.mtime.getTime() });
                        }
                    });
                }
            });
        } catch (e) {
            console.log(`[PROBE-SCAN:WARN] unable to scan ${logPath}: ${e.message}`);
        }
        return list;
    }
};
