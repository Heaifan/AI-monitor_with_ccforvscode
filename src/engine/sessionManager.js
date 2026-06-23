let macroTimer = null;
let sessionState = 'idle'; // 'idle', 'working', 'cohesion'

module.exports = {
    getState: () => sessionState,
    isActive: () => sessionState === 'working' || sessionState === 'cohesion',
    
    triggerWorking: (onTimeout) => {
        if (macroTimer) clearTimeout(macroTimer);
        sessionState = 'working';
        // 【极致响应】：全面换装 5秒 保护时窗，实现秒级快速判定自愈
        console.log(`[PROBE-STATE] 状态切入 [working] ➔ 启动5秒绝对自愈保护阀`);
        macroTimer = setTimeout(() => { sessionState = 'idle'; onTimeout(); }, 5000);
    },
    
    refreshWorking: (onTimeout) => {
        if (sessionState === 'working') {
            if (macroTimer) clearTimeout(macroTimer);
            console.log(`[PROBE-STATE] 检测到数据在飞，5秒工作倒计时向后顺延 (Keep-Alive)`);
            macroTimer = setTimeout(() => { sessionState = 'idle'; onTimeout(); }, 5000);
        }
    },
    
    triggerDone: (onTimeout) => {
        if (macroTimer) clearTimeout(macroTimer);
        if (sessionState === 'working' || sessionState === 'cohesion') {
            sessionState = 'cohesion';
            console.log(`[PROBE-STATE] 阶段任务触发 done ➔ 状态切入 [cohesion] (5秒合流观察期展开，快速结算)`);
            macroTimer = setTimeout(() => { sessionState = 'idle'; onTimeout(); }, 5000);
        }
    }
};