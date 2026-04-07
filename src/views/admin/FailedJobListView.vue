<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ pagination.total || 0 }} Failed Jobs</a-tag>
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
        <a-button v-if="items.length" :loading="retryingAll" @click="handleRetryAll">
          Retry All
        </a-button>
        <a-button v-if="items.length" danger :loading="flushing" @click="handleFlush">
          Flush All
        </a-button>
      </div>
    </div>

    <a-card :body-style="{ padding: 0 }">
      <a-table
        :columns="columns"
        :data-source="items"
        :loading="loading"
        :pagination="tablePagination"
        :row-key="(r) => r.id"
        @change="handleTableChange"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'job_name'">
            <span class="cell-name">{{ record.job_name }}</span>
            <span class="cell-sub">Queue: {{ record.queue }}</span>
          </template>

          <template v-else-if="column.key === 'exception'">
            <a-tooltip :title="record.exception" placement="topLeft">
              <span class="cell-truncate" style="max-width: 300px;">
                {{ record.exception ? record.exception.substring(0, 120) : '—' }}
              </span>
            </a-tooltip>
          </template>

          <template v-else-if="column.key === 'failed_at'">
            {{ formatDateTime(record.failed_at) }}
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button size="small" type="link" @click="handleRetry(record)">Retry</a-button>
              <a-button size="small" type="link" danger @click="handleDelete(record)">Delete</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { systemApi } from '@/api'
import { usePagination } from '@/composables/usePagination'
import { useAbortController } from '@/composables/useAbortController'
import { formatDateTime } from '@/utils/formatters'
import { cleanParams } from '@/utils/helpers'

const appStore = useAppStore()
const getSignal = useAbortController()
const search = ref('')
const items = ref([])
const loading = ref(false)
const retryingAll = ref(false)
const flushing = ref(false)

const columns = [
  { title: 'Job', key: 'job_name', width: 200 },
  { title: 'Error', key: 'exception', width: 340 },
  { title: 'Failed At', key: 'failed_at', width: 170 },
  { title: '', key: 'actions', width: 140, align: 'right' },
]

function buildParams(paginationParams) {
  return cleanParams({
    ...paginationParams,
    search: search.value || undefined,
  })
}

async function fetchData(paginationParams) {
  loading.value = true
  try {
    const res = await systemApi.failedJobs(buildParams(paginationParams), { signal: getSignal() })
    items.value = res.data.data?.data || res.data.data || []
    return res.data.data || res.data
  } catch { items.value = [] }
  finally { loading.value = false }
}

const { pagination, tablePagination, handleTableChange, refresh } = usePagination(fetchData)

function onFilterChange() { refresh() }

async function handleRetry(record) {
  try {
    await systemApi.retryJob(record.id)
    message.success('Job queued for retry')
    refresh()
  } catch (err) {
    message.error(err.response?.data?.message || 'Retry failed')
  }
}

function handleDelete(record) {
  Modal.confirm({
    title: 'Delete this failed job?',
    content: record.job_name,
    okText: 'Delete',
    okType: 'danger',
    onOk: async () => {
      try {
        await systemApi.deleteJob(record.id)
        message.success('Job deleted')
        refresh()
      } catch (err) {
        message.error(err.response?.data?.message || 'Delete failed')
      }
    },
  })
}

function handleRetryAll() {
  Modal.confirm({
    title: `Retry all ${pagination.total} failed jobs?`,
    onOk: async () => {
      retryingAll.value = true
      try {
        await systemApi.retryAllJobs()
        message.success('All jobs queued for retry')
        refresh()
      } catch (err) {
        message.error(err.response?.data?.message || 'Retry all failed')
      }
      retryingAll.value = false
    },
  })
}

function handleFlush() {
  Modal.confirm({
    title: 'Delete ALL failed jobs?',
    content: 'This action cannot be undone.',
    okText: 'Delete All',
    okType: 'danger',
    onOk: async () => {
      flushing.value = true
      try {
        await systemApi.flushJobs()
        message.success('All failed jobs cleared')
        refresh()
      } catch (err) {
        message.error(err.response?.data?.message || 'Flush failed')
      }
      flushing.value = false
    },
  })
}

onMounted(() => {
  appStore.setPageMeta('Failed Jobs', [{ title: 'System' }])
  refresh()
})
</script>

