# 快速开始

```bash
pnpm add ol @omap/core @omap/layers @omap/vue
```

## TypeScript

```ts
import View from 'ol/View.js';
import {map} from '@omap/core';
import {createOsmLayer} from '@omap/layers';

const viewer = map('map', {
  layers: [createOsmLayer()],
  view: new View({center: [0, 0], zoom: 2}),
});

viewer.native.once('rendercomplete', () => {
  console.log('Map rendered');
});
```

## Vue

```vue
<script setup lang="ts">
import View from 'ol/View.js';
import {OMap} from '@omap/vue';
import {createOsmLayer} from '@omap/layers';

const options = {
  layers: [createOsmLayer()],
  view: new View({center: [0, 0], zoom: 2}),
};
</script>

<template>
  <OMap :options="options" height="100vh" />
</template>
```
