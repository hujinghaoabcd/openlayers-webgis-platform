<script setup lang="ts">
import {Map} from '@omap/core';
import {
  createDrawInteraction,
  createModifyInteraction,
  createSelectInteraction,
  createSnapInteraction,
  createTranslateInteraction,
} from '@omap/interactions';
import {createOsmLayer, createVectorLayer} from '@omap/layers';
import View from 'ol/View.js';
import {fromLonLat} from 'ol/proj.js';
import VectorSource from 'ol/source/Vector.js';
import {onBeforeUnmount, onMounted, ref} from 'vue';

const target = ref<HTMLDivElement>();
const activeTool = ref('none');
const featureCount = ref(0);
const events = ref<string[]>([]);

const source = new VectorSource();
const sketchLayer = createVectorLayer({
  id: 'sketches',
  title: 'Sketches',
  source,
});

let viewer: Map | undefined;

onMounted(() => {
  if (!target.value) return;

  viewer = new Map({
    target: target.value,
    view: new View({
      center: fromLonLat([118.78, 32.04]),
      zoom: 11,
    }),
    layers: [createOsmLayer({id: 'standard'}), sketchLayer],
  });

  viewer
    .addInteraction(createSelectInteraction({layers: [sketchLayer]}))
    .addInteraction(createDrawInteraction({source, type: 'Polygon'}))
    .addInteraction(createModifyInteraction({source}))
    .addInteraction(createTranslateInteraction({layers: [sketchLayer]}))
    .addInteraction(createSnapInteraction({source}));

  viewer.on('interaction:active', ({id, active, group}) => {
    if (group === 'tools') syncActiveTool();
    events.value.unshift(`${id}: ${active ? 'active' : 'inactive'}`);
    events.value = events.value.slice(0, 8);
  });

  source.on(['addfeature', 'removefeature', 'clear'], updateFeatureCount);
  syncActiveTool();
  updateFeatureCount();
});

onBeforeUnmount(() => {
  void viewer?.remove();
  viewer = undefined;
});

function activate(id: string): void {
  viewer?.activateInteraction(id);
  syncActiveTool();
}

function stopTools(): void {
  viewer?.interactions.deactivateGroup('tools');
  syncActiveTool();
}

function clearFeatures(): void {
  source.clear();
  updateFeatureCount();
}

function syncActiveTool(): void {
  const interaction = viewer?.interactions.current('tools');
  activeTool.value = interaction ? viewer!.interactions.id(interaction) : 'none';
}

function updateFeatureCount(): void {
  featureCount.value = source.getFeatures().length;
}
</script>

<template>
  <div class="example-shell">
    <div ref="target" class="map" />
    <div class="toolbar">
      <button :class="{active: activeTool === 'select'}" @click="activate('select')">选择</button>
      <button :class="{active: activeTool === 'draw'}" @click="activate('draw')">绘制多边形</button>
      <button :class="{active: activeTool === 'modify'}" @click="activate('modify')">修改</button>
      <button :class="{active: activeTool === 'translate'}" @click="activate('translate')">平移</button>
      <button :class="{active: activeTool === 'none'}" @click="stopTools">停止工具</button>
      <button @click="clearFeatures">清空要素</button>
    </div>
    <aside class="status">
      <strong>交互状态</strong>
      <dl>
        <div><dt>当前工具</dt><dd>{{ activeTool }}</dd></div>
        <div><dt>互斥组</dt><dd>tools</dd></div>
        <div><dt>捕捉</dt><dd>持续激活</dd></div>
        <div><dt>要素数量</dt><dd>{{ featureCount }}</dd></div>
      </dl>
      <strong>最近事件</strong>
      <ol>
        <li v-for="event in events" :key="event">{{ event }}</li>
      </ol>
    </aside>
  </div>
</template>

<style scoped>
.example-shell { position:relative; width:100%; height:100%; min-height:560px; background:#dce6ec; }
.map { width:100%; height:100%; min-height:560px; }
.toolbar { position:absolute; top:14px; left:50%; z-index:4; display:flex; flex-wrap:wrap; gap:8px; max-width:calc(100% - 360px); transform:translateX(-50%); }
.toolbar button { border:1px solid #b9c8d1; border-radius:7px; padding:8px 11px; background:white; cursor:pointer; box-shadow:0 2px 8px rgba(25,52,70,.12); }
.toolbar button.active { border-color:#245f78; color:white; background:#245f78; }
.status { position:absolute; top:14px; right:14px; z-index:3; width:250px; max-height:calc(100% - 28px); overflow:auto; border:1px solid #d7e0e5; border-radius:9px; padding:14px; background:rgba(255,255,255,.94); box-shadow:0 6px 20px rgba(25,52,70,.14); }
.status strong { display:block; margin-bottom:9px; }
dl { margin:0 0 16px; } dl div { display:flex; justify-content:space-between; gap:12px; padding:5px 0; border-bottom:1px solid #edf1f4; } dt { color:#617684; } dd { margin:0; font-weight:600; } ol { margin:0; padding-left:20px; color:#4c6371; font-size:13px; } li { padding:2px 0; }
@media (max-width:900px) { .toolbar { left:14px; right:14px; max-width:none; transform:none; } .status { top:auto; bottom:14px; width:220px; } }
</style>
