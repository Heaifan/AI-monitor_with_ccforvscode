let macroTimer = null;
let sessionState = 'idle'; // 'idle', 'working', 'cohesion'

module.exports = {
    getState: () => sessionState,
    isActive: () => sessionState === 'working' || sessionState === 'cohesion',
    
    triggerWorking: (onTimeout) => {
        if (macroTimer) clearTimeout(macroTimer);
        sessionState = 'working';
        // 【极致响应】：全面换装 5秒 保护时窗，实现秒级快速判定自愈
        console.log('【状态机】状态切入 working，启动 5 秒保护窗口');
        macroTimer = setTimeout(() => { sessionState = 'idle'; onTimeout(); }, 5000);
    },
    
    refreshWorking: (onTimeout) => {
        if (sessionState === 'working') {
            if (macroTimer) clearTimeout(macroTimer);
            console.log('【状态机】检测到日志仍在更新，5 秒工作倒计时顺延');
            macroTimer = setTimeout(() => { sessionState = 'idle'; onTimeout(); }, 5000);
        }
    },
    
    triggerDone: (onTimeout) => {
        if (macroTimer) clearTimeout(macroTimer);
        if (sessionState === 'working' || sessionState === 'cohesion') {
            sessionState = 'cohesion';
            console.log('【状态机】阶段任务触发 done，切入 cohesion，进入 5 秒合流观察期');
            macroTimer = setTimeout(() => { sessionState = 'idle'; onTimeout(); }, 5000);
        }
    }
};
