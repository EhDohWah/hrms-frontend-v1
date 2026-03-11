<template>
  <div class="page-container">
    <!-- Filters + Actions -->
    <div class="page-header">
      <div class="filter-bar">
        <a-input
          v-model:value="search"
          placeholder="Search employee..."
          allow-clear
          class="filter-input"
          style="width: 220px"
          @pressEnter="onSearchOrFilterChange"
          @clear="onSearchOrFilterChange"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-select
          v-model:value="filters.organization"
          placeholder="Organization"
          allow-clear
          class="filter-input"
          style="width: 130px"
          @change="onSearchOrFilterChange"
        >
          <a-select-option value="SMRU">SMRU</a-select-option>
          <a-select-option value="BHF">BHF</a-select-option>
        </a-select>
        <a-date-picker
          v-model:value="filters.payPeriod"
          picker="month"
          placeholder="Pay Period"
          format="MMM YYYY"
          value-format="YYYY-MM-DD"
          allow-clear
          class="filter-input"
          style="width: 150px"
          @change="onSearchOrFilterChange"
        />
        <a-radio-group v-model:value="viewMode" size="small" button-style="solid">
          <a-radio-button value="standard">Standard</a-radio-button>
          <a-radio-button value="budget">Budget History</a-radio-button>
        </a-radio-group>
      </div>
      <div class="page-header-actions">
        <a-button v-if="selectedRowKeys.length > 0 && canDelete" danger @click="handleBulkDelete">
          Delete {{ selectedPayrollIds.length }} Record(s)
        </a-button>
        <a-button @click="bulkPayslipVisible = true">
          <FilePdfOutlined /> Bulk Payslips
        </a-button>
        <a-button v-if="canCreate" type="primary" @click="bulkVisible = true">
          <ThunderboltOutlined /> Bulk Payroll
        </a-button>
      </div>
    </div>


    <!-- Standard View -->
    <div v-if="viewMode === 'standard'" class="payroll-table-card">
      <a-table
        :columns="columns"
        :data-source="groupedData"
        :loading="loading"
        :pagination="false"
        :row-key="(r) => r.employeeKey"
        :row-selection="canDelete ? { selectedRowKeys, onChange: onSelectionChange } : undefined"
        size="middle"
        class="payroll-nested-table"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'employee'">
            <div>
              <strong>{{ record.name }}</strong>
              <div class="cell-sub">{{ record.staff_id }}</div>
            </div>
          </template>
          <template v-else-if="column.key === 'org'">
            <a-tag :color="record.organization === 'SMRU' ? 'blue' : 'green'" size="small">
              {{ record.organization }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'records'">
            {{ record.payrolls.length }}
          </template>
          <template v-else-if="column.key === 'gross'">
            {{ fmtCurrency(record.totalGross) }}
          </template>
          <template v-else-if="column.key === 'net'">
            <strong>{{ fmtCurrency(record.totalNet) }}</strong>
          </template>
        </template>

        <template #expandedRowRender="{ record }">
          <a-table
            :columns="innerColumns"
            :data-source="record.payrolls"
            :row-key="(r) => r.id"
            :pagination="false"
          >
            <template #bodyCell="{ column, record: pr }">
              <template v-if="column.key === 'pay_date'">
                {{ formatDate(pr.pay_period_date) }}
              </template>
              <template v-else-if="column.key === 'grant'">
                <div>
                  {{ pr.employee_funding_allocation?.grant_item?.grant?.code || '—' }}
                  <div class="cell-sub">{{ pr.employee_funding_allocation?.grant_item?.budgetline_code || '' }}</div>
                </div>
              </template>
              <template v-else-if="column.key === 'fte'">
                {{ fmtFte(pr.employee_funding_allocation?.fte) }}
              </template>
              <template v-else-if="column.key === 'inner_gross'">
                {{ fmtCurrency(pr.gross_salary_by_FTE) }}
              </template>
              <template v-else-if="column.key === 'total_income'">
                {{ fmtCurrency(pr.total_income) }}
              </template>
              <template v-else-if="column.key === 'deductions'">
                {{ fmtCurrency(pr.total_deduction) }}
              </template>
              <template v-else-if="column.key === 'net_salary'">
                <strong style="color: var(--color-success)">{{ fmtCurrency(pr.net_salary) }}</strong>
              </template>
              <template v-else-if="column.key === 'total_cost'">
                {{ fmtCurrency(pr.total_salary) }}
              </template>
              <template v-else-if="column.key === 'operation'">
                <span class="table-operation">
                  <a @click="openDetail(record)">View</a>
                  <a @click="downloadPayslip(pr.id)">
                    <LoadingOutlined v-if="payslipLoadingIds.includes(pr.id)" />
                    Payslip
                  </a>
                  <a v-if="canDelete" style="color: #ff4d4f" @click="handleDelete(pr)">Delete</a>
                </span>
              </template>
            </template>
          </a-table>
        </template>

        <!-- Custom empty state -->
        <template #emptyText>
          <div class="empty-state">
            <DollarOutlined class="empty-icon" />
            <h3 class="empty-title">No payroll records found</h3>
            <p class="empty-desc">Try adjusting your filters or run your first payroll</p>
          </div>
        </template>
      </a-table>

      <div v-if="pagination.total > 0" class="table-footer">
        <a-pagination
          v-model:current="pagination.current_page"
          v-model:pageSize="pagination.per_page"
          :total="pagination.total"
          :show-size-changer="true"
          :show-total="(total) => `${total} records`"
          :page-size-options="['20', '50', '100']"
          size="small"
          @change="fetchItems"
          @showSizeChange="fetchItems"
        />
      </div>
    </div>

    <!-- Budget History View -->
    <div v-if="viewMode === 'budget'" class="payroll-table-card">
      <div style="padding: 16px">
        <PayrollBudgetView
          v-model:date-range="budgetDateRange"
          v-model:display-field="budgetField"
          :data="budgetData"
          :months="budgetMonths"
          :loading="budgetLoading"
          @fetch="fetchBudgetHistory"
        />
      </div>
      <div v-if="budgetPagination.total > 0" class="table-footer">
        <a-pagination
          v-model:current="budgetPagination.current_page"
          v-model:pageSize="budgetPagination.per_page"
          :total="budgetPagination.total"
          :show-size-changer="true"
          :show-total="(total) => `${total} allocations`"
          :page-size-options="['50', '100']"
          size="small"
          @change="fetchBudgetHistory"
          @showSizeChange="fetchBudgetHistory"
        />
      </div>
    </div>

    <!-- Detail Drawer -->
    <PayrollDetailDrawer
      :open="detailVisible"
      :employee-group="detailRecord"
      :payslip-loading-ids="payslipLoadingIds"
      @update:open="detailVisible = $event"
      @download-payslip="downloadPayslip"
    />

    <!-- Bulk Payroll Modal -->
    <BulkPayrollModal
      :open="bulkVisible"
      @update:open="bulkVisible = $event"
      @completed="onCreated"
    />

    <!-- Bulk Payslips Modal -->
    <BulkPayslipModal
      :open="bulkPayslipVisible"
      @update:open="bulkPayslipVisible = $event"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, inject, createVNode } from 'vue'
