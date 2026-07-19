# 项目目录规划

```text
omap-workspace/
├─ apps/
│  ├─ portal/                 # Vue 3 产品介绍门户
│  ├─ examples/               # Vue 3 开发示例站
│  └─ docs/                   # VitePress 教程与 API 文档站
├─ packages/
│  ├─ core/                   # 地图生命周期、事件、插件系统
│  ├─ config/                 # 版本化配置、Schema 与校验
│  ├─ layers/                 # 图层、数据源、格式和样式
│  ├─ controls/               # 控件、工具条和图层管理
│  ├─ interactions/           # 绘制、编辑、选择和历史命令
│  ├─ services/               # 自研服务客户端、请求管线和任务契约
│  ├─ analysis/               # 客户端、Worker 和远程空间分析
│  ├─ visualization/          # 专题渲染、动画和图表覆盖物
│  ├─ widgets/                # Widget 注册与生命周期
│  ├─ example-kit/            # 示例元数据和运行器
│  ├─ project-meta/           # 集中式项目名称和品牌元数据
│  └─ vue/                    # Vue 组件、指令和组合式 API
├─ templates/                 # 通用 Vue 项目模板
├─ docs/                      # 仓库级架构与功能文档
├─ scripts/                   # 校验、更名、文档和发布脚本
├─ typedoc.json
├─ pnpm-workspace.yaml
└─ tsconfig.base.json
```

## 分层原则

- `core` 只负责稳定的地图生命周期、事件和插件机制。
- `layers` 负责地图数据呈现，不混入界面状态。
- `services` 直接实现统一服务客户端和请求能力，不设置额外的中间分层。
- `analysis` 统一客户端、Worker 和远程任务的调用模型。
- `widgets` 保持框架无关，`vue` 负责组件化界面。
- 示例、教程、API 和测试共享能力标识，避免重复维护。
