<template>
  <div class="info-field">
    <dt class="info-label">{{ label }}</dt>
    <dd class="info-value" :class="{ 'font-mono': mono }">
      <slot name="value">{{ value ?? '—' }}</slot>
    </dd>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: null },
  mono: { type: Boolean, default: false },
})
</script>

<style scoped>
.info-field {
  display: flex;
  align-items: stretch;
  min-height: 36px;
}
.info-label {
  flex: 0 0 clamp(100px, 38%, 200px);
  background: var(--color-bg-subtle, #f8f9fa);
  color: var(--color-text-secondary, #6b7280);
  font-size: 11.5px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 7px 10px;
  border-right: 1.5px solid var(--color-border, #e5e7eb);
  display: flex;
  align-items: center;
}
.info-value {
  flex: 1;
  background: var(--color-bg-surface, #ffffff);
  color: var(--color-text, #1f272e);
  font-size: 13px;
  font-weight: 500;
  padding: 7px 10px;
  margin: 0;
  display: flex;
  align-items: center;
}
</style>
