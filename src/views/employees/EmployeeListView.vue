<template>
  <div class="page-container">
    <!-- Quick Stats -->
    <div class="stats-grid">
      <div class="stat-card" v-for="stat in quickStats" :key="stat.label">
        <div :class="['stat-icon', stat.theme]">
          <component :is="stat.icon" />
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stat.value }}</span>
          <span class="stat-label">{{ stat.label }}</span>
        </div>
      </div>
    </div>

    <!-- Page header -->
    <div class="page-header">
      <div>
        <div class="page-header-stats" v-if="statistics">
          <a-tag color="green">{{ statistics.active || 0 }} Active</a-tag>
          <a-tag color="default">{{ pagination.total || 0 }} Total</a-tag>
        </div>
      </div>
      <div class="filter-bar">
        <a-input
          v-model:value="search"
          placeholder="Search by name, staff ID..."
          allow-clear
          class="filter-input"
          style="width: 260px"
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
          style="width: 140px"
          @change="onSearchOrFilterChange"
        >
          <a-select-option v-for="org in ORG_OPTIONS" :key="org.code" :value="org.code">{{ org.label }}</a-select-option>
        </a-select>
        <a-select
          v-model:value="filters.status"
          placeholder="Status"
          allow-clear
          class="filter-input"
          style="width: 160px"
          @change="onSearchOrFilterChange"
        >
          <a-select-option v-for="s in EMPLOYEE_STATUSES" :key="s.value" :value="s.value">{{ s.value }}</a-select-option>
        </a-select>
        <a-button v-if="selectedRowKeys.length > 0 && authStore.canEdit('employees')" danger @click="handleBulkDelete">
          Delete {{ selectedRowKeys.length }} Selected
        </a-button>
        <a-button v-if="authStore.canEdit('employees')" type="primary" @click="router.push({ name: 'employee-new' })">
          <PlusOutlined /> Add Employee
        </a-button>
      </div>
    </div>

    <!-- Table (desktop) -->
    <a-card :body-style="{ padding: 0 }" class="hidden-mobile">
      <a-table
        :columns="columns"
        :data-source="employees"
        :loading="loading"
        :pagination="tablePagination"
        :row-key="(r) => r.id"
        :row-selection="authStore.canEdit('employees') ? { selectedRowKeys, onChange: (keys) => selectedRowKeys = keys } : undefined"
        :row-class-name="(record) => record.is_resigned ? 'row-resigned' : ''"
        :scroll="{ x: 'max-content', y: 600 }"
        :virtual="true"
        @change="handleTableChange"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'organization'">
            <a-tag :color="getOrgColor(record.organization)" size="small">
              {{ record.organization || '—' }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'staff_id'">
            <router-link :to="{ name: 'employee-detail', params: { id: record.id } }" class="cell-link font-mono">
              {{ record.staff_id || '—' }}
            </router-link>
          </template>

          <template v-else-if="column.key === 'initial'">
            {{ record.initial_en || '—' }}
          </template>

          <template v-else-if="column.key === 'first_name'">
            <router-link :to="{ name: 'employee-detail', params: { id: record.id } }" class="employee-name-cell">
              <a-avatar :size="28" :style="{ backgroundColor: getAvatarColor(record.staff_id), fontSize: '11px', fontWeight: 600 }">
                {{ getInitials(record) }}
              </a-avatar>
              <span class="cell-name">{{ record.first_name_en || '—' }}</span>
            </router-link>
          </template>

          <template v-else-if="column.key === 'last_name'">
            <span class="cell-name">{{ record.last_name_en || '—' }}</span>
          </template>

          <template v-else-if="column.key === 'gender'">
            {{ genderLabel(record.gender) }}
          </template>

          <template v-else-if="column.key === 'dob'">
            {{ formatDate(record.date_of_birth) }}
          </template>

          <template v-else-if="column.key === 'age'">
            {{ calcAge(record.date_of_birth) }}
          </template>

          <template v-else-if="column.key === 'department'">
            {{ record.employment?.department?.name || '—' }}
          </template>

          <template v-else-if="column.key === 'position'">
            {{ record.employment?.position?.title || '—' }}
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="STATUS_COLOR_MAP[record.status] || 'default'" size="small">
              {{ record.status || '—' }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'id_type'">
            {{ record.identification_type || '—' }}
          </template>

          <template v-else-if="column.key === 'id_number'">
            <span class="font-mono">{{ record.identification_number || '—' }}</span>
          </template>

          <template v-else-if="column.key === 'ssn'">
            <span class="font-mono">{{ record.social_security_number || '—' }}</span>
          </template>

          <template v-else-if="column.key === 'tax_no'">
            <span class="font-mono">{{ record.tax_number || '—' }}</span>
          </template>

          <template v-else-if="column.key === 'mobile'">
            <span class="font-mono">{{ record.mobile_phone || '—' }}</span>
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button size="small" type="link" @click="openView(record)">View</a-button>
              <a-button v-if="authStore.canEdit('employees')" size="small" type="link" danger @click="handleDelete(record)">Delete</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Mobile card list -->
    <div class="visible-mobile">
      <a-spin :spinning="loading">
        <div class="mobile-card-list">
          <router-link
            v-for="record in employees"
            :key="record.id"
            :to="{ name: 'employee-detail', params: { id: record.id } }"
            class="mobile-employee-card"
            :class="{ 'mobile-card-resigned': record.is_resigned }"
          >
            <a-avatar :size="40" :style="{ backgroundColor: getAvatarColor(record.staff_id), fontSize: '14px', fontWeight: 600, flexShrink: 0 }">
              {{ getInitials(record) }}
            </a-avatar>
            <div class="mobile-card-body">
              <div class="cell-name">{{ record.initial_en ? record.initial_en + ' ' : '' }}{{ record.first_name_en }} {{ record.last_name_en }}</div>
              <div class="cell-staff-id font-mono">{{ record.staff_id }}</div>
              <div class="mobile-card-meta">{{ record.employment?.department?.name || '—' }} · {{ record.employment?.position?.title || '—' }}</div>
              <div class="mobile-card-tags">
                <a-tag :color="getOrgColor(record.organization)" size="small">{{ record.organization || '—' }}</a-tag>
                <a-tag :color="STATUS_COLOR_MAP[record.status] || 'default'" size="small">{{ record.status || '—' }}</a-tag>
              </div>
            </div>
          </router-link>
        </div>
        <div v-if="!loading && employees.length" class="mobile-pagination">
          <a-pagination
            :current="pagination.current_page"
            :page-size="pagination.per_page"
            :total="pagination.total"
            size="small"
            show-size-changer
            :page-size-options="['10', '20', '50', '100']"
            @change="handleMobilePageChange"
            @showSizeChange="handleMobilePageSizeChange"
          />
        </div>
      </a-spin>
    </div>

    <!-- Employee Record View Modal -->
    <a-modal
      v-model:open="viewModalVisible"
      :footer="null"
      :width="'min(95vw, 920px)'"
      :body-style="{ padding: 0, background: 'transparent' }"
      :closable="false"
      :mask-closable="true"
      wrap-class-name="record-view-modal"
      centered
    >
      <div v-if="viewLoading" class="view-loading-state">
        <a-spin tip="Loading record..." />
      </div>
      <div v-else-if="viewEmployee" class="view-modal-wrap">
        <button class="view-close-btn" @click="viewModalVisible = false" aria-label="Close">
          <i class="ti ti-x"></i>
        </button>
        <RecordView
          :org="viewOrgConfig"
          :title="viewDisplayName"
          :ref-id="viewEmployee.staff_id"
          icon="user"
          badge="Employee Record"
          :status="viewStatusKey"
          :status-label="viewEmployee.status || 'Active'"
          :status-meta="viewStatusMeta"
          :sections="viewSections"
          @print="handleViewPrint"
          @edit="openEditFromView"
        />
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, createVNode, markRaw } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { employeeApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'
import { formatDate, formatCurrency, genderLabel, calcAge, fmtFte } from '@/utils/formatters'
import { ORGANIZATIONS, ORG_OPTIONS, getOrgColor, ORG_RECORD_VIEW_CONFIG } from '@/constants/organizations'
import { EMPLOYEE_STATUSES, STATUS_COLOR_MAP } from '@/constants/employeeStatuses'
import {
  SearchOutlined, PlusOutlined, ExclamationCircleOutlined,
  TeamOutlined, LogoutOutlined, UserAddOutlined,
} from '@ant-design/icons-vue'
import RecordView from '@/components/common/RecordView.vue'

const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()
const getSignal = useAbortController()

const employees = ref([])
const loading = ref(false)
const search = ref('')
const statistics = ref(null)
const filters = reactive({ organization: undefined, status: undefined })
const pagination = reactive({ current_page: 1, per_page: 20, total: 0, last_page: 1 })
const selectedRowKeys = ref([])

const quickStats = computed(() => {
  const s = statistics.value
  const org = s?.organizationCount || {}
  return [
    { label: `${ORGANIZATIONS.SMRU.label} Employees`, value: org.SMRU_count ?? '—', icon: markRaw(TeamOutlined), theme: 'stat-info' },
    { label: `${ORGANIZATIONS.BHF.label} Employees`, value: org.BHF_count ?? '—', icon: markRaw(TeamOutlined), theme: 'stat-success' },
    { label: 'New Joiners', value: s?.newJoinerCount ?? '—', icon: markRaw(UserAddOutlined), theme: 'stat-warning' },
    { label: 'Resigned', value: s?.resignedCount ?? '—', icon: markRaw(LogoutOutlined), theme: 'stat-danger' },
  ]
})

const sortField = ref(null)
const sortOrder = ref(null)

const sortFieldMap = {
  organization: 'organization',
  staff_id: 'staff_id',
  first_name: 'first_name_en',
  last_name: 'last_name_en',
  gender: 'gender',
  dob: 'date_of_birth',
  age: 'age',
  status: 'status',
  id_type: 'identification_type',
}

const columns = computed(() => [
  { title: 'Organization', key: 'organization', width: 120, fixed: 'left', sorter: true, sortOrder: sortField.value === 'organization' ? sortOrder.value : null },
  { title: 'Staff ID', key: 'staff_id', width: 110, fixed: 'left', sorter: true, sortOrder: sortField.value === 'staff_id' ? sortOrder.value : null },
  { title: 'Initial', key: 'initial', width: 65, align: 'center' },
  { title: 'First Name', key: 'first_name', width: 160, sorter: true, sortOrder: sortField.value === 'first_name' ? sortOrder.value : null },
  { title: 'Last Name', key: 'last_name', width: 140, sorter: true, sortOrder: sortField.value === 'last_name' ? sortOrder.value : null },
  { title: 'Gender', key: 'gender', width: 75, align: 'center', sorter: true, sortOrder: sortField.value === 'gender' ? sortOrder.value : null },
  { title: 'DoB', key: 'dob', width: 115, sorter: true, sortOrder: sortField.value === 'dob' ? sortOrder.value : null },
  { title: 'Age', key: 'age', width: 60, align: 'center', sorter: true, sortOrder: sortField.value === 'age' ? sortOrder.value : null },
  { title: 'Department', key: 'department', width: 160, ellipsis: true },
  { title: 'Position', key: 'position', width: 160, ellipsis: true },
  { title: 'Employee Status', key: 'status', width: 150, sorter: true, sortOrder: sortField.value === 'status' ? sortOrder.value : null, ellipsis: true},
  { title: 'ID Type', key: 'id_type', width: 130, sorter: true, sortOrder: sortField.value === 'id_type' ? sortOrder.value : null },
  { title: 'ID Number', key: 'id_number', width: 140 },
  { title: 'Social Security Number', key: 'ssn', width: 140, ellipsis: true},
  { title: 'Tax No.', key: 'tax_no', width: 120 },
  { title: 'Mobile', key: 'mobile', width: 130 },
  { title: '', key: 'actions', width: 80, align: 'right', fixed: 'right' },
])

const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showSizeChanger: true,
  showTotal: (total) => `${total} employees`,
  pageSizeOptions: ['10', '20', '50', '100'],
}))

