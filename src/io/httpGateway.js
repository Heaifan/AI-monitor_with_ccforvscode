const express = require('express');
const telemetryHub = require('../engine/telemetryHub');

const server = express();
server.use(express.json());
let httpServer = null;

module.exports = {
    start: (sendFn) => {
        if (httpServer) {
            console.log('[PROBE-HTTP] gateway already listening on 127.0.0.1:8080');
            return;
        }
        server.post('/status', (req, res) => {
            const { state, detail } = req.body;
            console.log(`[PROBE-HTTP] POST /status state=${state || 'unknown'} detail=${detail || ''}`);
            telemetryHub.handleHttpStatus(state, detail);
            res.sendStatus(200);
        });
        httpServer = server.listen(8080, '127.0.0.1', () => {
            console.log('[PROBE-HTTP] gateway listening at http://127.0.0.1:8080/status');
        });
        httpServer.on('error', (err) => {
            console.log(`[PROBE-HTTP:ERROR] failed to listen on 8080: ${err.message}`);
        });
    }
};
