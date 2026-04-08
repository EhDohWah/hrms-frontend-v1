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
        :data-source="filteredGrants"
        :loading="loading"
        :pagination="false"
        row-key="grant_id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'grant_code'">
            <router-link
              :to="{ name: 'grant-detail', params: { id: record.grant_id } }"
              class="cell-code font-mono"
            >
              {{ record.grant_code }}
            </router-link>
          </template>

          <template v-else-if="column.key === 'total_manpower'">
            <span class="cell-number">{{ record.total_manpower }}</span>
          </template>

          <template v-else-if="column.key === 'total_recruited'">
            <a-tag v-if="record.total_recruited > 0" color="green" size="small">{{ record.total_recruited }}</a-tag>
            <span v-else class="text-muted">0</span>
          </template>

          <template v-else-if="column.key === 'total_finding'">
            <a-tag v-if="record.total_finding > 0" color="orange" size="small">{{ record.total_finding }}</a-tag>
            <span v-else class="text-muted">0</span>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColorMap[record.status] || 'default'" size="small">
              {{ record.status }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-button
              size="small"
              type="link"
              @click="$router.push({ name: 'grant-detail', params: { id: record.grant_id } })"
            >
              View
            </a-button>
          </template>
        </template>

        <!-- Nested table: grant positions -->
        <template #expandedRowRender="{ record }">
          <a-table
            :columns="innerColumns"
            :data-source="record.positions || []"
            :pagination="false"
            row-key="id"
            size="small"
          >
            <template #bodyCell="{ column, record: pos }">
              <template v-if="column.key === 'budgetline_code'">
                <a-tag v-if="pos.budgetline_code" color="blue" size="small">{{ pos.budgetline_code }}</a-tag>
                <span v-else class="text-muted">—</span>
              </template>

              <template v-else-if="column.key === 'manpower'">
                <span class="cell-number">{{ pos.manpower }}</span>
              </template>

              <template v-else-if="column.key === 'recruited'">
                <a-tag v-if="pos.recruited > 0" color="green" size="small">{{ pos.recruited }}</a-tag>
                <span v-else class="text-muted">0</span>
              </template>

              <template v-else-if="column.key === 'finding'">
                <a-tag v-if="pos.finding > 0" color="orange" size="small">{{ pos.finding }}</a-tag>
                <span v-else class="text-muted">0</span>
              </template>
            </template>
          </a-table>
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

// Outer table columns — grant-level info
const columns = [
  { title: 'Grant Code', key: 'grant_code', dataIndex: 'grant_code' },
  { title: 'Grant Name', key: 'grant_name', dataIndex: 'grant_name', ellipsis: true },
  { title: 'ManPower', key: 'total_manpower', dataIndex: 'total_manpower', align: 'center' },
  { title: 'Recruited', key: 'total_recruited', dataIndex: 'total_recruited', align: 'center' },
  { title: 'Finding', key: 'total_finding', dataIndex: 'total_finding', align: 'center' },
  { title: 'Status', key: 'status', dataIndex: 'status', align: 'center' },
  { title: '', key: 'actions', align: 'right' },
]

// Inner table columns — position-level info
const innerColumns = [
  { title: 'Position', key: 'position', dataIndex: 'position' },
  { title: 'Budget Line', key: 'budgetline_code', dataIndex: 'budgetline_code' },
  { title: 'ManPower', key: 'manpower', dataIndex: 'manpower', align: 'center' },
  { title: 'Recruited', key: 'recruited', dataIndex: 'recruited', align: 'center' },
  { title: 'Finding', key: 'finding', dataIndex: 'finding', align: 'center' },
]

const filteredGrants = computed(() => {
  if (!statusFilter.value) return rawData.value
  return rawData.value.filter((g) => g.status === statusFilter.value)
})

const totals = computed(() => {
  const src = filteredGrants.value
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
