<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ pagination.total || 0 }} Total</a-tag>
      </div>
      <div class="filter-bar">
        <a-input
          v-model:value="search"
          placeholder="Search personnel actions..."
          allow-clear
          class="filter-input"
          style="width: 220px"
          @pressEnter="onSearchOrFilterChange"
          @clear="onSearchOrFilterChange"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-select
          v-model:value="filters.action_type"
          placeholder="Action Type"
          allow-clear
          class="filter-input"
          style="width: 180px"
          @change="onSearchOrFilterChange"
        >
          <a-select-option v-for="(label, key) in constants.action_types" :key="key" :value="key">
            {{ label }}
          </a-select-option>
        </a-select>
        <a-select
          v-model:value="filters.status"
          placeholder="Status"
          allow-clear
          class="filter-input"
          style="width: 160px"
          @change="onSearchOrFilterChange"
        >
          <a-select-option v-for="(label, key) in constants.statuses" :key="key" :value="key">
            {{ label }}
          </a-select-option>
        </a-select>
        <a-button v-if="selectedRowKeys.length > 0 && canDelete" danger @click="handleBulkDelete">
          Delete {{ selectedRowKeys.length }} Selected
        </a-button>
        <a-button v-if="canCreate" type="primary" @click="openCreate">
          <PlusOutlined /> New Action
        </a-button>
      </div>
    </div>

    <a-card :body-style="{ padding: 0 }">
      <a-table
        :columns="columns"
        :data-source="items"
        :loading="loading"
        :pagination="tablePagination"
        :row-key="(r) => r.id"
        :row-selection="canDelete ? { selectedRowKeys, onChange: (keys) => selectedRowKeys = keys } : undefined"
        @change="handleTableChange"
        :scroll="{ x: 'max-content' }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'reference'">
            <span class="cell-ref font-mono">{{ record.reference_number || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'employee'">
            <div class="cell-employee">
              <span class="cell-name">{{ employeeName(record) }}</span>
              <span class="cell-sub font-mono">{{ record.employment?.employee?.staff_id || '—' }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'action_type'">
            {{ constants.action_types?.[record.action_type] || record.action_type }}
          </template>
          <template v-else-if="column.key === 'effective_date'">
            {{ formatDate(record.effective_date) }}
          </template>
          <template v-else-if="column.key === 'approvals'">
            <div class="approval-dots">
              <a-tooltip title="Dept Head">
                <span class="dot" :class="record.dept_head_approved ? 'approved' : 'pending'" />
              </a-tooltip>
              <a-tooltip title="COO">
                <span class="dot" :class="record.coo_approved ? 'approved' : 'pending'" />
              </a-tooltip>
              <a-tooltip title="HR">
                <span class="dot" :class="record.hr_approved ? 'approved' : 'pending'" />
              </a-tooltip>
              <a-tooltip title="Accountant">
                <span class="dot" :class="record.accountant_approved ? 'approved' : 'pending'" />
              </a-tooltip>
            </div>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)" size="small">
              {{ constants.statuses?.[record.status] || record.status || '—' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button size="small" type="link" @click="openPdfPreview(record)">
                <EyeOutlined /> View
              </a-button>
              <a-button
                v-if="canUpdate"
                size="small"
                type="link"
                @click="openEdit(record)"
              >Edit</a-button>
              <a-button
                v-if="canDelete"
                size="small"
                type="link"
                danger
                @click="handleDelete(record)"
              >Delete</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Modal -->
    <a-modal
      v-model:open="formModalVisible"
      :title="editingItem ? 'Edit Personnel Action' : 'Personnel Action Form'"
      :footer="null"
      :width="'min(95vw, 800px)'"
      destroy-on-close
    >
      <a-form :model="form" layout="vertical" class="modal-form" @submit.prevent="handleSave">
        <!-- Employee Search -->
        <a-form-item label="Employee" required>
          <a-select
            v-model:value="selectedEmployeeId"
            show-search
            :filter-option="false"
            placeholder="Search by name or staff ID..."
            :disabled="!!editingItem"
            :loading="employeeSearching || lookingUp"
            :not-found-content="employeeSearching ? undefined : null"
            @search="handleEmployeeSearch"
            @change="handleEmployeeSelect"
          >
            <a-select-option v-for="emp in employeeOptions" :key="emp.id" :value="emp.id">
              {{ emp.first_name_en }} {{ emp.last_name_en || '' }}
              <span class="font-mono" style="color: var(--color-text-muted);">({{ emp.staff_id }})</span>
            </a-select-option>
          </a-select>
        </a-form-item>

        <!-- ── Section 1: Current Information ── -->
        <div v-if="currentInfo" class="section-block">
          <div class="section-title">Section 1: Current Information</div>
          <a-descriptions :column="{ xs: 1, sm: 2, md: 3 }" size="small" bordered>
            <a-descriptions-item label="Position">{{ currentInfo.position }}</a-descriptions-item>
            <a-descriptions-item label="Department">{{ currentInfo.department }}</a-descriptions-item>
            <a-descriptions-item label="Sub-Department">{{ currentInfo.sectionDepartment }}</a-descriptions-item>
            <a-descriptions-item label="Site">{{ currentInfo.site }}</a-descriptions-item>
            <a-descriptions-item label="Salary">{{ currentInfo.salary }}</a-descriptions-item>
            <a-descriptions-item label="Probation Salary">{{ currentInfo.probationSalary }}</a-descriptions-item>
            <a-descriptions-item label="Start Date">{{ currentInfo.employmentDate }}</a-descriptions-item>
          </a-descriptions>
        </div>

        <!-- ── Section 2: Action ── -->
        <div class="section-block">
          <div class="section-title">Section 2: Action</div>
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="Action Type" required>
                <a-select v-model:value="form.action_type" placeholder="Select action type" @change="onActionTypeChange">
                  <a-select-option v-for="(label, key) in constants.action_types" :key="key" :value="key">
                    {{ label }}
                  </a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="Effective Date" required>
                <a-date-picker
                  v-model:value="form.effective_date"
                  style="width: 100%"
                  format="DD MMM YYYY"
                  value-format="YYYY-MM-DD"
                />
              </a-form-item>
            </a-col>
          </a-row>
          <a-row v-if="form.action_type === 'transfer'" :gutter="16">
            <a-col :span="12">
              <a-form-item label="Transfer Subtype" required>
                <a-select v-model:value="form.action_subtype" placeholder="Select subtype">
                  <a-select-option v-for="(label, key) in constants.action_subtypes" :key="key" :value="key">
                    {{ label }}
                  </a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>
        </div>

        <!-- ── Section 3: New Information ── -->
        <div class="section-block">
          <div class="section-title">Section 3: New Information</div>
          <a-row :gutter="16">
            <a-col :xs="24" :sm="8">
              <a-form-item label="Site">
                <a-select
                  v-model:value="form.new_site_id"
                  placeholder="Select site"
                  allow-clear
                  show-search
                  :filter-option="filterOption"
                >
                  <a-select-option v-for="s in sites" :key="s.id" :value="s.id">{{ s.name }}</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="8">
              <a-form-item label="Department">
                <a-select
                  v-model:value="form.new_department_id"
                  placeholder="Select department"
                  allow-clear
                  show-search
                  :filter-option="filterOption"
                  @change="onDepartmentChange"
                >
                  <a-select-option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="8">
              <a-form-item label="Section Department">
                <a-select
                  v-model:value="form.new_section_department_id"
                  placeholder="Select section"
                  allow-clear
                  show-search
                  :filter-option="filterOption"
                >
                  <a-select-option v-for="sd in filteredSectionDepartments" :key="sd.id" :value="sd.id">{{ sd.name }}</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>
          <a-row :gutter="16">
            <a-col :xs="24" :sm="8">
              <a-form-item label="Position">
                <a-select
                  v-model:value="form.new_position_id"
                  placeholder="Select position"
                  allow-clear
                  show-search
                  :filter-option="filterOption"
                >
                  <a-select-option v-for="p in filteredPositions" :key="p.id" :value="p.id">{{ p.title }}</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="8">
              <a-form-item label="Salary">
                <a-input-number
                  v-model:value="form.new_salary"
                  placeholder="THB"
                  style="width: 100%"
                  :min="0"
                  :precision="2"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="8">
              <a-form-item label="Probation Salary">
                <a-input-number
                  v-model:value="form.new_probation_salary"
                  placeholder="THB"
                  style="width: 100%"
                  :min="0"
                  :precision="2"
                />
              </a-form-item>
            </a-col>
          </a-row>
          <a-row :gutter="16">
            <a-col :xs="24" :sm="8">
              <a-form-item label="Work Schedule">
                <a-input v-model:value="form.new_work_schedule" placeholder="e.g. Full Time" />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="8">
              <a-form-item label="Pay Plan">
                <a-input v-model:value="form.new_pay_plan" placeholder="Pay plan" />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="8">
              <a-form-item label="Phone Ext">
                <a-input v-model:value="form.new_phone_ext" placeholder="Phone ext" />
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item label="Acknowledged By (Name and Signature from paper form)">
            <a-input v-model:value="form.acknowledged_by" placeholder="Name from paper form" />
          </a-form-item>
        </div>

        <!-- ── Section 4: Comments ── -->
        <div class="section-block">
          <div class="section-title">Section 4: Comments</div>
          <a-form-item label="Comments" style="margin-bottom: 0">
            <a-textarea v-model:value="form.comments" placeholder="Comments or details of change" :rows="3" />
          </a-form-item>
        </div>

        <!-- ── Approved By ── -->
        <div class="section-block">
          <div class="section-title">Approved By</div>
          <div class="approval-form-grid">
            <div v-for="a in approvalFields" :key="a.key" class="approval-form-item">
              <span class="approval-form-label">{{ a.label }}</span>
              <span v-if="a.labelTh" class="approval-form-label-th">{{ a.labelTh }}</span>
              <a-switch
                v-model:checked="form[a.key]"
                checked-children="Yes"
                un-checked-children="No"
              />
              <a-date-picker
                v-if="form[a.key]"
                v-model:value="form[a.dateKey]"
                size="small"
                format="DD MMM YYYY"
                value-format="YYYY-MM-DD"
                placeholder="Approval date"
                style="width: 100%"
              />
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <a-button @click="formModalVisible = false">Cancel</a-button>
          <a-button v-if="!editingItem" :loading="savingAnother" :disabled="savingMain" @click="handleSaveAndAddAnother">Save &amp; Add Another</a-button>
          <a-button type="primary" html-type="submit" :loading="savingMain" :disabled="savingAnother">{{ editingItem ? 'Update' : 'Save' }}</a-button>
        </div>
      </a-form>
    </a-modal>

    <!-- PDF Preview Modal -->
    <a-modal
      v-model:open="pdfPreviewVisible"
      :footer="null"
      :width="'min(95vw, 900px)'"
      :body-style="{ padding: 0 }"
      destroy-on-close
      centered
      wrap-class-name="pdf-preview-modal"
    >
      <div class="pdf-viewer">
        <div class="pdf-toolbar">
          <div class="pdf-toolbar-info">
            <strong>{{ detailItem?.reference_number || 'Personnel Action' }}</strong>
            <span v-if="detailItem" style="margin-left: 8px; color: var(--color-text-muted);">
              {{ employeeName(detailItem) }}
            </span>
          </div>
          <div class="pdf-toolbar-actions">
            <a-button type="primary" size="small" :loading="exportingPdf" @click="handleDownloadPdf">
              <DownloadOutlined /> PA Form
            </a-button>
            <a-button size="small" :loading="exportingAmendment" @click="handleDownloadAmendment">
              <DownloadOutlined /> Amendment
            </a-button>
            <a-button size="small" @click="pdfPreviewVisible = false">Close</a-button>
          </div>
        </div>
        <div class="pdf-frame-wrap">
          <div v-if="pdfLoading" class="pdf-loading">
            <a-spin tip="Loading PDF..." />
          </div>
          <iframe v-else-if="pdfUrl" :src="pdfUrl" class="pdf-iframe" />
          <a-empty v-else description="Failed to load PDF" style="padding: 40px 0;" />
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, onBeforeUnmount, createVNode } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, FilePdfOutlined, EyeOutlined, DownloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { useAbortController } from '@/composables/useAbortController'
import { useSaveAnother } from '@/composables/useSaveAnother'
import { personnelActionApi, employeeApi, employmentApi, optionsApi } from '@/api'
import { formatCurrency, formatNumber, formatDate } from '@/utils/formatters'
import { cleanParams } from '@/utils/helpers'
import { PAGINATION_DEFAULTS } from '@/constants/config'

const appStore = useAppStore()
const authStore = useAuthStore()
const getSignal = useAbortController()

// ======================== State ========================
const items = ref([])
const loading = ref(false)
const { savingMain, savingAnother, submitMain, submitAnother } = useSaveAnother({
  refresh: fetchItems, reset: resetForm,
  onError: (err) => showApiError(err, 'Failed to save personnel action'),
})
const search = ref('')
const filters = reactive({ action_type: undefined, status: undefined })
const pagination = reactive({ current_page: 1, per_page: 20, total: 0 })

// Constants from backend
const constants = reactive({
  action_types: {},
  action_subtypes: {},
  statuses: {},
})

// Dropdown options
const departments = ref([])
const positions = ref([])
const sites = ref([])
const sectionDepartments = ref([])

// Form modal
const formModalVisible = ref(false)
const editingItem = ref(null)
const selectedEmployeeId = ref(undefined)
const employeeOptions = ref([])
const employeeSearching = ref(false)
let employeeSearchTimer = null
const lookedUpEmployment = ref(null)
const lookingUp = ref(false)

const form = reactive({
  employment_id: null,
  action_type: undefined,
  action_subtype: undefined,
  effective_date: null,
  acknowledged_by: '',
  new_department_id: undefined,
  new_position_id: undefined,
  new_site_id: undefined,
  new_section_department_id: undefined,
  new_salary: null,
  new_probation_salary: null,
  new_work_schedule: '',
  new_pay_plan: '',
  new_phone_ext: '',
  comments: '',
  dept_head_approved: false,
  coo_approved: false,
  hr_approved: false,
  accountant_approved: false,
  dept_head_approved_date: null,
  coo_approved_date: null,
  hr_approved_date: null,
  accountant_approved_date: null,
})

// Selection
const selectedRowKeys = ref([])

// PDF preview modal
const pdfPreviewVisible = ref(false)
const pdfLoading = ref(false)
const pdfUrl = ref(null)
const detailItem = ref(null)
const exportingPdf = ref(false)
const exportingAmendment = ref(false)

// ======================== Constants ========================
const approvalFields = [
  { key: 'dept_head_approved', dateKey: 'dept_head_approved_date', label: 'Dept. Head / Supervisor', labelTh: 'หัวหน้าแผนก', type: 'dept_head' },
  { key: 'coo_approved', dateKey: 'coo_approved_date', label: 'COO of SMRU', labelTh: 'ผู้จัดการหน่วยวิจัยมาลาเรียโซโกล', type: 'coo' },
  { key: 'hr_approved', dateKey: 'hr_approved_date', label: 'Human Resources Manager', labelTh: 'ผู้จัดการฝ่ายบุคคล', type: 'hr' },
  { key: 'accountant_approved', dateKey: 'accountant_approved_date', label: 'Accountant Manager', labelTh: '', type: 'accountant' },
]

const columns = [
  { title: 'Reference', key: 'reference', width: 150 },
  { title: 'Employee', key: 'employee', width: 200 },
  { title: 'Action Type', key: 'action_type', width: 150 },
  { title: 'Effective Date', key: 'effective_date', width: 130 },
  { title: 'Approvals', key: 'approvals', width: 120, align: 'center' },
  { title: 'Status', key: 'status', width: 140, align: 'center' },
  { title: '', key: 'actions', width: 180, align: 'right' },
]

const changeColumns = [
  { title: 'Field', dataIndex: 'field', width: 120 },
  { title: 'Current', key: 'current', width: 200 },
  { title: 'New', key: 'new', width: 200 },
]

// ======================== Permissions ========================
const canCreate = computed(() => authStore.canCreate('personnel_actions'))
const canUpdate = computed(() => authStore.canUpdate('personnel_actions'))
const canDelete = computed(() => authStore.canDelete('personnel_actions'))

// ======================== Computed ========================
const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showSizeChanger: true,
  showTotal: (total) => `${total} actions`,
  pageSizeOptions: PAGINATION_DEFAULTS.pageSizeOptions,
}))

