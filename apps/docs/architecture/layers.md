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

工厂创建的 OSM、XYZ 和 WMTS 图层默认属于 `basemap`，其他数据图层默认属于 `overlay`。同一时刻只保留一个可见底图：

```ts
map.setBasemap('standard');
map.layers.getBasemap();
map.layers.basemaps();
map.layers.overlays();
```

## 数据源状态

`map.sources` 统一观察瓦片、影像和矢量数据源。它不会替换原生 Source，只记录状态、并发加载数和最近错误。

```ts
const info = map.sources.info('roads');

console.log(info.sourceState); // undefined | loading | ready | error
console.log(info.loadStatus);  // idle | loading | ready | error
console.log(info.pending);
console.log(info.error);
```

地图级事件可以直接监听不同来源的加载过程：

```ts
map.on('layer:loadstart', ({id, pending}) => {
  console.log(id, pending);
});

map.on('layer:loadend', ({id}) => {
  console.log(`${id} loaded`);
});

map.on('layer:loaderror', ({id, error}) => {
  console.error(id, error);
});
```

图层调用 `setSource()` 后，OMap 会解除旧 Source 监听并自动接管新 Source。

## 刷新与范围定位

```ts
map.refreshLayer('osm');
map.fitLayer('roads', {
  padding: [40, 40, 40, 40],
  duration: 400,
  maxZoom: 14,
});
```

范围优先读取图层显式 `extent`，其次读取支持 `getExtent()` 的数据源。没有有效范围时，`fitLayer()` 会明确报错。

## 图层工厂

`@omap/layers` 当前提供：

- OSM、XYZ、TileWMS、ImageWMS、WMTS；
- GeoTIFF；
- GeoJSON、Vector、VectorTile；
- KML、GPX、WKT；
- LayerGroup。

所有工厂都返回原生 OpenLayers 图层，并写入统一的 OMap `id / title / kind / type / group / tags` 元数据。

```ts
const area = createWktLayer({
  id: 'area',
  data: 'POLYGON ((118 31, 119 31, 119 32, 118 32, 118 31))',
  dataProjection: 'EPSG:4326',
  featureProjection: 'EPSG:3857',
});

map.addLayer(area).fitLayer('area');
```

## 图层事件

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
