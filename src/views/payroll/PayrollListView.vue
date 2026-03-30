<template>
  <div class="page-container">
    <!-- Row 1: Search + Primary Actions -->
    <div class="toolbar-row">
      <a-input
        v-model:value="search"
        placeholder="Search employee..."
        allow-clear
        class="filter-input"
        style="width: 280px"
        @pressEnter="onSearchOrFilterChange"
        @clear="onSearchOrFilterChange"
      >
        <template #prefix><SearchOutlined /></template>
      </a-input>
      <div class="toolbar-actions">
        <a-button @click="bulkPayslipVisible = true">
          <FilePdfOutlined /> Bulk Payslips
        </a-button>
        <a-button v-if="canCreate" type="primary" @click="bulkVisible = true">
          <ThunderboltOutlined /> Bulk Payroll
        </a-button>
      </div>
    </div>

    <!-- Row 2: Filters + View Toggle + Contextual Actions -->
    <div class="toolbar-row">
      <div class="filter-bar">
        <a-select
          v-model:value="filters.organization"
          placeholder="Organization"
          allow-clear
          class="filter-input"
          style="width: 130px"
          @change="onSearchOrFilterChange"
        >
          <a-select-option v-for="org in ORG_OPTIONS" :key="org.code" :value="org.code">{{ org.label }}</a-select-option>
        </a-select>
        <a-select
          v-model:value="filters.site"
          placeholder="Site"
          allow-clear
          show-search
          option-filter-prop="label"
          class="filter-input"
          style="width: 130px"
          @change="onSearchOrFilterChange"
        >
          <a-select-option v-for="s in siteOptions" :key="s.id" :value="s.name" :label="s.name">
            {{ s.name }}
          </a-select-option>
        </a-select>
        <a-select
          v-model:value="filters.department"
          placeholder="Department"
          allow-clear
          show-search
          option-filter-prop="label"
          class="filter-input"
          style="width: 170px"
          @change="onSearchOrFilterChange"
        >
          <a-select-option v-for="d in departmentOptions" :key="d.id" :value="d.name" :label="d.name">
            {{ d.name }}
          </a-select-option>
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
        <a-select
          v-model:value="filters.fundType"
          placeholder="Fund Type"
          allow-clear
          class="filter-input"
          style="width: 160px"
          @change="onSearchOrFilterChange"
        >
          <a-select-option value="pvd">
            <SafetyCertificateOutlined /> PVD
            <a-badge v-if="fundSummary.pvd_count != null" :count="fundSummary.pvd_count" :overflow-count="9999" :number-style="{ backgroundColor: '#1890ff', fontSize: '11px', marginLeft: '6px' }" />
          </a-select-option>
          <a-select-option value="saving_fund">
            <BankOutlined /> Saving Fund
            <a-badge v-if="fundSummary.saving_fund_count != null" :count="fundSummary.saving_fund_count" :overflow-count="9999" :number-style="{ backgroundColor: '#52c41a', fontSize: '11px', marginLeft: '6px' }" />
          </a-select-option>
        </a-select>
        <a-radio-group v-model:value="viewMode" size="small" button-style="solid">
          <a-radio-button value="standard">Standard</a-radio-button>
          <a-radio-button value="budget">Budget History</a-radio-button>
        </a-radio-group>
      </div>
      <a-button v-if="selectedRowKeys.length > 0 && canDelete" danger @click="handleBulkDelete">
        Delete {{ selectedPayrollIds.length }} Record(s)
      </a-button>
    </div>


    <!-- Standard View -->
    <div v-if="viewMode === 'standard'" class="payroll-table-card">
      <a-table
        :columns="columns"
        :data-source="paginatedGroups"
        :loading="loading"
        :pagination="false"
        :row-key="(r) => r.employeeKey"
        :row-selection="canDelete ? { selectedRowKeys, onChange: onSelectionChange } : undefined"
        size="middle"
        class="payroll-nested-table"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'org'">
            <a-tag :color="getOrgColor(record.organization)" size="small">
              {{ record.organization }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'employee'">
            <div>
              <strong>{{ record.name }}</strong>
              <div class="cell-sub">{{ record.staff_id }}</div>
            </div>
          </template>
          <template v-else-if="column.key === 'status'">
            {{ record.employee_status }}
          </template>
          <template v-else-if="column.key === 'pay_period'">
            {{ formatDate(record.pay_period_date) }}
          </template>
          <template v-else-if="column.key === 'records'">
            {{ record.payrolls.length }}
          </template>
          <template v-else-if="column.key === 'net'">
            <strong>{{ formatCurrency(record.totalNet) }}</strong>
          </template>
        </template>

        <template #expandedRowRender="{ record }">
          <a-table
            :columns="innerColumns"
            :data-source="record.payrolls"
            :row-key="(r) => r.id"
            :pagination="false"
            :scroll="{ x: 'max-content' }"
            size="small"
            class="payroll-inner-table"
          >
            <template #bodyCell="{ column, record: pr, text }">
              <template v-if="column.key === 'grant_code'">
                {{ pr.display?.grant_code || '—' }}
              </template>
              <template v-else-if="column.key === 'grant_name'">
                {{ pr.display?.grant_name || '—' }}
              </template>
              <template v-else-if="column.key === 'bl_code'">
                {{ pr.display?.budget_line_code || '—' }}
              </template>
              <template v-else-if="column.key === 'fte'">
                {{ fmtFte(pr.display?.fte) }}
              </template>
              <template v-else-if="column.key === 'net_salary'">
                <strong style="color: var(--color-success)">{{ formatCurrency(text) }}</strong>
              </template>
              <template v-else-if="column.key === 'notes'">
                {{ pr.notes || '—' }}
              </template>
              <template v-else-if="column.key === 'action'">
                <span class="table-operation">
                  <a @click="openDetail(record)">View</a>
                  <a @click="downloadPayslip(pr.id)">
                    <LoadingOutlined v-if="payslipLoadingIds.includes(pr.id)" />
                    Payslip
                  </a>
                  <a v-if="canDelete" style="color: #ff4d4f" @click="handleDelete(pr)">Delete</a>
                </span>
              </template>
              <!-- All monetary columns with dataIndex render as currency -->
              <template v-else-if="column.dataIndex">
                {{ formatCurrency(text) }}
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

      <div v-if="groupedData.length > 0" class="table-footer">
        <a-pagination
          v-model:current="page"
          v-model:pageSize="perPage"
          :total="groupedData.length"
          :show-size-changer="true"
          :show-total="(total) => `${total} employees`"
          :page-size-options="['20', '50', '100']"
          size="small"
          @change="onPageChange"
          @showSizeChange="onPageChange"
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
          :show-total="(total) => `${total} employees`"
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
  DollarOutlined, SafetyCertificateOutlined, BankOutlined,
} from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { payrollApi, optionsApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'
import { ORG_OPTIONS, getOrgColor } from '@/constants/organizations'
import { formatCurrency, formatDate, fmtFte } from '@/utils/formatters'
import PayrollBudgetView from './PayrollBudgetView.vue'
import PayrollDetailDrawer from './PayrollDetailDrawer.vue'
import BulkPayrollModal from './BulkPayrollModal.vue'
import BulkPayslipModal from './BulkPayslipModal.vue'

const dayjs = inject('$dayjs')
const appStore = useAppStore()
const authStore = useAuthStore()
const getSignal = useAbortController()

const canCreate = computed(() => authStore.canCreate('employee_salaries'))
const canDelete = computed(() => authStore.canDelete('employee_salaries'))

// ═══════════════════════════ Table Columns ═══════════════════════════
const columns = [
  { title: 'Organization', key: 'org', align: 'center', width: 100 },
  { title: 'Employee', key: 'employee', width: 180 },
  { title: 'Department', dataIndex: 'department', key: 'department', width: 150, ellipsis: true },
  { title: 'Position', dataIndex: 'position', key: 'position', width: 150, ellipsis: true },
  { title: 'Site', dataIndex: 'site', key: 'site', width: 100, ellipsis: true },
  { title: 'Status', key: 'status', width: 90 },
  { title: 'Pay Period', key: 'pay_period', width: 100 },
  { title: 'Records', key: 'records', align: 'center', width: 70 },
  { title: 'Total Net', key: 'net', align: 'right', width: 120 },
]

const innerColumns = [
  { title: 'Grant Code', key: 'grant_code', fixed: 'left', width: 100 },
  { title: 'Grant Name', key: 'grant_name', width: 150, ellipsis: true },
  { title: 'BL Code', key: 'bl_code', width: 90 },
  { title: 'FTE', key: 'fte', width: 55, align: 'center' },
  { title: 'Gross Salary', dataIndex: 'gross_salary', key: 'gross_salary', width: 110, align: 'right' },
  { title: 'Gross by FTE', dataIndex: 'gross_salary_by_FTE', key: 'gross_by_fte', width: 110, align: 'right' },
  { title: 'Retroactive', dataIndex: 'retroactive_salary', key: 'retroactive', width: 100, align: 'right' },
  { title: '13th Month', dataIndex: 'thirteen_month_salary', key: 'thirteen_month', width: 100, align: 'right' },
  { title: '13th Accrue', dataIndex: 'thirteen_month_salary_accured', key: 'thirteen_accrue', width: 100, align: 'right' },
  { title: 'Sal. Increase', dataIndex: 'salary_increase', key: 'sal_increase', width: 100, align: 'right' },
  { title: 'PVD', dataIndex: 'pvd', key: 'pvd', width: 85, align: 'right' },
  { title: 'PVD Employer', dataIndex: 'pvd_employer', key: 'pvd_employer', width: 105, align: 'right' },
  { title: 'Saving Fund', dataIndex: 'saving_fund', key: 'saving_fund', width: 100, align: 'right' },
  { title: 'SF Employer', dataIndex: 'saving_fund_employer', key: 'sf_employer', width: 100, align: 'right' },
  { title: 'Emp. SSF', dataIndex: 'employee_social_security', key: 'emp_ssf', width: 90, align: 'right' },
  { title: 'Empr. SSF', dataIndex: 'employer_social_security', key: 'empr_ssf', width: 90, align: 'right' },
  { title: 'Emp. H/W', dataIndex: 'employee_health_welfare', key: 'emp_hw', width: 90, align: 'right' },
  { title: 'Empr. H/W', dataIndex: 'employer_health_welfare', key: 'empr_hw', width: 90, align: 'right' },
  { title: 'Tax', dataIndex: 'tax', key: 'tax', width: 85, align: 'right' },
  { title: 'Student Loan', dataIndex: 'student_loan', key: 'student_loan', width: 95, align: 'right' },
  { title: 'Total Salary', dataIndex: 'total_salary', key: 'total_salary', width: 110, align: 'right' },
  { title: 'Total Income', dataIndex: 'total_income', key: 'total_income', width: 110, align: 'right' },
  { title: 'Empr. Contrib.', dataIndex: 'employer_contribution', key: 'empr_contrib', width: 110, align: 'right' },
  { title: 'Total Deduction', dataIndex: 'total_deduction', key: 'total_deduction', width: 115, align: 'right' },
  { title: 'Net Salary', dataIndex: 'net_salary', key: 'net_salary', width: 110, align: 'right' },
  { title: 'Notes', key: 'notes', width: 120, ellipsis: true },
  { title: 'Action', key: 'action', fixed: 'right', width: 150 },
]

// ═══════════════════════════ View Mode ═══════════════════════════
const viewMode = ref('standard')

// ═══════════════════════════ Standard List ═══════════════════════════
const items = ref([])
const selectedRowKeys = ref([])
const loading = ref(false)
const search = ref('')
const filters = reactive({ organization: undefined, department: undefined, site: undefined, payPeriod: null, fundType: undefined })
const siteOptions = ref([])
const departmentOptions = ref([])
const fundSummary = reactive({ pvd_count: null, saving_fund_count: null })
const page = ref(1)
const perPage = ref(20)

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
  page.value = 1
  fetchItems()
}