const filteredPositions = computed(() => {
  if (!form.new_department_id) return positions.value
  const deptId = Number(form.new_department_id)
  return positions.value.filter((p) => Number(p.department_id) === deptId)
})

const filteredSectionDepartments = computed(() => {
  if (!form.new_department_id) return sectionDepartments.value
  const deptId = Number(form.new_department_id)
  return sectionDepartments.value.filter((sd) => Number(sd.department_id) === deptId)
})

const currentInfo = computed(() => {
  if (editingItem.value) {
    const r = editingItem.value
    return {
      position: r.current_position?.title || '—',
      department: r.current_department?.name || '—',
      sectionDepartment: r.current_section_department?.name || '—',
      site: r.current_site?.name || '—',
      salary: formatCurrency(r.current_salary),
      probationSalary: formatCurrency(r.current_probation_salary),
      employmentDate: formatDate(r.current_employment_date),
    }
  }
  if (lookedUpEmployment.value) {
    const emp = lookedUpEmployment.value
    return {
      position: emp.position?.title || '—',
      department: emp.department?.name || '—',
      sectionDepartment: emp.section_department?.name || emp.sectionDepartment?.name || '—',
      site: emp.site?.name || '—',
      salary: formatCurrency(emp.pass_probation_salary),
      probationSalary: formatCurrency(emp.probation_salary),
      employmentDate: formatDate(emp.start_date),
    }
  }
  return null
})

