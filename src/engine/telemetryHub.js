// src/engine/telemetryHub.js
const fileRouter = require('../io/fileRouter');
const logParser = require('./logParser');
const sessionManager = require('./sessionManager');

let globalSendFn = null;

const DETAIL = {
    idle: '系统待机',
    working: '多维内核深度思考',
    cohesion: '阶段结束，等待后续输出',
    done: '输出答案完毕'
};

function broadcast(state, detail) {
    if (!globalSendFn) return;
    globalSendFn('status-update', {
        state,
        detail,
        tokens: String(logParser.getRoundTokens()),
        dayTokens: String(logParser.getLiveDayTotal()),
        costStr: logParser.getRoundCostStr(),
        dayCostStr: logParser.getLiveDayCostStr()
    });
}

function scheduleDone() {
    sessionManager.triggerDone(() => {
        broadcast('done', DETAIL.done);
        fileRouter.resetTaskBaseline();
        logParser.resetTurn();
    });
}

function scheduleWorking() {
    sessionManager.triggerWorking(() => broadcast('done', DETAIL.done));
}

module.exports = {
    initialize: (sendFn) => {
        globalSendFn = sendFn;
        fileRouter.bindRoute((activeLines, isColdStart, fileStatus) => {
            if (isColdStart && fileStatus) {
                logParser.setWatermark(
                    fileStatus.latestFileMaxTokens,
                    fileStatus.latestFileMaxCost,
                    fileStatus.watermarkTokens,
                    fileStatus.watermarkCost
                );
                logParser.setDayBaseline(fileStatus.dayTokensBaseline, fileStatus.dayCostBaseline);

                if (fileStatus.isMidTurnActive) scheduleWorking();

                const curState = sessionManager.isActive() ? 'working' : 'idle';
                const curDetail = sessionManager.getState() === 'cohesion'
                    ? DETAIL.cohesion
                    : (sessionManager.isActive() ? DETAIL.working : DETAIL.idle);

                sendFn('status-update', {
                    state: curState,
                    detail: curDetail,
                    tokens: String(logParser.getRoundTokens()),
                    dayTokens: String(logParser.getLiveDayTotal()),
                    costStr: logParser.getRoundCostStr(),
                    dayCostStr: logParser.getLiveDayCostStr(),
                    recoveredStartTime: fileStatus.isMidTurnActive ? fileStatus.startTimestamp : null
                });
                return;
            }

            const result = logParser.parse(activeLines, fileStatus);
            sessionManager.refreshWorking(() => broadcast('done', DETAIL.done));
            console.log(`【遥测枢纽】日志流更新：活跃行数=${activeLines?.length}，状态机=${sessionManager.getState()}`);

            if (fileStatus && !fileStatus.isMidTurnActive) {
                scheduleDone();
                if (sessionManager.getState() === 'cohesion') {
                    broadcast('working', DETAIL.cohesion);
                }
            } else if (result && result.action === 'send') {
                if (sessionManager.getState() !== 'working') {
                    if (!sessionManager.isActive()) logParser.resetTurn();
                    scheduleWorking();
                }
                globalSendFn('status-update', {
                    state: 'working',
                    detail: result.detail,
                    tokens: result.tokens,
                    dayTokens: result.dayTokens,
                    costStr: result.costStr,
                    dayCostStr: result.dayCostStr
                });
            }
        });
    },

    handleHttpStatus: (state, detail) => {
        console.log(`【遥测枢纽】收到本地 HTTP 状态通知：状态=${state}，详情=${detail || ''}`);
        if (state === 'working') {
            if (!sessionManager.isActive()) {
                fileRouter.resetTaskBaseline();
                logParser.resetTurn();
            }
            scheduleWorking();
            broadcast('working', detail || DETAIL.working);
        } else if (state === 'done') {
            scheduleDone();
            if (sessionManager.getState() === 'cohesion') broadcast('working', DETAIL.cohesion);
            else broadcast('done', DETAIL.done);
        }
    }
};
