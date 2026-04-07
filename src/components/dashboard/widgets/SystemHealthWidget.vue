<template>
  <div class="health-widget">
    <a-spin v-if="loading" size="small" class="widget-spinner" />
    <template v-else-if="health">
      <div class="health-rows">
        <router-link to="/admin/system-health" class="health-row">
          <span class="health-indicator" :class="health.database?.status" />
          <span class="health-label">Database</span>
          <span class="health-detail">{{ health.database?.response_ms }}ms</span>
        </router-link>
        <router-link to="/admin/system-health" class="health-row">
          <span class="health-indicator" :class="health.cache?.status" />
          <span class="health-label">Cache</span>
          <span class="health-detail">{{ health.cache?.driver }}</span>
        </router-link>
        <router-link to="/admin/system-health" class="health-row">
          <span class="health-indicator" :class="health.storage?.status" />
          <span class="health-label">Storage</span>
          <span class="health-detail">{{ health.storage?.used_percent }}% used</span>
        </router-link>
        <router-link to="/admin/failed-jobs" class="health-row">
          <span class="health-indicator" :class="health.queue?.status" />
          <span class="health-label">Queue</span>
          <span class="health-detail">{{ health.queue?.failed_jobs_24h }} failed</span>
        </router-link>
        <router-link to="/admin/login-history" class="health-row">
          <span class="health-indicator healthy" />
          <span class="health-label">Logins</span>
          <span class="health-detail">{{ health.logins?.today }} today, {{ health.logins?.failed_today }} failed</span>
        </router-link>
      </div>
      <div class="health-footer">
        <span class="health-timestamp">Checked {{ lastChecked }}</span>
        <button class="health-refresh" :disabled="loading" @click="fetchHealth">
          <ReloadOutlined :spin="loading" />
        </button>
      </div>
    </template>
    <a-empty v-else description="Health check unavailable" :image="simpleImage" />
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { Empty } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { systemApi } from '@/api'

const dayjs = inject('$dayjs')
const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE
const health = ref(null)
const loading = ref(true)
const lastChecked = ref('')

async function fetchHealth() {
  loading.value = true
  try {
    const res = await systemApi.health()
    health.value = res.data.data
    lastChecked.value = dayjs().format('HH:mm')
  } catch { /* silent */ }
  finally { loading.value = false }
}

onMounted(fetchHealth)
</script>

<style scoped>
.health-rows { display: flex; flex-direction: column; }
.health-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 4px;
  border-bottom: 1px solid var(--color-border-light);
  text-decoration: none;
  color: var(--color-text);
  transition: background var(--transition-fast);
}
.health-row:last-child { border-bottom: none; }
.health-row:hover { background: var(--color-bg-hover); }
.health-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--color-text-muted);
}
.health-indicator.healthy { background: #16a34a; }
.health-indicator.degraded, .health-indicator.warning { background: #d97706; }
.health-indicator.down, .health-indicator.critical { background: #dc2626; }
.health-label { font-size: 13px; font-weight: 500; flex: 1; }
.health-detail { font-size: 12px; color: var(--color-text-secondary); font-family: 'JetBrains Mono', monospace; }
.health-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  padding-top: 8px;
  margin-top: 4px;
  border-top: 1px solid var(--color-border-light);
}
.health-timestamp { font-size: 10px; color: var(--color-text-muted); }
.health-refresh {
  border: none;
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 12px;
  padding: 2px;
}
.health-refresh:hover { color: var(--color-accent); }
</style>
