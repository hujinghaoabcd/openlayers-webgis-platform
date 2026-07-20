# Overlay、Popup 与 Marker

OMap 不替换 OpenLayers Overlay。`map.overlays` 是原生 `map.native.getOverlays()` 集合的受管视图，Popup 与 Marker 控制器也直接暴露原生 `ol/Overlay`。

## 受管 Overlay 集合

```ts
import Overlay from 'ol/Overlay.js';

const element = document.createElement('div');
const overlay = new Overlay({element});

map.addOverlay(overlay, {
  id: 'station-popup',
  title: 'Station popup',
  type: 'popup',
  group: 'stations',
});
```

按稳定 ID 访问：

```ts
map.overlays.get('station-popup');
map.overlays.require('station-popup');
map.overlays.info('station-popup');
map.overlays.ids();
```

底层集合仍可直接使用：

```ts
map.native.getOverlays();
```

原生集合的添加和移除会同步到 `map.overlays`。直接调用 `overlay.setPosition()`、`setOffset()`、`setPositioning()` 或 `setElement()` 也会进入 OMap 事件系统。

受管 API 与原生 API 可以混合使用，但稳定 ID、显隐状态和业务元数据应优先通过 `map.overlays` 配置，以便插件、示例和应用工具栏读取一致状态。

## 显隐与坐标分离

```ts
map.hideOverlay('station-popup');
map.showOverlay('station-popup');
```

隐藏只改变 DOM 可见性，不会清除坐标。因此临时隐藏后可以在原位置恢复。

改变坐标：

```ts
map.setOverlayPosition('station-popup', [x, y]);
map.setOverlayPosition('station-popup', undefined);
```

自动平移到视口内：

```ts
map.panToOverlay('station-popup', {
  margin: 32,
  animation: {duration: 300},
});
```

## 类型安全事件

```ts
map.on('overlay:position', ({id, position}) => {
  console.log(id, position);
});

map.on('overlay:visible', ({id, visible}) => {
  console.log(id, visible);
});
```

完整事件包括：

- `overlay:add` / `overlay:remove`
- `overlay:visible`
- `overlay:position`
- `overlay:offset`
- `overlay:positioning`
- `overlay:element`
- `overlay:order`
- `overlay:metadata`

## Popup

`@omap/widgets` 提供安全、框架无关的 Popup 控制器：

```ts
import {createPopup} from '@omap/widgets';

const popup = createPopup({
  id: 'details',
  content: 'Click a feature',
});

map.addOverlay(popup.overlay);
popup.open([x, y], 'Feature details');
popup.close();
```

字符串内容通过 `textContent` 写入，不作为 HTML 解析。需要复杂内容时传入已创建的 DOM Node：

```ts
const content = document.createElement('section');
content.append('Feature details');
popup.setContent(content);
```

## Marker

```ts
import {createMarker} from '@omap/widgets';

const marker = createMarker({
  id: 'selected-location',
  label: 'Selected location',
  position: [x, y],
});

map.addOverlay(marker.overlay);
marker.setPosition([nextX, nextY]);
marker.hide();
marker.show();
```

Marker 显隐和坐标相互独立。

## 按要素确定锚点

```ts
import {getFeatureOverlayCoordinate} from '@omap/widgets';

const coordinate = getFeatureOverlayCoordinate(feature);
if (coordinate) popup.open(coordinate);
```

锚点规则：

- Point：点坐标
- LineString：线中点
- Polygon：内部点
- Circle：圆心
- 其他几何：范围中心

Polygon 的 OpenLayers 内部点使用 XYM 布局，OMap 会移除内部长度 M 值，只返回适合 Overlay 定位的二维坐标。

## Scope 生命周期

```ts
const scope = map.scope('feature-popup');
scope.addOverlay(popup.overlay);
scope.addOverlay(marker.overlay);

await scope.dispose();
```

释放 Scope 时，两个原生 Overlay 会自动从地图移除。控制器自身不再使用时，再调用 `destroy()` 释放 DOM 引用。
