<script setup lang="ts">
import View from 'ol/View.js';
import {fromLonLat} from 'ol/proj.js';
import {OrbiMap, type OrbiMapApp} from '@orbilayer/vue';
import {createOsmLayer} from '@orbilayer/layers';

const options = {
  layers: [createOsmLayer({id: 'osm', title: 'OpenStreetMap'})],
  view: new View({center: fromLonLat([118.7969, 32.0603]), zoom: 10}),
};

function handleReady(app: OrbiMapApp): void {
  app.map.set('exampleId', 'map-basic-osm');
}
</script>

<template>
  <OrbiMap :options="options" height="100%" @ready="handleReady" />
</template>
