<script setup>
defineProps({
  description: { type: String, default: 'No data found' },
})
</script>

<template>
  <div class="app-empty">
    <a-empty :description="description">
      <slot />
    </a-empty>
  </div>
</template>

<style scoped>
.app-empty {
  padding: 48px 0;
}
</style>
