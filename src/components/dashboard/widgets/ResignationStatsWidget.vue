<template>
  <div class="resignation-stats-widget">
    <a-spin v-if="loading" size="small" class="widget-spinner" />
    <template v-else-if="data">
      <div class="resign-stats-row">
        <div class="resign-stat">
          <span class="resign-stat-value submitted">{{ data.pending }}</span>
          <span class="resign-stat-label">Submitted</span>
        </div>
        <div class="resign-stat">
          <span class="resign-stat-value under-review">{{ data.pending_hr }}</span>
          <span class="resign-stat-label">Under HR Review</span>
        </div>
        <div class="resign-stat">
          <span class="resign-stat-value completed">{{ data.approved }}</span>
          <span class="resign-stat-label">Completed</span>
        </div>
        <div class="resign-stat">
          <span class="resign-stat-value declined">{{ data.rejected }}</span>
          <span class="resign-stat-label">Declined</span>
        </div>
      </div>
      <div v-if="data.overdue > 0" class="resign-overdue">
        <ExclamationCircleOutlined />
        <span>{{ data.overdue }} past last working date, not yet completed</span>
      </div>
      <div class="resign-total">
        <span>{{ data.total }} total &middot; {{ data.this_month }} this month</span>
      </div>
      <router-link to="/resignations" class="widget-view-all">View all resignations &rarr;</router-link>
    </template>
    <a-empty v-else description="No data" :image="simpleImage" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Empty } from 'ant-design-vue'
import { ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { dashboardApi } from '@/api'

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE
const data = ref(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await dashboardApi.resignationStats()
    data.value = res.data.data
  } catch { /* silent */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.widget-spinner { display: flex; justify-content: center; padding: 24px; }
.resign-stats-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
@media (min-width: 640px) {
  .resign-stats-row { grid-template-columns: repeat(4, 1fr); }
}
.resign-stat {
  text-align: center;
  padding: 12px 8px;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-md);
}
.resign-stat-value {
  display: block;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.resign-stat-value.submitted { color: var(--color-warning); }
.resign-stat-value.under-review { color: var(--color-accent); }
.resign-stat-value.completed { color: var(--color-success); }
.resign-stat-value.declined { color: var(--color-danger); }
.resign-stat-label { font-size: 11px; color: var(--color-text-secondary); }
.resign-overdue {
  margin-top: 10px;
  padding: 8px 12px;
  background: #fff2f0;
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--color-danger);
  font-size: 12px;
  color: var(--color-danger);
  display: flex;
  align-items: center;
  gap: 6px;
}
.resign-total {
  margin-top: 12px;
  text-align: center;
  font-size: 12px;
  color: var(--color-text-muted);
  padding-top: 8px;
  border-top: 1px solid var(--color-border-light);
}
</style>
