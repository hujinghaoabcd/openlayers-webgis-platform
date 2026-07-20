<script setup lang="ts">
import {Map} from '@omap/core';
import {
  bindFeatureHistory,
  createDrawInteraction,
  createModifyInteraction,
  createRemoveFeaturesCommand,
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
const selectedCount = ref(0);
const canUndo = ref(false);
const canRedo = ref(false);
const undoLabel = ref<string>();
const redoLabel = ref<string>();
const events = ref<string[]>([]);

const source = new VectorSource();
const sketchLayer = createVectorLayer({
  id: 'sketches',
  title: 'Sketches',
  source,
});

let viewer: Map | undefined;
let selectInteraction: ReturnType<typeof createSelectInteraction> | undefined;
let unbindHistory: (() => void) | undefined;

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

  selectInteraction = createSelectInteraction({layers: [sketchLayer]});
  const draw = createDrawInteraction({source, type: 'Polygon'});
  const modify = createModifyInteraction({source});
  const translate = createTranslateInteraction({layers: [sketchLayer]});
  const snap = createSnapInteraction({source});

  viewer
    .addInteraction(selectInteraction)
    .addInteraction(draw)
    .addInteraction(modify)
    .addInteraction(translate)
    .addInteraction(snap);

  unbindHistory = bindFeatureHistory({
    history: viewer.history,
    source,
    draw,
    modify,
    translate,
  });

  viewer.on('interaction:active', ({id, active, group}) => {
    if (group === 'tools') syncActiveTool();
    addEvent(`${id}: ${active ? 'active' : 'inactive'}`);
  });
  viewer.on('history:change', ({state}) => {
    syncHistory(state);
  });
  viewer.on('history:undo', ({entry}) => addEvent(`undo: ${entry.command.label}`));
  viewer.on('history:redo', ({entry}) => addEvent(`redo: ${entry.command.label}`));
  viewer.on('history:record', ({entry}) => addEvent(`record: ${entry.command.label}`));
  viewer.on('history:execute', ({entry}) => addEvent(`execute: ${entry.command.label}`));

  selectInteraction.on('select', () => {
    selectedCount.value = selectInteraction?.getFeatures().getLength() ?? 0;
  });
  source.on(['addfeature', 'removefeature', 'clear'], updateFeatureCount);
  syncActiveTool();
  syncHistory(viewer.history.state());
  updateFeatureCount();
});

onBeforeUnmount(() => {
  unbindHistory?.();
  unbindHistory = undefined;
  void viewer?.remove();
  viewer = undefined;
  selectInteraction = undefined;
});

function activate(id: string): void {
  viewer?.activateInteraction(id);
  syncActiveTool();
}

function stopTools(): void {
  viewer?.interactions.deactivateGroup('tools');
  syncActiveTool();
}

async function undo(): Promise<void> {
  selectInteraction?.getFeatures().clear();
  selectedCount.value = 0;
  await viewer?.undo();
}

async function redo(): Promise<void> {
  selectInteraction?.getFeatures().clear();
  selectedCount.value = 0;
  await viewer?.redo();
}

async function deleteSelected(): Promise<void> {
  const features = selectInteraction?.getFeatures().getArray() ?? [];
  if (!viewer || features.length === 0) return;
  await viewer.execute(
    createRemoveFeaturesCommand({
      source,
      features,
      label: features.length === 1 ? 'Delete selected feature' : 'Delete selected features',
    }),
  );
  selectInteraction?.getFeatures().clear();
  selectedCount.value = 0;
}

async function clearFeatures(): Promise<void> {
  const features = source.getFeatures();
  if (!viewer || features.length === 0) return;
  await viewer.execute(
    createRemoveFeaturesCommand({
      source,
      features,
      label: 'Clear features',
    }),
  );
  selectInteraction?.getFeatures().clear();
  selectedCount.value = 0;
}

async function clearHistory(): Promise<void> {
  await viewer?.history.clear();
}

function syncActiveTool(): void {
  const interaction = viewer?.interactions.current('tools');
  activeTool.value = interaction ? viewer!.interactions.id(interaction) : 'none';
}

function syncHistory(state: ReturnType<Map['history']['state']>): void {
  canUndo.value = state.canUndo;
  canRedo.value = state.canRedo;
  undoLabel.value = state.undoLabel;
  redoLabel.value = state.redoLabel;
}

function updateFeatureCount(): void {
  featureCount.value = source.getFeatures().length;
}

function addEvent(message: string): void {
  events.value.unshift(message);
  events.value = events.value.slice(0, 10);
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
      <button :disabled="!canUndo" :title="undoLabel" @click="undo">撤销</button>
      <button :disabled="!canRedo" :title="redoLabel" @click="redo">重做</button>
      <button :disabled="selectedCount === 0" @click="deleteSelected">删除所选</button>
      <button :disabled="featureCount === 0" @click="clearFeatures">清空要素</button>
      <button :disabled="!canUndo && !canRedo" @click="clearHistory">清空历史</button>
    </div>
    <aside class="status">
      <strong>交互与历史状态</strong>
      <dl>
        <div><dt>当前工具</dt><dd>{{ activeTool }}</dd></div>
        <div><dt>互斥组</dt><dd>tools</dd></div>
        <div><dt>捕捉</dt><dd>持续激活</dd></div>
        <div><dt>要素数量</dt><dd>{{ featureCount }}</dd></div>
        <div><dt>已选择</dt><dd>{{ selectedCount }}</dd></div>
        <div><dt>可撤销</dt><dd>{{ undoLabel ?? '无' }}</dd></div>
        <div><dt>可重做</dt><dd>{{ redoLabel ?? '无' }}</dd></div>
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
.toolbar { position:absolute; top:14px; left:14px; right:284px; z-index:4; display:flex; flex-wrap:wrap; gap:8px; }
.toolbar button { border:1px solid #b9c8d1; border-radius:7px; padding:8px 11px; background:white; cursor:pointer; box-shadow:0 2px 8px rgba(25,52,70,.12); }
.toolbar button.active { border-color:#245f78; color:white; background:#245f78; }
.toolbar button:disabled { cursor:not-allowed; opacity:.48; box-shadow:none; }
.status { position:absolute; top:14px; right:14px; z-index:3; width:250px; max-height:calc(100% - 28px); overflow:auto; border:1px solid #d7e0e5; border-radius:9px; padding:14px; background:rgba(255,255,255,.94); box-shadow:0 6px 20px rgba(25,52,70,.14); }
.status strong { display:block; margin-bottom:9px; }
dl { margin:0 0 16px; } dl div { display:flex; justify-content:space-between; gap:12px; padding:5px 0; border-bottom:1px solid #edf1f4; } dt { color:#617684; } dd { margin:0; max-width:140px; overflow:hidden; font-weight:600; text-overflow:ellipsis; white-space:nowrap; } ol { margin:0; padding-left:20px; color:#4c6371; font-size:13px; } li { padding:2px 0; }
@media (max-width:900px) { .toolbar { right:14px; } .status { top:auto; bottom:14px; width:220px; } }
</style>
