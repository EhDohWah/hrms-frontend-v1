<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})
</script>

<template>
  <div class="app-page-header">
    <div>
      <h1 class="app-page-header__title">{{ title }}</h1>
      <p v-if="subtitle" class="app-page-header__subtitle">{{ subtitle }}</p>
    </div>
    <div class="app-page-header__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.app-page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}
.app-page-header__title {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  color: var(--color-text, #1f272e);
}
.app-page-header__subtitle {
  margin: 4px 0 0;
  color: var(--color-text-secondary, #737373);
  font-size: 14px;
}
</style>
