import type {ExampleDefinition} from '@orbilayer/example-kit';

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
    id: 'planned-layer-management',
    title: '图层树与图层管理（规划）',
    category: '控件与交互',
    description: '图层分组、显隐、透明度、排序、过滤和状态。',
    tags: ['LayerSwitcher', 'Widget'],
    sourcePath: 'src/examples/PlannedExample.vue',
    capabilities: ['control.layer-tree'],
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
