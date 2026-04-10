<template>
  <a-modal
    :open="open"
    :title="wizardTitle"
    width="100vw"
    :style="{ top: 0, margin: 0, padding: 0, maxWidth: '100vw' }"
    :body-style="{ height: 'calc(100vh - 110px)', overflowY: 'auto' }"
    wrap-class-name="modal-fullscreen"
    :footer="null"
    :maskClosable="false"
    :closable="currentStep < 3"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-steps :current="currentStep" size="small" style="margin-bottom: 24px">
      <a-step v-for="s in steps" :key="s.key" :title="s.title" />
    </a-steps>

    <!-- Step 0: Pay Period Date -->
    <div v-if="currentStep === 0" class="wizard-step">
      <a-form layout="vertical">
        <a-form-item label="Pay Period Date" required>
          <a-date-picker
            v-model:value="wizardForm.pay_period_date"
            format="DD MMM YYYY"
            value-format="YYYY-MM-DD"
            placeholder="Select pay date (e.g. 25th)"
            style="width: 100%"
          />
        </a-form-item>
        <a-alert type="info" show-icon style="margin-bottom: 8px">
          <template #message>
            <div>The pay period date is typically the <strong>25th</strong> of each month. If the 25th falls on a weekend, select the nearest working day (e.g. 24th or 23rd). For December, use the <strong>20th</strong>.</div>
          </template>
        </a-alert>
        <a-alert type="info" show-icon>
          <template #message>
            <div>The system automatically calculates prorated salary for new starters and resignations based on each employee's start/end date using a standardized 30-day month.</div>
          </template>
        </a-alert>
      </a-form>
    </div>

    <!-- Step 1: Organization -->
    <div v-if="currentStep === 1" class="wizard-step">
      <a-form layout="vertical">
        <a-form-item label="Organization" required>
          <a-radio-group v-model:value="wizardForm.organization" button-style="solid" size="large">
            <a-radio-button v-for="org in ORG_OPTIONS" :key="org.code" :value="org.code">{{ org.label }}</a-radio-button>
          </a-radio-group>
        </a-form-item>
        <a-alert type="info" show-icon message="Select the organization to generate payroll for. All employees under the selected organization will be included." />
      </a-form>
    </div>

    <!-- Step 2: Review -->
    <div v-if="currentStep === 2" class="wizard-step">
      <template v-if="previewLoading">
        <div class="loading-center"><a-spin size="large" /><p>Calculating payroll for all employees...</p></div>
      </template>
      <template v-else-if="previewData">
        <!-- Pay period + org context -->
        <div class="preview-context">
          <strong>Payroll Preview:</strong> {{ wizardForm.organization }} — {{ formatDate(wizardForm.pay_period_date, 'DD MMM YYYY') }}
        </div>

        <a-alert type="info" show-icon style="margin-bottom: 16px">
          <template #message>
            <strong>{{ previewData.summary?.total_employees || 0 }}</strong> employees &middot;
            <strong>{{ previewData.summary?.total_payrolls || 0 }}</strong> payroll records &middot;
            Total Net: <strong>{{ formatCurrency(previewData.summary?.total_net_salary) }}</strong>
            <span v-if="previewData.summary?.advances_needed > 0">
              &middot; <strong>{{ previewData.summary.advances_needed }}</strong> inter-org advances
            </span>
          </template>
        </a-alert>

        <!-- Department breakdown -->
        <a-collapse v-if="departmentBreakdown.length" :bordered="false" style="margin-bottom: 16px; background: transparent">
          <a-collapse-panel key="dept" :header="`Department Breakdown (${departmentBreakdown.length} departments)`">
            <a-table
              :columns="deptBreakdownColumns"
              :data-source="departmentBreakdown"
              :row-key="(r) => r.department"
              :pagination="false"
              size="small"
            >
              <template #bodyCell="{ column, record: dept }">
                <template v-if="column.dataIndex === 'totalNet'">
                  <span class="font-mono">{{ formatCurrency(dept.totalNet) }}</span>
                </template>
              </template>
            </a-table>
          </a-collapse-panel>
        </a-collapse>

        <!-- Warnings with employee links -->
        <div v-if="previewData.warnings?.length" style="margin-bottom: 12px">
          <a-alert v-for="(w, i) in previewData.warnings" :key="i" type="warning" show-icon style="margin-bottom: 4px">
            <template #message>
              <span>{{ w }}</span>
              <router-link
                v-if="findEmployeeIdFromWarning(w)"
                :to="{ name: 'employee-detail', params: { id: findEmployeeIdFromWarning(w) } }"
                target="_blank"
                style="margin-left: 8px; font-size: 12px"
              >View employee</router-link>
            </template>
          </a-alert>
        </div>

        <div class="preview-toolbar">
          <a-input
            v-model:value="previewSearch"
            placeholder="Filter by name or staff ID..."
            allow-clear
            style="width: 240px"
            size="small"
          >
            <template #prefix><SearchOutlined style="color: var(--color-text-muted)" /></template>
          </a-input>
          <a-button size="small" @click="toggleExpandAll">
            {{ expandedRows.length === filteredPreviewEmployees.length ? 'Collapse All' : 'Expand All' }}
          </a-button>
          <a-button size="small" :loading="previewLoading" @click="handlePreview">
            <template #icon><ReloadOutlined /></template>
            Refresh Preview
          </a-button>
        </div>

        <div class="preview-table-scroll">
          <a-table
            :columns="previewColumns"
            :data-source="filteredPreviewEmployees"
            :row-key="(r) => r.employment_id"
            :pagination="{ pageSize: 15, size: 'small', showSizeChanger: true, pageSizeOptions: ['15', '30', '50'] }"
            size="small"
            :expanded-row-keys="expandedRows"
            @expand="onExpandRow"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'org'">
                <a-tag :color="getOrgColor(record.organization)" size="small">{{ record.organization }}</a-tag>
              </template>
              <template v-else-if="column.key === 'employee'">
                <div><strong>{{ record.name }}</strong></div>
                <span class="cell-sub font-mono">{{ record.staff_id }}</span>
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="statusColorMap[record.employee_status] || 'default'" size="small">{{ record.employee_status || '—' }}</a-tag>
              </template>
              <template v-else-if="column.key === 'records'">
                <a-tag size="small">{{ record.allocations?.length || 0 }}</a-tag>
              </template>
              <template v-else-if="column.key === 'total_net'">
                <span class="font-mono font-semibold">{{ formatCurrency(getEmployeeTotal(record, 'net_salary')) }}</span>
              </template>
            </template>

            <template #expandedRowRender="{ record }">
              <a-table
                :columns="allocColumns"
                :data-source="record.allocations || []"
                :row-key="(r) => r.allocation_id"
                :pagination="false"
                size="small"
                :scroll="{ x: 'max-content' }"
                class="alloc-sub-table"
              >
                <template #bodyCell="{ column, record: alloc }">
                  <template v-if="column.key === 'grant_code'">
                    <span class="font-mono">{{ alloc.grant_code }}</span>
                  </template>
                  <template v-else-if="column.key === 'grant_name'">
                    {{ alloc.grant_name }}
                  </template>
                  <template v-else-if="column.key === 'grant_position'">
                    {{ alloc.grant_position }}
                  </template>
                  <template v-else-if="column.key === 'fte'">
                    {{ (alloc.fte * 100).toFixed(0) }}%
                  </template>
                  <template v-else-if="column.key === 'flags'">
                    <a-tag v-if="alloc.needs_advance" color="orange" size="small">Advance</a-tag>
                  </template>
                  <template v-else>
                    <span class="font-mono">{{ formatCurrency(getAllocValue(alloc, column.key)) }}</span>
                  </template>
                </template>
              </a-table>
            </template>
          </a-table>
        </div>
      </template>
    </div>

    <!-- Step 3: Processing -->
    <div v-if="currentStep === 3" class="wizard-step">
      <div class="processing-state">
        <a-progress
          :percent="processProgress"
          :status="processStatus === 'failed' ? 'exception' : processStatus === 'completed' ? 'success' : 'active'"
          :stroke-color="processStatus === 'failed' ? '#ef4444' : 'var(--color-primary)'"
          :size="80"
          type="circle"
        />
        <p class="processing-message">{{ processMessage }}</p>
        <div v-if="processCurrentEmployee" class="processing-current">
          <span>{{ processCurrentEmployee }}</span>
          <span v-if="processCurrentAllocation" class="cell-sub"> &middot; {{ processCurrentAllocation }}</span>
        </div>
        <div class="processing-stats" v-if="processStats.successful > 0 || processStats.failed > 0">
          <a-tag color="green">{{ processStats.successful }} successful</a-tag>
          <a-tag v-if="processStats.failed > 0" color="red">{{ processStats.failed }} failed</a-tag>
          <a-tag v-if="processStats.advances_created > 0" color="blue">{{ processStats.advances_created }} advances</a-tag>
        </div>

        <!-- Failure details on completion -->
        <template v-if="processStatus === 'completed' && batchErrors.length">
          <a-alert type="warning" style="margin-top: 16px; max-width: 500px; text-align: left">
            <template #message>{{ batchErrors.length }} failed payroll{{ batchErrors.length > 1 ? 's' : '' }}</template>
            <template #description>
              <div v-for="(err, i) in batchErrors.slice(0, 5)" :key="i" style="font-size: 13px; padding: 2px 0">
                <strong>{{ err.employee }}</strong> — {{ err.error }}
              </div>
              <div v-if="batchErrors.length > 5" style="font-size: 12px; color: var(--color-text-muted); padding-top: 4px">
                and {{ batchErrors.length - 5 }} more...
              </div>
            </template>
          </a-alert>
        </template>
        <a-button
          v-if="(processStatus === 'completed' || processStatus === 'failed') && processStats.failed > 0"
          :loading="downloadingErrors"
          style="margin-top: 12px"
          @click="handleDownloadErrors"
        >
          <template #icon><DownloadOutlined /></template>
          Download Error Report
        </a-button>
      </div>
    </div>

    <!-- Footer -->
    <div class="wizard-footer">
      <a-button v-if="currentStep > 0 && currentStep < 3" @click="currentStep--">Back</a-button>
      <div style="flex: 1" />
      <a-button v-if="currentStep < 3" @click="handleCancel">Cancel</a-button>
      <a-button v-if="currentStep === 0" :type="wizardForm.pay_period_date ? 'primary' : 'default'" :disabled="!wizardForm.pay_period_date" @click="currentStep = 1">
        Next
      </a-button>
      <a-button v-if="currentStep === 1" type="primary" :disabled="!wizardForm.organization" :loading="previewLoading" @click="handlePreview">
        Preview
      </a-button>
      <a-button v-if="currentStep === 2 && previewData" type="primary" :loading="processing" @click="handleConfirm">
        Confirm &amp; Process
      </a-button>
      <a-button v-if="currentStep === 3 && processStatus === 'completed'" type="primary" @click="handleDone">
        Done
      </a-button>
      <a-button v-if="currentStep === 3 && processStatus === 'failed'" @click="handleDone">
        Close
      </a-button>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, reactive, computed, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import { payrollApi } from '@/api'
