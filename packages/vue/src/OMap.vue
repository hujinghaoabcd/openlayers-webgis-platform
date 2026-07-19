<script setup lang="ts">
import 'ol/ol.css';
import {onBeforeUnmount, onMounted, ref, shallowRef} from 'vue';
import {Map, type MapOptions} from '@omap/core';

const props = withDefaults(
  defineProps<{
    options?: Omit<MapOptions, 'target'>;
    height?: string;
  }>(),
  {height: '100%'},
);

const emit = defineEmits<{
  ready: [map: Map];
}>();

const target = ref<HTMLDivElement>();
const map = shallowRef<Map>();

onMounted(() => {
  if (!target.value) {
    throw new Error('OMap target element is unavailable.');
  }

  const instance = new Map({...props.options, target: target.value});
  map.value = instance;
  emit('ready', instance);
});

onBeforeUnmount(async () => {
  await map.value?.remove();
  map.value = undefined;
});

defineExpose({map});
</script>

<template>
  <div ref="target" class="omap-map" :style="{height}" />
</template>

<style scoped>
.omap-map {
  position: relative;
  width: 100%;
  min-height: 240px;
  overflow: hidden;
  background: #eef2f6;
}
</style>
