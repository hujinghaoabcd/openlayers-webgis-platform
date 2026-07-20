<script setup lang="ts">
import {computed, ref, shallowRef} from 'vue';
import {createStringXY} from 'ol/coordinate.js';
import {fromLonLat, transformExtent} from 'ol/proj.js';
import View from 'ol/View.js';
import type {ControlInfo, Map} from '@omap/core';
import {
  createFullScreenControl,
  createMousePositionControl,
  createScaleLineControl,
  createZoomControl,
  createZoomSliderControl,
  createZoomToExtentControl,
} from '@omap/controls';
import {createOsmLayer} from '@omap/layers';
import {OMap} from '@omap/vue';

const mapRef = shallowRef<Map>();
const revision = ref(0);
const messages = ref<string[]>([]);

const options = {
  layers: [createOsmLayer()],
  controls: [
    createZoomControl(),
    createZoomSliderControl(),
    createScaleLineControl({bar: true, text: true, minWidth: 120}),
    createMousePositionControl({
      coordinateFormat: createStringXY(4),
      projection: 'EPSG:4326',
    }),
    createFullScreenControl(),
    createZoomToExtentControl({
      extent: transformExtent([118.45, 31.85, 119.15, 32.35], 'EPSG:4326', 'EPSG:3857'),
    }),
  ],
  view: new View({center: fromLonLat([118.7969, 32.0603]), zoom: 10}),
};

const controls = computed<ControlInfo[]>(() => {
  revision.value;
  return mapRef.value?.controls.all().map(control => mapRef.value!.controls.info(control)) ?? [];
});

function refresh(): void {
  revision.value += 1;
}

function log(message: string): void {
  messages.value.unshift(message);
  messages.value = messages.value.slice(0, 7);
  refresh();
}

function handleReady(map: Map): void {
  mapRef.value = map;
  const scope = map.scope('control-management-example');
  scope.on(map, 'control:enabled', ({id, enabled}) => log(`${id} enabled=${String(enabled)}`));
  scope.on(map, 'control:metadata', ({metadata}) => {
    log(`${metadata.id} position=${metadata.position ?? 'native'}`);
  });
  scope.on(map, 'control:order', ({id, to}) => log(`${id} moved to ${to}`));
  refresh();
}

function toggle(id: string): void {
  mapRef.value?.controls.toggle(id);
  refresh();
}

function moveMousePosition(): void {
  const map = mapRef.value;
  if (!map) return;
  const current = map.controls.info('mouse-position').position;
  map.controls.update('mouse-position', {
    position: current === 'top-right' ? 'bottom-right' : 'top-right',
  });
  refresh();
}

function moveSlider(): void {
  mapRef.value?.controls.bringToFront('zoom-slider');
  refresh();
}
</script>

<template>
  <div class="control-example">
    <OMap :options="options" height="100%" @ready="handleReady" />
    <section class="panel">
      <header>
        <strong>Controls</strong>
        <span>{{ controls.length }} managed</span>
      </header>

      <div class="actions">
        <button type="button" @click="toggle('scale-line')">切换比例尺</button>
        <button type="button" @click="toggle('zoom-slider')">切换缩放条</button>
        <button type="button" @click="moveMousePosition">移动坐标控件</button>
        <button type="button" @click="moveSlider">缩放条置后</button>
      </div>

      <ol class="control-list">
        <li v-for="item in controls" :key="item.id">
          <span>{{ item.index }} · {{ item.title ?? item.id }}</span>
          <code>{{ item.enabled ? 'on' : 'off' }} / {{ item.position ?? 'native' }}</code>
        </li>
      </ol>

      <ul class="events">
        <li v-for="message in messages" :key="message">{{ message }}</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.control-example { position:relative; height:100%; min-height:480px; }
.panel { position:absolute; top:16px; right:16px; width:330px; max-height:calc(100% - 32px); overflow:auto; padding:16px; border-radius:10px; background:rgba(255,255,255,.95); box-shadow:0 8px 30px rgba(25,52,70,.18); }
header { display:flex; justify-content:space-between; align-items:center; } header span { color:#607686; font-size:12px; }
.actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:14px; }
button { border:0; border-radius:6px; padding:8px 10px; color:white; background:#176b87; cursor:pointer; }
.control-list, .events { margin:14px 0 0; padding:0; list-style:none; }
.control-list li { display:flex; justify-content:space-between; gap:10px; padding:7px 0; border-bottom:1px solid #edf1f4; font-size:12px; }
.control-list code { color:#39758a; }.events { color:#657b89; font:11px/1.7 monospace; }
:deep(.ol-mouse-position.omap-control-position-top-right) { top:8px; right:54px; bottom:auto; left:auto; }
:deep(.ol-mouse-position.omap-control-position-bottom-right) { right:8px; bottom:8px; top:auto; left:auto; }
</style>
