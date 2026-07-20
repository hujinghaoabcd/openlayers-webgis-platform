# OMap

OMap 是一个基于 OpenLayers 构建的模块化二维 WebGIS 开发库。项目提供简洁的地图入口、原生 OpenLayers 访问、图层、控件、交互、服务、空间分析、专题可视化、Widget 和 Vue 组件。

> 当前状态：核心库第一阶段开发中。所有公开能力均在本仓库内独立设计、实现、测试和维护。

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
pnpm dev:examples
```

首次启动会自动构建工作区 SDK 包。常用命令：

```bash
pnpm dev
pnpm dev:portal
pnpm dev:examples
pnpm dev:docs
pnpm build
pnpm typecheck
pnpm test
pnpm validate
```

## 核心 API

```ts
import View from 'ol/View.js';
import {map} from '@omap/core';
import {createOsmLayer, createWktLayer} from '@omap/layers';

const viewer = map('map', {
  layers: [createOsmLayer({id: 'standard'})],
  view: new View({center: [0, 0], zoom: 2}),
});

const area = createWktLayer({
  id: 'area',
  title: 'Study area',
  data: 'POLYGON ((118 31, 119 31, 119 32, 118 32, 118 31))',
  dataProjection: 'EPSG:4326',
  featureProjection: 'EPSG:3857',
});

viewer.on('layer:loaderror', ({id, error}) => {
  console.error(id, error);
});

viewer.addLayer(area);
viewer.fitLayer('area', {padding: [40, 40, 40, 40]});
viewer.refreshLayer('standard');
viewer.setBasemap('standard');

console.log(viewer.sources.info('area'));
viewer.native.renderSync();
await viewer.remove();
```

## 仓库入口

- `packages/core`：`Map`、`map()`、事件、Layers、Sources、Scope、Registry 和插件内核
- `packages/config`：版本化配置契约与校验
- `packages/layers`：图层工厂、数据源、格式和样式能力
- `packages/controls`：地图控件与工具条能力
- `packages/interactions`：绘制、编辑、选择和历史命令
- `packages/services`：服务客户端、请求管线和任务契约
- `packages/analysis`：客户端、Worker 和远程空间分析
- `packages/visualization`：专题渲染、动画和图表覆盖物
- `packages/widgets`：框架无关 Widget 注册与生命周期
- `packages/vue`：Vue 组件和组合式 API
- `packages/example-kit`：示例元数据和运行器
- `apps/examples`：可运行开发示例
- `apps/docs`：教程和 API 文档
- `apps/portal`：产品门户
- `templates`：通用 Vue 项目模板

详细目录见 [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md)，能力规划见 [`docs/FEATURES.md`](docs/FEATURES.md)。
