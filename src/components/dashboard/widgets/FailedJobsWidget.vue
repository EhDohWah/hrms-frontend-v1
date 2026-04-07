<template>
  <div class="jobs-widget">
    <a-spin v-if="loading" size="small" class="widget-spinner" />
    <template v-else-if="jobs.length">
      <div class="job-list widget-scroll" style="max-height: 240px;">
        <div v-for="j in jobs" :key="j.id" class="job-item">
          <div class="job-icon"><WarningOutlined /></div>
          <div class="job-content">
            <span class="job-name">{{ j.job_name }}</span>
            <span class="job-error">{{ j.exception_short || '—' }}</span>
            <span class="job-meta">{{ timeAgo(j.failed_at) }}</span>
          </div>
        </div>
      </div>
      <router-link to="/admin/failed-jobs" class="widget-view-all">View all failed jobs &rarr;</router-link>
    </template>
    <div v-else class="jobs-clear">
      <CheckCircleOutlined style="font-size: 20px; color: var(--color-success);" />
      <span>No failed jobs</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { WarningOutlined, CheckCircleOutlined } from '@ant-design/icons-vue'
import { systemApi } from '@/api'
import { timeAgo } from '@/utils/formatters'

const jobs = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await systemApi.failedJobs({ per_page: 5 })
    jobs.value = (res.data.data?.data || res.data.data || []).map(j => ({
      ...j,
      exception_short: j.exception ? j.exception.substring(0, 80) + (j.exception.length > 80 ? '...' : '') : null,
    }))
  } catch { /* silent */ }
  finally { loading.value = false }
})
</script>

<style scoped>
.job-list { display: flex; flex-direction: column; }
.job-item {
  display: flex;
  gap: 10px;
  padding: 8px 4px;
  border-bottom: 1px solid var(--color-border-light);
}
.job-item:last-child { border-bottom: none; }
.job-icon {
  width: 28px; height: 28px;
  border-radius: var(--radius-sm);
  background: var(--color-warning-bg);
  color: var(--color-warning);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  flex-shrink: 0;
  margin-top: 2px;
}
.job-content { min-width: 0; }
.job-name { display: block; font-size: 12px; font-weight: 500; }
.job-error {
  display: block;
  font-size: 11px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.job-meta { font-size: 10px; color: var(--color-text-muted); }
.jobs-clear {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 24px;
  font-size: 13px;
  color: var(--color-text-secondary);
}
</style>
