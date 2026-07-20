import {defineConfig} from 'vitepress';

export default defineConfig({
  lang: 'zh-CN',
  title: 'OMap',
  description: '基于 OpenLayers 的模块化二维 WebGIS 开发库',
  themeConfig: {
    nav: [
      {text: '指南', link: '/guide/getting-started'},
      {text: '架构', link: '/architecture/overview'},
      {text: '功能矩阵', link: '/reference/capabilities'},
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
          {text: '核心运行时', link: '/architecture/runtime'},
          {text: '图层核心', link: '/architecture/layers'},
          {text: '插件边界', link: '/architecture/plugins'},
        ]},
      ],
      '/reference/': [
        {text: '参考', items: [
          {text: '功能矩阵', link: '/reference/capabilities'},
          {text: '示例分类', link: '/reference/examples'},
        ]},
      ],
    },
    socialLinks: [],
    search: {provider: 'local'},
    footer: {message: 'OMap WebGIS library'},
  },
});
