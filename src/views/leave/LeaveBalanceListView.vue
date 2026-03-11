<template>
  <div class="page-container">
    <div class="page-header">
      <div class="filter-bar">
        <a-select v-model:value="filters.year" class="filter-input" style="width: 110px" @change="onSearchOrFilterChange">
          <a-select-option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</a-select-option>
        </a-select>
      </div>
      <a-input
        v-model:value="search"
        placeholder="Search employee..."
        allow-clear
        class="filter-input"
        style="width: 240px"
        @pressEnter="onSearchOrFilterChange"
        @clear="onSearchOrFilterChange"
      >
        <template #prefix><SearchOutlined /></template>
      </a-input>
    </div>

    <a-card :body-style="{ padding: 0 }">
      <a-table
        :columns="columns"
        :data-source="balances"
        :loading="loading"
        :row-key="(r) => r.id"
        :pagination="tablePagination"
        :scroll="{ x: 'max-content' }"
        @change="handleTableChange"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'employee'">
            <div class="cell-employee">
              <span class="cell-name">{{ record.employee?.first_name_en }} {{ record.employee?.last_name_en }}</span>
              <span class="cell-staff-id font-mono">{{ record.employee?.staff_id }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'leave_type'">
            {{ record.leave_type?.name || '—' }}
          </template>
          <template v-else-if="column.key === 'remaining'">
            <span
              class="font-semibold"
              :style="{ color: record.remaining_days <= 0 ? 'var(--color-danger)' : record.remaining_days <= 3 ? 'var(--color-warning)' : 'var(--color-success)' }"
            >
              {{ record.remaining_days }}
            </span>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { useAppStore } from '@/stores/uiStore'
import { leaveApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'
import { SearchOutlined } from '@ant-design/icons-vue'

const appStore = useAppStore()
const getSignal = useAbortController()

const balances = ref([])
const loading = ref(false)
const search = ref('')
const currentYear = new Date().getFullYear()
const filters = reactive({ year: currentYear })
const pagination = reactive({ current_page: 1, per_page: 20, total: 0 })

const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i)

const columns = [
  { title: 'Employee', key: 'employee', width: 220 },
  { title: 'Leave Type', key: 'leave_type', width: 160 },
  { title: 'Total Days', dataIndex: 'total_days', width: 100, align: 'center' },
  { title: 'Used', dataIndex: 'used_days', width: 100, align: 'center' },
  { title: 'Remaining', key: 'remaining', width: 100, align: 'center' },
  { title: 'Year', dataIndex: 'year', width: 80, align: 'center' },
]

const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showTotal: (total) => `${total} records`,
}))

async function fetchBalances() {
  loading.value = true
  try {
    const params = {
      page: pagination.current_page,
      per_page: pagination.per_page,
      year: filters.year,
      ...(search.value && { search: search.value }),
    }
    const { data } = await leaveApi.balances(params, { signal: getSignal() })
    balances.value = data.data || []
    if (data.pagination) Object.assign(pagination, data.pagination)
  } catch (err) { if (err.name !== 'CanceledError') message.error('Failed to load leave balances') }
  loading.value = false
}

function onSearchOrFilterChange() {
  pagination.current_page = 1
  fetchBalances()
}

function handleTableChange(pag) {
  pagination.current_page = pag.current
  pagination.per_page = pag.pageSize
  fetchBalances()
}

onMounted(() => { appStore.setPageMeta('Leave Balances'); fetchBalances() })
</script>

<style scoped>
.page-header {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  margin-bottom: 16px;
}
@media (min-width: 640px) {
  .page-header {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}
.cell-employee { display: flex; flex-direction: column; }
.cell-name { font-weight: 600; font-size: 13.5px; }
.cell-staff-id { font-size: 12px; color: var(--color-text-muted); }
</style>
