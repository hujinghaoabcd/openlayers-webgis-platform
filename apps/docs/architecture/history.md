# 命令历史

OMap 使用 `map.history` 管理可撤销操作。历史对象独立于具体图层和交互，既可以记录普通业务命令，也可以连接 OpenLayers 原生绘制与编辑事件。

## 基本使用

```ts
const command = {
  label: 'Update value',
  execute() {
    state.value = 10;
  },
  undo() {
    state.value = 0;
  },
};

await map.execute(command);
await map.undo();
await map.redo();
```

也可以直接使用历史对象：

```ts
await map.history.execute(command);
await map.history.undo();
await map.history.redo();
await map.history.clear();
```

## `execute` 与 `record`

`execute()` 适用于尚未发生的操作。历史对象先执行命令，成功后才写入撤销栈：

```ts
await map.history.execute(removeFeaturesCommand);
```

`record()` 适用于已经由外部系统完成的操作。OpenLayers 的 `drawend`、`modifyend` 和 `translateend` 事件触发时，几何变化已经发生，因此只需要记录对应命令，不能再次执行：

```ts
await map.history.record(alreadyAppliedCommand);
```

命令执行、撤销或重做失败时，历史栈保持原状，错误继续向调用方抛出。

## 历史状态

```ts
const state = map.history.state();

console.log(state.canUndo);
console.log(state.canRedo);
console.log(state.undoDepth);
console.log(state.redoDepth);
console.log(state.undoLabel);
console.log(state.redoLabel);
```

可以在创建地图时限制撤销深度：

```ts
const map = new Map({
  history: {
    limit: 50,
  },
});
```

## 类型安全事件

```ts
map.on('history:change', ({state}) => {
  undoButton.disabled = !state.canUndo;
  redoButton.disabled = !state.canRedo;
});

map.on('history:undo', ({entry}) => {
  console.log(entry.command.label);
});

map.on('history:error', ({action, error}) => {
  console.error(action, error);
});
```

公开事件包括：

```text
history:execute
history:record
history:undo
history:redo
history:clear
history:change
history:error
```

## 异步命令

命令可以返回 Promise：

```ts
await map.execute({
  label: 'Save feature',
  async execute() {
    await saveFeature(feature);
  },
  async undo() {
    await deleteFeature(feature.id);
  },
});
```

历史对象会串行处理异步操作。即使在命令尚未完成时调用 `undo()`，撤销也会等待前一个命令成功写入历史后再执行，从而避免状态竞争。

## 要素命令

`@omap/interactions` 提供原生矢量要素命令：

```ts
import {
  createAddFeaturesCommand,
  createRemoveFeaturesCommand,
  createGeometryChangeCommand,
} from '@omap/interactions';
```

删除并恢复要素：

```ts
await map.execute(
  createRemoveFeaturesCommand({
    source,
    features: selectedFeatures,
    label: 'Delete selected features',
  }),
);
```

几何命令使用克隆后的前后快照，不会保留对可变 Geometry 对象的共享引用。

## 连接原生编辑交互

```ts
import {bindFeatureHistory} from '@omap/interactions';

const unbind = bindFeatureHistory({
  history: map.history,
  source,
  draw,
  modify,
  translate,
});
```

绑定后：

- `drawend` 记录新增要素命令；
- `modifystart` 保存修改前几何，`modifyend` 记录前后快照；
- `translatestart` 保存平移前几何，`translateend` 记录前后快照。

销毁模块时应解除监听：

```ts
unbind();
```

完整可运行示例位于 `apps/examples/src/examples/InteractionManagement.vue`。
