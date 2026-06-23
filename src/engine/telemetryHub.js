const fileRouter = require('../io/fileRouter');
const logParser = require('./logParser');
const sessionManager = require('./sessionManager');

let globalSendFn = null;

function broadcast(state, detail) {
    if (!globalSendFn) return;
    globalSendFn('status-update', {
        state, detail,
        tokens: String(logParser.getRoundTokens()),
        dayTokens: String(logParser.getLiveDayTotal()),
        costStr: logParser.getRoundCostStr(),
        dayCostStr: logParser.getLiveDayCostStr()
    });
}

module.exports = {
    initialize: (sendFn) => {
        globalSendFn = sendFn;
        fileRouter.bindRoute((activeLines, isColdStart, fileStatus) => {
            if (isColdStart && fileStatus) {
                // 【核心拉正】：成对传入文件极值水位，绝不允许 Token 和 Cost 出现时序和物理跨界
                logParser.setWatermark(
                    fileStatus.latestFileMaxTokens,
                    fileStatus.latestFileMaxCost,
                    fileStatus.watermarkTokens,
                    fileStatus.watermarkCost
                );
                logParser.setDayBaseline(fileStatus.dayTokensBaseline, fileStatus.dayCostBaseline);
                if (fileStatus.isMidTurnActive) sessionManager.triggerWorking(() => broadcast('done', '输出答案完毕'));
                const curState = sessionManager.isActive() ? 'working' : 'done';
                const curDetail = sessionManager.getState() === 'cohesion' ? '阶段任务完成，自动续航调测中...' : (sessionManager.isActive() ? '多维内核深度思考' : '系统待机');
                sendFn('status-update', { state: curState, detail: curDetail, tokens: String(logParser.getRoundTokens()), dayTokens: String(logParser.getLiveDayTotal()), costStr: logParser.getRoundCostStr(), dayCostStr: logParser.getLiveDayCostStr(), recoveredStartTime: fileStatus.isMidTurnActive ? fileStatus.startTimestamp : null });
                return;
            }
            const result = logParser.parse(activeLines);
            sessionManager.refreshWorking(() => broadcast('done', '输出答案完毕'));
            console.log(`【遥测枢纽】日志流更新：活跃行数=${activeLines?.length}，状态机=${sessionManager.getState()}`);

            if (fileStatus && !fileStatus.isMidTurnActive) {
                sessionManager.triggerDone(() => broadcast('done', '输出答案完毕'));
                if (sessionManager.getState() === 'cohesion') broadcast('working', '阶段任务完成，自动续航调测中...');
            } else if (result && result.action === 'send') {
                if (sessionManager.getState() !== 'working') {
                    if (!sessionManager.isActive()) logParser.resetTurn();
                    sessionManager.triggerWorking(() => broadcast('done', '输出答案完毕'));
                }
                globalSendFn('status-update', { state: 'working', detail: result.detail, tokens: result.tokens, dayTokens: result.dayTokens, costStr: result.costStr, dayCostStr: result.dayCostStr });
            }
        });
    },
    handleHttpStatus: (state, detail) => {
        console.log(`【遥测枢纽】收到本地 HTTP 状态通知：状态=${state}，详情=${detail || ''}`);
        if (state === 'working') {
            if (!sessionManager.isActive()) logParser.resetTurn();
            sessionManager.triggerWorking(() => broadcast('done', '输出答案完毕'));
            broadcast('working', detail || '多维内核深度思考');
        } else if (state === 'done') {
            sessionManager.triggerDone(() => broadcast('done', '输出答案完毕'));
            if (sessionManager.getState() === 'cohesion') broadcast('working', '阶段任务完成，自动续航调测中...');
            else broadcast('done', '输出答案完毕');
        }
    }
};
