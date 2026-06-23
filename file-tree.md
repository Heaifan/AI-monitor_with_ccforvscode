# file-tree.md

ai_monitor-app/
├── renderer.html                      # 悬浮窗页面与 CSP 安全策略
├── package.json
├── package-lock.json
├── changelog.md
├── file-tree.md
├── src/
│   ├── main.js                         # Electron 主进程入口、中文启动探针与渲染日志转发
│   ├── cost/                           # 费用与 token 计价域
│   │   ├── billingEngine.js            # usage 行解析、token 与费用计算
│   │   ├── costManager.js              # 计价门面与兼容接口聚合
│   │   └── legacyAdapter.js            # 旧版前台接口、配置保存与币种切换兼容垫片
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
│   │   └── historyLogger.js            # 回合审计历史记录与复制文本生成
│   └── view/                           # 渲染进程 UI 逻辑
│       ├── eventHandler.js             # 点击、面板、拖动、关闭、复制等事件绑定
│       ├── renderer.js                 # status-update 消费、DOM 映射与中文渲染探针
│       └── uiTimer.js                  # 回合计时器
└── vscode-bridge/
    ├── package.json                    # VS Code 扩展声明
    └── extension.js                    # VS Code 状态栏到本地 HTTP 网关的桥接