import { getEcho, initEcho } from '@/plugins/echo'
import { ORG_OPTIONS, getOrgColor } from '@/constants/organizations'
import { formatCurrency, formatDate } from '@/utils/formatters'

const props = defineProps({ open: Boolean })
const emit = defineEmits(['update:open', 'completed'])

const steps = [
  { key: 'period', title: 'Pay Period' },
  { key: 'organization', title: 'Organization' },
  { key: 'review', title: 'Review' },
  { key: 'process', title: 'Processing' },
]

const currentStep = ref(0)
const wizardTitle = computed(() => `Run Payroll — ${steps[currentStep.value]?.title || ''}`)

const wizardForm = reactive({
  pay_period_date: null,
  organization: null,
})

const previewLoading = ref(false)
const previewData = ref(null)
const previewSearch = ref('')
const expandedRows = ref([])
const processing = ref(false)

// Processing state
const processProgress = ref(0)
const processStatus = ref('active')
const processMessage = ref('')
const processCurrentEmployee = ref('')
const processCurrentAllocation = ref('')
const processStats = reactive({ successful: 0, failed: 0, advances_created: 0 })

let echoChannel = null
let pollInterval = null
let batchId = null

const statusColorMap = {
  'Expats (Oxford)': 'blue',
  'Expats (Local)': 'purple',
  'Local ID Staff': 'green',
  'Local non ID Staff': 'green',
}

