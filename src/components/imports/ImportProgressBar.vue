<template>
  <div v-if="active" class="import-progress">
    <a-steps :current="step === 'import' ? 1 : 0" size="small" class="progress-steps">
      <a-step title="Validate" />
      <a-step title="Import" />
    </a-steps>
    <a-progress :percent="99.9" status="active" :show-info="false" stroke-linecap="square" />
    <div class="progress-meta">
      <span class="progress-label">{{ step === 'import' ? 'Importing...' : 'Validating...' }}</span>
      <span class="progress-detail">
        {{ fileName }}
        <template v-if="fileSize"> ({{ formattedSize }})</template>
        — {{ elapsed }}s
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  active: { type: Boolean, default: false },
  step: { type: String, default: 'validate' },
  fileName: { type: String, default: '' },
  fileSize: { type: Number, default: 0 },
  elapsed: { type: Number, default: 0 },
})

const formattedSize = computed(() => {
  if (props.fileSize < 1024) return `${props.fileSize} B`
  if (props.fileSize < 1024 * 1024) return `${(props.fileSize / 1024).toFixed(1)} KB`
  return `${(props.fileSize / 1024 / 1024).toFixed(1)} MB`
})
</script>

<style scoped>
.import-progress {
  padding: 16px 0 8px;
}
.progress-steps {
  margin-bottom: 12px;
}
.progress-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: var(--font-size-sm, 12px);
  color: var(--color-text-secondary, #6b7280);
}
.progress-label {
  font-weight: var(--font-weight-medium, 500);
  color: var(--color-text, #1f272e);
}
</style>
