# 快速开始

```bash
pnpm add ol @orbilayer/core @orbilayer/layers @orbilayer/vue
```

```vue
<script setup lang="ts">
import View from 'ol/View.js';
import {OrbiMap} from '@orbilayer/vue';
import {createOsmLayer} from '@orbilayer/layers';

const options = {
  layers: [createOsmLayer()],
  view: new View({center: [0, 0], zoom: 2}),
};
</script>

<template>
  <OrbiMap :options="options" height="100vh" />
</template>
```
