<template>
  <div class="import-history">
    <a-collapse ghost :bordered="false">
      <a-collapse-panel key="history" header="Recent Imports">
        <div v-if="loading" class="history-loading">
          <a-spin size="small" />
        </div>
        <div v-else-if="!items.length" class="history-empty">
          No import history yet.
        </div>
        <div v-else class="history-list">
          <div v-for="item in items" :key="item.id" class="history-item">
            <div class="history-item-main">
              <span class="history-filename">{{ item.file_name }}</span>
              <span class="history-time">{{ timeAgo(item.created_at) }}</span>
            </div>
            <div class="history-item-detail">
              <a-tag :color="statusColor(item.status)" size="small">{{ item.status }}</a-tag>
              <span>{{ item.imported_rows }} imported</span>
              <span v-if="item.error_rows > 0" class="history-errors">{{ item.error_rows }} error(s)</span>
              <span class="history-user">{{ item.user_name }}</span>
            </div>
          </div>
        </div>
      </a-collapse-panel>
    </a-collapse>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { uploadApi } from '@/api'
import { timeAgo } from '@/utils/formatters'

const props = defineProps({
  module: { type: String, required: true },
})

const items = ref([])
const loading = ref(false)

function statusColor(status) {
  if (status === 'success') return 'green'
  if (status === 'failed') return 'red'
  return 'orange'
}

onMounted(async () => {
  loading.value = true
  try {
    const response = await uploadApi.importHistory(props.module)
    items.value = response.data?.data ?? []
  } catch {
    // Silently fail — history is non-critical
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.import-history {
  margin-top: 8px;
}
.history-loading {
  text-align: center;
  padding: 12px;
}
.history-empty {
  color: var(--color-text-muted, #9ca3af);
  font-size: var(--font-size-sm, 12px);
  padding: 8px 0;
}
.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.history-item {
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border-light, #f0f0f0);
}
.history-item:last-child {
  border-bottom: none;
}
.history-item-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.history-filename {
  font-size: var(--font-size-sm, 12px);
  font-weight: var(--font-weight-medium, 500);
  color: var(--color-text, #1f272e);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}
.history-time {
  font-size: var(--font-size-xs, 11px);
  color: var(--color-text-muted, #9ca3af);
  flex-shrink: 0;
}
.history-item-detail {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-xs, 11px);
  color: var(--color-text-secondary, #6b7280);
}
.history-errors {
  color: var(--color-danger, #dc2626);
}
.history-user {
  margin-left: auto;
  color: var(--color-text-muted, #9ca3af);
}
</style>
