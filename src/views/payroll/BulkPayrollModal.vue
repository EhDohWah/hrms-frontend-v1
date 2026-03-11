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
            <a-radio-button value="SMRU">SMRU</a-radio-button>
            <a-radio-button value="BHF">BHF</a-radio-button>
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
        <a-alert type="info" show-icon style="margin-bottom: 16px">
          <template #message>
            <strong>{{ previewData.summary?.total_employees || 0 }}</strong> employees &middot;
            <strong>{{ previewData.summary?.total_payrolls || 0 }}</strong> payroll records &middot;
            Total Net: <strong>{{ fmtCurrency(previewData.summary?.total_net_salary) }}</strong>
            <span v-if="previewData.summary?.advances_needed > 0">
              &middot; <strong>{{ previewData.summary.advances_needed }}</strong> inter-org advances
            </span>
          </template>
        </a-alert>

        <div v-if="previewData.warnings?.length" style="margin-bottom: 12px">
          <a-alert v-for="(w, i) in previewData.warnings" :key="i" type="warning" :message="w" show-icon style="margin-bottom: 4px" />
        </div>

        <a-table
          :columns="previewColumns"
          :data-source="previewData.employees || []"
          :row-key="(r) => r.employment_id"
          :pagination="{ pageSize: 10, size: 'small' }"
          size="small"
          :scroll="{ x: 1420, y: 420 }"
          :expanded-row-keys="expandedRows"
          @expand="onExpandRow"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'employee'">
              <div><strong>{{ record.name }}</strong></div>
              <span class="cell-sub">{{ record.staff_id }}</span>
            </template>
            <template v-else-if="column.key === 'employee_status'">
              <a-tag :color="statusColorMap[record.employee_status] || 'default'" size="small">{{ record.employee_status || '—' }}</a-tag>
            </template>
            <template v-else-if="column.key === 'org'">
              <a-tag :color="record.organization === 'SMRU' ? 'blue' : 'green'" size="small">{{ record.organization }}</a-tag>
            </template>
            <template v-else-if="column.key === 'start_date'">
              {{ fmtDate(record.start_date) }}
            </template>
            <template v-else-if="column.key === 'pass_probation_date'">
              {{ fmtDate(record.pass_probation_date) }}
            </template>
            <template v-else-if="column.key === 'probation_salary'">
              <span class="font-mono">{{ fmtCurrency(record.probation_salary) }}</span>
            </template>
            <template v-else-if="column.key === 'pass_probation_salary'">
              <span class="font-mono">{{ fmtCurrency(record.pass_probation_salary) }}</span>
            </template>
            <template v-else-if="column.key === 'allocations'">
              <a-tag size="small">{{ record.allocations?.length || 0 }}</a-tag>
            </template>
            <template v-else-if="column.key === 'gross'">
              <span class="font-mono">{{ fmtCurrency(getEmployeeTotal(record, 'gross_salary_by_fte')) }}</span>
            </template>
            <template v-else-if="column.key === 'tax'">
              <span class="font-mono">{{ fmtCurrency(getEmployeeDeduction(record, 'tax')) }}</span>
            </template>
            <template v-else-if="column.key === 'net'">
              <span class="font-mono font-semibold">{{ fmtCurrency(getEmployeeTotal(record, 'net_salary')) }}</span>
            </template>
          </template>

          <template #expandedRowRender="{ record }">
            <div class="alloc-expand">
              <div v-for="alloc in (record.allocations || [])" :key="alloc.allocation_id" class="alloc-detail-card">
                <div class="alloc-detail-header">
                  <div class="alloc-detail-grant">
                    <span class="alloc-grant-name">{{ alloc.grant_name }}</span>
                    <span class="alloc-grant-code font-mono">{{ alloc.grant_code }}</span>
                  </div>
                  <div class="alloc-detail-tags">
                    <a-tag color="processing" size="small">FTE: {{ (alloc.fte * 100).toFixed(0) }}%</a-tag>
                    <a-tag v-if="alloc.needs_advance" color="orange" size="small">Advance Needed</a-tag>
                  </div>
                </div>
                <div class="alloc-detail-body">
                  <div class="alloc-detail-col">
                    <div class="alloc-detail-col-title">Income</div>
                    <div class="alloc-row"><span>Gross Salary</span><span class="font-mono">{{ fmtCurrency(alloc.gross_salary) }}</span></div>
                    <div v-if="getAnnualIncrease(alloc)" class="alloc-row alloc-row-increase">
                      <span>
                        Annual Increase
                        <a-tooltip :title="`Full increase ${fmtCurrency(getAnnualIncreaseFull(alloc))} × ${(alloc.calculation_breakdown?.step_1_salary_determination?.fte * 100).toFixed(0)}% FTE = ${fmtCurrency(getAnnualIncrease(alloc))}`">
                          <InfoCircleOutlined style="font-size: 11px; color: #999; margin-left: 4px" />
                        </a-tooltip>
                      </span>
                      <span class="font-mono" style="color: #389e0d">+{{ fmtCurrency(getAnnualIncrease(alloc)) }}</span>
                    </div>
                    <div class="alloc-row"><span>Salary by FTE</span><span class="font-mono">{{ fmtCurrency(alloc.gross_salary_by_fte) }}</span></div>
                    <div v-if="alloc.income_additions?.retroactive_salary" class="alloc-row"><span>Retroactive Sal.</span><span class="font-mono">{{ fmtCurrency(alloc.income_additions.retroactive_salary) }}</span></div>
                    <div v-if="alloc.income_additions?.thirteen_month" class="alloc-row"><span>13th Month</span><span class="font-mono">{{ fmtCurrency(alloc.income_additions.thirteen_month) }}</span></div>
                    <div v-if="alloc.income_additions?.salary_bonus" class="alloc-row"><span>Salary Bonus</span><span class="font-mono">{{ fmtCurrency(alloc.income_additions.salary_bonus) }}</span></div>
                    <div class="alloc-row alloc-row-total"><span>Total Income</span><span class="font-mono">{{ fmtCurrency(alloc.total_income) }}</span></div>
                  </div>
                  <div class="alloc-detail-col">
                    <div class="alloc-detail-col-title">Deductions</div>
                    <div class="alloc-row"><span>PVD</span><span class="font-mono">{{ fmtCurrency(alloc.deductions?.pvd) }}</span></div>
                    <div v-if="alloc.deductions?.saving_fund" class="alloc-row"><span>Saving Fund</span><span class="font-mono">{{ fmtCurrency(alloc.deductions.saving_fund) }}</span></div>
                    <div class="alloc-row"><span>Social Security</span><span class="font-mono">{{ fmtCurrency(alloc.deductions?.employee_ss) }}</span></div>
                    <div class="alloc-row"><span>Health Welfare</span><span class="font-mono">{{ fmtCurrency(alloc.deductions?.employee_hw) }}</span></div>
                    <div class="alloc-row"><span>Income Tax</span><span class="font-mono">{{ fmtCurrency(alloc.deductions?.tax) }}</span></div>
                    <div v-if="alloc.deductions?.study_loan" class="alloc-row"><span>Study Loan</span><span class="font-mono">{{ fmtCurrency(alloc.deductions.study_loan) }}</span></div>
                    <div class="alloc-row alloc-row-total"><span>Total Deductions</span><span class="font-mono">{{ fmtCurrency(alloc.deductions?.total) }}</span></div>
                  </div>
                  <div class="alloc-detail-col">
                    <div class="alloc-detail-col-title">Employer Contributions</div>
                    <div class="alloc-row"><span>PVD (Employer)</span><span class="font-mono">{{ fmtCurrency(alloc.contributions?.pvd_employer) }}</span></div>
                    <div v-if="alloc.contributions?.saving_fund_employer" class="alloc-row"><span>Saving Fund (Employer)</span><span class="font-mono">{{ fmtCurrency(alloc.contributions.saving_fund_employer) }}</span></div>
                    <div class="alloc-row"><span>Social Security</span><span class="font-mono">{{ fmtCurrency(alloc.contributions?.employer_ss) }}</span></div>
                    <div class="alloc-row"><span>Health Welfare</span><span class="font-mono">{{ fmtCurrency(alloc.contributions?.employer_hw) }}</span></div>
                    <div class="alloc-row alloc-row-total"><span>Total Employer</span><span class="font-mono">{{ fmtCurrency(alloc.contributions?.total) }}</span></div>
                  </div>
                </div>
                <div class="alloc-detail-footer">
                  <span class="cell-sub">
                    Total PVD: {{ fmtCurrency(alloc.total_pvd) }}
                    <template v-if="alloc.total_saving_fund">&middot; Total Saving Fund: {{ fmtCurrency(alloc.total_saving_fund) }}</template>
                  </span>
                  <div style="display: flex; gap: 8px; margin-top: 6px">
                    <div class="alloc-net-box" style="flex: 1">
                      <span>Net Salary</span>
                      <span class="font-mono font-semibold">{{ fmtCurrency(alloc.net_salary) }}</span>
                    </div>
                    <div class="alloc-net-box" style="flex: 1; background: #f0faf0">
                      <span>Total Cost</span>
                      <span class="font-mono font-semibold">{{ fmtCurrency(alloc.total_salary) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </a-table>
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
import { ref, reactive, computed, inject, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'
import { InfoCircleOutlined } from '@ant-design/icons-vue'
import { payrollApi } from '@/api'
import { getEcho, initEcho } from '@/plugins/echo'

const dayjs = inject('$dayjs')
function fmtDate(d) { return d ? dayjs(d).format('DD MMM YYYY') : '—' }

const props = defineProps({ open: Boolean })
const emit = defineEmits(['update:open', 'completed'])

const steps = [
  { key: 'period', title: 'Pay Period' },
  { key: 'organization', title: 'Organization' },
  { key: 'review', title: 'Review' },
  { key: 'process', title: 'Processing' },
]

const currentStep = ref(0)
const wizardTitle = computed(() => `Bulk Payroll — ${steps[currentStep.value]?.title || ''}`)

const wizardForm = reactive({
  pay_period_date: null,
  organization: null,
})

const previewLoading = ref(false)
const previewData = ref(null)
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
  'Local ID Staff': 'green',
  'Local non ID Staff': 'green',
  'Expats (Local)': 'purple',
}

const previewColumns = [
  { title: 'Employee', key: 'employee', width: 180, fixed: 'left' },
  { title: 'Status', key: 'employee_status', width: 140 },
  { title: 'Org', key: 'org', width: 70, align: 'center' },
  { title: 'Department', dataIndex: 'department', width: 140 },
  { title: 'Start Date', key: 'start_date', width: 120 },
  { title: 'Pass Prob. Date', key: 'pass_probation_date', width: 120 },
  { title: 'Prob. Salary', key: 'probation_salary', width: 130, align: 'right' },
  { title: 'Pass Prob. Salary', key: 'pass_probation_salary', width: 120, align: 'right' },
  { title: 'Alloc.', key: 'allocations', width: 60, align: 'center' },
  { title: 'Gross', key: 'gross', width: 120, align: 'right' },
  { title: 'Tax', key: 'tax', width: 100, align: 'right' },
  { title: 'Net', key: 'net', width: 120, align: 'right' },
]

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
    // Auto-expand all employee rows to show allocation details
    expandedRows.value = (data.data?.employees || []).map(e => e.employment_id)
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
      } else if (e.status === 'failed') {
        processStatus.value = 'failed'
        processMessage.value = 'Bulk payroll processing failed'
        cleanupTracking()
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
      } else if (s.status === 'failed') {
        processStatus.value = 'failed'
        processMessage.value = 'Bulk payroll processing failed'
        cleanupTracking()
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
  expandedRows.value = []
  processProgress.value = 0
  processStatus.value = 'active'
  processMessage.value = ''
  processCurrentEmployee.value = ''
  processCurrentAllocation.value = ''
  Object.assign(processStats, { successful: 0, failed: 0, advances_created: 0 })
  Object.assign(wizardForm, { pay_period_date: null, organization: null })
  batchId = null
}

function onExpandRow(expanded, record) {
  if (expanded) {
    expandedRows.value = [...expandedRows.value, record.employment_id]
  } else {
    expandedRows.value = expandedRows.value.filter(id => id !== record.employment_id)
  }
}

function getEmployeeTotal(record, field) {
  return (record.allocations || []).reduce((sum, a) => sum + (Number(a[field]) || 0), 0)
}

function getEmployeeDeduction(record, field) {
  return (record.allocations || []).reduce((sum, a) => sum + (Number(a.deductions?.[field]) || 0), 0)
}

function getAnnualIncrease(alloc) {
  return Number(alloc.calculation_breakdown?.step_1_salary_determination?.annual_increase_by_fte) || 0
}

function getAnnualIncreaseFull(alloc) {
  return Number(alloc.calculation_breakdown?.step_1_salary_determination?.annual_increase_full) || 0
}

function fmtCurrency(val) {
  if (val == null || val === '') return '—'
  const n = Number(val)
  return isNaN(n) ? '—' : `฿${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
.wizard-footer { display: flex; align-items: center; gap: 8px; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--color-border-light, #f0f0f0); }
.font-mono { font-family: 'SF Mono', 'Consolas', monospace; }
.font-semibold { font-weight: 600; }
.cell-sub { font-size: 12px; color: var(--color-text-muted); }
.loading-center { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 0; gap: 16px; color: var(--color-text-secondary); }
.processing-state { display: flex; flex-direction: column; align-items: center; padding: 32px 0; gap: 16px; }
.processing-message { font-size: 15px; color: var(--color-text-secondary); margin: 0; }
.processing-current { font-size: 13px; color: var(--color-text-muted); }
.processing-stats { display: flex; gap: 8px; margin-top: 4px; }

/* Allocation expanded row styles */
.alloc-expand { display: flex; flex-direction: column; gap: 10px; padding: 4px 0; }
.alloc-detail-card { border: 1px solid #e8e8e8; border-radius: 8px; background: #fafbfc; overflow: hidden; }
.alloc-detail-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f5f7fa; border-bottom: 1px solid #e8e8e8; }
.alloc-detail-grant { display: flex; flex-direction: column; gap: 2px; }
.alloc-grant-name { font-weight: 600; font-size: 13px; }
.alloc-grant-code { font-size: 11px; color: var(--color-text-muted); }
.alloc-detail-tags { display: flex; gap: 6px; align-items: center; }
.alloc-detail-body { display: grid; grid-template-columns: 1fr; gap: 12px; padding: 12px 14px; }
@media (min-width: 768px) { .alloc-detail-body { grid-template-columns: 1fr 1fr 1fr; gap: 0; } }
.alloc-detail-col { padding: 0 10px; }
.alloc-detail-col:first-child { padding-left: 0; }
.alloc-detail-col:last-child { padding-right: 0; }
.alloc-detail-col:not(:last-child) { border-bottom: 1px solid #f0f0f0; padding-bottom: 8px; }
@media (min-width: 768px) { .alloc-detail-col:not(:last-child) { border-bottom: none; padding-bottom: 0; border-right: 1px solid #f0f0f0; } }
.alloc-detail-col-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-text-muted); margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #f0f0f0; }
.alloc-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; border-bottom: 1px solid #f8f8f8; }
.alloc-row span:first-child { color: var(--color-text-secondary); }
.alloc-row-increase { background: #f6ffed; border-radius: 3px; padding: 3px 4px; margin: 1px -4px; }
.alloc-row-total { border-top: 1px solid #e8e8e8; border-bottom: none; padding-top: 6px; margin-top: 4px; font-weight: 600; }
.alloc-row-total span:first-child { color: var(--color-text); }
.alloc-detail-footer { display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; border-top: 1px solid #e8e8e8; }
.alloc-net-box { display: flex; align-items: center; gap: 12px; padding: 6px 12px; background: #f0f7ff; border-radius: 6px; font-size: 13px; }
</style>
