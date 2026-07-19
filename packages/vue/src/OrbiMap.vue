<script setup lang="ts">
import 'ol/ol.css';
import {onBeforeUnmount, onMounted, ref, shallowRef} from 'vue';
import {OrbiMapApp, type OrbiMapOptions} from '@orbilayer/core';

const props = withDefaults(
  defineProps<{
    options?: Omit<OrbiMapOptions, 'target'>;
    height?: string;
  }>(),
  {height: '100%'},
);

const emit = defineEmits<{
  ready: [app: OrbiMapApp];
}>();

const target = ref<HTMLDivElement>();
const app = shallowRef<OrbiMapApp>();

onMounted(() => {
  if (!target.value) {
    throw new Error('OrbiMap target element is unavailable.');
  }
  const instance = new OrbiMapApp({...props.options, target: target.value});
  app.value = instance;
  emit('ready', instance);
});

onBeforeUnmount(async () => {
  await app.value?.dispose();
  app.value = undefined;
});

defineExpose({app});
</script>

<template>
  <div ref="target" class="orbilayer-map" :style="{height}" />
</template>

<style scoped>
.orbilayer-map {
  position: relative;
  width: 100%;
  min-height: 240px;
  overflow: hidden;
  background: #eef2f6;
}
</style>
