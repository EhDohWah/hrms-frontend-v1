<template>
  <div class="page-container">
    <!-- Tabs -->
    <a-tabs v-model:activeKey="activeTab" @change="onTabChange">
      <a-tab-pane key="server" tab="Server Errors" />
      <a-tab-pane key="client" tab="Client Errors" />
    </a-tabs>

    <!-- Filters -->
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ pagination.total || 0 }} Entries</a-tag>
      </div>
      <div class="filter-bar">
        <a-input
          v-model:value="search"
          placeholder="Search errors..."
          allow-clear
          class="filter-input"
          style="width: 220px"
          @pressEnter="onFilterChange"
          @clear="onFilterChange"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-select
          v-if="activeTab === 'server'"
          v-model:value="filters.level"
          placeholder="Severity"
          allow-clear
          class="filter-input"
          style="width: 130px"
          @change="onFilterChange"
        >
          <a-select-option value="emergency">Emergency</a-select-option>
          <a-select-option value="critical">Critical</a-select-option>
          <a-select-option value="error">Error</a-select-option>
          <a-select-option value="warning">Warning</a-select-option>
        </a-select>
        <a-range-picker
          v-model:value="dateRange"
          format="DD MMM YYYY"
          value-format="YYYY-MM-DD"
          style="width: 260px"
          @change="onFilterChange"
        />
        <a-button
          v-if="activeTab === 'server'"
          size="small"
          danger
          @click="handleCleanup"
        >
          Cleanup 30d+
        </a-button>
      </div>
    </div>

    <!-- Server Errors Table -->
    <a-card v-if="activeTab === 'server'" :body-style="{ padding: 0 }">
      <a-table
        :columns="serverColumns"
        :data-source="items"
        :loading="loading"
        :pagination="tablePagination"
        :row-key="(r) => r.id"
        @change="handleTableChange"
        :scroll="{ x: 'max-content' }"
        size="middle"
        :expandable="{ expandedRowRender: expandedRow }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'level'">
            <a-tag :color="levelColor(record.level)" size="small">{{ record.level }}</a-tag>
          </template>
          <template v-else-if="column.key === 'message'">
            <span class="cell-error-msg">{{ record.message }}</span>
          </template>
          <template v-else-if="column.key === 'context'">
            <span v-if="record.context?.url" class="font-mono" style="font-size: 11px;">
              {{ record.context.method || 'GET' }} {{ record.context.url }}
            </span>
            <span v-else class="text-muted">—</span>
          </template>
          <template v-else-if="column.key === 'occurrences'">
            <a-badge :count="record.occurrences" :overflow-count="999" :number-style="{ backgroundColor: record.occurrences > 10 ? 'var(--color-danger)' : 'var(--color-text-muted)' }" />
          </template>
          <template v-else-if="column.key === 'last_seen_at'">
            {{ timeAgo(record.last_seen_at) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-button
              v-if="!record.is_dismissed"
              size="small"
              type="link"
              @click.stop="handleDismiss(record)"
            >
              Dismiss
            </a-button>
            <span v-else class="text-muted" style="font-size: 11px;">Dismissed</span>
          </template>
        </template>
        <template #expandedRowRender="{ record }">
          <div class="trace-block">
            <pre v-if="record.trace">{{ record.trace }}</pre>
            <span v-else class="text-muted">No stack trace available</span>
          </div>
        </template>
      </a-table>
    </a-card>

    <!-- Client Errors Table -->
    <a-card v-else :body-style="{ padding: 0 }">
      <a-table
        :columns="clientColumns"
        :data-source="items"
        :loading="loading"
        :pagination="tablePagination"
        :row-key="(r) => r.id"
        @change="handleTableChange"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'message'">
            <span class="cell-error-msg">{{ record.message }}</span>
            <span v-if="record.source" class="cell-sub">{{ record.source }}</span>
          </template>
          <template v-else-if="column.key === 'page_url'">
            <span class="font-mono" style="font-size: 11px;">{{ record.page_url }}</span>
          </template>
          <template v-else-if="column.key === 'user'">
            {{ record.user?.name || '—' }}
          </template>
          <template v-else-if="column.key === 'occurrences'">
            <a-badge :count="record.occurrences" :overflow-count="999" />
          </template>
          <template v-else-if="column.key === 'last_seen_at'">
            {{ timeAgo(record.last_seen_at) }}
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { systemApi } from '@/api'
import { usePagination } from '@/composables/usePagination'
import { useAbortController } from '@/composables/useAbortController'
import { timeAgo } from '@/utils/formatters'
import { cleanParams } from '@/utils/helpers'
import { levelColor } from '@/constants/colors'

const appStore = useAppStore()
const getSignal = useAbortController()

const activeTab = ref('server')
const search = ref('')
const dateRange = ref(null)
const filters = reactive({ level: undefined })
const items = ref([])
const loading = ref(false)

const serverColumns = [
  { title: 'Severity', key: 'level', width: 100 },
  { title: 'Message', key: 'message', width: 300, ellipsis: true },
  { title: 'Request', key: 'context', width: 220 },
  { title: 'Count', key: 'occurrences', width: 70, align: 'center' },
  { title: 'Last Seen', key: 'last_seen_at', width: 120 },
  { title: '', key: 'actions', width: 80, align: 'right' },
]

const clientColumns = [
  { title: 'Error', key: 'message', width: 300 },
  { title: 'Page', key: 'page_url', width: 200 },
  { title: 'User', key: 'user', width: 140 },
  { title: 'Count', key: 'occurrences', width: 70, align: 'center' },
  { title: 'Last Seen', key: 'last_seen_at', width: 120 },
]

function buildParams(paginationParams) {
  return cleanParams({
    ...paginationParams,
    search: search.value || undefined,
    level: filters.level,
    date_from: dateRange.value?.[0],
    date_to: dateRange.value?.[1],
  })
}

async function fetchData(paginationParams) {
  loading.value = true
  const apiFn = activeTab.value === 'server' ? systemApi.errorLogs : systemApi.clientErrors
  try {
    const res = await apiFn(buildParams(paginationParams), { signal: getSignal() })
    items.value = res.data.data?.data || res.data.data || []
    return res.data.data || res.data
  } catch { items.value = [] }
  finally { loading.value = false }
}

const { pagination, tablePagination, handleTableChange, refresh } = usePagination(fetchData)

function onFilterChange() { refresh() }
function onTabChange() {
  items.value = []
  search.value = ''
  filters.level = undefined
  dateRange.value = null
  refresh()
}


async function handleDismiss(record) {
  try {
    await systemApi.dismissError(record.id)
    record.is_dismissed = true
    message.success('Error dismissed')
  } catch (err) {
    message.error(err.response?.data?.message || 'Failed to dismiss')
  }
}

function handleCleanup() {
  Modal.confirm({
    title: 'Clean up old error logs?',
    content: 'This will delete all error entries older than 30 days.',
    okText: 'Clean Up',
    okType: 'danger',
    onOk: async () => {
      try {
        await systemApi.cleanupErrors(30)
        message.success('Old errors cleaned up')
        refresh()
      } catch (err) {
        message.error(err.response?.data?.message || 'Cleanup failed')
      }
    },
  })
}

onMounted(() => {
  appStore.setPageMeta('Error Logs', [{ title: 'System' }])
  refresh()
})
</script>

<style scoped>
.cell-error-msg {
  display: block;
  font-size: 12px;
  font-weight: 500;
  max-width: 280px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.trace-block {
  padding: 12px;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-md);
  max-height: 300px;
  overflow: auto;
}
.trace-block pre {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  line-height: 1.5;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
