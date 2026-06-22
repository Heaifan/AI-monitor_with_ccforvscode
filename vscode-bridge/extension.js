const vscode = require('vscode');
const http = require('http');

function sendStatus(state) {
    const req = http.request({
        hostname: '127.0.0.1', port: 8080, path: '/status',
        method: 'POST', headers: { 'Content-Type': 'application/json' }
    });
    req.write(JSON.stringify({ state }));
    req.end();
}

function activate(context) {
    vscode.window.onDidChangeStatusBarMessage((e) => {
        if (!e) return;
        const msg = (typeof e === 'string' ? e : e.text).toLowerCase();
        // 只要状态栏包含高负载动态词，持续刷新主进程的活跃时间戳
        if (msg.includes('thinking') || msg.includes('generating') || msg.includes('progress') || msg.includes('executing')) {
            sendStatus('working');
        }
    });
}
exports.activate = activate;