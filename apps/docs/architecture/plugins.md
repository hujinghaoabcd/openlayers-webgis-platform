# 插件

插件必须声明唯一 `id`，并实现安装逻辑。插件创建的监听器、图层、控件和其他资源应在可选的 `dispose` 方法中完整释放。

```ts
import {definePlugin} from '@omap/core';

export const samplePlugin = definePlugin({
  id: 'sample',
  install({map, native}) {
    native.set('pluginOwner', map);
  },
  dispose({native}) {
    native.unset('pluginOwner');
  },
});
```

适合插件化的能力包括：

- 图层和数据格式
- 控件、交互与 Widget
- 空间分析任务
- 专题可视化
- 打印、离线缓存和实时数据
- 项目级业务模块
