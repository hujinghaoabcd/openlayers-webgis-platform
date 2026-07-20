# 整体架构

```text
Vue Apps / Project Templates
          ↓
Vue Components / Widgets
          ↓
Map / Events / Scope / Registry / Plugins
          ↓
Config / Layers / Controls / Interactions
          ↓
Services / Analysis / Visualization
          ↓
OpenLayers 10.x / Browser APIs / Data Services
```

OMap 按功能域拆分为独立包。`@omap/core` 提供地图入口、类型安全事件、资源作用域、注册中心和插件生命周期。OpenLayers 作为地图渲染内核，并通过 `map.native` 保留原生对象访问能力。
