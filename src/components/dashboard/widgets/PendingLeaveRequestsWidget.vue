<template>
  <div class="pending-leave-widget">
    <a-spin v-if="loading" size="small" class="widget-spinner" />
    <template v-else-if="requests.length">
      <div class="request-list widget-scroll">
        <router-link
          v-for="r in requests"
          :key="r.id"
          :to="`/leave-requests`"
          class="request-item"
        >
          <div class="request-info">
            <span class="request-name">{{ r.name }}</span>
            <span class="request-meta">
              {{ r.leave_types?.join(', ') || 'Leave' }} &middot; {{ r.total_days }}d
            </span>
          </div>
          <div class="request-right">
            <span class="request-dates">{{ formatRange(r.start_date, r.end_date) }}</span>
            <a-tag color="orange" size="small" class="status-tag">Pending</a-tag>
          </div>
        </router-link>
      </div>
      <router-link to="/leave-requests" class="widget-view-all">View all leave requests &rarr;</router-link>
    </template>
    <a-empty v-else description="No pending requests" :image="simpleImage" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Empty } from 'ant-design-vue'
import { dashboardApi } from '@/api'
import { formatDate } from '@/utils/formatters'

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE
const requests = ref([])
const loading = ref(true)

function formatRange(start, end) {
  if (!start) return '—'
  const s = formatDate(start, 'DD MMM')
  const e = end ? formatDate(end, 'DD MMM') : ''
  return start === end ? s : `${s} – ${e}`
}

onMounted(async () => {
  try {
    const res = await dashboardApi.pendingLeaveRequests()
    requests.value = res.data.data || []
  } catch { /* silent */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.widget-spinner { display: flex; justify-content: center; padding: 24px; }
.request-list { display: flex; flex-direction: column; }
.request-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 4px;
  text-decoration: none;
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border-light);
  transition: background var(--transition-fast);
}
.request-item:last-child { border-bottom: none; }
.request-item:hover { background: var(--color-bg-hover); }
.request-info { min-width: 0; }
.request-name { display: block; font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.request-meta { font-size: 11px; color: var(--color-text-secondary); }
.request-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.request-dates { font-size: 11px; color: var(--color-text-muted); white-space: nowrap; }
.status-tag { margin: 0; font-size: 10px; }
</style>