async function fetchItems() {
  loading.value = true
  try {
    const params = {
      page: 1,
      per_page: 10000,
      ...(search.value && { search: search.value }),
      ...(filters.organization && { filter_organization: filters.organization }),
      ...(filters.department && { filter_department: filters.department }),
      ...(filters.site && { filter_site: filters.site }),
      ...(filters.fundType && { filter_fund_type: filters.fundType }),
    }
    if (filters.payPeriod) {
      const start = dayjs(filters.payPeriod).startOf('month').format('YYYY-MM-DD')
      const end = dayjs(filters.payPeriod).endOf('month').format('YYYY-MM-DD')
      params.filter_date_range = `${start},${end}`
    }
    const { data } = await payrollApi.list(params, { signal: getSignal() })
    items.value = data.data || []
    if (data.fund_summary) Object.assign(fundSummary, data.fund_summary)
  } catch (err) { if (err.name !== 'CanceledError') message.error('Failed to load payroll records') }
  loading.value = false
}

// ═══════════════════════════ Group by Employee + Pay Period ═══════════════════════════
const groupedData = computed(() => {
  const map = new Map()
  for (const pr of items.value) {
    const empId = pr.employee_id || pr.employment_id || pr.id
    const month = pr.pay_period_date ? pr.pay_period_date.substring(0, 7) : 'unknown'
    const key = `${empId}-${month}`
    if (!map.has(key)) {
      map.set(key, {
        employeeKey: `emp-${key}`,
        name: pr.display?.employee_name || '—',
        staff_id: pr.display?.staff_id || '—',
        organization: pr.organization || '—',
        department: pr.display?.department || '—',
        position: pr.display?.position || '—',
        site: pr.display?.site || '—',
        employee_status: pr.display?.employee_status || '—',
        pay_period_date: pr.pay_period_date,
        payrolls: [],
        totalNet: 0,
      })
    }
    const group = map.get(key)
    group.payrolls.push(pr)
    group.totalNet += Number(pr.net_salary) || 0
  }
  return Array.from(map.values())
})

