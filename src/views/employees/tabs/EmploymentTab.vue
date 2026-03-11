<template>
  <div>
    <template v-if="employee.employment">
      <div class="section-header">
        <div class="section-title" style="margin: 0; border: none; padding: 0;">Employment Details</div>
        <a-space>
          <a-button v-if="canUpdateEmployment" size="small" :loading="loadingOptions" @click="openEditEmployment"><EditOutlined /> Edit</a-button>
          <a-button v-if="canDeleteEmployment" size="small" danger @click="confirmDeleteEmployment"><DeleteOutlined /> Delete</a-button>
        </a-space>
      </div>
      <div class="info-grid">
        <InfoField label="Organization" :value="employee.employment.organization" />
        <InfoField label="Department" :value="employee.employment.department?.name" />
        <InfoField label="Section" :value="employee.employment.section_department?.name" />
        <InfoField label="Position" :value="employee.employment.position?.title" />
        <InfoField label="Site" :value="employee.employment.site?.name" />
        <InfoField label="Start Date" :value="formatDate(employee.employment.start_date)" />
        <InfoField label="Pay Method" :value="employee.employment.pay_method" />
        <InfoField label="Status" :value="employee.employment.end_date ? 'Inactive' : 'Active'" />
      </div>

      <div class="section-title">Salary</div>
      <div class="info-grid">
        <InfoField v-if="employee.employment.probation_required !== false" label="Probation Salary" :value="formatCurrency(employee.employment.probation_salary)" />
        <InfoField label="Pass-Probation Salary" :value="formatCurrency(employee.employment.pass_probation_salary)" />
      </div>

      <div class="section-title">Probation</div>
      <div class="info-grid">
        <InfoField label="Probation Required" :value="employee.employment.probation_required === false ? 'No' : 'Yes'" />
        <template v-if="employee.employment.probation_required !== false">
          <InfoField label="Pass Probation Date" :value="formatDate(employee.employment.pass_probation_date)" />
          <InfoField label="End Probation Date" :value="formatDate(employee.employment.end_probation_date)" />
        </template>
      </div>
      <div v-if="employee.employment.probation_required === false" class="no-probation-note">
        Employee skips probation — full salary and benefits from start date.
      </div>
      <a-space v-if="canUpdateEmployment && employee.employment.probation_required !== false && !employee.employment.end_probation_date" style="margin-top: 12px;">
        <a-button type="primary" size="small" @click="openProbationModal('passed')">
          <CheckOutlined /> Mark as Passed
        </a-button>
        <a-button danger size="small" @click="openProbationModal('failed')">
          <CloseOutlined /> Mark as Failed
        </a-button>
      </a-space>

      <div class="section-title">Benefits</div>
      <div class="info-grid">
        <InfoField label="Health Welfare" :value="employee.employment.health_welfare ? 'Yes' : 'No'" />
        <InfoField label="PVD" :value="employee.employment.pvd ? 'Yes' : 'No'" />
        <InfoField label="Saving Fund" :value="employee.employment.saving_fund ? 'Yes' : 'No'" />
        <InfoField label="Study Loan" :value="employee.employment.study_loan > 0 ? `฿${Number(employee.employment.study_loan).toLocaleString('en', { minimumFractionDigits: 2 })}/month` : 'None'" />
        <InfoField label="Retroactive Salary" :value="employee.employment.retroactive_salary != 0 && employee.employment.retroactive_salary != null ? `฿${Number(employee.employment.retroactive_salary).toLocaleString('en', { minimumFractionDigits: 2 })}` : 'None'" />
      </div>
    </template>
    <a-empty v-else description="No employment record">
      <a-button v-if="canCreateEmployment" type="primary" @click="openAddEmployment">
        <PlusOutlined /> Add Employment
      </a-button>
    </a-empty>

    <!-- Employment Modal (Add/Edit) -->
    <a-modal
      v-model:open="employmentModalVisible"
      :title="editingEmployment ? 'Edit Employment' : 'New Employment Contract'"
      @ok="handleSaveEmployment"
      :confirm-loading="savingEmployment"
      :width="'min(95vw, 800px)'"
      :bodyStyle="{ maxHeight: '70vh', overflowY: 'auto' }"
    >
      <a-form :model="empForm" layout="vertical" class="modal-form">
        <div class="form-section-title">Assignment</div>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="Organization" required>
              <a-select
                v-model:value="empForm.organization"
                placeholder="Select organization"
              >
                <a-select-option value="SMRU">SMRU</a-select-option>
                <a-select-option value="BHF">BHF</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Department" required>
              <a-select
                v-model:value="empForm.department_id"
                placeholder="Select department"
                show-search
                :filter-option="filterOption"
                :loading="loadingOptions"
              >
                <a-select-option v-for="d in departmentOptions" :key="d.id" :value="d.id">
                  {{ d.name }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Position" required>
              <a-select
                v-model:value="empForm.position_id"
                placeholder="Select position"
                show-search
                :filter-option="filterOption"
                :disabled="!empForm.department_id"
                :loading="loadingOptions"
              >
                <a-select-option v-for="p in filteredPositions" :key="p.id" :value="p.id">
                  {{ p.title || p.name }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Section Department">
              <a-select
                v-model:value="empForm.section_department_id"
                placeholder="Select section"
                show-search
                allow-clear
                :filter-option="filterOption"
                :disabled="!empForm.department_id"
                :loading="loadingOptions"
              >
                <a-select-option v-for="sd in filteredSectionDepartments" :key="sd.id" :value="sd.id">
                  {{ sd.name }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="Site">
              <a-select v-model:value="empForm.site_id" placeholder="Select site" allow-clear show-search :filter-option="filterOption">
                <a-select-option v-for="s in siteOptions" :key="s.id" :value="s.id">
                  {{ s.name }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <div class="form-section-title">Contract &amp; Probation</div>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item required>
              <template #label><span>Start Date</span></template>
              <a-date-picker
                v-model:value="empForm.start_date"
                style="width: 100%"
                format="DD-MMM-YY"
                value-format="YYYY-MM-DD"
                placeholder="DD-MMM-YY"
              />
              <div class="form-hint">Contract / Recruitment date</div>
            </a-form-item>
          </a-col>
          <a-col :span="16">
            <a-form-item>
              <template #label><span>Probation Required</span></template>
              <div class="probation-toggle">
                <a-switch
                  v-model:checked="empForm.probation_required"
                  checked-children="Yes"
                  un-checked-children="No"
                />
                <span class="probation-toggle-label" :class="{ 'skip': !empForm.probation_required }">
                  {{ empForm.probation_required ? 'Standard probation period' : 'Skip probation' }}
                </span>
              </div>
              <div class="form-hint">Set to "No" for employees who do not need a probation period</div>
            </a-form-item>
          </a-col>
        </a-row>

        <template v-if="empForm.probation_required">
          <a-row :gutter="16">
            <a-col :span="8">
              <a-form-item>
                <template #label><span>End Prob. Date</span></template>
                <a-date-picker
                  v-model:value="empForm.end_probation_date"
                  style="width: 100%"
                  format="DD-MMM-YY"
                  value-format="YYYY-MM-DD"
                  placeholder="DD-MMM-YY"
                />
                <div class="form-hint">Last day of probation</div>
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item>
                <template #label><span>Pass Prob. Date</span></template>
                <a-date-picker
                  v-model:value="empForm.pass_probation_date"
                  style="width: 100%"
                  format="DD-MMM-YY"
                  value-format="YYYY-MM-DD"
                  placeholder="DD-MMM-YY"
                />
                <div class="form-hint">New salary starts</div>
              </a-form-item>
            </a-col>
          </a-row>

          <div v-if="probationPeriodText" class="probation-indicator">
            <div class="probation-indicator-bar"></div>
            <div class="probation-indicator-text">
              <span class="probation-label">Probation period:</span>
              <span class="probation-dates">{{ probationPeriodText }}</span>
            </div>
          </div>
        </template>

        <div class="form-section-title">Salary</div>
        <a-row :gutter="16">
          <a-col v-if="empForm.probation_required" :span="12">
            <a-form-item>
              <template #label>
                <span>Probation Salary</span>
                <span class="field-hint"> (During probation)</span>
              </template>
              <a-input-number
                v-model:value="empForm.probation_salary"
                :min="0"
                :precision="2"
                style="width: 100%"
                placeholder="e.g. 30,000"
                :formatter="val => val ? `฿ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''"
                :parser="val => val.replace(/฿\s?|(,*)/g, '')"
              />
            </a-form-item>
          </a-col>
          <a-col :span="empForm.probation_required ? 12 : 24">
            <a-form-item required>
              <template #label>
                <span>{{ empForm.probation_required ? 'Pass-Probation Salary' : 'Salary' }}</span>
                <span class="field-hint"> {{ empForm.probation_required ? '(After probation)' : '(Full salary from day 1)' }}</span>
              </template>
              <a-input-number
                v-model:value="empForm.pass_probation_salary"
                :min="0"
                :precision="2"
                style="width: 100%"
                placeholder="e.g. 35,000"
                :formatter="val => val ? `฿ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''"
                :parser="val => val.replace(/฿\s?|(,*)/g, '')"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <div v-if="empForm.probation_required && empForm.probation_salary && empForm.pass_probation_salary && Number(empForm.probation_salary) > Number(empForm.pass_probation_salary)" class="form-warning">
          Probation salary must be &le; pass-probation salary
        </div>

        <div class="form-section-title">Pay &amp; Benefits</div>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Pay Method">
              <a-select
                v-model:value="empForm.pay_method"
                placeholder="Select pay method"
                allow-clear
                :options="payMethodOptions"
                :loading="loadingPayMethods"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item>
              <a-checkbox v-model:checked="empForm.health_welfare">Health Welfare</a-checkbox>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item>
              <a-checkbox v-model:checked="empForm.pvd">PVD</a-checkbox>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item>
              <a-checkbox v-model:checked="empForm.saving_fund">Saving Fund</a-checkbox>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Study Loan Deduction (THB/month)">
              <a-input-number
                v-model:value="empForm.study_loan"
                :min="0"
                :max="999999.99"
                :precision="2"
                :step="500"
                style="width: 100%"
                placeholder="0.00"
                :formatter="val => val ? `฿ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''"
                :parser="val => val.replace(/฿\s?|(,*)/g, '')"
              />
              <div class="form-hint">Fixed monthly amount deducted from net pay. Leave empty or 0 for no deduction.</div>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Retroactive Salary (THB)">
              <a-input-number
                v-model:value="empForm.retroactive_salary"
                :min="-999999.99"
                :max="999999.99"
                :precision="2"
                :step="500"
                style="width: 100%"
                placeholder="0.00"
                :formatter="val => val ? `฿ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''"
                :parser="val => val.replace(/฿\s?|(,*)/g, '')"
              />
              <div class="form-hint">Manual HR correction: positive = underpaid, negative = overpaid. Applied before payroll.</div>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- Probation Modal -->
    <a-modal
      v-model:open="probationModalVisible"
      :title="probationForm.action === 'passed' ? 'Complete Probation' : 'Fail Probation'"
      @ok="handleProbationSubmit"
      :confirm-loading="savingProbation"
      :width="'min(95vw, 480px)'"
    >
      <a-form layout="vertical" class="modal-form">
        <a-form-item label="Decision Date">
          <a-date-picker
            v-model:value="probationForm.decision_date"
            style="width: 100%"
            format="DD/MM/YYYY"
            value-format="YYYY-MM-DD"
            placeholder="Defaults to today"
          />
        </a-form-item>
        <a-form-item v-if="probationForm.action === 'failed'" label="Reason" required>
          <a-textarea v-model:value="probationForm.reason" :rows="3" placeholder="Reason for failing probation..." />
        </a-form-item>
        <a-form-item label="Notes">
          <a-textarea v-model:value="probationForm.notes" :rows="2" placeholder="Additional notes..." />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, inject } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useAuthStore } from '@/stores/auth'
import { employmentApi, optionsApi, lookupApi } from '@/api'
import {
  EditOutlined, DeleteOutlined, PlusOutlined,
  CheckOutlined, CloseOutlined,
} from '@ant-design/icons-vue'
import InfoField from '@/components/common/InfoField.vue'

const dayjs = inject('$dayjs')
const authStore = useAuthStore()

const props = defineProps({
  employee: { type: Object, required: true },
})

const emit = defineEmits(['refresh'])

const canCreateEmployment = computed(() => authStore.canCreate('employment_records'))
const canUpdateEmployment = computed(() => authStore.canUpdate('employment_records'))
const canDeleteEmployment = computed(() => authStore.canDelete('employment_records'))

// ---- Employment Modal State ----
const employmentModalVisible = ref(false)
const editingEmployment = ref(false)
const savingEmployment = ref(false)
const departmentOptions = ref([])
const positionOptions = ref([])
const siteOptions = ref([])
const sectionDepartmentOptions = ref([])
const payMethodOptions = ref([])
const loadingOptions = ref(false)
const loadingPayMethods = ref(false)

const empForm = reactive({
  organization: undefined,
  department_id: undefined,
  section_department_id: undefined,
  position_id: undefined,
  site_id: undefined,
  start_date: null,
  probation_required: true,
  end_probation_date: null,
  pass_probation_date: null,
  pass_probation_salary: null,
  probation_salary: null,
  pay_method: undefined,
  health_welfare: false,
  pvd: false,
  saving_fund: false,
  study_loan: null,
  retroactive_salary: null,
})

const filteredPositions = computed(() => {
  if (!empForm.department_id) return []
  const deptId = Number(empForm.department_id)
  return positionOptions.value.filter(p => Number(p.department_id) === deptId)
})

const filteredSectionDepartments = computed(() => {
  if (!empForm.department_id) return []
  const deptId = Number(empForm.department_id)
  return sectionDepartmentOptions.value.filter(sd => Number(sd.department_id) === deptId)
})

const probationPeriodText = computed(() => {
  if (!empForm.start_date || !empForm.end_probation_date) return null
  return `${dayjs(empForm.start_date).format('DD MMM YYYY')} — ${dayjs(empForm.end_probation_date).format('DD MMM YYYY')}`
})

const skipDateAutoFill = ref(false)
const skipDepartmentReset = ref(false)

watch(() => empForm.start_date, (newVal) => {
  if (skipDateAutoFill.value) return
  if (!empForm.probation_required) return
  if (newVal) {
    const start = dayjs(newVal)
    empForm.pass_probation_date = start.add(3, 'month').format('YYYY-MM-DD')
    empForm.end_probation_date = start.add(3, 'month').subtract(1, 'day').format('YYYY-MM-DD')
  } else {
    empForm.pass_probation_date = null
    empForm.end_probation_date = null
  }
})

// When probation_required is toggled off, clear probation fields;
// when toggled back on, auto-calculate dates from start_date
watch(() => empForm.probation_required, (required) => {
  if (!required) {
    empForm.pass_probation_date = null
    empForm.end_probation_date = null
    empForm.probation_salary = null
  } else if (empForm.start_date) {
    const start = dayjs(empForm.start_date)
    empForm.pass_probation_date = start.add(3, 'month').format('YYYY-MM-DD')
    empForm.end_probation_date = start.add(3, 'month').subtract(1, 'day').format('YYYY-MM-DD')
  }
})

watch(() => empForm.department_id, () => {
  if (skipDepartmentReset.value) return
  if (empForm.position_id) {
    const valid = filteredPositions.value.some(p => Number(p.id) === Number(empForm.position_id))
    if (!valid) empForm.position_id = undefined
  }
  if (empForm.section_department_id) {
    const valid = filteredSectionDepartments.value.some(sd => Number(sd.id) === Number(empForm.section_department_id))
    if (!valid) empForm.section_department_id = undefined
  }
})

// ---- Probation State ----
const probationModalVisible = ref(false)
const savingProbation = ref(false)
const probationForm = reactive({
  action: '',
  decision_date: null,
  reason: '',
  notes: '',
})

// ---- Helpers ----
function formatDate(date) {
  return date ? dayjs(date).format('DD MMM YYYY') : null
}

function formatCurrency(val) {
  if (val == null) return null
  return `฿${Number(val).toLocaleString('en', { minimumFractionDigits: 2 })}`
}

function filterOption(input, option) {
  const label = (option.children?.[0]?.children || option.label || '').toString().toLowerCase()
  return label.includes(input.toLowerCase())
}

function showApiError(err, fallback) {
  const resp = err.response?.data
  if (resp?.errors) {
    const firstErr = Object.values(resp.errors)[0]
    message.error(Array.isArray(firstErr) ? firstErr[0] : firstErr)
  } else {
    message.error(resp?.message || fallback)
  }
}

// ---- Load Options ----
async function loadDropdownOptions() {
  if (departmentOptions.value.length) return
  loadingOptions.value = true
  try {
    const [depts, pos, sites, secDepts, payMethods] = await Promise.all([
      optionsApi.departments(),
      optionsApi.positions(),
      optionsApi.sites(),
      optionsApi.sectionDepartments(),
      lookupApi.byType('pay_method'),
    ])
    departmentOptions.value = depts.data.data || depts.data || []
    positionOptions.value = pos.data.data || pos.data || []
    siteOptions.value = sites.data.data || sites.data || []
    sectionDepartmentOptions.value = secDepts.data.data || secDepts.data || []
    payMethodOptions.value = (payMethods.data?.data || []).map(l => ({ label: l.value, value: l.value }))
  } catch { /* silent */ }
  loadingOptions.value = false
}

// ---- Employment CRUD ----
function resetEmpForm() {
  Object.assign(empForm, {
    organization: undefined,
    department_id: undefined, section_department_id: undefined,
    position_id: undefined, site_id: undefined,
    start_date: null, probation_required: true,
    end_probation_date: null, pass_probation_date: null,
    pass_probation_salary: null, probation_salary: null,
    pay_method: undefined, health_welfare: false, pvd: false, saving_fund: false,
    study_loan: null,
    retroactive_salary: null,
  })
}

function openAddEmployment() {
  resetEmpForm()
  editingEmployment.value = false
  employmentModalVisible.value = true
  loadDropdownOptions()
}

async function openEditEmployment() {
  await loadDropdownOptions()
  const emp = props.employee.employment
  skipDateAutoFill.value = true
  skipDepartmentReset.value = true

  const deptId = emp.department_id || emp.department?.id
  const posId = emp.position_id || emp.position?.id
  const siteId = emp.site_id || emp.site?.id
  const secDeptId = emp.section_department_id || emp.section_department?.id

  Object.assign(empForm, {
    organization: emp.organization || undefined,
    department_id: deptId != null ? Number(deptId) : undefined,
    section_department_id: secDeptId != null ? Number(secDeptId) : undefined,
    position_id: posId != null ? Number(posId) : undefined,
    site_id: siteId != null ? Number(siteId) : undefined,
    start_date: emp.start_date || null,
    probation_required: emp.probation_required !== false,
    end_probation_date: emp.end_probation_date || null,
    pass_probation_date: emp.pass_probation_date || null,
    pass_probation_salary: emp.pass_probation_salary != null ? Number(emp.pass_probation_salary) : null,
    probation_salary: emp.probation_salary != null ? Number(emp.probation_salary) : null,
    pay_method: emp.pay_method || undefined,
    health_welfare: !!emp.health_welfare,
    pvd: !!emp.pvd,
    saving_fund: !!emp.saving_fund,
    study_loan: emp.study_loan != null ? Number(emp.study_loan) : null,
    retroactive_salary: emp.retroactive_salary != null ? Number(emp.retroactive_salary) : null,
  })
  nextTick(() => {
    skipDateAutoFill.value = false
    skipDepartmentReset.value = false
  })
  editingEmployment.value = true
  employmentModalVisible.value = true
}

async function handleSaveEmployment() {
  if (!empForm.organization) return message.warning('Organization is required')
  if (!empForm.department_id) return message.warning('Department is required')
  if (!empForm.position_id) return message.warning('Position is required')
  if (!empForm.start_date) return message.warning('Start Date is required')
  if (empForm.pass_probation_salary == null || empForm.pass_probation_salary === '') {
    return message.warning(empForm.probation_required ? 'Pass-Probation Salary is required' : 'Salary is required')
  }
  if (empForm.probation_required && empForm.probation_salary != null && empForm.probation_salary !== '' &&
      Number(empForm.probation_salary) > Number(empForm.pass_probation_salary)) {
    return message.warning('Probation salary must be less than or equal to pass-probation salary')
  }

  const payload = {
    employee_id: props.employee.id,
    organization: empForm.organization,
    department_id: empForm.department_id,
    position_id: empForm.position_id,
    start_date: empForm.start_date,
    probation_required: empForm.probation_required,
    pass_probation_salary: Number(empForm.pass_probation_salary),
    health_welfare: empForm.health_welfare,
    pvd: empForm.pvd,
    saving_fund: empForm.saving_fund,
    study_loan: empForm.study_loan || 0,
    retroactive_salary: empForm.retroactive_salary || 0,
  }
  if (empForm.section_department_id) payload.section_department_id = empForm.section_department_id
  if (empForm.site_id) payload.site_id = empForm.site_id
  if (empForm.probation_required && empForm.probation_salary != null && empForm.probation_salary !== '') {
    payload.probation_salary = Number(empForm.probation_salary)
  }
  if (empForm.pay_method) payload.pay_method = empForm.pay_method
  if (empForm.probation_required && empForm.pass_probation_date) payload.pass_probation_date = empForm.pass_probation_date
  if (empForm.probation_required && empForm.end_probation_date) payload.end_probation_date = empForm.end_probation_date

  savingEmployment.value = true
  try {
    if (editingEmployment.value) {
      await employmentApi.update(props.employee.employment.id, payload)
      message.success('Employment updated')
    } else {
      await employmentApi.store(payload)
      message.success('Employment created')
    }
    employmentModalVisible.value = false
    emit('refresh')
  } catch (err) {
    showApiError(err, 'Failed to save employment')
  }
  savingEmployment.value = false
}

function confirmDeleteEmployment() {
  Modal.confirm({
    title: 'Delete Employment',
    content: 'Are you sure you want to delete this employment record? This action cannot be undone.',
    okText: 'Delete',
    okType: 'danger',
    onOk: async () => {
      try {
        await employmentApi.destroy(props.employee.employment.id)
        message.success('Employment deleted')
        emit('refresh')
      } catch (err) {
        showApiError(err, 'Failed to delete employment')
      }
    },
  })
}

// ---- Probation ----
function openProbationModal(action) {
  Object.assign(probationForm, { action, decision_date: null, reason: '', notes: '' })
  probationModalVisible.value = true
}

async function handleProbationSubmit() {
  if (probationForm.action === 'failed' && !probationForm.reason) {
    return message.warning('Reason is required when failing probation')
  }

  const payload = { action: probationForm.action }
  if (probationForm.decision_date) payload.decision_date = probationForm.decision_date
  if (probationForm.reason) payload.reason = probationForm.reason
  if (probationForm.notes) payload.notes = probationForm.notes

  savingProbation.value = true
  try {
    await employmentApi.probationStatus(props.employee.employment.id, payload)
    message.success(`Probation marked as ${probationForm.action}`)
    probationModalVisible.value = false
    emit('refresh')
  } catch (err) {
    showApiError(err, 'Failed to update probation status')
  }
  savingProbation.value = false
}
</script>

<style scoped>
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 20px 0 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--color-border-light);
}
.section-title:first-child { margin-top: 0; }

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.modal-form { margin-top: 8px; }
.form-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--color-border);
}
.form-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 4px;
}
.form-warning {
  font-size: 12px;
  color: var(--color-danger, #ff4d4f);
  margin: -8px 0 12px;
}
.field-hint {
  font-weight: 400;
  color: var(--color-text-muted);
  font-size: 12px;
}

.probation-indicator {
  background: var(--color-bg-hover, #fafafa);
  border: 1px solid var(--color-border-light, #f0f0f0);
  border-radius: 6px;
  padding: 10px 14px;
  margin-bottom: 16px;
  position: relative;
  overflow: hidden;
}
.probation-indicator-bar {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: #1677ff;
}
.probation-indicator-text {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.probation-label {
  color: var(--color-text-secondary);
  font-weight: 500;
}
.probation-dates {
  color: var(--color-text);
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}

.probation-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
}
.probation-toggle-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}
.probation-toggle-label.skip {
  color: #1677ff;
}

.no-probation-note {
  font-size: 12px;
  color: #1677ff;
  background: #e6f4ff;
  border: 1px solid #91caff;
  border-radius: 6px;
  padding: 8px 12px;
  margin-top: 8px;
}
</style>
