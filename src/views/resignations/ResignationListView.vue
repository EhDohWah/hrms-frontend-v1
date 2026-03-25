<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ pagination.total || 0 }} Total</a-tag>
      </div>
      <div class="filter-bar">
        <a-input
          v-model:value="search"
          placeholder="Search resignations..."
          allow-clear
          class="filter-input"
          style="width: 240px"
          @pressEnter="onSearchOrFilterChange"
          @clear="onSearchOrFilterChange"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-select
          v-model:value="filters.status"
          placeholder="Status"
          allow-clear
          class="filter-input"
          style="width: 150px"
          @change="onSearchOrFilterChange"
        >
          <a-select-option value="Pending">Pending</a-select-option>
          <a-select-option value="Acknowledged">Acknowledged</a-select-option>
          <a-select-option value="Rejected">Rejected</a-select-option>
        </a-select>
        <a-select
          v-model:value="filters.department_id"
          placeholder="Department"
          allow-clear
          class="filter-input"
          style="width: 180px"
          @change="onSearchOrFilterChange"
          :options="departmentOptions"
          :field-names="{ label: 'name', value: 'id' }"
          show-search
          :filter-option="(input, opt) => opt.name.toLowerCase().includes(input.toLowerCase())"
        />
        <a-button v-if="selectedRowKeys.length > 0 && authStore.canDelete('resignation')" danger @click="handleBulkDelete">
          Delete {{ selectedRowKeys.length }} Selected
        </a-button>
        <a-button v-if="authStore.canCreate('resignation')" type="primary" @click="openCreate">
          <PlusOutlined /> Add Resignation
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
        :row-selection="authStore.canDelete('resignation') ? { selectedRowKeys, onChange: (keys) => selectedRowKeys = keys } : undefined"
        @change="handleTableChange"
        :scroll="{ x: 'max-content' }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'employee'">
            <router-link :to="{ name: 'resignation-detail', params: { id: record.id } }" class="cell-link">
              <div class="cell-employee">
                <span class="cell-name">{{ record.employee?.first_name_en }} {{ record.employee?.last_name_en }}</span>
                <span class="cell-sub">
                  <span class="font-mono">{{ record.employee?.staff_id }}</span>
                  <a-tag v-if="record.employee?.organization" :color="getOrgColor(record.employee.organization)" size="small" class="org-tag-inline">{{ record.employee.organization }}</a-tag>
                </span>
              </div>
            </router-link>
          </template>
          <template v-else-if="column.key === 'department'">
            {{ record.department?.name || '—' }}
          </template>
          <template v-else-if="column.key === 'position'">
            {{ record.position?.title || '—' }}
          </template>
          <template v-else-if="column.key === 'resignation_date'">
            {{ formatDate(record.resignation_date) }}
          </template>
          <template v-else-if="column.key === 'last_working_date'">
            {{ formatDate(record.last_working_date) }}
          </template>
          <template v-else-if="column.key === 'notice_period'">
            {{ record.notice_period_days ?? '—' }}d
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="getResignationStatusColor(record.status)" size="small">{{ record.status || '—' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button v-if="authStore.canUpdate('resignation')" size="small" type="link" @click="openEdit(record)">Edit</a-button>
              <a-button v-if="authStore.canDelete('resignation')" size="small" type="link" danger @click="handleDelete(record)">Delete</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingItem ? 'Edit Resignation' : 'Submit Resignation'"
      @ok="handleSave"
      :confirm-loading="saving"
      :width="'min(95vw, 560px)'"
    >
      <a-form :model="form" layout="vertical" class="modal-form">
        <a-form-item label="Employee" required>
          <a-select
            v-model:value="form.employee_id"
            show-search
            :filter-option="false"
            placeholder="Search by name or staff ID..."
            :disabled="!!editingItem"
            :loading="employeeSearching"
            :not-found-content="employeeSearching ? undefined : null"
            @search="handleEmployeeSearch"
          >
            <a-select-option v-for="emp in employeeOptions" :key="emp.id" :value="emp.id">
              {{ emp.full_name }} <span class="font-mono" style="color: var(--color-text-muted);">({{ emp.staff_id }})</span>
              <span v-if="emp.department" style="color: var(--color-text-muted);"> — {{ emp.department }}</span>
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Resignation Date" required>
              <a-date-picker v-model:value="form.resignation_date" style="width: 100%" format="DD MMM YYYY" value-format="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Last Working Date" required>
              <a-date-picker v-model:value="form.last_working_date" style="width: 100%" format="DD MMM YYYY" value-format="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Reason" required>
          <a-input v-model:value="form.reason" placeholder="Enter reason for resignation" :maxlength="50" show-count />
        </a-form-item>
        <a-form-item label="Details">
          <a-textarea v-model:value="form.reason_details" placeholder="Additional details (optional)" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, createVNode } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { SearchOutlined, PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { useAbortController } from '@/composables/useAbortController'
import { resignationApi, departmentApi } from '@/api'
import { formatDate } from '@/utils/formatters'
import { getOrgColor } from '@/constants/organizations'
import { getResignationStatusColor } from '@/constants/resignations'

const appStore = useAppStore()
const authStore = useAuthStore()
const getSignal = useAbortController()

const items = ref([])
const selectedRowKeys = ref([])
const loading = ref(false)
const saving = ref(false)
const search = ref('')
const filters = reactive({ status: undefined, department_id: undefined })
const departmentOptions = ref([])
const sortState = reactive({ field: 'resignation_date', order: 'descend' })
const pagination = reactive({ current_page: 1, per_page: 20, total: 0 })
const modalVisible = ref(false)
const editingItem = ref(null)
const employeeOptions = ref([])
const employeeSearching = ref(false)
let employeeSearchTimer = null

const form = reactive({
  employee_id: undefined, resignation_date: null, last_working_date: null,
  reason: '', reason_details: '',
})

const columns = computed(() => [
  { title: 'Employee', key: 'employee', width: 220 },
  { title: 'Department', key: 'department', width: 150 },
  { title: 'Position', key: 'position', width: 150 },
  { title: 'Resignation Date', key: 'resignation_date', width: 140, sorter: true, sortOrder: sortState.field === 'resignation_date' ? sortState.order : null },
  { title: 'Last Working Date', key: 'last_working_date', width: 140, sorter: true, sortOrder: sortState.field === 'last_working_date' ? sortState.order : null },
  { title: 'Notice', key: 'notice_period', width: 80, align: 'center' },
  { title: 'Reason', dataIndex: 'reason', ellipsis: true },
  { title: 'Status', key: 'status', width: 120, align: 'center', sorter: true, sortOrder: sortState.field === 'status' ? sortState.order : null },
  { title: '', key: 'actions', width: 140, align: 'right' },
])

const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showSizeChanger: true,
  showTotal: (total) => `${total} resignations`,
  pageSizeOptions: ['10', '20', '50'],
}))


