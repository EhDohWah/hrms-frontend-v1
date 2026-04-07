<template>
  <div class="page-container">
    <div class="perf-actions">
      <a-button :loading="loading" @click="fetchAll">
        <ReloadOutlined /> Refresh
      </a-button>
    </div>

    <!-- Summary Cards -->
    <div class="stats-grid" style="margin-bottom: 20px;">
      <div class="stat-card" v-for="stat in summaryCards" :key="stat.label">
        <div class="stat-icon" :style="{ background: stat.bg, color: stat.color }">
          <component :is="stat.icon" />
        </div>
        <div class="stat-content">
          <template v-if="loading">
            <a-skeleton-input :active="true" size="small" style="width: 50px; height: 22px;" />
          </template>
          <template v-else>
            <span class="stat-value">{{ stat.value }}</span>
          </template>
          <span class="stat-label">{{ stat.label }}</span>
        </div>
      </div>
    </div>

    <!-- Endpoints Table -->
    <a-card title="Endpoint Performance" :bordered="false" :body-style="{ padding: 0 }">
      <a-table
        :columns="columns"
        :data-source="endpoints"
        :loading="loading"
        :pagination="false"
        :row-key="(r) => r.endpoint"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'endpoint'">
            <span class="font-mono" style="font-size: 12px;">{{ record.endpoint }}</span>
          </template>
          <template v-else-if="column.key === 'avg_time'">
            <span :class="{ 'text-danger': record.avg_time > 2000, 'text-warning': record.avg_time > 1000 }">
              {{ formatNumber(record.avg_time) }}ms
            </span>
          </template>
          <template v-else-if="column.key === 'max_time'">
            <span class="text-muted">{{ formatNumber(record.max_time) }}ms</span>
          </template>
          <template v-else-if="column.key === 'requests'">
            {{ formatNumber(record.requests) }}
          </template>
          <template v-else-if="column.key === 'slow_count'">
            <a-tag v-if="record.slow_count > 0" color="orange" size="small">{{ record.slow_count }}</a-tag>
            <span v-else class="text-muted">0</span>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, markRaw } from 'vue'
import { ReloadOutlined, ThunderboltOutlined, ClockCircleOutlined, ApiOutlined, WarningOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { systemApi } from '@/api'
import { formatNumber } from '@/utils/formatters'
import { STAT_COLORS } from '@/constants/colors'

const appStore = useAppStore()
const loading = ref(true)
const summary = ref({ avg_response_ms: 0, total_requests: 0, slow_requests: 0, memory_avg_mb: 0 })
const endpoints = ref([])

const summaryCards = computed(() => [
  { label: 'Avg Response', value: `${summary.value.avg_response_ms}ms`, icon: markRaw(ThunderboltOutlined), ...STAT_COLORS.blue },
  { label: 'Total Requests', value: formatNumber(summary.value.total_requests), icon: markRaw(ApiOutlined), ...STAT_COLORS.green },
  { label: 'Slow Requests', value: String(summary.value.slow_requests), icon: markRaw(WarningOutlined), ...STAT_COLORS.amber },
  { label: 'Avg Memory', value: `${summary.value.memory_avg_mb}MB`, icon: markRaw(ClockCircleOutlined), ...STAT_COLORS.pink },
])

const columns = [
  { title: 'Endpoint', key: 'endpoint', width: 300 },
  { title: 'Avg Time', key: 'avg_time', width: 120, align: 'right', sorter: (a, b) => a.avg_time - b.avg_time, defaultSortOrder: 'descend' },
  { title: 'Max Time', key: 'max_time', width: 120, align: 'right' },
  { title: 'Requests', key: 'requests', width: 100, align: 'right' },
  { title: 'Slow (>2s)', key: 'slow_count', width: 100, align: 'center' },
]

async function fetchAll() {
  loading.value = true
  try {
    const [summaryRes, endpointsRes] = await Promise.allSettled([
      systemApi.performanceSummary(),
      systemApi.performanceEndpoints(),
    ])
    if (summaryRes.status === 'fulfilled') {
      summary.value = summaryRes.value.data.data || summary.value
    }
    if (endpointsRes.status === 'fulfilled') {
      endpoints.value = endpointsRes.value.data.data || []
    }
  } catch { /* silent */ }
  finally { loading.value = false }
}

onMounted(() => {
  appStore.setPageMeta('Performance', [{ title: 'System' }, { title: 'Performance' }])
  fetchAll()
})
</script>

<style scoped>
.perf-actions { margin-bottom: 16px; }
.text-danger { color: var(--color-danger); font-weight: 600; }
.text-warning { color: var(--color-warning); font-weight: 600; }
</style>
