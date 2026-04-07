<template>
  <div class="errors-widget">
    <a-spin v-if="loading" size="small" class="widget-spinner" />
    <template v-else-if="errors.length">
      <div class="error-list widget-scroll" style="max-height: 240px;">
        <div v-for="e in errors" :key="e.id" class="error-item">
          <a-tag :color="levelColor(e.level)" size="small" class="error-level">{{ e.level }}</a-tag>
          <div class="error-content">
            <span class="error-message">{{ e.message }}</span>
            <span class="error-meta">{{ e.occurrences > 1 ? `${e.occurrences}x · ` : '' }}{{ timeAgo(e.last_seen_at) }}</span>
          </div>
        </div>
      </div>
      <router-link to="/admin/error-logs" class="widget-view-all">View all errors &rarr;</router-link>
    </template>
    <div v-else class="errors-clear">
      <CheckCircleOutlined style="font-size: 20px; color: var(--color-success);" />
      <span>No recent errors</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { CheckCircleOutlined } from '@ant-design/icons-vue'
import { systemApi } from '@/api'
import { timeAgo } from '@/utils/formatters'
import { levelColor } from '@/constants/colors'

const errors = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await systemApi.errorLogs({ per_page: 5 })
    errors.value = res.data.data?.data || res.data.data || []
  } catch { /* silent — feature may not have backend yet */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.error-list { display: flex; flex-direction: column; }
.error-item {
  display: flex;
  gap: 8px;
  padding: 8px 4px;
  border-bottom: 1px solid var(--color-border-light);
}
.error-item:last-child { border-bottom: none; }
.error-level { flex-shrink: 0; margin: 0; font-size: 10px; }
.error-content { min-width: 0; }
.error-message {
  display: block;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.error-meta { font-size: 10px; color: var(--color-text-muted); }
.errors-clear {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 24px;
  font-size: 13px;
  color: var(--color-text-secondary);
}
</style>
