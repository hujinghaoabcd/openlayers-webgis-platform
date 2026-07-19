<script setup lang="ts">
import {projectMeta} from '@omap/project-meta';
const capabilities = [
  ['地图内核', 'OpenLayers 原生兼容、配置驱动、插件生命周期、多地图协同'],
  ['数据与服务', '多源地图、标准服务、空间数据、实时数据与统一请求管线'],
  ['交互与编辑', '绘制、编辑、捕捉、撤销重做、图层管理、量测、打印'],
  ['空间分析', '客户端、Web Worker 与远程服务三种执行模式'],
  ['专题可视化', '聚合、热力、轨迹、流向、图表符号、时间动画与 WebGL'],
  ['Vue 工程化', 'Vue 3 组件、composables、示例站、教程/API 与项目模板'],
];
</script>

<template>
  <main>
    <header class="hero">
      <nav><strong>{{ projectMeta.name }}</strong><span>{{ projectMeta.tagline }}</span></nav>
      <section>
        <p class="eyebrow">OPENLAYERS · TYPESCRIPT · VUE 3</p>
        <h1>面向完整 WebGIS 产品的二维地图开发平台</h1>
        <p class="lead">保留 OpenLayers 原生能力，以统一配置、插件、组件、示例和工程模板补齐产品化开发链路。</p>
        <div class="actions"><a href="http://localhost:5174">开发示例</a><a class="ghost" href="http://localhost:5175">开发文档</a></div>
      </section>
    </header>
    <section class="grid">
      <article v-for="item in capabilities" :key="item[0]">
        <h2>{{ item[0] }}</h2><p>{{ item[1] }}</p>
      </article>
    </section>
    <section class="principles">
      <h2>设计原则</h2>
      <p>自研优先 · 分层清晰 · 类型完整 · 生命周期可控 · 示例即测试 · 文档与 API 同源生成</p>
    </section>
  </main>
</template>

<style scoped>
main { min-height: 100vh; }
.hero { color: white; background: radial-gradient(circle at 80% 0%, #276d89, transparent 38%), linear-gradient(135deg, #071726, #123a52); padding: 24px clamp(24px, 6vw, 88px) 88px; }
nav { display: flex; gap: 16px; align-items: baseline; opacity: .9; }
nav strong { font-size: 24px; letter-spacing: .04em; }
.hero section { max-width: 920px; margin-top: 100px; }
.eyebrow { letter-spacing: .18em; font-size: 12px; color: #8bd9ed; }
h1 { max-width: 850px; margin: 18px 0; font-size: clamp(42px, 7vw, 78px); line-height: 1.05; }
.lead { max-width: 760px; font-size: 20px; line-height: 1.8; color: #c9dce8; }
.actions { display: flex; gap: 14px; margin-top: 32px; }
.actions a { text-decoration: none; padding: 12px 20px; border-radius: 8px; color: #072033; background: #8de4f4; font-weight: 700; }
.actions .ghost { color: white; background: transparent; border: 1px solid #6f8fa2; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; padding: 54px clamp(24px, 6vw, 88px); }
article { min-height: 165px; border: 1px solid #dae3eb; border-radius: 14px; background: white; padding: 24px; box-shadow: 0 8px 30px rgba(25, 48, 70, .06); }
article h2 { margin-top: 0; }
article p, .principles p { line-height: 1.75; color: #53677b; }
.principles { margin: 0 clamp(24px, 6vw, 88px) 64px; padding: 30px; border-radius: 14px; background: #eaf2f7; }
</style>
