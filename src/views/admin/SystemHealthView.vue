<template>
  <div class="page-container">
    <div class="health-actions">
      <a-button :loading="loading" @click="fetchHealth">
        <ReloadOutlined /> Refresh
      </a-button>
      <span v-if="lastChecked" class="health-time">Last checked: {{ lastChecked }}</span>
    </div>

    <div class="health-grid">
      <a-card v-for="item in healthItems" :key="item.key" class="health-card" :bordered="false">
        <div class="health-card-header">
          <span class="health-status-dot" :class="item.status" />
          <span class="health-card-title">{{ item.title }}</span>
          <a-tag :color="statusColor(item.status)" size="small">{{ item.status }}</a-tag>
        </div>
        <div class="health-card-details">
          <div v-for="(val, label) in item.details" :key="label" class="health-detail-row">
            <span class="health-detail-label">{{ label }}</span>
            <span class="health-detail-value">{{ val }}</span>
          </div>
        </div>
      </a-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { systemApi } from '@/api'

const dayjs = inject('$dayjs')
const appStore = useAppStore()
const health = ref(null)
const loading = ref(true)
const lastChecked = ref('')

const healthItems = computed(() => {
  if (!health.value) return []
  const checks = health.value.checks || {}
  return [
    {
      key: 'database', title: 'Database', status: checks.database?.status || 'down',
      details: { 'Response Time': `${checks.database?.response_ms ?? '—'}ms` },
    },
    {
      key: 'cache', title: 'Cache', status: checks.cache?.status || 'down',
      details: { 'Driver': checks.cache?.driver || '—' },
    },
    {
      key: 'storage', title: 'Storage', status: checks.storage?.status || 'down',
      details: {
        'Used': `${checks.storage?.used_gb || 0} GB / ${checks.storage?.total_gb || 0} GB`,
        'Usage': `${checks.storage?.used_percent || 0}%`,
      },
    },
    {
      key: 'queue', title: 'Queue', status: checks.queue?.status || 'down',
      details: {
        'Pending Jobs': checks.queue?.pending_jobs ?? '—',
        'Failed (24h)': checks.queue?.failed_jobs_24h ?? '—',
      },
    },
    {
      key: 'logins', title: 'Login Activity', status: 'healthy',
      details: {
        'Logins Today': checks.logins?.today ?? '—',
        'Failed Today': checks.logins?.failed_today ?? '—',
        'Lockouts': checks.logins?.locked_out_today ?? '—',
      },
    },
  ]
})

function statusColor(status) {
  if (status === 'healthy') return 'green'
  if (status === 'warning' || status === 'degraded') return 'orange'
  return 'red'
}

async function fetchHealth() {
  loading.value = true
  try {
    const res = await systemApi.health()
    health.value = res.data.data
    lastChecked.value = dayjs().format('HH:mm:ss')
  } catch { /* silent */ }
  finally { loading.value = false }
}

onMounted(() => {
  appStore.setPageMeta('System Health', [{ title: 'System' }])
  fetchHealth()
})
</script>

<style scoped>
.health-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.health-time { font-size: 12px; color: var(--color-text-muted); }
.health-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
@media (max-width: 767px) {
  .health-grid { grid-template-columns: 1fr; }
}
.health-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
.health-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
.health-status-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  background: var(--color-text-muted);
}
.health-status-dot.healthy { background: #16a34a; }
.health-status-dot.warning, .health-status-dot.degraded { background: #d97706; }
.health-status-dot.down, .health-status-dot.critical { background: #dc2626; }
.health-card-title { flex: 1; font-size: 14px; font-weight: 600; }
.health-detail-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid var(--color-border-light);
}
.health-detail-row:last-child { border-bottom: none; }
.health-detail-label { font-size: 12px; color: var(--color-text-secondary); }
.health-detail-value { font-size: 13px; font-weight: 500; font-family: 'JetBrains Mono', monospace; }
</style>