const previewColumns = [
  { title: 'Org', key: 'org', width: 70, align: 'center' },
  { title: 'Employee', key: 'employee', width: 180 },
  { title: 'Department', dataIndex: 'department', width: 140, ellipsis: true },
  { title: 'Actual Position', dataIndex: 'position', width: 150, ellipsis: true },
  { title: 'Site', dataIndex: 'site', width: 100, ellipsis: true },
  { title: 'Status', key: 'status', width: 140 },
  { title: 'Records', key: 'records', width: 70, align: 'center' },
  { title: 'Total Net', key: 'total_net', width: 120, align: 'right' },
]

// Inner table: full spreadsheet layout with all monetary columns
const allocColumns = [
  // Grant info
  { title: 'Grant Code', key: 'grant_code', width: 100 },
  { title: 'Grant Name', key: 'grant_name', width: 160, ellipsis: true },
  { title: 'Position Under Grant', key: 'grant_position', width: 160, ellipsis: true },
  { title: 'FTE', key: 'fte', width: 55, align: 'center' },
  // Income
  { title: 'Gross Salary', key: 'gross_salary', width: 105, align: 'right' },
  { title: 'Gross by FTE', key: 'gross_salary_by_fte', width: 105, align: 'right' },
  { title: 'Sal. Increase', key: 'salary_increase', width: 100, align: 'right' },
  { title: 'Retroactive', key: 'retroactive_salary', width: 95, align: 'right' },
  { title: '13th Month', key: 'thirteen_month', width: 95, align: 'right' },
  { title: '13th Accrue', key: 'thirteen_month_salary_accured', width: 95, align: 'right', customHeaderCell: () => ({ title: '13th Month Salary Accrued' }) },
  { title: 'Bonus', key: 'salary_bonus', width: 85, align: 'right' },
  { title: 'Total Income', key: 'total_income', width: 100, align: 'right' },
  // Deductions
  { title: 'PVD', key: 'pvd', width: 85, align: 'right' },
  { title: 'PVD Employer', key: 'pvd_employer', width: 100, align: 'right' },
  { title: 'Saving Fund', key: 'saving_fund', width: 95, align: 'right' },
  { title: 'SF Employer', key: 'saving_fund_employer', width: 95, align: 'right' },
  { title: 'Emp. SSF', key: 'employee_ss', width: 85, align: 'right' },
  { title: 'Empr. SSF', key: 'employer_ss', width: 85, align: 'right' },
  { title: 'Emp. H/W', key: 'employee_hw', width: 85, align: 'right' },
  { title: 'Empr. H/W', key: 'employer_hw', width: 85, align: 'right' },
  { title: 'Tax', key: 'tax', width: 85, align: 'right' },
  { title: 'Student Loan', key: 'student_loan', width: 90, align: 'right' },
  // Totals
  { title: 'Total Deduction', key: 'total_deduction', width: 110, align: 'right' },
  { title: 'Employer Contrib.', key: 'employer_total', width: 115, align: 'right' },
  { title: 'Total Salary', key: 'total_salary', width: 105, align: 'right' },
  { title: 'Net Salary', key: 'net_salary', width: 105, align: 'right' },
  { title: '', key: 'flags', width: 70 },
]

