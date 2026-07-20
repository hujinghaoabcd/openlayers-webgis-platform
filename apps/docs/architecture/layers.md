# 图层核心

`map.layers` 是 OpenLayers 原生图层集合的受管视图。图层对象本身仍是 `BaseLayer` 及其子类，OMap 不替换底层类，只增加稳定 ID、元数据、查找、排序、底图互斥和类型安全事件。

## 添加与查找

```ts
const roads = createGeoJsonLayer(data, {
  id: 'roads',
  title: '道路',
});

map.addLayer(roads);
map.getLayer('roads');
map.layers.require('roads');
map.removeLayer('roads');
```

没有显式 ID 的图层会获得自动 ID。重复 ID 默认报错；确需替换时显式传入 `{replace: true}`。

## 图层状态

```ts
map.showLayer('roads');
map.hideLayer('roads');
map.setLayerOpacity('roads', 0.6);
map.layers.setZIndex('roads', 20);
map.layers.bringToFront('roads');
```

`map.layers.info('roads')` 返回当前 ID、标题、类型、角色、索引、显隐、透明度和 z-index 快照。

## 底图互斥

工厂创建的 OSM 和 XYZ 图层默认属于 `basemap`，WMS 和 GeoJSON 默认属于 `overlay`。同一时刻只保留一个可见底图：

```ts
map.setBasemap('standard');
map.layers.getBasemap();
map.layers.basemaps();
map.layers.overlays();
```

## 事件

```ts
map.on('layer:visibility', ({id, visible}) => {
  console.log(id, visible);
});

map.on('layer:order', ({id, from, to}) => {
  console.log(id, from, to);
});

map.on('basemap:change', ({layer}) => {
  console.log(layer ? map.layers.info(layer).id : 'none');
});
```

直接调用 `map.native.getLayers()` 仍然可用。通过原生集合添加和移除图层时，OMap 会同步建立或移除索引；通过 OMap API 操作则可获得重复 ID 检查和完整状态事件。