const SORT_FIELD_MAP = { resignation_date: 'resignation_date', last_working_date: 'last_working_date', status: 'acknowledgement_status' }

async function fetchItems() {
  loading.value = true
  try {
    const params = {
      page: pagination.current_page,
      per_page: pagination.per_page,
      ...(search.value && { search: search.value }),
      ...(filters.status && { acknowledgement_status: filters.status }),
      ...(filters.department_id && { department_id: filters.department_id }),
      ...(sortState.field && { sort_by: SORT_FIELD_MAP[sortState.field] || sortState.field, sort_order: sortState.order === 'ascend' ? 'asc' : 'desc' }),
    }
    const { data } = await resignationApi.list(params, { signal: getSignal() })
    items.value = data.data || []
    if (data.pagination) Object.assign(pagination, data.pagination)
  } catch (err) { if (err.name !== 'CanceledError') message.error('Failed to load resignations') }
  loading.value = false
}

function onSearchOrFilterChange() {
  pagination.current_page = 1
  fetchItems()
}

function handleTableChange(pag, _filters, sorter) {
  pagination.current_page = pag.current
  pagination.per_page = pag.pageSize
  if (sorter?.field) {
    sortState.field = sorter.field
    sortState.order = sorter.order || null
  }
  fetchItems()
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
      const { data } = await resignationApi.searchEmployees({ search: val, limit: 10 })
      employeeOptions.value = data.data || []
    } catch { /* ignore */ }
    employeeSearching.value = false
  }, 300)
}

function resetForm() {
  Object.assign(form, {
    employee_id: undefined, resignation_date: null, last_working_date: null,
    reason: '', reason_details: '',
  })
  employeeOptions.value = []
}

function openCreate() {
  editingItem.value = null
  resetForm()
  modalVisible.value = true
}

function openEdit(record) {
  editingItem.value = record
  // Pre-populate employee option so the select shows the employee name
  if (record.employee) {
    employeeOptions.value = [{
      id: record.employee_id,
      staff_id: record.employee.staff_id,
      full_name: `${record.employee.first_name_en || ''} ${record.employee.last_name_en || ''}`.trim(),
      department: record.department?.name,
    }]
  }
  Object.assign(form, {
    employee_id: record.employee_id || undefined,
    resignation_date: record.resignation_date || null,
    last_working_date: record.last_working_date || null,
    reason: record.reason || '',
    reason_details: record.reason_details || '',
  })
  modalVisible.value = true
}

async function handleSave() {
  if (!form.employee_id) return message.warning('Please select an employee')
  if (!form.resignation_date) return message.warning('Resignation date is required')
  if (!form.reason) return message.warning('Reason is required')
  if (!form.last_working_date) return message.warning('Last working date is required')
  saving.value = true
  try {
    const payload = { ...form }
    if (editingItem.value) {
      await resignationApi.update(editingItem.value.id, payload)
      message.success('Resignation updated')
    } else {
      await resignationApi.store(payload)
      message.success('Resignation submitted')
    }
    modalVisible.value = false
    fetchItems()
  } catch (err) {
    message.error(err.response?.data?.message || 'Failed to save')
  }
  saving.value = false
}

function handleDelete(record) {
  Modal.confirm({
    title: 'Delete Resignation',
    content: `Are you sure you want to delete this resignation record?`,
    okType: 'danger',
    onOk: async () => {
      try {
        await resignationApi.destroy(record.id)
        message.success('Resignation deleted')
        selectedRowKeys.value = []
        fetchItems()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to delete')
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
        await resignationApi.destroyBatch(selectedRowKeys.value)
        message.success(`${selectedRowKeys.value.length} record(s) deleted successfully`)
        selectedRowKeys.value = []
        fetchItems()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to delete records')
      }
    },
  })
}

async function fetchDepartmentOptions() {
  try {
    const { data } = await departmentApi.options()
    departmentOptions.value = data.data || []
  } catch { /* silent */ }
}

onMounted(() => {
  appStore.setPageMeta('Resignations')
  fetchItems()
  fetchDepartmentOptions()
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
.cell-link { text-decoration: none; color: inherit; }
.cell-employee { display: flex; flex-direction: column; }
.cell-name { font-weight: 600; font-size: 13.5px; }
.cell-sub { font-size: 12px; color: var(--color-text-muted); display: flex; align-items: center; gap: 4px; }
.org-tag-inline { margin: 0; font-size: 10px; line-height: 1; }
.modal-form { margin-top: 16px; }
</style>
