<template>
  <div class="page-container">
    <!-- Summary Cards -->
    <div class="stats-grid" style="margin-bottom: 20px;">
      <div class="stat-card" v-for="stat in summaryCards" :key="stat.label">
        <div class="stat-icon" :style="{ background: stat.bg, color: stat.color }">
          <component :is="stat.icon" />
        </div>
        <div class="stat-content">
          <template v-if="summaryLoading">
            <a-skeleton-input :active="true" size="small" style="width: 36px; height: 22px;" />
          </template>
          <template v-else>
            <span class="stat-value">{{ stat.value }}</span>
          </template>
          <span class="stat-label">{{ stat.label }}</span>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ pagination.total || 0 }} Records</a-tag>
      </div>
      <div class="filter-bar">
        <a-input
          v-model:value="search"
          placeholder="Search by email..."
          allow-clear
          class="filter-input"
          style="width: 220px"
          @pressEnter="onFilterChange"
          @clear="onFilterChange"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-select
          v-model:value="filters.status"
          placeholder="Status"
          allow-clear
          class="filter-input"
          style="width: 140px"
          @change="onFilterChange"
        >
          <a-select-option value="success">Success</a-select-option>
          <a-select-option value="failed">Failed</a-select-option>
          <a-select-option value="locked_out">Locked Out</a-select-option>
        </a-select>
        <a-range-picker
          v-model:value="dateRange"
          format="DD MMM YYYY"
          value-format="YYYY-MM-DD"
          style="width: 260px"
          @change="onFilterChange"
        />
      </div>
    </div>

    <!-- Table -->
    <a-card :body-style="{ padding: 0 }">
      <a-table
        :columns="columns"
        :data-source="items"
        :loading="loading"
        :pagination="tablePagination"
        :row-key="(r) => r.id"
        :scroll="{ x: 'max-content' }"
        @change="handleTableChange"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'user'">
            <span class="cell-name">{{ record.user?.name || '—' }}</span>
            <span class="cell-sub">{{ record.email }}</span>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)" size="small">
              {{ statusLabel(record.status) }}
            </a-tag>
            <span v-if="record.failure_reason" class="cell-sub">
              {{ reasonLabel(record.failure_reason) }}
            </span>
          </template>

          <template v-else-if="column.key === 'ip_address'">
            <span class="font-mono" style="font-size: 12px;">{{ record.ip_address || '—' }}</span>
          </template>

          <template v-else-if="column.key === 'user_agent'">
            <a-tooltip :title="record.user_agent" placement="topLeft">
              <span class="cell-truncate">{{ parseUserAgent(record.user_agent) }}</span>
            </a-tooltip>
          </template>

          <template v-else-if="column.key === 'created_at'">
            <span>{{ formatDateTime(record.created_at) }}</span>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, markRaw } from 'vue'
import {
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LockOutlined,
  LoginOutlined,
} from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { adminApi } from '@/api'
import { usePagination } from '@/composables/usePagination'
import { useAbortController } from '@/composables/useAbortController'
import { formatDateTime } from '@/utils/formatters'
import { STAT_COLORS } from '@/constants/colors'
import { cleanParams } from '@/utils/helpers'

const appStore = useAppStore()
const getSignal = useAbortController()

// ── Filters ──
const search = ref('')
const dateRange = ref(null)
const filters = reactive({ status: undefined })

// ── Summary ──
const summaryLoading = ref(true)
const summary = ref({
  active_users_today: 0,
  failed_attempts_today: 0,
  failed_attempts_week: 0,
  total_logins_week: 0,
  locked_out_today: 0,
})

const summaryCards = computed(() => [
  { label: 'Logins Today', value: summary.value.active_users_today, icon: markRaw(LoginOutlined), ...STAT_COLORS.blue },
  { label: 'Failed Today', value: summary.value.failed_attempts_today, icon: markRaw(CloseCircleOutlined), ...STAT_COLORS.amber },
  { label: 'Failed This Week', value: summary.value.failed_attempts_week, icon: markRaw(CloseCircleOutlined), ...STAT_COLORS.pink },
  { label: 'Lockouts Today', value: summary.value.locked_out_today, icon: markRaw(LockOutlined), ...STAT_COLORS.red },
])

async function fetchSummary() {
  summaryLoading.value = true
  try {
    const res = await adminApi.loginHistorySummary()
    summary.value = res.data.data
  } catch { /* silent */ }
  finally { summaryLoading.value = false }
}

// ── Table ──
const columns = [
  { title: 'User', key: 'user', width: 200 },
  { title: 'Status', key: 'status', width: 160 },
  { title: 'IP Address', key: 'ip_address', width: 140 },
  { title: 'Browser / Device', key: 'user_agent', width: 200, ellipsis: true },
  { title: 'When', key: 'created_at', width: 170 },
]

const items = ref([])
const loading = ref(false)

function buildParams(paginationParams) {
  return cleanParams({
    ...paginationParams,
    search: search.value || undefined,
    status: filters.status,
    date_from: dateRange.value?.[0],
    date_to: dateRange.value?.[1],
  })
}

async function fetchData(paginationParams) {
  loading.value = true
  try {
    const res = await adminApi.loginHistory(buildParams(paginationParams), { signal: getSignal() })
    items.value = res.data.data
    return res.data
  } catch { items.value = [] }
  finally { loading.value = false }
}

const { pagination, tablePagination, handleTableChange, refresh } = usePagination(fetchData)

function onFilterChange() {
  refresh()
}

// ── Helpers ──
function statusColor(status) {
  if (status === 'success') return 'green'
  if (status === 'failed') return 'orange'
  if (status === 'locked_out') return 'red'
  return 'default'
}

function statusLabel(status) {
  if (status === 'success') return 'Success'
  if (status === 'failed') return 'Failed'
  if (status === 'locked_out') return 'Locked Out'
  return status
}

function reasonLabel(reason) {
  const map = {
    invalid_credentials: 'Wrong email or password',
    account_inactive: 'Account inactive',
    rate_limited: 'Too many attempts',
  }
  return map[reason] || reason
}

function parseUserAgent(ua) {
  if (!ua) return '—'
  // Extract browser name from UA string
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari'
  if (ua.includes('Edg')) return 'Edge'
  if (ua.length > 30) return ua.substring(0, 30) + '...'
  return ua
}

// ── Init ──
onMounted(() => {
  appStore.setPageMeta('Login History', [
    { title: 'Administration' },
    { title: 'Login History' },
  ])
  refresh()
  fetchSummary()
})
</script>

