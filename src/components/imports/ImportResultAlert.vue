<template>
  <a-alert
    v-if="result"
    :type="result.type"
    :message="result.message"
    show-icon
    closable
    class="result-alert"
    @close="$emit('close')"
  >
    <template #description>
      <div>{{ result.description }}</div>
      <ul v-if="result.errors?.length" class="import-error-list">
        <li v-for="(err, i) in result.errors" :key="i">{{ formatError(err) }}</li>
      </ul>
      <ul v-if="result.warnings?.length" class="import-warning-list">
        <li v-for="(w, i) in result.warnings" :key="'w' + i">{{ formatError(w) }}</li>
      </ul>
    </template>
  </a-alert>
</template>

<script setup>
defineProps({
  result: { type: Object, default: null },
})
defineEmits(['close'])

function formatError(err) {
  if (typeof err === 'string') return err
  if (err.row && err.field) return `Row ${err.row}, ${err.field}: ${err.message}`
  if (err.sheet && err.message) return `${err.sheet}: ${err.message}`
  return err.message || String(err)
}
</script>

<style scoped>
.result-alert {
  margin-top: 12px;
}
.import-error-list {
  margin: 8px 0 0;
  padding-left: 18px;
  font-size: var(--font-size-sm, 12px);
  line-height: 1.6;
  color: var(--color-text-secondary, #6b7280);
}
.import-warning-list {
  margin: 8px 0 0;
  padding-left: 18px;
  font-size: var(--font-size-sm, 12px);
  line-height: 1.6;
  color: #d48806;
}
</style>
