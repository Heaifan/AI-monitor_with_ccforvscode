# file-tree.md

ai_monitor-app/
├── .editorconfig                     # 全仓 UTF-8、LF 与基础编辑规则
├── renderer.html                      # 悬浮窗页面与 CSP 安全策略
├── package.json
├── package-lock.json
├── changelog.md
├── file-tree.md
├── .vscode/
│   ├── launch.json
│   └── settings.json                  # VS Code UTF-8 文件与终端编码设置
├── src/
│   ├── main.js                         # Electron 主进程入口、中文启动探针与渲染日志转发
│   ├── cost/                           # 费用与 token 计价域
│   │   ├── billingEngine.js            # DeepSeek usage 解析、message.id 去重与三档费用计算
│   │   ├── costManager.js              # 计价门面与兼容接口聚合
│   │   └── legacyAdapter.js            # 旧版前台接口、配置保存与币种切换兼容垫片
│   ├── engine/                         # 状态机、日志解析与遥测调度域
│   │   ├── logParser.js                # 任务增量账本、今日累计账本与实时计数
│   │   ├── sessionManager.js           # idle / working / cohesion 状态机、工作保活与完成观察期
│   │   ├── telemetryHub.js             # 文件日志、HTTP 状态与保守完成判定的统一广播枢纽
│   │   └── turnAnalyzer.js             # JSONL 回合边界、timestamp 归日、冷启动水位与日基线分析
│   ├── io/                             # 文件扫描、监听、路由与本地 HTTP 网关
│   │   ├── fileRouter.js               # 冷启动扫描、活跃日志路由、任务基线与跨文件全局去重日基线
│   │   ├── fileScanner.js              # 扫描当天 .claude/projects JSONL 文件
│   │   ├── httpGateway.js              # 监听 127.0.0.1:8080/status
│   │   └── logWatcher.js               # chokidar 监听 JSONL 文件变化
│   ├── utils/                          # 前台辅助工具
│   │   ├── audioChime.js               # 完成提示音
│   │   ├── domTruncator.js             # 审计表行数裁剪
│   │   └── historyLogger.js            # 回合审计历史记录与复制文本生成
│   └── view/                           # 渲染进程 UI 逻辑
│       ├── eventHandler.js             # 点击、面板、拖动、关闭、复制等事件绑定
│       ├── renderer.js                 # status-update 消费、DOM 映射、任务计时器与 token 单位格式化
│       └── uiTimer.js                  # 回合计时器
└── vscode-bridge/
    ├── package.json                    # VS Code 扩展声明
    └── extension.js                    # VS Code 中英文状态栏到本地 HTTP 网关的工作心跳桥接
