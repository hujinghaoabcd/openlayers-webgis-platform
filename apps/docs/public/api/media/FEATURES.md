# 自研功能规划

## 状态说明

- `FOUNDATION`：已有可运行基础接口或骨架。
- `PLANNED`：已进入开发规划。
- `DONE`：实现、类型、测试、示例和文档全部完成。

| 功能域 | 能力 | 所属包 | 状态 |
|---|---|---|---|
| 地图内核 | 创建、挂载、卸载、销毁、插件生命周期 | `core` | FOUNDATION |
| 配置系统 | 版本化配置、校验、迁移、注册表 | `config` | FOUNDATION |
| 图层 | 瓦片、图像、矢量、矢量瓦片、实时图层 | `layers` | FOUNDATION |
| 图层管理 | 分组、排序、显隐、透明度、筛选和状态 | `layers` / `widgets` | PLANNED |
| 控件 | 工具条、图层树、图例、书签、鹰眼、比例尺 | `controls` | FOUNDATION |
| 交互 | 选择、绘制、编辑、捕捉、变换、撤销重做 | `interactions` | FOUNDATION |
| 查询 | 点击识别、属性查询、空间查询、组合过滤 | `services` | PLANNED |
| 数据编辑 | 要素增删改、批量事务、冲突和历史管理 | `services` | PLANNED |
| 空间分析 | 缓冲、叠加、裁剪、聚合和几何计算 | `analysis` | FOUNDATION |
| 网络分析 | 最短路径、服务区、最近设施和连通性 | `analysis` | PLANNED |
| 地形分析 | 等值线、坡度、坡向、曲率和填挖方 | `analysis` | PLANNED |
| 专题可视化 | 热力、聚合、图表符号、轨迹、流向和动画 | `visualization` | FOUNDATION |
| 时间与实时 | 时间轴、时间过滤、实时数据和增量更新 | `visualization` / `services` | PLANNED |
| 输出 | 截图、打印、PDF、视频和故事导出 | `services` / `visualization` | PLANNED |
| Widget | 注册、装载、卸载、布局和状态管理 | `widgets` | FOUNDATION |
| Vue | 地图组件、组合式 API、声明式图层和控件 | `vue` | FOUNDATION |
| 示例体系 | 分类、搜索、源码、预览和能力关联 | `example-kit` | FOUNDATION |
| 项目模板 | 浏览器、工作台、大屏、专题门户和移动端 | `templates` | PLANNED |

一个能力只有满足完整实现、类型、测试、示例、教程或 API 文档和变更记录后，才能标记为 `DONE`。
