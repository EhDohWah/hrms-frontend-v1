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
            <a-button v-if="authStore.canEdit('employees')" size="small" type="link" danger @click="handleDelete(record)">Delete</a-button>
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
import { formatDate, genderLabel, calcAge } from '@/utils/formatters'
import { ORGANIZATIONS, ORG_OPTIONS, getOrgColor } from '@/constants/organizations'
import { EMPLOYEE_STATUSES, STATUS_COLOR_MAP } from '@/constants/employeeStatuses'
import {
  SearchOutlined, PlusOutlined, ExclamationCircleOutlined,
  TeamOutlined, LogoutOutlined, UserAddOutlined,
} from '@ant-design/icons-vue'

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
  { title: 'Status', key: 'status', width: 140, sorter: true, sortOrder: sortField.value === 'status' ? sortOrder.value : null },
  { title: 'ID Type', key: 'id_type', width: 130, sorter: true, sortOrder: sortField.value === 'id_type' ? sortOrder.value : null },
  { title: 'ID Number', key: 'id_number', width: 140 },
  { title: 'SSN', key: 'ssn', width: 140 },
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
.mobile-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
</style>
