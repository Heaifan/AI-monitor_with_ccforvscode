// src/engine/sessionManager.js
const WORKING_KEEPALIVE_MS = 180000;
const COMPLETION_GRACE_MS = 180000;

let macroTimer = null;
let sessionState = 'idle'; // idle, working, cohesion

function resetTimer(onTimeout, timeoutMs) {
    if (macroTimer) clearTimeout(macroTimer);
    macroTimer = setTimeout(() => {
        sessionState = 'idle';
        onTimeout();
    }, timeoutMs);
}

module.exports = {
    getState: () => sessionState,
    isActive: () => sessionState === 'working' || sessionState === 'cohesion',

    triggerWorking: (onTimeout) => {
        sessionState = 'working';
        console.log(`【状态机】状态切入 working，启动 ${WORKING_KEEPALIVE_MS / 1000} 秒工作保活窗口`);
        resetTimer(onTimeout, WORKING_KEEPALIVE_MS);
    },

    refreshWorking: (onTimeout) => {
        if (sessionState !== 'working' && sessionState !== 'cohesion') return;
        sessionState = 'working';
        console.log(`【状态机】检测到日志仍在更新，${WORKING_KEEPALIVE_MS / 1000} 秒工作倒计时顺延`);
        resetTimer(onTimeout, WORKING_KEEPALIVE_MS);
    },

    triggerDone: (onTimeout) => {
        if (sessionState !== 'working' && sessionState !== 'cohesion') return;
        sessionState = 'cohesion';
        console.log(`【状态机】检测到 end_turn，进入 ${COMPLETION_GRACE_MS / 1000} 秒完成观察期`);
        resetTimer(onTimeout, COMPLETION_GRACE_MS);
    }
};
