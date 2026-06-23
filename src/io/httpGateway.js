const express = require('express');
const telemetryHub = require('../engine/telemetryHub');

const server = express();
server.use(express.json());
let httpServer = null;

module.exports = {
    start: (sendFn) => {
        if (httpServer) {
            console.log('【HTTP探针】网关已在 127.0.0.1:8080 监听，跳过重复启动');
            return;
        }
        server.post('/status', (req, res) => {
            const { state, detail } = req.body;
            console.log(`【HTTP探针】收到 /status 状态=${state || '未知'} 详情=${detail || ''}`);
            telemetryHub.handleHttpStatus(state, detail);
            res.sendStatus(200);
        });
        httpServer = server.listen(8080, '127.0.0.1', () => {
            console.log('【HTTP探针】网关已监听 http://127.0.0.1:8080/status');
        });
        httpServer.on('error', (err) => {
            console.log(`【HTTP探针:错误】监听 8080 失败：${err.message}`);
        });
    }
};
