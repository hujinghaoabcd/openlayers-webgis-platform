<script setup lang="ts">
import {onBeforeUnmount, ref, shallowRef} from 'vue';
import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import VectorLayer from 'ol/layer/Vector.js';
import {fromLonLat} from 'ol/proj.js';
import VectorSource from 'ol/source/Vector.js';
import CircleStyle from 'ol/style/Circle.js';
import Fill from 'ol/style/Fill.js';
import Style from 'ol/style/Style.js';
import View from 'ol/View.js';
import type {Map, Scope} from '@omap/core';
import {OMap} from '@omap/vue';
import {createOsmLayer} from '@omap/layers';

const mapRef = shallowRef<Map>();
const pointScope = shallowRef<Scope>();
const messages = ref<string[]>([]);

const options = {
  layers: [createOsmLayer({id: 'osm', title: 'OpenStreetMap'})],
  view: new View({center: fromLonLat([118.7969, 32.0603]), zoom: 11}),
};

function createPointLayer(): VectorLayer<VectorSource> {
  return new VectorLayer({
    properties: {id: 'runtime-point', title: 'Runtime point'},
    source: new VectorSource({
      features: [new Feature(new Point(fromLonLat([118.7969, 32.0603])))],
    }),
    style: new Style({
      image: new CircleStyle({
        radius: 9,
        fill: new Fill({color: '#e64a35'}),
      }),
    }),
  });
}

function handleReady(map: Map): void {
  mapRef.value = map;
  const eventScope = map.scope('runtime-events');
  eventScope.on(map, 'layer:add', ({layer}) => {
    messages.value.unshift(`layer:add — ${String(layer.get('id') ?? 'unnamed')}`);
  });
  eventScope.on(map, 'layer:remove', ({layer}) => {
    messages.value.unshift(`layer:remove — ${String(layer.get('id') ?? 'unnamed')}`);
  });

  map.registry.register('layer', 'runtime-point', createPointLayer, {replace: true});
  eventScope.add(() => map.registry.unregister('layer', 'runtime-point'));
  messages.value.push('Registry 已注册 layer:runtime-point');
}

async function addPoint(): Promise<void> {
  const map = mapRef.value;
  if (!map) {
    return;
  }

  await pointScope.value?.dispose();
  const factory = map.registry.require<() => VectorLayer<VectorSource>>(
    'layer',
    'runtime-point',
  );
  const scope = map.scope('runtime-point');
  scope.addLayer(factory());
  pointScope.value = scope;
}

async function clearPoint(): Promise<void> {
  await pointScope.value?.dispose();
  pointScope.value = undefined;
}

onBeforeUnmount(() => {
  void pointScope.value?.dispose();
});
</script>

<template>
  <div class="runtime-example">
    <OMap :options="options" height="100%" @ready="handleReady" />
    <section class="panel">
      <strong>Core Runtime</strong>
      <p>Registry 创建图层，Scope 管理生命周期，事件记录增删过程。</p>
      <div class="actions">
        <button type="button" @click="addPoint">添加点图层</button>
        <button type="button" @click="clearPoint">释放 Scope</button>
      </div>
      <ol>
        <li v-for="(message, index) in messages.slice(0, 5)" :key="`${index}-${message}`">
          {{ message }}
        </li>
      </ol>
    </section>
  </div>
</template>

<style scoped>
.runtime-example { position: relative; height: 100%; min-height: 440px; }
.panel { position: absolute; top: 16px; right: 16px; width: 280px; padding: 16px; border-radius: 10px; background: rgba(255,255,255,.94); box-shadow: 0 8px 30px rgba(25,52,70,.18); }
.panel p { color: #64798a; font-size: 13px; line-height: 1.5; }
.actions { display: flex; gap: 8px; }
button { border: 0; border-radius: 6px; padding: 8px 10px; color: white; background: #176b87; cursor: pointer; }
ol { padding-left: 20px; color: #3d5667; font: 12px/1.7 monospace; }
</style>