// Department breakdown from preview data
const departmentBreakdown = computed(() => {
  const employees = previewData.value?.employees || []
  const map = {}
  for (const emp of employees) {
    const dept = emp.department || 'Unassigned'
    if (!map[dept]) map[dept] = { department: dept, count: 0, totalNet: 0 }
    map[dept].count++
    map[dept].totalNet += (emp.allocations || []).reduce((s, a) => s + (Number(a.net_salary) || 0), 0)
  }
  return Object.values(map).sort((a, b) => b.totalNet - a.totalNet)
})

const deptBreakdownColumns = [
  { title: 'Department', dataIndex: 'department', ellipsis: true },
  { title: 'Employees', dataIndex: 'count', width: 90, align: 'center' },
  { title: 'Total Net', dataIndex: 'totalNet', width: 130, align: 'right' },
]

// Track batch errors for completion screen
const batchErrors = ref([])
const downloadingErrors = ref(false)

const filteredPreviewEmployees = computed(() => {
  const employees = previewData.value?.employees || []
  if (!previewSearch.value) return employees
  const q = previewSearch.value.toLowerCase()
  return employees.filter(e =>
    (e.name || '').toLowerCase().includes(q) ||
    (e.staff_id || '').toLowerCase().includes(q)
  )
})

async function handlePreview() {
  previewLoading.value = true
  currentStep.value = 2
  try {
    const payload = {
      pay_period_date: wizardForm.pay_period_date,
      detailed: true,
      filters: {
        subsidiaries: [wizardForm.organization],
      },
    }
    const { data } = await payrollApi.bulkPreview(payload)
    previewData.value = data.data
    expandedRows.value = []
  } catch (err) {
    message.error(err.response?.data?.message || 'Failed to generate preview')
    currentStep.value = 1
  }
  previewLoading.value = false
}

