<template>
  <div>
    <!-- ═══════════════════════════════════════════════════ -->
    <!-- SECTION 1: EMPLOYMENT DETAILS                      -->
    <!-- ═══════════════════════════════════════════════════ -->
    <template v-if="employee.employment">
      <div class="section-header">
        <div class="section-title">Employment Details</div>
        <a-space>
          <a-button v-if="canUpdateEmployment" size="small" :loading="loadingOptions" @click="openEditEmployment"><EditOutlined /> Edit</a-button>
          <a-button v-if="canDeleteEmployment" size="small" danger @click="confirmDeleteEmployment"><DeleteOutlined /> Delete</a-button>
        </a-space>
      </div>
      <div class="info-grid">
        <InfoField label="Organization" :value="employee.organization" />
        <InfoField label="Department" :value="employee.employment.department?.name" />
        <InfoField label="Section" :value="employee.employment.section_department?.name" />
        <InfoField label="Actual Position" :value="employee.employment.position?.title" />
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

      <!-- ═══════════════════════════════════════════════════ -->
      <!-- RESIGNATION STATUS                                  -->
      <!-- ═══════════════════════════════════════════════════ -->
      <template v-if="canReadResignation && resignation">
        <div class="section-title">Resignation</div>
        <div class="info-grid">
          <InfoField label="Status">
            <template #value>
              <a-tag :color="getResignationStatusColor(resignation.acknowledgement_status)" size="small">
                {{ resignation.acknowledgement_status || '—' }}
              </a-tag>
            </template>
          </InfoField>
          <InfoField label="Resignation Date" :value="formatDate(resignation.resignation_date)" />
          <InfoField label="Last Working Date" :value="formatDate(resignation.last_working_date)" />
          <InfoField label="Reason" :value="resignation.reason" />
          <InfoField label="Acknowledged By" :value="resignation.acknowledged_by?.name" />
        </div>
        <div class="resignation-link">
          <router-link :to="{ name: 'resignation-detail', params: { id: resignation.id } }" class="view-detail-link">
            View full resignation details &rarr;
          </router-link>
        </div>
      </template>

      <div class="section-title">Benefits</div>
      <div class="info-grid">
        <InfoField label="Health Welfare" :value="employee.employment.health_welfare ? 'Yes' : 'No'" />
        <InfoField label="PVD" :value="employee.employment.pvd ? 'Yes' : 'No'" />
        <InfoField label="Saving Fund" :value="employee.employment.saving_fund ? 'Yes' : 'No'" />
        <InfoField label="Study Loan" :value="employee.employment.study_loan > 0 ? `${formatCurrency(employee.employment.study_loan)}/month` : 'None'" />
        <InfoField label="Retroactive Salary" :value="employee.employment.retroactive_salary != 0 && employee.employment.retroactive_salary != null ? formatCurrency(employee.employment.retroactive_salary) : 'None'" />
      </div>

      <!-- ═══════════════════════════════════════════════════ -->
      <!-- SECTION 2: FUNDING ALLOCATIONS                     -->
      <!-- ═══════════════════════════════════════════════════ -->
      <div class="section-divider" />

      <div class="section-header">
        <div class="section-title" style="margin: 0; padding: 0; border: none;">
          Under Grant Position
          <a-tag
            v-if="totalFte > 0"
            :color="totalFte === 100 ? 'green' : 'orange'"
            style="margin-left: 8px;"
          >{{ totalFte }}% FTE</a-tag>
        </div>
        <a-button v-if="canUpdateAllocation && employee.employee_funding_allocations?.length" size="small" type="primary" @click="openManageAllocations">
          <EditOutlined /> Manage Allocations
        </a-button>
      </div>

      <a-table
        v-if="employee.employee_funding_allocations?.length"
        :columns="fundingColumns"
        :data-source="employee.employee_funding_allocations"
        :row-key="(r) => r.id"
        :pagination="false"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'grant'">
            {{ record.grant_item?.grant?.name || '—' }}
            <div class="cell-sub">{{ record.grant_item?.grant?.code || '' }}</div>
          </template>
          <template v-else-if="column.key === 'position'">
            {{ record.grant_item?.grant_position || '—' }}
          </template>
          <template v-else-if="column.key === 'budgetline'">
            <span class="font-mono">{{ record.grant_item?.budgetline_code || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'fte'">
            <span class="font-mono">{{ record.fte != null ? `${(record.fte * 100).toFixed(0)}%` : '—' }}</span>
          </template>
          <template v-else-if="column.key === 'amount'">
            <span class="font-mono">{{ formatCurrency(record.allocated_amount) || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="allocationStatusColor(record.status)" size="small">{{ record.status }}</a-tag>
          </template>
        </template>
      </a-table>
      <a-empty v-else description="No funding allocations">
        <a-button v-if="canCreateAllocation" type="primary" size="small" @click="openManageAllocations">
          <PlusOutlined /> Add Allocation
        </a-button>
      </a-empty>
    </template>

    <!-- NO EMPLOYMENT YET -->
    <a-empty v-else description="No employment record">
      <a-button v-if="canCreateEmployment" type="primary" @click="openAddEmployment">
        <PlusOutlined /> Add Employment
      </a-button>
    </a-empty>

    <!-- ═══════════════════════════════════════════════════ -->
    <!-- EMPLOYMENT MODAL (Add/Edit)                        -->
    <!-- ═══════════════════════════════════════════════════ -->
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
            <a-form-item label="Site">
              <a-select v-model:value="empForm.site_id" placeholder="Select site" allow-clear show-search :filter-option="filterOption">
                <a-select-option v-for="s in siteOptions" :key="s.id" :value="s.id">
                  {{ s.name }}
                </a-select-option>
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
        </a-row>
        <a-row :gutter="16">
          <a-col :span="16">
            <a-form-item label="Actual Position" required>
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
                :loading="loadingOptions"
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

    <!-- ═══════════════════════════════════════════════════ -->
    <!-- MANAGE FUNDING ALLOCATIONS MODAL                   -->
    <!-- ═══════════════════════════════════════════════════ -->
    <a-modal
      v-model:open="allocationModalVisible"
      title="Manage Grant Position"
      :width="'min(95vw, 1200px)'"
      :bodyStyle="{ maxHeight: '70vh', overflowY: 'auto' }"
      :maskClosable="false"
      ok-text="Save Allocations"
      :confirm-loading="savingAllocation"
      @ok="saveAllocations"
    >
      <div class="alloc-modal-header">
        <div class="fte-summary">
          <span>Allocations</span>
          <a-tag
            v-if="editFteTotal > 0"
            :color="editFteTotal === 100 ? 'green' : 'orange'"
            style="margin-left: 8px;"
          >{{ editFteTotal }}% FTE</a-tag>
          <span v-if="editFteTotal > 0 && editFteTotal !== 100" class="fte-hint">
            (must total 100%)
          </span>
        </div>
        <a-button size="small" @click="addAllocRow"><PlusOutlined /> Add Row</a-button>
      </div>

      <a-table
        :columns="editAllocColumns"
        :data-source="allocRows"
        :row-key="(r) => r._key"
        :pagination="false"
        size="small"
        class="alloc-edit-table"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'grant'">
            <a-select
              v-model:value="record.grant_id"
              placeholder="Search grant name or code..."
              show-search
              :filter-option="filterGrantOption"
              :loading="loadingGrantStructure"
              style="width: 100%"
              size="small"
              :dropdown-match-select-width="false"
              :dropdown-style="{ minWidth: '420px' }"
              @change="onAllocGrantChange(record)"
            >
              <a-select-option
                v-for="opt in grantOptions"
                :key="opt.value"
                :value="opt.value"
                :label="opt.searchText"
              >
                <div class="grant-option">
                  <span class="grant-option-name">{{ opt.name }}</span>
                  <a-tag :color="getOrgColor(opt.organization)" size="small" class="grant-option-org">{{ opt.organization }}</a-tag>
                </div>
                <div class="grant-option-code">{{ opt.code }}</div>
              </a-select-option>
            </a-select>
          </template>
          <template v-else-if="column.key === 'position'">
            <a-select
              v-model:value="record.grant_item_id"
              placeholder="Search position..."
              show-search
              option-filter-prop="label"
              :options="getGrantItemOptions(record.grant_id)"
              :disabled="!record.grant_id"
              style="width: 100%"
              size="small"
              @change="onAllocItemChange(record)"
            />
          </template>
          <template v-else-if="column.key === 'budgetline'">
            <span class="font-mono cell-sub">{{ getRowBudgetLine(record) }}</span>
          </template>
          <template v-else-if="column.key === 'fte'">
            <a-input-number
              v-model:value="record.fte"
              :min="0.01"
              :max="100"
              :precision="2"
              style="width: 100%; min-width: 80px"
              size="small"
              placeholder="100"
              suffix="%"
              @change="onAllocFteChange(record)"
            />
          </template>
          <template v-else-if="column.key === 'amount'">
            <span class="font-mono">{{ record.previewAmount != null ? formatCurrency(record.previewAmount) : '—' }}</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-switch
              v-if="record._id"
              :checked="record.status === 'active'"
              checked-children="Active"
              un-checked-children="Inactive"
              size="small"
              @change="(val) => record.status = val ? 'active' : 'inactive'"
            />
            <a-tag v-else color="green" size="small">active</a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-button type="link" size="small" danger @click="removeAllocRow(index)"><DeleteOutlined /></a-button>
          </template>
        </template>
      </a-table>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, inject, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useAuthStore } from '@/stores/auth'
import { employmentApi, fundingAllocationApi, optionsApi, lookupApi } from '@/api'
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue'
import InfoField from '@/components/common/InfoField.vue'
import { getOrgColor } from '@/constants/organizations'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { getResignationStatusColor } from '@/constants/resignations'

const dayjs = inject('$dayjs')
const authStore = useAuthStore()

const props = defineProps({
  employee: { type: Object, required: true },
  autoOpenEmployment: { type: Boolean, default: false },
})

const emit = defineEmits(['refresh'])

// ════════════════════════════════════════════════════════
// PERMISSIONS
// ════════════════════════════════════════════════════════
const canCreateEmployment = computed(() => authStore.canCreate('employment_records'))
const canUpdateEmployment = computed(() => authStore.canUpdate('employment_records'))
const canDeleteEmployment = computed(() => authStore.canDelete('employment_records'))
const canCreateAllocation = computed(() => authStore.canCreate('employee_funding_allocations'))
const canUpdateAllocation = computed(() => authStore.canUpdate('employee_funding_allocations'))
const canReadResignation = computed(() => authStore.canRead('resignation'))

// ════════════════════════════════════════════════════════
// EMPLOYMENT: Modal State
// ════════════════════════════════════════════════════════
const employmentModalVisible = ref(false)
const editingEmployment = ref(false)
const savingEmployment = ref(false)
const departmentOptions = ref([])
const positionOptions = ref([])
const siteOptions = ref([])
const sectionDepartmentOptions = ref([])
const payMethodOptions = ref([])
const loadingOptions = ref(false)

const empForm = reactive({
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

// ════════════════════════════════════════════════════════
// EMPLOYMENT: Computed & Watchers
// ════════════════════════════════════════════════════════
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

// ════════════════════════════════════════════════════════
// RESIGNATION — uses employee.resignations (eager-loaded by backend)
// ════════════════════════════════════════════════════════
const resignation = computed(() => {
  const list = props.employee?.resignations
  if (!list?.length) return null
  return list[0]
})

// ════════════════════════════════════════════════════════
// FUNDING: Table & State
// ════════════════════════════════════════════════════════
const fundingColumns = [
  { title: 'Grant', key: 'grant', width: 260 },
  { title: 'Position under Grant', key: 'position', width: 200 },
  { title: 'Budget Line', key: 'budgetline', width: 130 },
  { title: 'FTE %', key: 'fte', width: 90, align: 'center' },
  { title: 'Amount', key: 'amount', width: 120, align: 'right' },
  { title: 'Status', key: 'status', width: 90 },
]

const editAllocColumns = [
  { title: 'Grant', key: 'grant', width: 300 },
  { title: 'Position under Grant', key: 'position', width: 220 },
  { title: 'Budget Line', key: 'budgetline', width: 110 },
  { title: 'FTE %', key: 'fte', width: 110, align: 'center' },
  { title: 'Amount', key: 'amount', width: 120, align: 'right' },
  { title: 'Status', key: 'status', width: 80 },
  { title: '', key: 'actions', width: 50, align: 'center' },
]

const allocationModalVisible = ref(false)
const savingAllocation = ref(false)
const grantStructure = ref([])
const loadingGrantStructure = ref(false)
const allocRows = ref([])
let allocRowKey = 0
let originalAllocIds = []

const totalFte = computed(() => {
  const allocs = props.employee?.employee_funding_allocations || []
  const sum = allocs
    .filter(a => a.status === 'active')
    .reduce((s, a) => s + (Number(a.fte) || 0), 0)
  return Math.round(sum * 100)
})

const editFteTotal = computed(() => {
  return Math.round(allocRows.value
    .filter(r => r.status === 'active')
    .reduce((s, r) => s + (Number(r.fte) || 0), 0))
})

const grantOptions = computed(() => {
  const opts = grantStructure.value.map(g => ({
    value: Number(g.id),
    name: g.name,
    code: g.code,
    organization: g.organization || '—',
    searchText: `${g.name} ${g.code} ${g.organization || ''}`,
  }))
  for (const row of allocRows.value) {
    if (row.grant_id != null && row._grant_label && !opts.some(o => o.value === row.grant_id)) {
      opts.push({ value: row.grant_id, name: row._grant_label, code: '', organization: '—', searchText: row._grant_label })
    }
  }
  return opts
})

// ════════════════════════════════════════════════════════
// SHARED HELPERS
// ════════════════════════════════════════════════════════
function filterOption(input, option) {
  const label = (option.children?.[0]?.children || option.label || '').toString().toLowerCase()
  return label.includes(input.toLowerCase())
}

function showApiError(err, fallback) {
  const resp = err.response?.data
  const errors = resp?.errors
  if (Array.isArray(errors) && errors.length) {
    Modal.error({ title: resp.message || fallback, content: errors.join('\n') })
  } else if (errors && typeof errors === 'object') {
    const firstErr = Object.values(errors)[0]
    message.error(Array.isArray(firstErr) ? firstErr[0] : firstErr)
  } else {
    message.error(resp?.message || fallback)
  }
}

function allocationStatusColor(status) {
  if (status === 'active') return 'green'
  if (status === 'inactive') return 'orange'
  return 'default'
}

// ════════════════════════════════════════════════════════
// EMPLOYMENT: Dropdown Loading
// ════════════════════════════════════════════════════════
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

// ════════════════════════════════════════════════════════
// EMPLOYMENT: CRUD
// ════════════════════════════════════════════════════════
function resetEmpForm() {
  Object.assign(empForm, {
    department_id: undefined, section_department_id: undefined,
    position_id: undefined, site_id: undefined,
    start_date: null, probation_required: true,
    end_probation_date: null, pass_probation_date: null,
    pass_probation_salary: null, probation_salary: null,
    pay_method: undefined, health_welfare: false, pvd: false, saving_fund: false,
    study_loan: null, retroactive_salary: null,
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
      message.success('Employment created — you can now add funding allocations')
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
    content: 'Are you sure you want to delete this employment record? This will also affect funding allocations. This action cannot be undone.',
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

// ════════════════════════════════════════════════════════
// FUNDING: Grant Structure & Helpers
// ════════════════════════════════════════════════════════
const grantSearchMap = computed(() => {
  const m = new Map()
  for (const opt of grantOptions.value) m.set(opt.value, opt.searchText)
  return m
})

const grantStructureMap = computed(() => {
  const m = new Map()
  for (const g of grantStructure.value) m.set(Number(g.id), g)
  return m
})

function filterGrantOption(input, option) {
  return grantSearchMap.value.get(option.value)?.toLowerCase().includes(input.toLowerCase()) ?? false
}

function getGrantItems(grantId) {
  if (!grantId) return []
  return grantStructureMap.value.get(Number(grantId))?.grant_items || []
}

function getGrantItemOptions(grantId) {
  const items = getGrantItems(grantId)
  const opts = items.map(gi => ({
    value: Number(gi.id),
    label: gi.grant_position || gi.name || `Position ${gi.id}`,
  }))
  for (const row of allocRows.value) {
    if (Number(row.grant_id) === Number(grantId) && row.grant_item_id != null) {
      if (!opts.some(o => o.value === row.grant_item_id)) {
        opts.push({
          value: row.grant_item_id,
          label: row._position_label || `Position ${row.grant_item_id}`,
        })
      }
    }
  }
  return opts
}

function getRowBudgetLine(row) {
  if (!row.grant_id || !row.grant_item_id) return 'Auto'
  const items = getGrantItems(row.grant_id)
  const item = items.find(gi => Number(gi.id) === Number(row.grant_item_id))
  return item?.budgetline_code || 'Auto'
}

async function loadGrantStructureData() {
  if (grantStructure.value.length) return
  loadingGrantStructure.value = true
  try {
    const { data } = await fundingAllocationApi.grantStructure()
    grantStructure.value = data.data?.grants || data.grants || data.data || []
  } catch { /* silent */ }
  loadingGrantStructure.value = false
}

// ════════════════════════════════════════════════════════
// FUNDING: Row Management
// ════════════════════════════════════════════════════════
function makeAllocRow(existing) {
  allocRowKey++
  if (existing) {
    const gi = existing.grant_item
    const g = gi?.grant
    return {
      _key: `existing-${existing.id}`,
      _id: existing.id,
      grant_id: g?.id != null ? Number(g.id) : undefined,
      grant_item_id: existing.grant_item_id != null ? Number(existing.grant_item_id) : (gi?.id != null ? Number(gi.id) : undefined),
      _grant_label: g ? `${g.name} (${g.code})` : undefined,
      _position_label: gi?.grant_position || gi?.name || undefined,
      fte: existing.fte != null ? Math.round(Number(existing.fte) * 100) : null,
      previewAmount: existing.allocated_amount != null ? Number(existing.allocated_amount) : null,
      status: existing.status || 'active',
    }
  }
  return {
    _key: `new-${allocRowKey}`,
    _id: null,
    grant_id: undefined,
    grant_item_id: undefined,
    _grant_label: undefined,
    _position_label: undefined,
    fte: null,
    previewAmount: null,
    status: 'active',
  }
}

async function openManageAllocations() {
  await loadGrantStructureData()
  const allocs = props.employee?.employee_funding_allocations || []
  if (allocs.length) {
    allocRows.value = allocs.map(a => makeAllocRow(a))
    originalAllocIds = allocs.map(a => a.id)
  } else {
    allocRows.value = [makeAllocRow(null)]
    originalAllocIds = []
  }
  allocationModalVisible.value = true
}

function addAllocRow() {
  allocRows.value.push(makeAllocRow(null))
}

function removeAllocRow(index) {
  if (allocRows.value.length <= 1) {
    Modal.confirm({
      title: 'Remove all allocations?',
      content: 'This will delete all funding allocations for this employee.',
      okText: 'Remove',
      okType: 'danger',
      onOk: () => { allocRows.value.splice(index, 1) },
    })
    return
  }
  allocRows.value.splice(index, 1)
}

function onAllocGrantChange(row) {
  row.grant_item_id = undefined
  row._position_label = undefined
  row.previewAmount = null
}

function onAllocItemChange(row) {
  if (row.fte) fetchPreviewAmount(row)
}

async function onAllocFteChange(row) {
  if (row.fte && row.grant_item_id) {
    fetchPreviewAmount(row)
  } else {
    row.previewAmount = null
  }
}

async function fetchPreviewAmount(row) {
  if (!props.employee?.employment?.id || !row.fte) return
  try {
    const { data } = await fundingAllocationApi.calculatePreview({
      employment_id: props.employee.employment.id,
      fte: row.fte,
    })
    row.previewAmount = data.data?.allocated_amount ?? null
  } catch {
    const emp = props.employee.employment
    const salary = Number(emp.pass_probation_salary) || Number(emp.probation_salary) || 0
    row.previewAmount = salary ? Math.round(salary * (row.fte / 100) * 100) / 100 : null
  }
}

async function saveAllocations() {
  for (const row of allocRows.value) {
    if (!row.grant_item_id) return message.warning('Please select a Grant Position for all rows')
    if (!row.fte || row.fte <= 0) return message.warning('FTE must be greater than 0 for all rows')
  }

  savingAllocation.value = true
  try {
    const existingRows = allocRows.value.filter(r => r._id)
    const newRows = allocRows.value.filter(r => !r._id)
    const currentIds = existingRows.map(r => r._id)
    const deletedIds = originalAllocIds.filter(id => !currentIds.includes(id))

    await fundingAllocationApi.batchUpdate({
      employee_id: props.employee.id,
      employment_id: props.employee.employment.id,
      updates: existingRows.map(r => ({
        id: r._id,
        grant_item_id: r.grant_item_id,
        fte: r.fte,
        status: r.status,
      })),
      creates: newRows.map(r => ({
        grant_item_id: r.grant_item_id,
        fte: r.fte,
      })),
      deletes: deletedIds,
    })

    message.success('Funding allocations saved')
    allocationModalVisible.value = false
    emit('refresh')
  } catch (err) {
    showApiError(err, 'Failed to save allocations')
  }
  savingAllocation.value = false
}

// ════════════════════════════════════════════════════════
// AUTO-OPEN (Guided Create Flow)
// ════════════════════════════════════════════════════════
onMounted(() => {
  if (props.autoOpenEmployment && !props.employee.employment) {
    openAddEmployment()
  }
})
</script>

<style scoped>
/* ── Section headers ── */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 20px 0 12px;
  padding-bottom: 8px;
  border-bottom: 1.5px solid var(--color-border);
}
.section-header:first-child { margin-top: 0; }
.section-header .section-title {
  margin: 0;
  padding: 0;
  border: none;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 20px 0 12px;
  padding-bottom: 8px;
  border-bottom: 1.5px solid var(--color-border);
}
.section-title::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  flex-shrink: 0;
}
.section-title:first-child { margin-top: 0; }

/* ── Two-zone info grid ── */
.info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
@media (min-width: 768px) {
  .info-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
.info-grid > :deep(:nth-child(n+4)) {
  border-top: 1px solid var(--color-border-light);
}
.info-grid :deep(.info-value) {
  border-right: 0.5px solid var(--color-border-light);
}
.info-grid > :deep(:nth-child(3n) .info-value) {
  border-right: none;
}

.modal-form { margin-top: 8px; }
.form-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1.5px solid var(--color-border);
}
.form-section-title::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  flex-shrink: 0;
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
.probation-toggle-label.skip { color: #1677ff; }
.no-probation-note {
  font-size: 12px;
  color: #1677ff;
  background: #e6f4ff;
  border: 1px solid #91caff;
  border-radius: 6px;
  padding: 8px 12px;
  margin-top: 8px;
}

.resignation-link {
  margin-top: 8px;
}
.view-detail-link {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-accent, #2563eb);
  text-decoration: none;
}
.view-detail-link:hover {
  text-decoration: underline;
}

.section-divider {
  margin: 24px 0;
  border-top: 2px solid var(--color-border-light);
}

.fte-summary {
  font-size: 13px;
  color: var(--color-text-secondary);
}
.fte-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-left: 4px;
}
.cell-sub { font-size: 11.5px; color: var(--color-text-muted); font-family: 'JetBrains Mono', monospace; }

.alloc-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.alloc-edit-table :deep(.ant-table-cell) {
  padding: 6px 8px !important;
  vertical-align: middle;
}
.alloc-edit-table :deep(.ant-select-selector),
.alloc-edit-table :deep(.ant-input-number) {
  font-size: 13px;
}

.grant-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.grant-option-name {
  font-weight: 500;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.grant-option-org { flex-shrink: 0; margin: 0; }
.grant-option-code {
  font-size: 11.5px;
  color: var(--color-text-muted);
  font-family: 'JetBrains Mono', monospace;
}
</style>
