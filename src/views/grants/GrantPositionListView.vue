<template>
  <div class="page-container">
    <!-- Page header -->
    <div class="page-header">
      <div class="page-header-stats" v-if="totals">
        <a-tag color="blue">{{ totals.manpower }} ManPower</a-tag>
        <a-tag color="green">{{ totals.recruited }} Recruited</a-tag>
        <a-tag color="orange">{{ totals.finding }} Finding</a-tag>
      </div>
      <div class="filter-bar">
        <a-input
          v-model:value="search"
          placeholder="Search by grant code, position..."
          allow-clear
          class="filter-input"
          style="width: 280px"
          @pressEnter="onSearchOrFilterChange"
          @clear="onSearchOrFilterChange"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-select
          v-model:value="statusFilter"
          placeholder="Status"
          allow-clear
          class="filter-input"
          style="width: 140px"
          @change="applyFilter"
        >
          <a-select-option value="Active">Active</a-select-option>
          <a-select-option value="Pending">Pending</a-select-option>
          <a-select-option value="Completed">Completed</a-select-option>
        </a-select>
      </div>
    </div>

    <!-- Table -->
    <a-card :body-style="{ padding: 0 }">
      <a-table
        :columns="columns"
        :data-source="flatRows"
        :loading="loading"
        :pagination="false"
        :row-key="(r) => r._rowKey"
        :scroll="{ x: 'max-content' }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'grant_code'">
            <router-link
              v-if="record._isFirst"
              :to="{ name: 'grant-detail', params: { id: record.grant_id } }"
              class="cell-code font-mono"
            >
              {{ record.grant_code }}
            </router-link>
          </template>

          <template v-else-if="column.key === 'grant_name'">
            <span v-if="record._isFirst">{{ record.grant_name }}</span>
          </template>

          <template v-else-if="column.key === 'budgetline_code'">
            <a-tag v-if="record.budgetline_code" color="blue" size="small">{{ record.budgetline_code }}</a-tag>
            <span v-else class="text-muted">—</span>
          </template>

          <template v-else-if="column.key === 'manpower'">
            <span class="cell-number">{{ record.manpower }}</span>
          </template>

          <template v-else-if="column.key === 'recruited'">
            <a-tag v-if="record.recruited > 0" color="green" size="small">{{ record.recruited }}</a-tag>
            <span v-else class="text-muted">0</span>
          </template>

          <template v-else-if="column.key === 'finding'">
            <a-tag v-if="record.finding > 0" color="orange" size="small">{{ record.finding }}</a-tag>
            <span v-else class="text-muted">0</span>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag
              v-if="record._isFirst"
              :color="statusColorMap[record.status] || 'default'"
              size="small"
            >
              {{ record.status }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-button
              v-if="record._isFirst"
              size="small"
              type="link"
              @click="$router.push({ name: 'grant-detail', params: { id: record.grant_id } })"
            >
              View
            </a-button>
          </template>
        </template>
      </a-table>
      <div v-if="pagination.total > 0" class="grant-pagination">
        <a-pagination
          :current="pagination.current_page"
          :page-size="pagination.per_page"
          :total="pagination.total"
          show-size-changer
          :show-total="(total) => `${total} grants`"
          :page-size-options="['10', '20', '50']"
          size="small"
          @change="handlePageChange"
          @show-size-change="handlePageChange"
        />
      </div>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAbortController } from '@/composables/useAbortController'
import { grantApi } from '@/api'

const appStore = useAppStore()
const getSignal = useAbortController()

const rawData = ref([])
const loading = ref(false)
const search = ref('')
const statusFilter = ref(undefined)
const pagination = reactive({ current_page: 1, per_page: 10, total: 0 })

const statusColorMap = {
  Active: 'blue',
  Pending: 'orange',
  Completed: 'green',
}

const columns = [
  { title: 'Grant Code', key: 'grant_code', width: 130 },
  { title: 'Grant Name', key: 'grant_name', width: 180, ellipsis: true },
  { title: 'Budget Line', key: 'budgetline_code', width: 130 },
  { title: 'Grant Position', dataIndex: 'position', width: 180, ellipsis: true },
  { title: 'ManPower', key: 'manpower', width: 100, align: 'center' },
  { title: 'Recruited', key: 'recruited', width: 100, align: 'center' },
  { title: 'Finding', key: 'finding', width: 100, align: 'center' },
  { title: 'Status', key: 'status', width: 110, align: 'center' },
  { title: '', key: 'actions', width: 80, align: 'right' },
]

// Flatten API data: each grant position becomes one row, with grant info merged in
const flatRows = computed(() => {
  const rows = []
  const filtered = statusFilter.value
    ? rawData.value.filter((g) => g.status === statusFilter.value)
    : rawData.value

  for (const grant of filtered) {
    const positions = grant.positions || []
    if (positions.length === 0) {
      // Grant with no positions — show one summary row
      rows.push({
        _rowKey: `g-${grant.grant_id}`,
        _isFirst: true,
        grant_id: grant.grant_id,
        grant_code: grant.grant_code,
        grant_name: grant.grant_name,
        budgetline_code: null,
        position: '—',
        manpower: grant.total_manpower,
        recruited: grant.total_recruited,
        finding: grant.total_finding,
        status: grant.status,
      })
    } else {
      positions.forEach((pos, idx) => {
        rows.push({
          _rowKey: `p-${pos.id}`,
          _isFirst: idx === 0,
          grant_id: grant.grant_id,
          grant_code: grant.grant_code,
          grant_name: grant.grant_name,
          budgetline_code: pos.budgetline_code,
          position: pos.position || '—',
          manpower: pos.manpower,
          recruited: pos.recruited,
          finding: pos.finding,
          status: grant.status,
        })
      })
    }
  }
  return rows
})

const totals = computed(() => {
  const src = statusFilter.value
    ? rawData.value.filter((g) => g.status === statusFilter.value)
    : rawData.value
  return {
    manpower: src.reduce((s, g) => s + (g.total_manpower || 0), 0),
    recruited: src.reduce((s, g) => s + (g.total_recruited || 0), 0),
    finding: src.reduce((s, g) => s + (g.total_finding || 0), 0),
  }
})

async function fetchData() {
  loading.value = true
  try {
    const params = {
      page: pagination.current_page,
      per_page: pagination.per_page,
      ...(search.value && { search: search.value }),
    }
    const { data } = await grantApi.grantPositions(params, { signal: getSignal() })
    rawData.value = data.data || []
    if (data.pagination) Object.assign(pagination, data.pagination)
  } catch (err) { if (err.name !== 'CanceledError') message.error('Failed to load grant positions') }
  loading.value = false
}

function onSearchOrFilterChange() {
  pagination.current_page = 1
  fetchData()
}

function handlePageChange(page, pageSize) {
  pagination.current_page = page
  pagination.per_page = pageSize
  fetchData()
}

function applyFilter() {
  // Status filtering is client-side since the API returns status per grant
  // just re-render; no new API call needed
}

onMounted(() => {
  appStore.setPageMeta('Grant Positions')
  fetchData()
})
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
.page-header-stats {
  display: flex;
  gap: 6px;
}
.cell-code {
  font-weight: 600;
  color: var(--color-primary);
  text-decoration: none;
}
.cell-code:hover {
  text-decoration: underline;
}
.cell-number {
  font-weight: 600;
}
.grant-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid var(--color-border-light);
}
</style>
