// src/view/eventHandler.js
module.exports = {
    init: (doms, costManager, historyLogger, getTokensFn, getDayTokensFn) => {
        if (!doms) return;

        // 绝杀点击黑色 Token / 计费区域无法隐藏或展开面板的硬伤 Bug
        if (doms.tokenText) {
            doms.tokenText.addEventListener('click', (e) => {
                e.stopPropagation();
                if (doms.settingsPanel) doms.settingsPanel.classList.toggle('active');
            });
        }

        // 绝杀点击计时器区域无响应故障，绑定为一键横转审计历史抽屉
        if (doms.timerText) {
            doms.timerText.addEventListener('click', (e) => {
                e.stopPropagation();
                if (doms.auditPanel) doms.auditPanel.classList.toggle('visible');
            });
        }

        if (doms.closeBtn && doms.settingsPanel) {
            doms.closeBtn.addEventListener('click', () => {
                doms.settingsPanel.classList.remove('active');
            });
        }

        // 防御性阻断：点击配置窗口内部时，防止事件冒泡引发抽屉闪退
        if (doms.settingsPanel) {
            doms.settingsPanel.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }
};