// Client-side pagination on grouped rows
const paginatedGroups = computed(() => {
  const start = (page.value - 1) * perPage.value
  return groupedData.value.slice(start, start + perPage.value)
})

function onPageChange(newPage, newPerPage) {
  page.value = newPage
  perPage.value = newPerPage
  selectedRowKeys.value = []
}

// ═══════════════════════════ Budget History ═══════════════════════════
const budgetData = ref([])
const budgetMonths = ref([])
const budgetLoading = ref(false)
const budgetDateRange = ref([dayjs().subtract(11, 'month').startOf('month'), dayjs().startOf('month')])
const budgetField = ref('gross_salary_by_fte')
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
      ...(filters.department && { department: filters.department }),
      ...(filters.site && { site: filters.site }),
    }
    const { data } = await payrollApi.budgetHistory(params)
    budgetData.value = data.data || []
    budgetMonths.value = data.date_range?.months || []
    if (data.pagination) Object.assign(budgetPagination, data.pagination)
  } catch (err) {
    message.error(err.response?.data?.message || 'Failed to load budget history')
  }
  budgetLoading.value = false
}

watch(viewMode, (mode) => {
  if (mode === 'budget') {
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
  const name = record.display?.employee_name || `#${record.id}`
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

async function fetchFilterOptions() {
  try {
    const [sitesRes, deptsRes] = await Promise.all([optionsApi.sites(), optionsApi.departments()])
    siteOptions.value = sitesRes.data?.data || []
    departmentOptions.value = deptsRes.data?.data || []
  } catch { /* silent — filters still work with manual input */ }
}

onMounted(() => {
  appStore.setPageMeta('Payroll')
  fetchFilterOptions()
  fetchItems()
})
</script>

<style scoped>
.toolbar-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.toolbar-row:last-of-type {
  margin-bottom: 16px;
}
.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
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

/* Compact nested table */
.payroll-nested-table :deep(.ant-table-thead > tr > th) { font-size: 11px; white-space: nowrap; }
.payroll-nested-table :deep(.ant-table-tbody > tr > td) { font-size: 12px; }
.payroll-inner-table :deep(.ant-table-thead > tr > th) { font-size: 11px; white-space: nowrap; }
.payroll-inner-table :deep(.ant-table-tbody > tr > td) { font-size: 12px; font-family: 'SF Mono', 'Consolas', monospace; }

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
