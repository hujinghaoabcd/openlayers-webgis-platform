# 插件

插件声明唯一 `id` 并实现安装逻辑。每个插件自动获得独立的 `scope` 和共享 `registry`。插件创建的图层、控件、交互、监听器及其他资源应登记到 Scope，由 OMap 统一释放。

```ts
import {definePlugin} from '@omap/core';

export const samplePlugin = definePlugin({
  id: 'sample',
  install({map, native, scope, registry}) {
    native.set('pluginOwner', map);
    scope.add(() => native.unset('pluginOwner'));
    registry.register('plugin', 'sample', {enabled: true});
    scope.add(() => registry.unregister('plugin', 'sample'));
  },
});
```

插件安装失败时，Scope 会自动回滚已经登记的资源。地图移除时，插件按照安装顺序的相反方向释放。

适合插件化的能力包括：

- 图层和数据格式
- 控件、交互与 Widget
- 空间分析任务
- 专题可视化
- 打印、离线缓存和实时数据
- 项目级业务模块
