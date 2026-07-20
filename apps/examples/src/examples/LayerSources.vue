<script setup lang="ts">
import {computed, ref, shallowRef} from 'vue';
import Fill from 'ol/style/Fill.js';
import Stroke from 'ol/style/Stroke.js';
import Style from 'ol/style/Style.js';
import View from 'ol/View.js';
import type {LayerSourceInfo, Map} from '@omap/core';
import {createOsmLayer, createWktLayer} from '@omap/layers';
import {OMap} from '@omap/vue';

const mapRef = shallowRef<Map>();
const revision = ref(0);
const messages = ref<string[]>([]);

const areaLayer = createWktLayer({
  id: 'study-area',
  title: '南京示例范围',
  data: 'POLYGON ((118.66 31.96, 118.93 31.96, 118.93 32.16, 118.66 32.16, 118.66 31.96))',
  dataProjection: 'EPSG:4326',
  featureProjection: 'EPSG:3857',
  style: new Style({
    stroke: new Stroke({color: '#d94841', width: 3}),
    fill: new Fill({color: 'rgba(217,72,65,0.16)'}),
  }),
});

const options = {
  layers: [
    createOsmLayer({id: 'osm', title: 'OpenStreetMap'}),
    areaLayer,
  ],
  view: new View({center: [13224000, 3779000], zoom: 9}),
};

const sources = computed<LayerSourceInfo[]>(() => {
  revision.value;
  const map = mapRef.value;
  return map ? map.layers.all().map(layer => map.sources.info(layer)) : [];
});

function refreshPanel(): void {
  revision.value += 1;
}

function log(message: string): void {
  messages.value.unshift(message);
  messages.value = messages.value.slice(0, 7);
  refreshPanel();
}

function handleReady(map: Map): void {
  mapRef.value = map;
  const scope = map.scope('layer-sources-example');
  scope.on(map, 'layer:loadstart', ({id, pending}) => log(`${id} loading (${pending})`));
  scope.on(map, 'layer:loadend', ({id, pending}) => log(`${id} ready (${pending})`));
  scope.on(map, 'layer:loaderror', ({id}) => log(`${id} load error`));
  scope.on(map, 'layer:source-state', ({id, state}) => log(`${id} source=${state}`));
  map.fitLayer('study-area', {padding: [70, 360, 70, 70], maxZoom: 11});
  refreshPanel();
}

function fitArea(): void {
  mapRef.value?.fitLayer('study-area', {
    padding: [70, 360, 70, 70],
    duration: 400,
    maxZoom: 11,
  });
}

function refreshBasemap(): void {
  mapRef.value?.refreshLayer('osm');
  log('osm refresh()');
}
</script>

<template>
  <div class="source-example">
    <OMap :options="options" height="100%" @ready="handleReady" />
    <section class="panel">
      <header>
        <strong>Sources & Formats</strong>
        <span>{{ sources.length }} sources</span>
      </header>
      <p>统一查看数据源状态，并使用 WKT 图层范围控制视图。</p>
      <div class="actions">
        <button type="button" @click="fitArea">定位 WKT</button>
        <button type="button" @click="refreshBasemap">刷新底图</button>
      </div>
      <ol class="source-list">
        <li v-for="item in sources" :key="item.id">
          <span>{{ item.id }}</span>
          <code>{{ item.sourceState }} / {{ item.loadStatus }}</code>
        </li>
      </ol>
      <ul class="events">
        <li v-for="message in messages" :key="message">{{ message }}</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.source-example { position:relative; height:100%; min-height:480px; }
.panel { position:absolute; top:16px; right:16px; width:320px; max-height:calc(100% - 32px); overflow:auto; padding:16px; border-radius:10px; background:rgba(255,255,255,.95); box-shadow:0 8px 30px rgba(25,52,70,.18); }
header { display:flex; justify-content:space-between; align-items:center; } header span { color:#607686; font-size:12px; }
p { color:#607686; font-size:13px; line-height:1.55; }
.actions { display:flex; gap:8px; } button { border:0; border-radius:6px; padding:8px 10px; color:white; background:#176b87; cursor:pointer; }
.source-list, .events { margin:14px 0 0; padding:0; list-style:none; }
.source-list li { display:flex; justify-content:space-between; gap:10px; padding:8px 0; border-bottom:1px solid #edf1f4; font-size:12px; }
.source-list code { color:#39758a; }.events { color:#657b89; font:11px/1.7 monospace; }
</style>
