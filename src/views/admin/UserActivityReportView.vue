<template>
  <div class="page-container">
    <!-- Filters -->
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ pagination.total || 0 }} Users</a-tag>
        <a-tag v-if="inactiveCount > 0" color="orange">{{ inactiveCount }} inactive 30d+</a-tag>
      </div>
      <div class="filter-bar">
        <a-input
          v-model:value="search"
          placeholder="Search by name or email..."
          allow-clear
          class="filter-input"
          style="width: 240px"
          @pressEnter="onFilterChange"
          @clear="onFilterChange"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
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
            <div class="cell-employee">
              <span class="cell-name">{{ record.name }}</span>
              <span class="cell-sub">{{ record.email }}</span>
            </div>
          </template>

          <template v-else-if="column.key === 'role_name'">
            <a-tag color="default" size="small">{{ record.role_name || '—' }}</a-tag>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.status === 'active' ? 'green' : 'default'" size="small">
              {{ record.status }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'login_count'">
            <span :class="{ 'text-muted': record.login_count === 0 }">
              {{ record.login_count }}
            </span>
          </template>

          <template v-else-if="column.key === 'records_created'">
            <span :class="{ 'text-muted': record.records_created === 0 }">
              {{ record.records_created }}
            </span>
          </template>

          <template v-else-if="column.key === 'last_login_at'">
            <template v-if="record.last_login_at">
              <span>{{ formatDate(record.last_login_at) }}</span>
              <span v-if="isInactive(record.last_login_at)" class="inactive-badge">30d+</span>
            </template>
            <span v-else class="text-muted">Never</span>
          </template>

          <template v-else-if="column.key === 'last_activity_at'">
            <span v-if="record.last_activity_at">{{ timeAgo(record.last_activity_at) }}</span>
            <span v-else class="text-muted">—</span>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { adminApi } from '@/api'
import { usePagination } from '@/composables/usePagination'
import { useAbortController } from '@/composables/useAbortController'
import { formatDate, timeAgo } from '@/utils/formatters'
import { cleanParams } from '@/utils/helpers'

const dayjs = inject('$dayjs')
const appStore = useAppStore()
const getSignal = useAbortController()

const search = ref('')
const items = ref([])
const loading = ref(false)

const columns = [
  { title: 'User', key: 'user', width: 220 },
  { title: 'Role', key: 'role_name', width: 120 },
  { title: 'Status', key: 'status', width: 90, align: 'center' },
  { title: 'Logins (30d)', key: 'login_count', width: 120, align: 'center', sorter: true },
  { title: 'Records Created (30d)', key: 'records_created', width: 160, align: 'center', sorter: true },
  { title: 'Last Login', key: 'last_login_at', width: 150, sorter: true },
  { title: 'Last Activity', key: 'last_activity_at', width: 140 },
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
    const res = await adminApi.userActivityReport(buildParams(paginationParams), { signal: getSignal() })
    items.value = res.data.data
    return res.data
  } catch { items.value = [] }
  finally { loading.value = false }
}

const { pagination, tablePagination, handleTableChange, refresh } = usePagination(fetchData)

function onFilterChange() {
  refresh()
}

const inactiveCount = computed(() =>
  items.value.filter(u => isInactive(u.last_login_at)).length
)

function isInactive(lastLogin) {
  if (!lastLogin) return true
  return dayjs().diff(dayjs(lastLogin), 'day') > 30
}

onMounted(() => {
  appStore.setPageMeta('User Activity', [
    { title: 'Administration' },
    { title: 'User Activity' },
  ])
  refresh()
})
</script>

<style scoped>
.inactive-badge {
  display: inline-block;
  margin-left: 6px;
  font-size: 10px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 8px;
  background: var(--color-warning-bg);
  color: var(--color-warning);
}
</style>
