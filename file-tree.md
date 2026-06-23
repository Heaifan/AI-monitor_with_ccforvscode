# file-tree.md

ai_monitor-app/
├── renderer.html
├── package.json
├── package-lock.json
├── changelog.md
├── file-tree.md
├── src/
│   ├── main.js                         # Electron 主进程入口，创建悬浮窗并启动监控链路
│   ├── cost/                           # 费用与 token 计价域
│   │   ├── billingEngine.js            # usage 行解析、token 与费用计算
│   │   ├── costManager.js              # 计价门面与兼容接口聚合
│   │   └── legacyAdapter.js            # 旧版前台接口兼容垫片
│   ├── engine/                         # 状态机、日志解析与遥测调度域
│   │   ├── logParser.js                # 活跃回合日志解析与实时计数
│   │   ├── sessionManager.js           # idle / working / cohesion 状态机
│   │   ├── telemetryHub.js             # 文件日志与 HTTP 状态的统一广播枢纽
│   │   └── turnAnalyzer.js             # JSONL 回合边界、冷启动水位与日基线分析
│   ├── io/                             # 文件扫描、监听、路由与本地 HTTP 网关
│   │   ├── fileRouter.js               # 冷启动扫描与活跃日志文件路由
│   │   ├── fileScanner.js              # 扫描当天 .claude/projects JSONL 文件
│   │   ├── httpGateway.js              # 监听 127.0.0.1:8080/status
│   │   └── logWatcher.js               # chokidar 监听 JSONL 文件变化
│   ├── utils/                          # 前台辅助工具
│   │   ├── audioChime.js               # 完成提示音
│   │   ├── domTruncator.js             # 审计表行数裁剪
│   │   └── historyLogger.js            # 回合审计历史记录
│   └── view/                           # 渲染进程 UI 逻辑
│       ├── eventHandler.js             # 点击、面板、关闭等事件绑定
│       ├── renderer.js                 # status-update 消费与 DOM 映射
│       └── uiTimer.js                  # 回合计时器
└── vscode-bridge/
    ├── package.json                    # VS Code 扩展声明
    └── extension.js                    # VS Code 状态栏到本地 HTTP 网关的桥接
