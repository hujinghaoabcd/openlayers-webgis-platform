<script setup lang="ts">
import View from 'ol/View.js';
import {fromLonLat} from 'ol/proj.js';
import {OMap, type Map} from '@omap/vue';
import {createOsmLayer} from '@omap/layers';

const options = {
  layers: [createOsmLayer({id: 'osm', title: 'OpenStreetMap'})],
  view: new View({center: fromLonLat([118.7969, 32.0603]), zoom: 10}),
};

function handleReady(map: Map): void {
  map.native.set('exampleId', 'map-basic-osm');
}
</script>

<template>
  <OMap :options="options" height="100%" @ready="handleReady" />
</template>
