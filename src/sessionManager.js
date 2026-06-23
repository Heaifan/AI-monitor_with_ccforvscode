const logParser = require('./logParser');

let fallbackDoneTimer = null;
let isSessionActive = false;

function emitUpdate(state, detail, sendFn) {
    sendFn({
        state,
        detail,
        tokens: String(logParser.getRoundTokens()),
        dayTokens: String(logParser.getLiveDayTotal())
    });
}

module.exports = {
    isActive: () => isSessionActive,
    updateStatus: (state, detail, sendFn) => {
        if (fallbackDoneTimer) clearTimeout(fallbackDoneTimer);

        if (state === 'working') {
            if (!isSessionActive) {
                logParser.resetTurn(); // 真正新回合切入，重置始发水位线
                isSessionActive = true;
            }
            emitUpdate('working', detail || '多维内核深度思考', sendFn);
            
            // 45秒防断流安全阀
            fallbackDoneTimer = setTimeout(() => {
                isSessionActive = false;
                emitUpdate('done', '输出答案完毕', sendFn);
            }, 45000);
        } else if (state === 'done') {
            // 4秒防断流迟滞期，粘合复合子任务
            fallbackDoneTimer = setTimeout(() => {
                isSessionActive = false;
                emitUpdate('done', '输出答案完毕', sendFn);
            }, 4000);
        }
    }
};