async function handleConfirm() {
  processing.value = true
  processProgress.value = 0
  processStatus.value = 'active'
  processMessage.value = 'Starting bulk payroll...'
  processCurrentEmployee.value = ''
  processCurrentAllocation.value = ''
  Object.assign(processStats, { successful: 0, failed: 0, advances_created: 0 })

  currentStep.value = 3

  try {
    const payload = {
      pay_period_date: wizardForm.pay_period_date,
      filters: {
        subsidiaries: [wizardForm.organization],
      },
    }

    const { data } = await payrollApi.bulkCreate(payload)
    batchId = data.data?.batch_id

    if (batchId) {
      subscribeWebSocket(batchId)
      startPolling(batchId)
    }
  } catch (err) {
    processStatus.value = 'failed'
    processMessage.value = err.response?.data?.message || 'Failed to start bulk payroll'
    processing.value = false
  }
}

async function subscribeWebSocket(id) {
  try {
    const echo = getEcho() || await initEcho()
    if (!echo) return

    // Public channel (not private)
    echoChannel = echo.channel(`payroll-bulk.${id}`)

    echoChannel.listen('.payroll.progress', (e) => {
      if (processStatus.value !== 'active') return

      const total = e.total || 1
      processProgress.value = Math.round((e.processed / total) * 100)
      processMessage.value = `Processing ${e.processed} of ${e.total}...`
      processCurrentEmployee.value = e.currentEmployee || ''
      processCurrentAllocation.value = e.currentAllocation || ''

      if (e.stats) {
        Object.assign(processStats, e.stats)
      }

      if (e.status === 'completed') {
        processProgress.value = 100
        processStatus.value = 'completed'
        processMessage.value = `Completed! ${e.stats?.successful || 0} payrolls created.`
        processCurrentEmployee.value = ''
        processCurrentAllocation.value = ''
        cleanupTracking()
        if (e.stats?.failed > 0) fetchBatchErrors()
      } else if (e.status === 'failed') {
        processStatus.value = 'failed'
        processMessage.value = 'Bulk payroll processing failed'
        cleanupTracking()
        fetchBatchErrors()
      }
    })
  } catch {
    // WebSocket unavailable, rely on polling
  }
}

