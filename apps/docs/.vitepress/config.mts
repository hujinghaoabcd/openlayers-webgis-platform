import {defineConfig} from 'vitepress';

export default defineConfig({
  lang: 'zh-CN',
  title: 'OrbiLayer',
  description: '基于 OpenLayers 的自研二维 WebGIS SDK',
  themeConfig: {
    nav: [
      {text: '指南', link: '/guide/getting-started'},
      {text: '架构', link: '/architecture/overview'},
      {text: '功能', link: '/reference/capabilities'},
      {text: 'API', link: '/api/index.html'},
    ],
    sidebar: {
      '/guide/': [
        {text: '从这里开始', items: [
          {text: '简介', link: '/guide/introduction'},
          {text: '快速开始', link: '/guide/getting-started'},
          {text: '配置体系', link: '/guide/configuration'},
        ]},
      ],
      '/architecture/': [
        {text: '架构', items: [
          {text: '整体设计', link: '/architecture/overview'},
          {text: '插件边界', link: '/architecture/plugins'},
        ]},
      ],
      '/reference/': [
        {text: '能力', items: [
          {text: '功能矩阵', link: '/reference/capabilities'},
          {text: '示例分类', link: '/reference/examples'},
        ]},
      ],
    },
    socialLinks: [],
    search: {provider: 'local'},
    footer: {message: 'OrbiLayer self-developed WebGIS platform'},
  },
});