import { Modal, message } from 'ant-design-vue'
import {
  SearchOutlined, ThunderboltOutlined, FilePdfOutlined, ExclamationCircleOutlined, LoadingOutlined,
} from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { payrollApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'
import PayrollBudgetView from './PayrollBudgetView.vue'
import PayrollDetailDrawer from './PayrollDetailDrawer.vue'
import BulkPayrollModal from './BulkPayrollModal.vue'
import BulkPayslipModal from './BulkPayslipModal.vue'

const dayjs = inject('$dayjs')
const appStore = useAppStore()
const authStore = useAuthStore()
const getSignal = useAbortController()

const canCreate = computed(() => authStore.canCreate('employee_salary'))
const canDelete = computed(() => authStore.canDelete('employee_salary'))

// ═══════════════════════════ Table Columns ═══════════════════════════
const columns = [
  { title: 'Employee', key: 'employee' },
  { title: 'Org', key: 'org', align: 'center' },
  { title: 'Department', dataIndex: 'department', key: 'department' },
  { title: 'Records', key: 'records', align: 'center' },
  { title: 'Total Gross', key: 'gross', align: 'right' },
  { title: 'Total Net', key: 'net', align: 'right' },
]

const innerColumns = [
  { title: 'Pay Date', key: 'pay_date' },
  { title: 'Grant / BL', key: 'grant' },
  { title: 'FTE', key: 'fte', align: 'center' },
  { title: 'Gross (FTE)', key: 'inner_gross', align: 'right' },
  { title: 'Total Income', key: 'total_income', align: 'right' },
  { title: 'Deductions', key: 'deductions', align: 'right' },
  { title: 'Net Salary', key: 'net_salary', align: 'right' },
  { title: 'Total Cost', key: 'total_cost', align: 'right' },
  { title: 'Action', key: 'operation' },
]

// ═══════════════════════════ View Mode ═══════════════════════════
const viewMode = ref('standard')

// ═══════════════════════════ Standard List ═══════════════════════════
const items = ref([])
const selectedRowKeys = ref([])
const loading = ref(false)
const search = ref('')
const filters = reactive({ organization: undefined, payPeriod: null })
const pagination = reactive({ current_page: 1, per_page: 20, total: 0 })

// Map selected employee keys to their actual payroll record IDs
const selectedPayrollIds = computed(() => {
  const keySet = new Set(selectedRowKeys.value)
  return groupedData.value
    .filter((g) => keySet.has(g.employeeKey))
    .flatMap((g) => g.payrolls.map((pr) => pr.id))
})

function onSelectionChange(keys) {
  selectedRowKeys.value = keys
}

function onSearchOrFilterChange() {
  pagination.current_page = 1
  fetchItems()
}

async function fetchItems() {
  loading.value = true
  try {
    const params = {
      page: pagination.current_page,
      per_page: pagination.per_page,
      ...(search.value && { search: search.value }),
      ...(filters.organization && { filter_organization: filters.organization }),
    }
    if (filters.payPeriod) {
      const start = dayjs(filters.payPeriod).startOf('month').format('YYYY-MM-DD')
      const end = dayjs(filters.payPeriod).endOf('month').format('YYYY-MM-DD')
      params.filter_date_range = `${start},${end}`
    }
    const { data } = await payrollApi.list(params, { signal: getSignal() })
    items.value = data.data || []
    if (data.pagination) Object.assign(pagination, data.pagination)
  } catch (err) { if (err.name !== 'CanceledError') message.error('Failed to load payroll records') }
  loading.value = false
}

// ═══════════════════════════ Group by Employee ═══════════════════════════
const groupedData = computed(() => {
  const map = new Map()
  for (const pr of items.value) {
    const emp = pr.employment?.employee
    const key = pr.employment_id || pr.id
    if (!map.has(key)) {
      map.set(key, {
        employeeKey: `emp-${key}`,
        name: emp ? `${emp.first_name_en} ${emp.last_name_en}` : '—',
        staff_id: emp?.staff_id || '—',
        organization: pr.organization || pr.employment?.organization || '—',
        department: pr.employment?.department?.name || '—',
        payrolls: [],
        totalGross: 0,
        totalNet: 0,
      })
    }
    const group = map.get(key)
    group.payrolls.push(pr)
    group.totalGross += Number(pr.gross_salary_by_FTE) || 0
    group.totalNet += Number(pr.net_salary) || 0
  }
  return Array.from(map.values())
})

// ═══════════════════════════ Budget History ═══════════════════════════
const budgetData = ref([])
const budgetMonths = ref([])
const budgetLoading = ref(false)
const budgetDateRange = ref([dayjs().subtract(11, 'month').startOf('month'), dayjs().startOf('month')])
const budgetField = ref('net_salary')
const budgetPagination = reactive({ current_page: 1, per_page: 50, total: 0 })

async function fetchBudgetHistory() {
  if (budgetDateRange.value?.length !== 2) return
  budgetLoading.value = true
  try {
    const params = {
      page: budgetPagination.current_page,
      per_page: budgetPagination.per_page,
      start_date: dayjs(budgetDateRange.value[0]).format('YYYY-MM'),
      end_date: dayjs(budgetDateRange.value[1]).format('YYYY-MM'),
      ...(search.value && { search: search.value }),
      ...(filters.organization && { organization: filters.organization }),
    }
    const { data } = await payrollApi.budgetHistory(params)
    const result = data.data
    budgetData.value = result.data || []
    budgetMonths.value = result.date_range?.months || []
    if (result.pagination) Object.assign(budgetPagination, result.pagination)
  } catch (err) {
    message.error(err.response?.data?.message || 'Failed to load budget history')
  }
  budgetLoading.value = false
}

watch(viewMode, (mode) => {
  if (mode === 'budget' && !budgetData.value.length) {
    fetchBudgetHistory()
  }
})

// ═══════════════════════════ Detail Drawer ═══════════════════════════
const detailVisible = ref(false)
const detailRecord = ref(null)

function openDetail(record) {
  detailRecord.value = record
  detailVisible.value = true
}

// ═══════════════════════════ Payslip Download ═══════════════════════════
const payslipLoadingIds = ref([])

async function downloadPayslip(id) {
  payslipLoadingIds.value.push(id)
  try {
    const response = await payrollApi.payslip(id)
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = `payslip-${id}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  } catch (err) {
    message.error(err.response?.data?.message || 'Failed to download payslip')
  } finally {
    payslipLoadingIds.value = payslipLoadingIds.value.filter(x => x !== id)
  }
}

// ═══════════════════════════ Delete ═══════════════════════════
function handleDelete(record) {
  const emp = record.employment?.employee
  const name = emp ? `${emp.first_name_en} ${emp.last_name_en}` : `#${record.id}`
  Modal.confirm({
    title: 'Delete Payroll',
    content: `Delete payroll for ${name} (${formatDate(record.pay_period_date)})?`,
    okType: 'danger',
    onOk: async () => {
      try {
        await payrollApi.destroy(record.id)
        message.success('Payroll deleted')
        selectedRowKeys.value = []
        fetchItems()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to delete')
      }
    },
  })
}

function handleBulkDelete() {
  const ids = selectedPayrollIds.value
  Modal.confirm({
    title: 'Delete Selected Records',
    icon: createVNode(ExclamationCircleOutlined),
    content: `Are you sure you want to delete ${ids.length} payroll record(s) from ${selectedRowKeys.value.length} employee(s)? This action cannot be undone.`,
    okText: 'Delete',
    okType: 'danger',
    cancelText: 'Cancel',
    centered: true,
    async onOk() {
      try {
        await payrollApi.destroyBatch(ids)
        message.success(`${ids.length} record(s) deleted successfully`)
        selectedRowKeys.value = []
        fetchItems()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to delete records')
      }
    },
  })
}

// ═══════════════════════════ Modals ═══════════════════════════
const bulkVisible = ref(false)
const bulkPayslipVisible = ref(false)

function onCreated() {
  fetchItems()
  if (viewMode.value === 'budget') fetchBudgetHistory()
}

// ═══════════════════════════ Helpers ═══════════════════════════
function fmtCurrency(val) {
  if (val == null || val === '') return '—'
  const n = Number(val)
  return isNaN(n) ? '—' : `฿${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtFte(val) {
  if (val == null) return '—'
  return `${(Number(val) * 100).toFixed(0)}%`
}

function formatDate(d) {
  return d ? dayjs(d).format('DD MMM YYYY') : '—'
}

onMounted(() => {
  appStore.setPageMeta('Payroll')
  fetchItems()
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
.page-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
/* Table card — flat, border-only */
.payroll-table-card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

/* Table footer / pagination */
.table-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid var(--color-border-light);
}

/* Table helpers */
.cell-sub { font-size: 12px; color: var(--color-text-muted); }
.table-operation a { margin-right: 8px; }

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 16px;
}
.empty-icon {
  font-size: 36px;
  color: var(--color-text-muted);
  margin-bottom: 12px;
}
.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 6px;
}
.empty-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0 0 20px;
}
</style>
