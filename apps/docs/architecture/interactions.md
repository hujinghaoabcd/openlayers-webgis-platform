# 交互核心

OMap 的交互系统建立在 OpenLayers 原生 `Interaction` 和地图交互 `Collection` 之上。公开 API 不创建替代对象，而是为原生交互补充稳定 ID、元数据、激活状态、互斥组、顺序和类型安全事件。

## 受管集合

每个地图实例都提供：

```ts
map.interactions
```

常用操作：

```ts
map.interactions.add(interaction, {id: 'draw'});
map.interactions.remove('draw');
map.interactions.get('draw');
map.interactions.require('draw');
map.interactions.has('draw');
map.interactions.info('draw');
map.interactions.ids();
```

底层原生集合仍可直接访问：

```ts
map.native.getInteractions();
```

通过原生 `map.addInteraction()` 或 `map.removeInteraction()` 修改集合时，OMap 会同步注册状态并产生相应事件。

## 激活状态

```ts
map.activateInteraction('draw');
map.deactivateInteraction('draw');
map.interactions.toggle('draw');
map.interactions.isActive('draw');
```

OMap 使用原生 `Interaction#setActive()`，因此从原生对象直接修改状态也会被观察：

```ts
interaction.setActive(false);
```

## 互斥组

交互可以声明 `group`：

```ts
map.addInteraction(draw, {id: 'draw', group: 'tools'});
map.addInteraction(modify, {id: 'modify', group: 'tools'});
```

激活 `modify` 时，同一组内已激活的 `draw` 会自动停用：

```ts
map.activateInteraction('modify');
map.interactions.current('tools');
map.interactions.active('tools');
map.interactions.deactivateGroup('tools');
```

没有组名的交互不会参与互斥。`Snap`、拖放加载等辅助交互可以与绘制和编辑工具并行工作。

## 类型安全事件

```ts
map.on('interaction:active', ({id, active, group}) => {
  console.log(id, active, group);
});
```

可用事件：

- `interaction:add`
- `interaction:remove`
- `interaction:active`
- `interaction:metadata`
- `interaction:order`

## 标准工厂

`@omap/interactions` 提供原生 OpenLayers 交互工厂：

```ts
createSelectInteraction
createDrawInteraction
createModifyInteraction
createTranslateInteraction
createSnapInteraction
createDragBoxInteraction
createExtentInteraction
createDragAndDropInteraction
```

需要互斥的工具默认属于 `tools` 组并设为未激活。`Snap` 和 `DragAndDrop` 默认保持激活且不属于互斥组。

```ts
const draw = createDrawInteraction({
  source,
  type: 'Polygon',
});

const snap = createSnapInteraction({source});

map.addInteraction(draw);
map.addInteraction(snap);
map.activateInteraction('draw');
```

## Scope 清理

```ts
const scope = map.scope('editing');

scope.addInteraction(createDrawInteraction({source, type: 'Polygon'}));
scope.addInteraction(createSnapInteraction({source}));

await scope.dispose();
```

释放 Scope 时，所属交互会从原生地图集合中移除。