function startPolling(id) {
  pollInterval = setInterval(async () => {
    try {
      const { data } = await payrollApi.bulkStatus(id)
      const s = data.data || data

      if (processStatus.value !== 'active') return

      processProgress.value = s.progress_percentage || Math.round(((s.processed || 0) / (s.total || 1)) * 100)
      processMessage.value = `Processing ${s.processed || 0} of ${s.total || 0}...`
      processCurrentEmployee.value = s.current_employee || ''
      processCurrentAllocation.value = s.current_allocation || ''

      if (s.stats) Object.assign(processStats, s.stats)

      if (s.status === 'completed') {
        processProgress.value = 100
        processStatus.value = 'completed'
        processMessage.value = `Completed! ${s.stats?.successful || 0} payrolls created.`
        processCurrentEmployee.value = ''
        cleanupTracking()
        if (s.stats?.failed > 0) fetchBatchErrors()
      } else if (s.status === 'failed') {
        processStatus.value = 'failed'
        processMessage.value = 'Bulk payroll processing failed'
        cleanupTracking()
        fetchBatchErrors()
      }
    } catch { /* polling error, continue */ }
  }, 3000)
}

function cleanupTracking() {
  if (echoChannel) {
    try {
      const echo = getEcho()
      if (echo && batchId) echo.leave(`payroll-bulk.${batchId}`)
    } catch {}
    echoChannel = null
  }
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
  processing.value = false
}

function handleCancel() {
  resetWizard()
  emit('update:open', false)
}

function handleDone() {
  resetWizard()
  emit('update:open', false)
  emit('completed')
}

function resetWizard() {
  cleanupTracking()
  currentStep.value = 0
  previewData.value = null
  previewSearch.value = ''
  expandedRows.value = []
  processProgress.value = 0
  processStatus.value = 'active'
  processMessage.value = ''
  processCurrentEmployee.value = ''
  processCurrentAllocation.value = ''
  Object.assign(processStats, { successful: 0, failed: 0, advances_created: 0 })
  Object.assign(wizardForm, { pay_period_date: null, organization: null })
  batchId = null
  batchErrors.value = []
  downloadingErrors.value = false
}

function onExpandRow(expanded, record) {
  if (expanded) {
    expandedRows.value = [...expandedRows.value, record.employment_id]
  } else {
    expandedRows.value = expandedRows.value.filter(id => id !== record.employment_id)
  }
}

function toggleExpandAll() {
  const employees = filteredPreviewEmployees.value
  if (expandedRows.value.length === employees.length) {
    expandedRows.value = []
  } else {
    expandedRows.value = employees.map(e => e.employment_id)
  }
}

function getEmployeeTotal(record, field) {
  return (record.allocations || []).reduce((sum, a) => sum + (Number(a[field]) || 0), 0)
}

