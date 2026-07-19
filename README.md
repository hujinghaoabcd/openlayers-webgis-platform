# OrbiLayer

OrbiLayer（中文工作名：寰图）是一个基于 OpenLayers 构建的现代二维 WebGIS 开发平台。当前名称仅为可替换的开发代号，正式名称确定后可通过项目脚本统一更新。

项目以自研 SDK 为核心，统一提供地图生命周期、配置管理、图层组织、控件、交互、查询、空间分析、专题可视化、Widget、Vue 组件、开发示例、教程和项目模板。

> 当前状态：Phase 0 可运行工程骨架。所有新增业务能力均在本仓库内独立设计、实现、测试和维护。

## 技术基线

- OpenLayers 10.9.x
- Vue 3.5.x
- TypeScript 6.x
- Vite 8.x
- pnpm workspace
- VitePress + TypeDoc
- Vitest

## 快速开始

```bash
corepack enable
pnpm install
pnpm dev
```

常用命令：

```bash
pnpm dev:portal
pnpm dev:examples
pnpm dev:docs
pnpm build
pnpm typecheck
pnpm test
pnpm validate
```

## 仓库入口

- `apps/portal`：产品介绍门户
- `apps/examples`：可搜索、可运行、可查看源码的开发示例站
- `apps/docs`：开发教程、架构说明与 API 文档站
- `packages/core`：地图生命周期、事件和插件内核
- `packages/config`：版本化配置契约与校验
- `packages/layers`：图层、数据源、格式和样式能力
- `packages/controls`：地图控件与工具条能力
- `packages/interactions`：绘制、编辑、选择和历史命令
- `packages/services`：自研服务客户端、请求管线和任务契约
- `packages/analysis`：客户端、Worker 和远程空间分析
- `packages/visualization`：专题渲染、动画和图表覆盖物
- `packages/widgets`：框架无关 Widget 注册与生命周期
- `packages/vue`：Vue 组件、指令和组合式 API
- `packages/example-kit`：示例元数据和运行器
- `templates`：通用 Vue 项目模板

详细目录见 [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md)，能力规划见 [`docs/FEATURES.md`](docs/FEATURES.md)。

## GitHub 同步

当前已初始化本地 Git 仓库，但正式名称尚未确定，因此暂不绑定远程地址。绑定方法见 [`docs/GITHUB_SYNC.md`](docs/GITHUB_SYNC.md)。
