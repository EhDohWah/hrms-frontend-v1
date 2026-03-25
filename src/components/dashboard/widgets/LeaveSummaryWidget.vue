<template>
  <div class="leave-summary-widget">
    <a-spin v-if="loading" size="small" class="widget-spinner" />
    <template v-else-if="data">
      <div class="leave-stats-row">
        <div class="leave-stat">
          <span class="leave-stat-value pending">{{ data.pending }}</span>
          <span class="leave-stat-label">Pending</span>
        </div>
        <div class="leave-stat">
          <span class="leave-stat-value approved">{{ data.approved }}</span>
          <span class="leave-stat-label">Approved</span>
        </div>
        <div class="leave-stat">
          <span class="leave-stat-value declined">{{ data.declined }}</span>
          <span class="leave-stat-label">Declined</span>
        </div>
        <div class="leave-stat">
          <span class="leave-stat-value on-leave">{{ data.on_leave_today }}</span>
          <span class="leave-stat-label">On Leave Today</span>
        </div>
      </div>
      <div class="leave-total">
        <span>{{ data.total_requests }} total requests in {{ data.current_year }}</span>
      </div>
    </template>
    <a-empty v-else description="No data" :image="simpleImage" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Empty } from 'ant-design-vue'
import { dashboardApi } from '@/api'

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE
const data = ref(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await dashboardApi.leaveSummary()
    data.value = res.data.data
  } catch { /* silent */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.widget-spinner { display: flex; justify-content: center; padding: 24px; }
.leave-stats-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
@media (min-width: 640px) {
  .leave-stats-row { grid-template-columns: repeat(4, 1fr); }
}
.leave-stat {
  text-align: center;
  padding: 12px 8px;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-md);
}
.leave-stat-value {
  display: block;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.leave-stat-value.pending { color: #d97706; }
.leave-stat-value.approved { color: #16a34a; }
.leave-stat-value.declined { color: #dc2626; }
.leave-stat-value.on-leave { color: #2563eb; }
.leave-stat-label { font-size: 11px; color: var(--color-text-secondary); }
.leave-total {
  margin-top: 12px;
  text-align: center;
  font-size: 12px;
  color: var(--color-text-muted);
  padding-top: 8px;
  border-top: 1px solid var(--color-border-light);
}
</style>
