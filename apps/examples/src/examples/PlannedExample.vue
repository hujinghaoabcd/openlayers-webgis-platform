<script setup lang="ts">
defineProps<{title: string; description: string}>();
</script>
<template>
  <section class="planned"><span>PLANNED</span><h2>{{ title }}</h2><p>{{ description }}</p></section>
</template>
<style scoped>
.planned { display: grid; place-content: center; height: 100%; text-align: center; padding: 40px; background: linear-gradient(135deg,#eef5f8,#fff); }
span { justify-self: center; padding: 5px 10px; border-radius: 999px; background: #dcebf1; color: #1c6079; font-size: 12px; font-weight: 700; }
p { color:#657b8c; }
</style>
