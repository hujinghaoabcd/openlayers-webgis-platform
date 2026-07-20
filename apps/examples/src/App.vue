<script setup lang="ts">
import {computed, ref} from 'vue';
import {projectMeta} from '@omap/project-meta';
import BasicMap from './examples/BasicMap.vue';
import ControlManagement from './examples/ControlManagement.vue';
import CoreRuntime from './examples/CoreRuntime.vue';
import LayerManagement from './examples/LayerManagement.vue';
import LayerSources from './examples/LayerSources.vue';
import PlannedExample from './examples/PlannedExample.vue';
import {exampleCatalog} from './catalog';

const selectedId = ref(exampleCatalog[0]?.id ?? '');
const query = ref('');
const selected = computed(() => exampleCatalog.find(item => item.id === selectedId.value) ?? exampleCatalog[0]);
const filtered = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  return keyword
    ? exampleCatalog.filter(item => [item.title, item.category, ...item.tags].join(' ').toLowerCase().includes(keyword))
    : exampleCatalog;
});
</script>

<template>
  <div class="shell">
    <header><strong>{{ projectMeta.name }} Examples</strong><input v-model="query" placeholder="搜索示例、类别或标签" /></header>
    <aside>
      <button v-for="item in filtered" :key="item.id" :class="{active:item.id===selectedId}" @click="selectedId=item.id">
        <small>{{ item.category }}</small><span>{{ item.title }}</span>
      </button>
    </aside>
    <main v-if="selected">
      <section class="meta"><div><small>{{ selected.category }}</small><h1>{{ selected.title }}</h1><p>{{ selected.description }}</p></div><code>{{ selected.sourcePath }}</code></section>
      <section class="stage">
        <BasicMap v-if="selected.id==='map-basic-osm'" />
        <CoreRuntime v-else-if="selected.id==='core-runtime'" />
        <LayerManagement v-else-if="selected.id==='layer-management'" />
        <LayerSources v-else-if="selected.id==='layer-sources'" />
        <ControlManagement v-else-if="selected.id==='control-management'" />
        <PlannedExample v-else :title="selected.title" :description="selected.description" />
      </section>
    </main>
  </div>
</template>

<style scoped>
.shell { height:100vh; display:grid; grid-template-columns:310px 1fr; grid-template-rows:64px 1fr; overflow:hidden; }
header { grid-column:1/-1; display:flex; align-items:center; justify-content:space-between; padding:0 22px; color:white; background:#102c3d; }
header input { width:min(420px,45vw); border:1px solid #587182; border-radius:8px; padding:9px 12px; color:white; background:#183b50; outline:none; }
aside { overflow:auto; padding:12px; border-right:1px solid #dfe6ec; background:white; }
aside button { width:100%; display:flex; flex-direction:column; gap:5px; border:0; border-radius:8px; padding:12px; text-align:left; background:transparent; cursor:pointer; }
aside button:hover, aside button.active { background:#eaf3f7; }
small { color:#3b829a; }
main { min-width:0; display:grid; grid-template-rows:auto 1fr; overflow:hidden; }
.meta { display:flex; justify-content:space-between; align-items:end; gap:20px; padding:18px 24px; border-bottom:1px solid #dfe6ec; background:white; }
.meta h1 { margin:4px 0; font-size:22px; }.meta p { margin:0; color:#64798a; }.meta code { color:#607686; }
.stage { min-height:0; padding:16px; background:#e8eef2; }.stage > * { border-radius:10px; overflow:hidden; box-shadow:0 8px 30px rgba(25,52,70,.12); }
@media (max-width:760px){.shell{grid-template-columns:1fr;grid-template-rows:64px 180px 1fr}aside{display:flex;gap:8px;border-right:0;border-bottom:1px solid #ddd}aside button{min-width:230px}.meta code{display:none}}
</style>
