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

    <!-- Hourly Breakdown Table -->
    <a-card title="Hourly Breakdown" :bordered="false" :body-style="{ padding: 0 }">
      <template #extra>
        <span class="text-muted" style="font-size: 12px;">{{ metricsData.date || 'Today' }}</span>
      </template>
      <a-table
        :columns="columns"
        :data-source="hourlyRows"
        :loading="loading"
        :pagination="false"
        :row-key="(r) => r.hour"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'hour'">
            <span class="font-mono" style="font-size: 12px;">{{ record.hour }}:00</span>
          </template>
          <template v-else-if="column.key === 'avg_time'">
            <span :class="{ 'text-danger': record.avg_time > 2000, 'text-warning': record.avg_time > 1000 }">
              {{ formatNumber(record.avg_time) }}ms
            </span>
          </template>
          <template v-else-if="column.key === 'avg_memory'">
            <span class="text-muted">{{ record.avg_memory }}MB</span>
          </template>
          <template v-else-if="column.key === 'requests'">
            {{ formatNumber(record.requests) }}
          </template>
        </template>
        <template #emptyText>
          <div style="padding: 24px; text-align: center; color: var(--color-text-muted);">
            No hourly data recorded yet. Performance data populates as API requests are made.
          </div>
        </template>
      </a-table>
    </a-card>

    <!-- Daily Totals -->
    <a-card title="Daily Totals" :bordered="false" style="margin-top: 16px;">
      <a-descriptions :column="{ xs: 1, sm: 2, md: 4 }" size="small" bordered>
        <a-descriptions-item label="Total Requests">
          {{ formatNumber(dailyTotals.total_requests) }}
        </a-descriptions-item>
        <a-descriptions-item label="Total Execution Time">
          {{ formatNumber(dailyTotals.total_execution_time_ms) }}ms
        </a-descriptions-item>
        <a-descriptions-item label="Total Memory Usage">
          {{ dailyTotals.total_memory_usage_mb }}MB
        </a-descriptions-item>
        <a-descriptions-item label="Slow Requests">
          <a-tag v-if="dailyTotals.slow_queries > 0" color="orange" size="small">
            {{ dailyTotals.slow_queries }}
          </a-tag>
          <span v-else class="text-muted">0</span>
        </a-descriptions-item>
      </a-descriptions>
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
const metricsData = ref({ date: '', daily: {}, hourly: [] })

const summaryCards = computed(() => [
  { label: 'Avg Response', value: `${summary.value.avg_response_ms}ms`, icon: markRaw(ThunderboltOutlined), ...STAT_COLORS.blue },
  { label: 'Total Requests', value: formatNumber(summary.value.total_requests), icon: markRaw(ApiOutlined), ...STAT_COLORS.green },
  { label: 'Slow Requests', value: String(summary.value.slow_requests), icon: markRaw(WarningOutlined), ...STAT_COLORS.amber },
  { label: 'Avg Memory', value: `${summary.value.memory_avg_mb}MB`, icon: markRaw(ClockCircleOutlined), ...STAT_COLORS.pink },
])

const hourlyRows = computed(() => {
  return (metricsData.value.hourly || []).map(h => ({
    hour: h.hour,
    requests: h.requests,
    avg_time: h.avg_execution_time_ms,
    avg_memory: h.avg_memory_usage_mb,
  }))
})

const dailyTotals = computed(() => {
  const d = metricsData.value.daily || {}
  return {
    total_requests: d.total_requests || 0,
    total_execution_time_ms: d.total_execution_time_ms || 0,
    total_memory_usage_mb: d.total_memory_usage_mb || 0,
    slow_queries: d.slow_queries || 0,
  }
})

const columns = [
  { title: 'Hour', key: 'hour', width: 100 },
  { title: 'Requests', key: 'requests', width: 120, align: 'right', sorter: (a, b) => a.requests - b.requests },
  { title: 'Avg Response', key: 'avg_time', width: 140, align: 'right', sorter: (a, b) => a.avg_time - b.avg_time, defaultSortOrder: 'descend' },
  { title: 'Avg Memory', key: 'avg_memory', width: 120, align: 'right' },
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
      metricsData.value = endpointsRes.value.data.data || metricsData.value
    }
  } catch { /* silent */ }
  finally { loading.value = false }
}

onMounted(() => {
  appStore.setPageMeta('Performance', [{ title: 'System' }])
  fetchAll()
})
</script>

<style scoped>
.perf-actions { margin-bottom: 16px; }
.text-danger { color: var(--color-danger); font-weight: 600; }
.text-warning { color: var(--color-warning); font-weight: 600; }
</style>
