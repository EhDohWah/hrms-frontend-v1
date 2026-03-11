<template>
  <div class="placeholder-widget">
    <AppstoreOutlined class="placeholder-icon" />
    <p class="placeholder-text">Widget coming soon</p>
  </div>
</template>

<script setup>
import { AppstoreOutlined } from '@ant-design/icons-vue'
</script>

<style scoped>
.placeholder-widget {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  color: var(--color-text-muted);
}
.placeholder-icon { font-size: 32px; margin-bottom: 8px; }
.placeholder-text { font-size: 13px; margin: 0; }
</style>