const changeRows = computed(() => {
  if (!detailItem.value) return []
  const d = detailItem.value
  const rows = []

  if (d.current_department || d.new_department) {
    rows.push({
      field: 'Department',
      current: d.current_department?.name || '—',
      new: d.new_department?.name || '—',
    })
  }
  if (d.current_section_department || d.new_section_department) {
    rows.push({
      field: 'Sub-Department',
      current: d.current_section_department?.name || '—',
      new: d.new_section_department?.name || '—',
    })
  }
  if (d.current_position || d.new_position) {
    rows.push({
      field: 'Position',
      current: d.current_position?.title || '—',
      new: d.new_position?.title || '—',
    })
  }
  if (d.current_site || d.new_site) {
    rows.push({
      field: 'Site',
      current: d.current_site?.name || '—',
      new: d.new_site?.name || '—',
    })
  }
  if (d.current_salary != null || d.new_salary != null) {
    rows.push({
      field: 'Salary',
      current: formatNumber(d.current_salary),
      new: formatNumber(d.new_salary),
    })
  }
  if (d.current_probation_salary != null || d.new_probation_salary != null) {
    rows.push({
      field: 'Probation Salary',
      current: formatNumber(d.current_probation_salary),
      new: formatNumber(d.new_probation_salary),
    })
  }
  if (d.new_work_schedule) rows.push({ field: 'Work Schedule', current: '—', new: d.new_work_schedule })
  if (d.new_report_to) rows.push({ field: 'Report To', current: '—', new: d.new_report_to })
  if (d.new_pay_plan) rows.push({ field: 'Pay Plan', current: '—', new: d.new_pay_plan })
  if (d.new_phone_ext) rows.push({ field: 'Phone Ext', current: '—', new: d.new_phone_ext })
  if (d.new_email) rows.push({ field: 'Email', current: '—', new: d.new_email })

  return rows
})

