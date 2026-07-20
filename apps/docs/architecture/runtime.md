# 核心运行时

OMap 的核心对象保持地图库常见的直接调用方式，同时提供类型安全事件、资源作用域和通用注册中心。

## 事件

```ts
const onLayerAdd = ({layer}) => {
  console.log(layer);
};

map.on('layer:add', onLayerAdd);
map.once('remove', () => console.log('map removed'));
map.off('layer:add', onLayerAdd);
```

内置事件覆盖 target、view、layer、control、interaction、overlay、plugin、scope 和 map removal。事件名称与载荷由 `MapEventMap` 约束。

## Scope

`map.scope()` 创建一组共同释放的资源。Scope 按注册的相反顺序执行清理，并在地图移除时自动释放。

```ts
const scope = map.scope('drawing');

scope.addLayer(drawLayer);
scope.addInteraction(drawInteraction);
scope.on(map, 'layer:remove', event => {
  console.log(event.layer);
});
scope.add(() => worker.terminate());

await scope.dispose();
```

插件会自动获得独立 Scope。安装失败时，OMap 会立即回滚插件已经登记的资源。

## Registry

注册中心按 `kind + id` 保存运行时能力，供图层、控件、交互、服务和插件共享。

```ts
map.registry.register('layer', 'geojson', geoJsonFactory);

const factory = map.registry.require('layer', 'geojson');
map.registry.unregister('layer', 'geojson');
```

重复注册默认报错；确需替换时显式传入 `{replace: true}`。
