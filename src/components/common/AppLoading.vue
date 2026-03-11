<script setup>
defineProps({
  tip: { type: String, default: 'Loading...' },
  size: { type: String, default: 'large' },
})
</script>

<template>
  <div class="app-loading">
    <a-spin :tip="tip" :size="size" />
  </div>
</template>

<style scoped>
.app-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 48px 0;
}
</style>
