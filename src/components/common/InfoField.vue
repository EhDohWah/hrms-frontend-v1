<template>
  <div class="info-field">
    <dt class="info-label">{{ label }}</dt>
    <dd class="info-value" :class="{ 'font-mono': mono }">
      {{ value || '—' }}
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
  flex-direction: column;
  gap: 4px;
}
.info-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.info-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  margin: 0;
}
</style>
