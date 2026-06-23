// vscode-bridge/extension.js
const vscode = require('vscode');
const http = require('http');

const ACTIVE_KEYWORDS = [
    'thinking',
    'generating',
    'progress',
    'executing',
    'working',
    'running',
    '正在',
    '思考',
    '生成',
    '执行',
    '塑造',
    '处理中',
    '排队'
];

function sendStatus(state, detail = '') {
    const req = http.request({
        hostname: '127.0.0.1',
        port: 8080,
        path: '/status',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    req.on('error', () => {});
    req.write(JSON.stringify({ state, detail }));
    req.end();
}

function activate(context) {
    const disposable = vscode.window.onDidChangeStatusBarMessage((event) => {
        if (!event) return;
        const text = (typeof event === 'string' ? event : event.text || '').toLowerCase();
        if (ACTIVE_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()))) {
            sendStatus('working', 'VS Code 状态栏仍在工作');
        }
    });
    context.subscriptions.push(disposable);
}

exports.activate = activate;
