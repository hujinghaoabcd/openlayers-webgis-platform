<script setup lang="ts">
import {computed, ref, shallowRef} from 'vue';
import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import VectorLayer from 'ol/layer/Vector.js';
import {fromLonLat} from 'ol/proj.js';
import VectorSource from 'ol/source/Vector.js';
import CircleStyle from 'ol/style/Circle.js';
import Fill from 'ol/style/Fill.js';
import Style from 'ol/style/Style.js';
import View from 'ol/View.js';
import {configureLayer, type LayerInfo, type Map} from '@omap/core';
import {createOsmLayer, createXyzLayer} from '@omap/layers';
import {OMap} from '@omap/vue';

const mapRef = shallowRef<Map>();
const revision = ref(0);
const overlayOpacity = ref(0.8);
const messages = ref<string[]>([]);

const pointLayer = configureLayer(
  new VectorLayer({
    source: new VectorSource({
      features: [new Feature(new Point(fromLonLat([118.7969, 32.0603])))],
    }),
    style: new Style({
      image: new CircleStyle({
        radius: 9,
        fill: new Fill({color: '#d94841'}),
      }),
    }),
  }),
  {
    id: 'city-center',
    title: '南京中心点',
    kind: 'overlay',
    type: 'vector',
    opacity: overlayOpacity.value,
  },
);

const options = {
  layers: [
    createOsmLayer({id: 'standard', title: '标准底图'}),
    createXyzLayer({
      id: 'humanitarian',
      title: '人道主义底图',
      visible: false,
      url: 'https://{a-c}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
      attributions: '© OpenStreetMap contributors, Tiles style by HOT',
    }),
    pointLayer,
  ],
  view: new View({center: fromLonLat([118.7969, 32.0603]), zoom: 11}),
};

const layers = computed<LayerInfo[]>(() => {
  revision.value;
  return mapRef.value?.layers.all().map(layer => mapRef.value!.layers.info(layer)) ?? [];
});

function refresh(): void {
  revision.value += 1;
}

function log(message: string): void {
  messages.value.unshift(message);
  messages.value = messages.value.slice(0, 6);
  refresh();
}

function handleReady(map: Map): void {
  mapRef.value = map;
  const scope = map.scope('layer-management-example');
  scope.on(map, 'basemap:change', ({layer}) => {
    log(`basemap → ${layer ? map.layers.info(layer).id : 'none'}`);
  });
  scope.on(map, 'layer:visibility', ({id, visible}) => {
    log(`${id} visible=${String(visible)}`);
  });
  scope.on(map, 'layer:order', ({id, to}) => {
    log(`${id} moved to ${to}`);
  });
  refresh();
}

function selectBasemap(id: string): void {
  mapRef.value?.setBasemap(id);
  refresh();
}

function toggleOverlay(): void {
  mapRef.value?.layers.toggle('city-center');
  refresh();
}

function updateOpacity(): void {
  mapRef.value?.setLayerOpacity('city-center', overlayOpacity.value);
  refresh();
}

function moveOverlay(front: boolean): void {
  const map = mapRef.value;
  if (!map) return;
  if (front) map.layers.bringToFront('city-center');
  else map.layers.sendToBack('city-center');
  refresh();
}
</script>

<template>
  <div class="layer-example">
    <OMap :options="options" height="100%" @ready="handleReady" />
    <section class="panel">
      <header>
        <strong>Layers</strong>
        <span>{{ layers.length }} layers</span>
      </header>

      <div class="section">
        <small>底图</small>
        <div class="actions">
          <button type="button" @click="selectBasemap('standard')">标准</button>
          <button type="button" @click="selectBasemap('humanitarian')">人道主义</button>
        </div>
      </div>

      <div class="section">
        <small>业务图层</small>
        <button type="button" @click="toggleOverlay">切换中心点</button>
        <label>
          透明度 {{ overlayOpacity.toFixed(1) }}
          <input v-model.number="overlayOpacity" type="range" min="0" max="1" step="0.1" @input="updateOpacity" />
        </label>
        <div class="actions">
          <button type="button" @click="moveOverlay(false)">移到底层</button>
          <button type="button" @click="moveOverlay(true)">移到顶层</button>
        </div>
      </div>

      <ol class="layer-list">
        <li v-for="item in layers" :key="item.id">
          <span>{{ item.index }} · {{ item.title ?? item.id }}</span>
          <code>{{ item.kind }} / {{ item.visible ? 'on' : 'off' }}</code>
        </li>
      </ol>

      <ul class="events">
        <li v-for="message in messages" :key="message">{{ message }}</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.layer-example { position: relative; height: 100%; min-height: 480px; }
.panel { position:absolute; top:16px; right:16px; width:310px; max-height:calc(100% - 32px); overflow:auto; padding:16px; border-radius:10px; background:rgba(255,255,255,.95); box-shadow:0 8px 30px rgba(25,52,70,.18); }
header { display:flex; justify-content:space-between; align-items:center; } header span, small { color:#607686; font-size:12px; }
.section { display:grid; gap:8px; margin-top:15px; padding-top:13px; border-top:1px solid #e2e9ee; }
.actions { display:flex; gap:8px; } button { border:0; border-radius:6px; padding:8px 10px; color:white; background:#176b87; cursor:pointer; }
label { display:grid; gap:5px; color:#405969; font-size:12px; }
.layer-list, .events { margin:14px 0 0; padding:0; list-style:none; }
.layer-list li { display:flex; justify-content:space-between; gap:10px; padding:7px 0; border-bottom:1px solid #edf1f4; font-size:12px; }
.layer-list code { color:#39758a; }.events { color:#657b89; font:11px/1.7 monospace; }
</style>
