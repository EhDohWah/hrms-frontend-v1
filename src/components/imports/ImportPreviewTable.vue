<template>
  <div class="import-preview">
    <!-- Summary stats -->
    <div class="preview-stats">
      <a-tag color="green">{{ validCount }} valid</a-tag>
      <a-tag v-if="errorCount > 0" color="red">{{ errorCount }} error(s)</a-tag>
      <a-tag v-if="warningCount > 0" color="orange">{{ warningCount }} warning(s)</a-tag>

      <a-segmented
        v-model:value="filter"
        :options="filterOptions"
        size="small"
        class="preview-filter"
      />
    </div>

    <!-- Preview table -->
    <a-table
      :columns="tableColumns"
      :data-source="filteredRows"
      :row-key="(r) => r.row"
      :row-class-name="rowClassName"
      :pagination="{ pageSize: 20, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }"
      v-model:expandedRowKeys="expandedKeys"
      size="small"
      :scroll="{ x: 'max-content' }"
    >
      <!-- Row number -->
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'row'">
          <span class="row-number">{{ record.row }}</span>
        </template>

        <!-- Status tag -->
        <template v-else-if="column.key === '_status'">
          <a-tag v-if="record.status === 'error'" color="red" size="small">Error</a-tag>
          <a-tag v-else-if="record.warnings?.length" color="orange" size="small">Warning</a-tag>
          <a-tag v-else color="green" size="small">Valid</a-tag>
        </template>

        <!-- Key field values -->
        <template v-else>
          <span>{{ record.key_fields?.[column.key] ?? '' }}</span>
        </template>
      </template>

      <!-- Expandable error detail -->
      <template #expandedRowRender="{ record }">
        <div v-if="record.errors?.length" class="preview-error-details">
          <div v-for="(err, i) in record.errors" :key="i" class="preview-error-item">
            <a-tag color="red" size="small">{{ err.field || 'Error' }}</a-tag>
            <span>{{ err.message }}</span>
            <span v-if="err.column" class="preview-error-cell">Cell {{ err.column }}{{ record.row }}</span>
          </div>
        </div>
        <div v-if="record.warnings?.length" class="preview-warning-details">
          <div v-for="(w, i) in record.warnings" :key="'w' + i" class="preview-warning-item">
            <a-tag color="orange" size="small">{{ w.field || 'Warning' }}</a-tag>
            <span>{{ w.message }}</span>
          </div>
        </div>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  previewRows: { type: Array, required: true },
  columns: { type: Array, required: true },
  validCount: { type: Number, default: 0 },
  errorCount: { type: Number, default: 0 },
  warningCount: { type: Number, default: 0 },
})

const filter = ref('All')
const filterOptions = ['All', 'Errors', 'Warnings', 'Valid']

// Expanded rows — user clicks to expand; no auto-expand to avoid overwhelming lists
const expandedKeys = ref([])
watch(
  () => props.previewRows,
  () => {
    expandedKeys.value = []
  },
  { immediate: true },
)

const tableColumns = computed(() => [
  { title: 'Row', key: 'row', width: 60, fixed: 'left' },
  ...props.columns.map((c) => ({ title: c.title, key: c.key, dataIndex: ['key_fields', c.key], width: c.width || 120 })),
  { title: 'Status', key: '_status', width: 80, fixed: 'right' },
])

const filteredRows = computed(() => {
  if (filter.value === 'Errors') return props.previewRows.filter((r) => r.status === 'error')
  if (filter.value === 'Warnings') return props.previewRows.filter((r) => r.status !== 'error' && r.warnings?.length)
  if (filter.value === 'Valid') return props.previewRows.filter((r) => r.status !== 'error' && !r.warnings?.length)
  return props.previewRows
})

function rowClassName(record) {
  if (record.status === 'error') return 'preview-row-error'
  if (record.warnings?.length) return 'preview-row-warning'
  return ''
}
</script>

<style scoped>
.preview-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.preview-filter {
  margin-left: auto;
}

:deep(.preview-row-error) {
  background: var(--color-danger-bg, #fef2f2) !important;
}
:deep(.preview-row-error:hover > td) {
  background: #fde8e8 !important;
}
:deep(.preview-row-warning) {
  background: var(--color-warning-bg, #fffbeb) !important;
}
:deep(.preview-row-warning:hover > td) {
  background: #fef3c7 !important;
}

.row-number {
  font-family: 'JetBrains Mono', monospace;
  font-size: var(--font-size-xs, 11px);
  color: var(--color-text-muted, #9ca3af);
}

.preview-error-details,
.preview-warning-details {
  padding: 4px 0;
}
.preview-error-item,
.preview-warning-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
  font-size: var(--font-size-sm, 12px);
}
.preview-error-cell {
  color: var(--color-text-muted, #9ca3af);
  font-family: 'JetBrains Mono', monospace;
  font-size: var(--font-size-xs, 11px);
}
</style>
