# 控件核心

`map.controls` 是 OpenLayers 原生控件集合的受管视图。控件对象仍是 `ol/control/Control` 的实例；OMap 只增加稳定 ID、元数据、启用状态、顺序和类型安全事件。

## 创建和添加

```ts
import {createScaleLineControl} from '@omap/controls';

const scale = createScaleLineControl({
  id: 'scale',
  position: 'bottom-left',
  bar: true,
});

map.addControl(scale);
map.getControl('scale');
map.controls.require('scale');
```

也可以直接通过原生集合添加控件，OMap 会自动为其建立索引：

```ts
map.native.addControl(control);
```

## 启用和禁用

禁用控件不会把它从地图集合移除，而是隐藏控件元素并保留其 ID 与配置：

```ts
map.disableControl('scale');
map.enableControl('scale');
map.controls.toggle('scale');
map.controls.isEnabled('scale');
```

## 元数据和位置

```ts
map.controls.update('scale', {
  title: '地图比例尺',
  position: 'bottom-right',
});

console.log(map.controls.info('scale'));
```

位置值为 `top-left`、`top-right`、`bottom-left`、`bottom-right` 或 `custom`。OMap 会在控件元素上写入 `data-omap-control-position` 和对应的 `omap-control-position-*` CSS 类。最终布局仍由 CSS 决定。

## 顺序和事件

```ts
map.controls.move('scale', 0);
map.controls.bringToFront('scale');

map.on('control:enabled', ({id, enabled}) => {
  console.log(id, enabled);
});

map.on('control:metadata', ({metadata}) => {
  console.log(metadata);
});
```

## 标准工厂

`@omap/controls` 当前提供：

- `createZoomControl()`
- `createRotateControl()`
- `createAttributionControl()`
- `createScaleLineControl()`
- `createMousePositionControl()`
- `createFullScreenControl()`
- `createOverviewMapControl()`
- `createZoomSliderControl()`
- `createZoomToExtentControl()`

所有工厂都返回原生 OpenLayers 控件，并接受原生构造选项与 OMap 的 `id`、`title`、`type`、`position` 和 `enabled` 元数据。
