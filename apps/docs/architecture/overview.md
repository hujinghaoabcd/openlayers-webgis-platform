# 整体架构

```text
Vue Apps / Project Templates
          ↓
Vue Components / Widgets
          ↓
Core / Config / Layers / Controls / Interactions
          ↓
Services / Analysis / Visualization
          ↓
OpenLayers 10.x / Browser APIs / Data Services
```

平台按功能域拆分为独立包。所有业务能力由本项目统一设计和实现；OpenLayers 作为地图渲染内核，并通过公开类型保留原生对象访问能力。
