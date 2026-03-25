<template>
  <a-config-provider :theme="themeConfig">
    <router-view />
  </a-config-provider>
</template>

<script setup>
import { theme } from 'ant-design-vue'

/**
 * Single source of truth for all Ant Design theme overrides.
 * Do NOT add LESS modifyVars in vite.config.js — they are dead code since AntD v4.
 * Global CSS custom properties live in src/styles/global.less.
 */
const themeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#002147',
    borderRadius: 8,
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f4f5f6',
    fontSize: 14,
  },
  components: {
    Table: {
      headerBg: '#f8f9fa',
      headerColor: '#6b7280',
      rowHoverBg: '#f0f2f4',
      borderColor: '#f0f0f0',
    },
    Card: {
      paddingLG: 20,
      headerFontSize: 14,
    },
    Button: {
      primaryShadow: 'none',
      fontWeight: 500,
    },
    Tag: {
      borderRadiusSM: 6,
    },
    Modal: {
      borderRadiusLG: 16,
    },
    Menu: {
      itemBorderRadius: 8,
    },
  },
}
</script>