// Maps inner-table column keys to their data paths in the allocation object
function getAllocValue(alloc, key) {
  const map = {
    gross_salary: alloc.gross_salary,
    gross_salary_by_fte: alloc.gross_salary_by_fte,
    salary_increase: alloc.calculation_breakdown?.step_1_salary_determination?.annual_increase_by_fte,
    retroactive_salary: alloc.income_additions?.retroactive_salary,
    thirteen_month: alloc.income_additions?.thirteen_month,
    thirteen_month_salary_accured: alloc.income_additions?.thirteen_month_accrued,
    salary_bonus: alloc.income_additions?.salary_bonus,
    total_income: alloc.total_income,
    pvd: alloc.deductions?.pvd,
    pvd_employer: alloc.contributions?.pvd_employer,
    saving_fund: alloc.deductions?.saving_fund,
    saving_fund_employer: alloc.contributions?.saving_fund_employer,
    employee_ss: alloc.deductions?.employee_ss,
    employer_ss: alloc.contributions?.employer_ss,
    employee_hw: alloc.deductions?.employee_hw,
    employer_hw: alloc.contributions?.employer_hw,
    tax: alloc.deductions?.tax,
    student_loan: alloc.deductions?.student_loan,
    total_deduction: alloc.deductions?.total,
    employer_total: alloc.contributions?.total,
    total_salary: alloc.total_salary,
    net_salary: alloc.net_salary,
  }
  return map[key] ?? null
}

// Match staff_id from warning text and find the employee in preview data
function findEmployeeIdFromWarning(warningText) {
  const employees = previewData.value?.employees || []
  for (const emp of employees) {
    if (emp.staff_id && warningText.includes(emp.staff_id)) return emp.employee_id || null
    if (emp.name && warningText.includes(emp.name)) return emp.employee_id || null
  }
  return null
}

async function handleDownloadErrors() {
  if (!batchId) return
  downloadingErrors.value = true
  try {
    const res = await payrollApi.bulkErrors(batchId)
    const url = window.URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `payroll-errors-batch-${batchId}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  } catch {
    message.error('Failed to download error report')
  }
  downloadingErrors.value = false
}

async function fetchBatchErrors() {
  if (!batchId) return
  try {
    const { data } = await payrollApi.bulkStatus(batchId)
    const batch = data.data || data
    batchErrors.value = batch.errors || []
  } catch {
    // Silent — errors are supplementary info
  }
}

onUnmounted(() => cleanupTracking())
</script>

<style>
.modal-fullscreen .ant-modal {
  top: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  max-width: 100vw !important;
}
.modal-fullscreen .ant-modal-content {
  border-radius: 0 !important;
  min-height: 100vh;
}
</style>

<style scoped>
.wizard-step { min-height: 200px; }
.preview-context { font-size: 16px; margin-bottom: 12px; padding: 10px 14px; background: var(--color-bg-subtle, #f9fafb); border-radius: var(--radius-md, 8px); border: 1px solid var(--color-border-light, #f0f0f0); }
.wizard-footer { display: flex; align-items: center; gap: 8px; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--color-border-light, #f0f0f0); }
.font-mono { font-family: 'SF Mono', 'Consolas', monospace; }
.font-semibold { font-weight: 600; }
.cell-sub { font-size: 12px; color: var(--color-text-muted); }
.loading-center { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 0; gap: 16px; color: var(--color-text-secondary); }
.processing-state { display: flex; flex-direction: column; align-items: center; padding: 32px 0; gap: 16px; }
.processing-message { font-size: 15px; color: var(--color-text-secondary); margin: 0; }
.processing-current { font-size: 13px; color: var(--color-text-muted); }
.processing-stats { display: flex; gap: 8px; margin-top: 4px; }

/* Preview toolbar */
.preview-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

/* Outer scroll wrapper — the inner 25-column table pushes the
   outer table wider than the viewport. Wrapping the entire outer
   table in overflow-x: auto gives a single horizontal scrollbar.
   A div inside a <td> cannot independently scroll because table
   layout expands the td to fit content before overflow applies. */
.preview-table-scroll {
  overflow-x: auto;
}
.alloc-sub-table :deep(.ant-table-thead > tr > th) {
  font-size: 11px;
  padding: 5px 6px;
  background: #f5f7fa;
  white-space: nowrap;
}
.alloc-sub-table :deep(.ant-table-tbody > tr > td) {
  font-size: 12px;
  padding: 6px;
  white-space: nowrap;
}
</style>
