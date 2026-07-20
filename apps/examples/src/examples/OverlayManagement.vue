<script setup lang="ts">
import {Map} from '@omap/core';
import {createOsmLayer} from '@omap/layers';
import {createMarker, createPopup} from '@omap/widgets';
import View from 'ol/View.js';
import type {Coordinate} from 'ol/coordinate.js';
import {fromLonLat, toLonLat} from 'ol/proj.js';
import {onBeforeUnmount, onMounted, ref} from 'vue';

const target = ref<HTMLDivElement>();
const markerVisible = ref(true);
const popupOpen = ref(false);
const coordinateLabel = ref('尚未选择位置');
const overlayCount = ref(0);
const events = ref<string[]>([]);

const marker = createMarker({
  id: 'selected-location',
  title: 'Selected location',
  label: 'Selected location',
  className: 'example-marker',
  position: fromLonLat([118.78, 32.04]),
});
const popup = createPopup({
  id: 'location-popup',
  title: 'Location popup',
  className: 'example-popup',
  content: '点击地图查看坐标',
});

let viewer: Map | undefined;

onMounted(() => {
  if (!target.value) return;
  viewer = new Map({
    target: target.value,
    layers: [createOsmLayer({id: 'standard'})],
    view: new View({center: fromLonLat([118.78, 32.04]), zoom: 11}),
  });

  viewer.addOverlay(marker.overlay).addOverlay(popup.overlay);
  viewer.native.on('singleclick', event => selectCoordinate(event.coordinate));
  viewer.on('overlay:add', ({id}) => pushEvent(`${id}: added`));
  viewer.on('overlay:visible', ({id, visible}) => {
    pushEvent(`${id}: ${visible ? 'visible' : 'hidden'}`);
    syncState();
  });
  viewer.on('overlay:position', ({id, position}) => {
    pushEvent(`${id}: ${position ? 'position updated' : 'position cleared'}`);
    syncState();
  });
  syncState();
});

onBeforeUnmount(() => {
  popup.destroy();
  marker.destroy();
  void viewer?.remove();
  viewer = undefined;
});

function selectCoordinate(coordinate: Coordinate): void {
  marker.setPosition(coordinate);
  marker.show();
  const [longitude, latitude] = toLonLat(coordinate);
  coordinateLabel.value = `${longitude?.toFixed(5)}, ${latitude?.toFixed(5)}`;
  popup.open(coordinate, `经度 ${longitude?.toFixed(5)}，纬度 ${latitude?.toFixed(5)}`);
  syncState();
}

function toggleMarker(): void {
  if (marker.isVisible()) marker.hide();
  else marker.show();
  syncState();
}

function togglePopup(): void {
  if (popup.isOpen()) popup.close();
  else {
    const coordinate = marker.getPosition() ?? viewer?.getView().getCenter();
    if (coordinate) popup.open(coordinate, coordinateLabel.value);
  }
  syncState();
}

function moveToCenter(): void {
  const coordinate = viewer?.getView().getCenter();
  if (coordinate) selectCoordinate(coordinate);
}

function panToPopup(): void {
  viewer?.panToOverlay('location-popup', {animation: {duration: 300}, margin: 32});
}

function syncState(): void {
  markerVisible.value = marker.isVisible();
  popupOpen.value = popup.isOpen();
  overlayCount.value = viewer?.overlays.count() ?? 0;
}

function pushEvent(message: string): void {
  events.value.unshift(message);
  events.value = events.value.slice(0, 8);
}
</script>

<template>
  <div class="example-shell">
    <div ref="target" class="map" />
    <div class="toolbar">
      <button @click="toggleMarker">{{ markerVisible ? '隐藏 Marker' : '显示 Marker' }}</button>
      <button @click="togglePopup">{{ popupOpen ? '关闭 Popup' : '打开 Popup' }}</button>
      <button @click="moveToCenter">移动到地图中心</button>
      <button :disabled="!popupOpen" @click="panToPopup">自动平移到 Popup</button>
    </div>
    <aside class="status">
      <strong>Overlay 状态</strong>
      <dl>
        <div><dt>Overlay 数量</dt><dd>{{ overlayCount }}</dd></div>
        <div><dt>Marker</dt><dd>{{ markerVisible ? 'visible' : 'hidden' }}</dd></div>
        <div><dt>Popup</dt><dd>{{ popupOpen ? 'open' : 'closed' }}</dd></div>
        <div><dt>当前位置</dt><dd>{{ coordinateLabel }}</dd></div>
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
.toolbar { position:absolute; top:14px; left:14px; z-index:4; display:flex; flex-wrap:wrap; gap:8px; max-width:calc(100% - 320px); }
.toolbar button { border:1px solid #b9c8d1; border-radius:7px; padding:8px 11px; background:white; cursor:pointer; box-shadow:0 2px 8px rgba(25,52,70,.12); }
.toolbar button:disabled { cursor:not-allowed; opacity:.5; }
.status { position:absolute; top:14px; right:14px; z-index:3; width:260px; max-height:calc(100% - 28px); overflow:auto; border:1px solid #d7e0e5; border-radius:9px; padding:14px; background:rgba(255,255,255,.94); box-shadow:0 6px 20px rgba(25,52,70,.14); }
.status strong { display:block; margin-bottom:9px; }
dl { margin:0 0 16px; } dl div { display:grid; grid-template-columns:auto 1fr; gap:12px; padding:5px 0; border-bottom:1px solid #edf1f4; } dt { color:#617684; } dd { margin:0; overflow-wrap:anywhere; text-align:right; font-weight:600; } ol { margin:0; padding-left:20px; color:#4c6371; font-size:13px; } li { padding:2px 0; }
:global(.example-marker) { width:22px; height:22px; overflow:hidden; border:3px solid white; border-radius:50% 50% 50% 0; color:transparent; background:#d64c3f; box-shadow:0 3px 10px rgba(30,49,61,.35); transform:rotate(-45deg); }
:global(.example-popup) { min-width:220px; border:1px solid #cdd9df; border-radius:9px; padding:12px 36px 12px 14px; color:#243d4c; background:white; box-shadow:0 8px 24px rgba(25,52,70,.2); }
:global(.example-popup .omap-popup-close) { position:absolute; top:5px; right:7px; border:0; padding:2px 6px; font-size:20px; color:#607686; background:transparent; cursor:pointer; }
@media (max-width:820px) { .toolbar { right:14px; max-width:none; } .status { top:auto; bottom:14px; width:230px; } }
</style>
