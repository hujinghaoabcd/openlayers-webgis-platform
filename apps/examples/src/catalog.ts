import type {ExampleDefinition} from '@omap/example-kit';

export const exampleCatalog: ExampleDefinition[] = [
  {
    id: 'map-basic-osm',
    title: '基础地图与 OSM 底图',
    category: '地图基础',
    description: '创建地图、视图和基础瓦片图层。',
    tags: ['Map', 'View', 'OSM'],
    sourcePath: 'src/examples/BasicMap.vue',
    capabilities: ['map.lifecycle', 'layer.osm'],
  },
  {
    id: 'core-runtime',
    title: '事件、Scope 与 Registry',
    category: '地图基础',
    description: '演示类型安全事件、资源作用域和运行时注册中心。',
    tags: ['Events', 'Scope', 'Registry'],
    sourcePath: 'src/examples/CoreRuntime.vue',
    capabilities: ['core.events', 'core.scope', 'core.registry'],
  },
  {
    id: 'layer-management',
    title: '图层管理与底图切换',
    category: '图层核心',
    description: '按 ID 查找图层，切换底图，控制显隐、透明度与顺序。',
    tags: ['Layers', 'Basemap', 'Opacity', 'Order'],
    sourcePath: 'src/examples/LayerManagement.vue',
    capabilities: ['layer.collection', 'layer.basemap', 'layer.state'],
  },
  {
    id: 'planned-draw-edit',
    title: '绘制与编辑工具栏（规划）',
    category: '标绘编辑',
    description: '点线面、规则图形、捕捉、撤销重做、分割与挖洞。',
    tags: ['Draw', 'Modify', 'UndoRedo'],
    sourcePath: 'src/examples/PlannedExample.vue',
    capabilities: ['interaction.draw', 'interaction.modify'],
  },
  {
    id: 'planned-ogc',
    title: 'OGC 服务接入（规划）',
    category: '地图服务',
    description: 'WMS、WMTS、WFS、OGC API Features/Tiles 与 STAC。',
    tags: ['OGC', 'WMS', 'WMTS', 'WFS'],
    sourcePath: 'src/examples/PlannedExample.vue',
    capabilities: ['service.ogc'],
  },
];