// ======================== Helpers ========================
function statusColor(status) {
  const map = { pending: 'orange', partial_approved: 'blue', fully_approved: 'green', implemented: 'default' }
  return map[status] || 'default'
}

function employeeName(record) {
  const emp = record.employment?.employee
  if (!emp) return '—'
  return `${emp.first_name_en} ${emp.last_name_en || ''}`.trim()
}

function filterOption(input, option) {
  const label = option.children?.[0]?.children || option.label || ''
  return String(label).toLowerCase().includes(input.toLowerCase())
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

// ======================== Data Loading ========================
async function fetchItems() {
  loading.value = true
  try {
    const params = {
      page: pagination.current_page,
      per_page: pagination.per_page,
      ...(search.value && { search: search.value }),
      ...(filters.action_type && { action_type: filters.action_type }),
      ...(filters.status && { status: filters.status }),
    }
    const { data } = await personnelActionApi.list(params, { signal: getSignal() })
    items.value = data.data?.data || data.data || []
    const pag = data.data?.meta || data.pagination || data.data
    if (pag) {
      pagination.current_page = pag.current_page ?? pagination.current_page
      pagination.per_page = pag.per_page ?? pagination.per_page
      pagination.total = pag.total ?? pagination.total
    }
  } catch (err) {
    if (err.name !== 'CanceledError') message.error('Failed to load personnel actions')
  }
  loading.value = false
}

async function loadConstants() {
  try {
    const { data } = await personnelActionApi.constants()
    Object.assign(constants, data.data || {})
  } catch {
    // silent
  }
}

async function loadDropdowns() {
  try {
    const [deptRes, posRes, siteRes, secDeptRes] = await Promise.all([
      optionsApi.departments(),
      optionsApi.positions(),
      optionsApi.sites(),
      optionsApi.sectionDepartments(),
    ])
    departments.value = deptRes.data?.data || deptRes.data || []
    positions.value = posRes.data?.data || posRes.data || []
    sites.value = siteRes.data?.data || siteRes.data || []
    sectionDepartments.value = secDeptRes.data?.data || secDeptRes.data || []
  } catch {
    // silent
  }
}

// ======================== Table ========================
function onSearchOrFilterChange() {
  pagination.current_page = 1
  fetchItems()
}

function handleTableChange(pag) {
  pagination.current_page = pag.current
  pagination.per_page = pag.pageSize
  fetchItems()
}

// ======================== Form Modal ========================
function resetForm() {
  Object.assign(form, {
    employment_id: null,
    action_type: undefined,
    action_subtype: undefined,
    effective_date: null,
    acknowledged_by: '',
    new_department_id: undefined,
    new_position_id: undefined,
    new_site_id: undefined,
    new_section_department_id: undefined,
    new_salary: null,
    new_probation_salary: null,
    new_work_schedule: '',
    new_pay_plan: '',
    new_phone_ext: '',
    comments: '',
    dept_head_approved: false,
    coo_approved: false,
    hr_approved: false,
    accountant_approved: false,
    dept_head_approved_date: null,
    coo_approved_date: null,
    hr_approved_date: null,
    accountant_approved_date: null,
  })
  selectedEmployeeId.value = undefined
  employeeOptions.value = []
  lookedUpEmployment.value = null
}

function openCreate() {
  editingItem.value = null
  resetForm()
  formModalVisible.value = true
}

function openEdit(record) {
  editingItem.value = record
  Object.assign(form, {
    employment_id: record.employment_id,
    action_type: record.action_type,
    action_subtype: record.action_subtype || undefined,
    effective_date: record.effective_date,
    acknowledged_by: record.acknowledged_by || '',
    new_department_id: record.new_department_id || undefined,
    new_position_id: record.new_position_id || undefined,
    new_site_id: record.new_site_id || undefined,
    new_section_department_id: record.new_section_department_id || undefined,
    new_salary: record.new_salary ? Number(record.new_salary) : null,
    new_probation_salary: record.new_probation_salary ? Number(record.new_probation_salary) : null,
    new_work_schedule: record.new_work_schedule || '',
    new_pay_plan: record.new_pay_plan || '',
    new_phone_ext: record.new_phone_ext || '',
    comments: record.comments || '',
    dept_head_approved: !!record.dept_head_approved,
    coo_approved: !!record.coo_approved,
    hr_approved: !!record.hr_approved,
    accountant_approved: !!record.accountant_approved,
    dept_head_approved_date: record.dept_head_approved_date || null,
    coo_approved_date: record.coo_approved_date || null,
    hr_approved_date: record.hr_approved_date || null,
    accountant_approved_date: record.accountant_approved_date || null,
  })
  // Pre-populate employee option so the select shows the name
  if (record.employment?.employee) {
    const emp = record.employment.employee
    employeeOptions.value = [{ id: emp.id, staff_id: emp.staff_id, first_name_en: emp.first_name_en, last_name_en: emp.last_name_en }]
    selectedEmployeeId.value = emp.id
  }
  lookedUpEmployment.value = null
  formModalVisible.value = true
}

function handleEmployeeSearch(val) {
  if (employeeSearchTimer) clearTimeout(employeeSearchTimer)
  if (!val || val.length < 2) {
    employeeOptions.value = []
    return
  }
  employeeSearching.value = true
  employeeSearchTimer = setTimeout(async () => {
    try {
      const { data } = await employeeApi.list({ search: val, per_page: 10 })
      employeeOptions.value = data.data?.data || data.data || []
    } catch { /* ignore */ }
    employeeSearching.value = false
  }, 300)
}

async function handleEmployeeSelect(employeeId) {
  if (!employeeId) {
    lookedUpEmployment.value = null
    form.employment_id = null
    return
  }
  const emp = employeeOptions.value.find((e) => e.id === employeeId)
  if (!emp?.staff_id) return

  lookingUp.value = true
  try {
    const { data } = await employmentApi.searchByStaffId(emp.staff_id)
    const records = Array.isArray(data.data) ? data.data : data.data ? [data.data] : []
    const employment = records[0]
    if (employment?.id) {
      lookedUpEmployment.value = employment
      form.employment_id = employment.id
    } else {
      message.warning(`${emp.first_name_en} has no employment records. Please create an employment record first.`)
      lookedUpEmployment.value = null
      form.employment_id = null
    }
  } catch {
    message.error('Failed to lookup employment record')
    lookedUpEmployment.value = null
    form.employment_id = null
  }
  lookingUp.value = false
}

function onActionTypeChange(val) {
  if (val !== 'transfer') form.action_subtype = undefined
}

function onDepartmentChange() {
  form.new_position_id = undefined
  form.new_section_department_id = undefined
}

function validateForm() {
  if (!form.employment_id) { message.warning('Please select an employee first'); return false }
  if (!form.action_type) { message.warning('Action type is required'); return false }
  if (!form.effective_date) { message.warning('Effective date is required'); return false }
  if (form.action_type === 'transfer' && !form.action_subtype) { message.warning('Transfer subtype is required'); return false }
  if (form.action_type === 'transfer' && !form.new_department_id && !form.new_site_id) { message.warning('Department or site is required for transfers'); return false }
  if (['promotion', 'demotion'].includes(form.action_type) && !form.new_position_id) { message.warning('New position is required for this action type'); return false }
  if (['fiscal_increment', 're_evaluated_pay'].includes(form.action_type) && !form.new_salary) { message.warning('New salary is required for salary adjustments'); return false }
  return true
}

async function handleSave() {
  if (!validateForm()) return
  await submitMain(async () => {
    const payload = cleanParams({ ...form })
    if (editingItem.value) {
      await personnelActionApi.update(editingItem.value.id, payload)
      message.success('Personnel action updated')
    } else {
      await personnelActionApi.store(payload)
      message.success('Personnel action created')
    }
    formModalVisible.value = false
  })
}

async function handleSaveAndAddAnother() {
  if (!validateForm()) return
  await submitAnother(async () => {
    await personnelActionApi.store(cleanParams({ ...form }))
    message.success('Personnel action created — ready for next entry')
  })
}

// ======================== PDF Preview ========================
async function openPdfPreview(record) {
  detailItem.value = { ...record }
  pdfUrl.value = null
  pdfLoading.value = true
  pdfPreviewVisible.value = true
  try {
    const { data } = await personnelActionApi.exportPdf(record.id)
    pdfUrl.value = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
  } catch {
    message.error('Failed to load PDF')
  }
  pdfLoading.value = false
}

function closePdfPreview() {
  if (pdfUrl.value) {
    window.URL.revokeObjectURL(pdfUrl.value)
    pdfUrl.value = null
  }
  detailItem.value = null
}

watch(pdfPreviewVisible, (val) => {
  if (!val) closePdfPreview()
})

onBeforeUnmount(() => {
  if (pdfUrl.value) window.URL.revokeObjectURL(pdfUrl.value)
})

async function handleDownloadPdf() {
  if (!detailItem.value?.id) return
  exportingPdf.value = true
  try {
    const { data } = await personnelActionApi.exportPdf(detailItem.value.id)
    const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `personnel-action-${detailItem.value.reference_number || detailItem.value.id}.pdf`
    link.click()
    window.URL.revokeObjectURL(url)
  } catch (err) {
    showApiError(err, 'Failed to export PDF')
  }
  exportingPdf.value = false
}

async function handleDownloadAmendment() {
  if (!detailItem.value?.id) return
  exportingAmendment.value = true
  try {
    const { data } = await personnelActionApi.amendmentLetter(detailItem.value.id)
    const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `amendment-contract-${detailItem.value.reference_number || detailItem.value.id}.pdf`
    link.click()
    window.URL.revokeObjectURL(url)
  } catch (err) {
    showApiError(err, 'Failed to generate amendment letter')
  }
  exportingAmendment.value = false
}

// ======================== Delete ========================
function handleDelete(record) {
  Modal.confirm({
    title: 'Delete Personnel Action',
    content: `Are you sure you want to delete ${record.reference_number || 'this action'}?`,
    okType: 'danger',
    onOk: async () => {
      try {
        await personnelActionApi.destroy(record.id)
        message.success('Personnel action deleted')
        selectedRowKeys.value = []
        fetchItems()
      } catch (err) {
        showApiError(err, 'Failed to delete')
      }
    },
  })
}

function handleBulkDelete() {
  Modal.confirm({
    title: 'Delete Selected Records',
    icon: createVNode(ExclamationCircleOutlined),
    content: `Are you sure you want to delete ${selectedRowKeys.value.length} selected record(s)? This action cannot be undone.`,
    okText: 'Delete',
    okType: 'danger',
    cancelText: 'Cancel',
    centered: true,
    async onOk() {
      try {
        await personnelActionApi.destroyBatch(selectedRowKeys.value)
        message.success(`${selectedRowKeys.value.length} record(s) deleted successfully`)
        selectedRowKeys.value = []
        fetchItems()
      } catch (err) {
        showApiError(err, 'Failed to delete records')
      }
    },
  })
}

// ======================== Init ========================
onMounted(() => {
  appStore.setPageMeta('Personnel Actions')
  loadConstants()
  loadDropdowns()
  fetchItems()
})

onUnmounted(() => {
  if (employeeSearchTimer) clearTimeout(employeeSearchTimer)
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
.page-header-stats { display: flex; gap: 6px; }

.cell-ref { font-size: 12.5px; }
.cell-employee { display: flex; flex-direction: column; }
.cell-name { font-weight: 600; font-size: 13.5px; }
.cell-sub { font-size: 12px; color: var(--color-text-muted); }

/* Approval dots */
.approval-dots {
  display: flex;
  gap: 5px;
  justify-content: center;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}
.dot.approved { background: var(--color-success, #52c41a); }
.dot.pending { background: var(--color-border, #d9d9d9); }

/* Modal form */
.modal-form { margin-top: 16px; }

/* Section blocks — mirrors paper form sections */
.section-block {
  margin-top: 20px;
  padding: 16px;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle, #fafafa);
}
.section-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border-light);
}
.section-block :deep(.ant-form-item) {
  margin-bottom: 12px;
}

/* Approval form grid (2x2 like paper form signature blocks) */
.approval-form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
@media (max-width: 480px) {
  .approval-form-grid { grid-template-columns: 1fr; }
}
.approval-form-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 12px;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface, #fff);
}
.approval-form-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-align: center;
}
.approval-form-label-th {
  font-size: 11px;
  color: var(--color-text-muted);
  text-align: center;
  margin-top: -4px;
}

/* Detail modal */
.detail-descriptions { margin-top: 16px; }
.detail-comments { margin-top: 16px; }
.detail-comments p { margin: 4px 0 0; color: var(--color-text-secondary); }

.change-current { color: var(--color-text-muted); }
.change-new { font-weight: 600; color: var(--color-primary); }

/* Approval grid */
.approval-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
@media (min-width: 640px) {
  .approval-grid { grid-template-columns: repeat(2, 1fr); }
}
.approval-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
}
.approval-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-align: center;
}
.approval-label-th {
  font-size: 10px;
  color: var(--color-text-muted);
  text-align: center;
  margin-top: -2px;
}
.approval-date {
  font-size: 11px;
  color: var(--color-text-muted);
  font-family: 'SF Mono', 'Consolas', monospace;
}

/* PDF Preview */
.pdf-viewer {
  display: flex;
  flex-direction: column;
  height: 78vh;
}
.pdf-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--color-border-light, #eee);
  background: var(--color-bg-surface, #fff);
}
.pdf-toolbar-info {
  font-size: 14px;
}
.pdf-toolbar-actions {
  display: flex;
  gap: 8px;
}
.pdf-frame-wrap {
  flex: 1;
  min-height: 0;
  position: relative;
}
.pdf-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.pdf-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>

<style>
/* Unscoped: override Ant modal chrome for PDF preview */
.pdf-preview-modal .ant-modal-content {
  padding: 0 !important;
  overflow: hidden !important;
}
.pdf-preview-modal .ant-modal-body {
  padding: 0 !important;
}
.pdf-preview-modal .ant-modal-header {
  display: none !important;
}
.pdf-preview-modal .ant-modal-close {
  display: none !important;
}
</style>
