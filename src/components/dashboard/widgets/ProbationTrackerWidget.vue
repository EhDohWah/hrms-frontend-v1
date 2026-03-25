<template>
  <div class="probation-widget">
    <a-spin v-if="loading" size="small" class="widget-spinner" />
    <template v-else-if="records.length">
      <div class="probation-list">
        <div v-for="r in records" :key="r.employee_id" class="probation-item">
          <div class="probation-info">
            <span class="probation-name">{{ r.name }}</span>
            <span class="probation-meta">{{ r.department }} &middot; {{ r.position }}</span>
          </div>
          <div class="probation-progress">
            <div class="days-badge" :class="urgencyClass(r.days_remaining)">
              {{ r.days_remaining != null ? `${r.days_remaining}d` : '—' }}
            </div>
            <span class="probation-dates">{{ formatDate(r.probation_end) }}</span>
          </div>
        </div>
      </div>
    </template>
    <a-empty v-else description="No employees on probation" :image="simpleImage" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Empty } from 'ant-design-vue'
import { dashboardApi } from '@/api'
import { formatDate } from '@/utils/formatters'

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE
const records = ref([])
const loading = ref(true)

function urgencyClass(days) {
  if (days == null) return ''
  if (days <= 7) return 'urgent'
  if (days <= 30) return 'warning'
  return 'normal'
}

onMounted(async () => {
  try {
    const res = await dashboardApi.probationTracker()
    records.value = res.data.data || []
  } catch { /* silent */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.widget-spinner { display: flex; justify-content: center; padding: 24px; }
.probation-list { display: flex; flex-direction: column; }
.probation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 4px;
  border-bottom: 1px solid var(--color-border-light);
}
.probation-item:last-child { border-bottom: none; }
.probation-info { min-width: 0; }
.probation-name { display: block; font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.probation-meta { font-size: 11px; color: var(--color-text-secondary); }
.probation-progress { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
.days-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--color-bg-subtle);
  color: var(--color-text-secondary);
}
.days-badge.urgent { background: #fee2e2; color: #dc2626; }
.days-badge.warning { background: #fef3c7; color: #d97706; }
.days-badge.normal { background: #f0fdf4; color: #16a34a; }
.probation-dates { font-size: 10px; color: var(--color-text-muted); }
</style>