function getInitials(record) {
  return `${(record.first_name_en || '')[0] || ''}${(record.last_name_en || '')[0] || ''}`.toUpperCase()
}

const AVATAR_COLORS = ['#1677ff', '#52c41a', '#722ed1', '#eb2f96', '#fa8c16', '#13c2c2']

function getAvatarColor(staffId) {
  const hash = (staffId || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

async function fetchEmployees() {
  loading.value = true
  try {
    const params = {
      page: pagination.current_page,
      per_page: pagination.per_page,
      ...(search.value && { search: search.value }),
      ...(filters.organization && { filter_organization: filters.organization }),
      ...(filters.status && { filter_status: filters.status }),
      ...(sortField.value && { sort_by: sortFieldMap[sortField.value] || sortField.value }),
      ...(sortOrder.value && { sort_order: sortOrder.value === 'ascend' ? 'asc' : 'desc' }),
    }
    const { data } = await employeeApi.list(params, { signal: getSignal() })
    employees.value = data.data || []
    statistics.value = data.statistics || null
    if (data.pagination) Object.assign(pagination, data.pagination)
  } catch (err) { if (err.name !== 'CanceledError') message.error('Failed to load employees') }
  loading.value = false
}

function onSearchOrFilterChange() {
  pagination.current_page = 1
  fetchEmployees()
}

function handleTableChange(pag, _filters, sorter) {
  pagination.current_page = pag.current
  pagination.per_page = pag.pageSize

  if (sorter && sorter.columnKey) {
    sortField.value = sorter.columnKey
    sortOrder.value = sorter.order || null
  } else {
    sortField.value = null
    sortOrder.value = null
  }

  fetchEmployees()
}

function handleMobilePageChange(page, pageSize) {
  pagination.current_page = page
  pagination.per_page = pageSize
  fetchEmployees()
}

function handleMobilePageSizeChange(_current, size) {
  pagination.current_page = 1
  pagination.per_page = size
  fetchEmployees()
}

function handleDelete(record) {
  const name = [record.first_name_en, record.last_name_en].filter(Boolean).join(' ') || record.staff_id
  Modal.confirm({
    title: 'Delete Employee',
    content: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
    okText: 'Delete',
    okType: 'danger',
    cancelText: 'Cancel',
    centered: true,
    async onOk() {
      try {
        await employeeApi.destroy(record.id)
        message.success('Employee deleted successfully')
        selectedRowKeys.value = []
        fetchEmployees()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to delete employee')
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
        await employeeApi.destroyBatch(selectedRowKeys.value)
        message.success(`${selectedRowKeys.value.length} record(s) deleted successfully`)
        selectedRowKeys.value = []
        fetchEmployees()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to delete records')
      }
    },
  })
}

// ---- Record View Modal ----
const viewModalVisible = ref(false)
const viewLoading = ref(false)
const viewEmployee = ref(null)

const viewOrgConfig = computed(() => ORG_RECORD_VIEW_CONFIG[viewEmployee.value?.organization] ?? null)

const viewDisplayName = computed(() => {
  const e = viewEmployee.value
  if (!e) return ''
  return [e.initial_en, e.first_name_en, e.last_name_en].filter(Boolean).join(' ') || 'Employee'
})

const viewStatusKey = computed(() => {
  const e = viewEmployee.value
  if (!e) return 'active'
  const resignation = e.employment?.resignation
  if (resignation?.supervisor_approved === true && resignation?.hr_manager_approved === true) return 'expired'
  if (resignation) return 'ending-soon'
  return 'active'
})

const viewStatusMeta = computed(() => {
  const e = viewEmployee.value
  if (!e) return []
  const meta = []
  if (e.employment?.department?.name) {
    meta.push({ icon: 'building', text: e.employment.department.name })
  }
  if (e.employment?.position?.title) {
    meta.push({ icon: 'briefcase', text: e.employment.position.title })
  }
  if (e.employment?.start_date) {
    meta.push({ icon: 'calendar', text: `Joined ${formatDate(e.employment.start_date)}` })
  }
  if (e.employment?.site?.name) {
    meta.push({ icon: 'map-pin', text: e.employment.site.name })
  }
  return meta
})

const viewSections = computed(() => {
  const e = viewEmployee.value
  if (!e) return []

  const result = []

  // 1. Employee Profile (avatar + key fields)
  const posTitle = e.employment?.position?.title
  const fullName = [e.initial_en, e.first_name_en, e.last_name_en].filter(Boolean).join(' ') || 'Employee'

  result.push({
    title: 'Employee Profile', icon: 'user', type: 'avatar_fields',
    initials: getInitials(e),
    name: fullName,
    subtitle: posTitle || null,
    fields: [
      { label: 'Staff ID', value: e.staff_id, mono: true },
      { label: 'Organization', value: e.organization },
      { label: 'Status', value: e.status },
      { label: 'Gender', value: genderLabel(e.gender) },
      { label: 'Date of Birth', value: formatDate(e.date_of_birth), mono: true },
      { label: 'Age', value: e.date_of_birth ? `${calcAge(e.date_of_birth)} years` : null },
    ],
  })

  // 2. Employment Details
  if (e.employment) {
    const emp = e.employment
    result.push({
      title: 'Employment', icon: 'briefcase', type: 'fields',
      fields: [
        { label: 'Department', value: emp.department?.name },
        { label: 'Position', value: emp.position?.title },
        { label: 'Section', value: emp.section_department?.name },
        { label: 'Site', value: emp.site?.name },
        { label: 'Start Date', value: formatDate(emp.start_date), mono: true },
        { label: 'Pay Method', value: emp.pay_method },
        { label: 'Probation Salary', value: formatCurrency(emp.probation_salary) },
        { label: 'Post-Probation Salary', value: formatCurrency(emp.pass_probation_salary) },
      ],
    })
  }

  // 2b. Employment History (timeline)
  if (e.employment) {
    const emp = e.employment
    const events = []

    // Current employment
    const startLabel = formatDate(emp.start_date)
    events.push({
      date: emp.end_date ? `${startLabel} — ${formatDate(emp.end_date)}` : `${startLabel} — Present`,
      title: emp.position?.title || 'Employee',
      detail: [emp.department?.name, emp.site?.name].filter(Boolean).join(' · ') || null,
      status: emp.end_date ? 'past' : 'current',
    })

    // Transfer / employment history records (if backend provides them)
    if (e.transfers?.length) {
      e.transfers.forEach(t => {
        const fromLabel = [t.from_department?.name, t.from_position?.title].filter(Boolean).join(' · ')
        events.push({
          date: formatDate(t.transfer_date || t.effective_date || t.created_at),
          title: `Transferred — ${t.to_department?.name || t.to_position?.title || 'New Assignment'}`,
          detail: fromLabel ? `From: ${fromLabel}` : t.reason || null,
          status: 'past',
        })
      })
    }

    if (e.employment_histories?.length) {
      e.employment_histories.forEach(h => {
        events.push({
          date: h.end_date ? `${formatDate(h.start_date)} — ${formatDate(h.end_date)}` : formatDate(h.start_date),
          title: h.position?.title || h.position_title || 'Previous Role',
          detail: [h.department?.name || h.department_name, h.site?.name || h.site_name].filter(Boolean).join(' · ') || null,
          status: 'past',
        })
      })
    }

    result.push({
      title: 'Employment History', icon: 'timeline', type: 'timeline',
      events,
    })
  }

  // 3. Personal Details
  const thaiName = [e.initial_th, e.first_name_th, e.last_name_th].filter(Boolean).join(' ')
  const personalFields = []
  if (thaiName) personalFields.push({ label: 'Thai Name', value: thaiName })
  if (e.nationality) personalFields.push({ label: 'Nationality', value: e.nationality })
  if (e.religion) personalFields.push({ label: 'Religion', value: e.religion })
  if (e.marital_status) personalFields.push({ label: 'Marital Status', value: e.marital_status })
  if (e.military_status) personalFields.push({ label: 'Military Status', value: e.military_status })

  if (personalFields.length > 0) {
    result.push({
      title: 'Personal Details', icon: 'id', type: 'fields',
      fields: personalFields,
    })
  }

  // 4. Identification
  const idFields = []
  if (e.identification_type) idFields.push({ label: 'ID Type', value: e.identification_type })
  if (e.identification_number) idFields.push({ label: 'ID Number', value: e.identification_number, mono: true })
  if (e.social_security_number) idFields.push({ label: 'SSN', value: e.social_security_number, mono: true })
  if (e.tax_number) idFields.push({ label: 'Tax Number', value: e.tax_number, mono: true })
  if (e.driver_license_number) idFields.push({ label: 'Driver License', value: e.driver_license_number, mono: true })

  if (idFields.length > 0) {
    result.push({
      title: 'Identification', icon: 'id-badge-2', type: 'fields',
      fields: idFields,
    })
  }

  // 5. Contact Information
  const contactFields = []
  if (e.mobile_phone) contactFields.push({ label: 'Mobile Phone', value: e.mobile_phone, mono: true })
  if (e.permanent_address) contactFields.push({ label: 'Permanent Address', value: e.permanent_address, fullWidth: true })
  if (e.current_address) contactFields.push({ label: 'Current Address', value: e.current_address, fullWidth: true })
  if (e.emergency_contact_person_name) {
    contactFields.push({ label: 'Emergency Contact', value: e.emergency_contact_person_name })
    contactFields.push({ label: 'Relationship', value: e.emergency_contact_person_relationship })
    if (e.emergency_contact_person_phone) {
      contactFields.push({ label: 'Emergency Phone', value: e.emergency_contact_person_phone, mono: true })
    }
  }

  if (contactFields.length > 0) {
    result.push({
      title: 'Contact Information', icon: 'phone', type: 'fields',
      fields: contactFields,
    })
  }

  // 6. Funding Allocations table
  if (e.employee_funding_allocations?.length > 0) {
    result.push({
      title: 'Funding Allocations', icon: 'report-money', type: 'table',
      headers: ['Grant', 'Position', 'Budgetline', 'FTE', 'Amount'],
      aligns: { 3: 'text-center', 4: 'text-right' },
      monoCols: [2, 3, 4],
      rows: e.employee_funding_allocations.map(fa => {
        const gi = fa.grant_item || {}
        const grant = gi.grant || {}
        return [
          grant.name || grant.code || '—',
          gi.grant_position || '—',
          gi.budgetline_code || '—',
          fa.fte != null ? fmtFte(fa.fte) : '—',
          fa.allocated_amount != null ? formatCurrency(fa.allocated_amount) : '—',
        ]
      }),
    })
  }

  // 7. Education table
  if (e.employee_education?.length > 0) {
    result.push({
      title: 'Education', icon: 'school', type: 'table',
      headers: ['Degree', 'Institution', 'Field of Study', 'Start', 'End'],
      aligns: {},
      monoCols: [],
      rows: e.employee_education.map(edu => [
        edu.degree || edu.education_level || '—',
        edu.institution || edu.school_name || '—',
        edu.field_of_study || edu.major || '—',
        formatDate(edu.start_date),
        formatDate(edu.end_date),
      ]),
    })
  }

  // 8. Leave Balances
  if (e.leave_balances?.length > 0) {
    result.push({
      title: 'Leave Balances', icon: 'calendar-stats', type: 'table',
      headers: ['Leave Type', 'Total Days', 'Used', 'Remaining'],
      aligns: { 1: 'text-center', 2: 'text-center', 3: 'text-center' },
      monoCols: [1, 2, 3],
      rows: e.leave_balances.map(lb => [
        lb.leave_type?.name || '—',
        lb.total_days != null ? String(lb.total_days) : '—',
        lb.used_days != null ? String(lb.used_days) : '—',
        lb.remaining_days != null ? String(lb.remaining_days) : '—',
      ]),
    })
  }

  // 9. Financial
  const hasFinancial = e.bank_name || e.bank_branch || e.bank_account_name || e.bank_account_number
  if (hasFinancial) {
    result.push({
      title: 'Financial', icon: 'building-bank', type: 'fields',
      fields: [
        { label: 'Bank Name', value: e.bank_name },
        { label: 'Bank Branch', value: e.bank_branch },
        { label: 'Account Name', value: e.bank_account_name },
        { label: 'Account Number', value: e.bank_account_number, mono: true },
      ],
    })
  }

  // 10. Notes & Remarks
  result.push({ title: 'Notes & Remarks', icon: 'notes', type: 'notes', content: e.remark || null })

  // 11. Record Information
  result.push({
    title: 'Record Information', icon: 'info-circle', type: 'fields',
    fields: [
      { label: 'Created By', value: e.created_by },
      { label: 'Updated By', value: e.updated_by },
      { label: 'Created At', value: formatDate(e.created_at), mono: true },
      { label: 'Updated At', value: formatDate(e.updated_at), mono: true },
    ],
  })

  return result
})

const viewAbort = ref(null)

async function openView(record) {
  viewAbort.value?.abort()
  viewAbort.value = new AbortController()
  viewEmployee.value = null
  viewModalVisible.value = true
  viewLoading.value = true
  try {
    const { data } = await employeeApi.show(record.id, { signal: viewAbort.value.signal })
    viewEmployee.value = data.data || data
  } catch (err) {
    if (err.name !== 'CanceledError') {
      message.error('Failed to load employee details')
      viewModalVisible.value = false
    }
  }
  viewLoading.value = false
}

function handleViewPrint() {
  window.print()
}

function openEditFromView() {
  const id = viewEmployee.value?.id
  viewModalVisible.value = false
  if (id) {
    router.push({ name: 'employee-detail', params: { id } })
  }
}

onMounted(() => {
  appStore.setPageMeta('Employees')
  fetchEmployees()
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

.employee-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: inherit;
}
.cell-name {
  font-weight: 600;
  font-size: 13px;
  color: var(--color-text);
}
.cell-link {
  color: var(--color-accent);
  text-decoration: none;
  font-weight: 500;
}
.cell-link:hover {
  text-decoration: underline;
}
.cell-staff-id {
  font-size: 12px;
  color: var(--color-text-muted);
}

.mobile-employee-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  text-decoration: none;
  color: inherit;
  transition: box-shadow var(--transition-fast);
}
.mobile-employee-card:hover {
  box-shadow: var(--shadow-md);
}
.mobile-card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.mobile-card-body {
  flex: 1;
  min-width: 0;
}
.mobile-card-meta {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}
.mobile-card-tags {
  margin-top: 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.mobile-card-resigned {
  border-color: var(--color-danger);
  background: var(--color-danger-bg);
}
.mobile-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

/* ── Record View Modal ── */
.view-loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 64px 0;
}
.view-modal-wrap {
  position: relative;
  max-width: 880px;
  margin: 0 auto;
}
.view-close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.18);
  backdrop-filter: blur(8px);
  color: rgba(255,255,255,0.9);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}
.view-close-btn:hover {
  background: rgba(255,255,255,0.35);
  color: #fff;
  transform: scale(1.08);
}
.view-close-btn:focus-visible {
  outline: 2px solid rgba(255,255,255,0.6);
  outline-offset: 2px;
}
</style>

<!-- Unscoped: Ant modal chrome overrides for record-view-modal -->
<style>
.record-view-modal .ant-modal-wrap {
  overflow: auto;
}
.record-view-modal .ant-modal {
  padding: 24px 0;
}
.record-view-modal .ant-modal-content {
  padding: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 10px !important;
  overflow: visible !important;
}
.record-view-modal .ant-modal-body {
  padding: 0 !important;
  background: transparent !important;
}
.record-view-modal .ant-modal-header {
  display: none !important;
}
.record-view-modal .ant-modal-close {
  display: none !important;
}
</style>

<!-- Unscoped: resigned row highlighting for Ant Design table -->
<style>
.row-resigned td {
  background: var(--color-danger-bg) !important;
}
.row-resigned:hover td {
  background: #fee2e2 !important;
}
</style>
