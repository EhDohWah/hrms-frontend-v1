<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ pagination.total || 0 }} Total</a-tag>
      </div>
      <div class="filter-bar">
        <a-input
          v-model:value="search"
          placeholder="Search employee..."
          allow-clear
          class="filter-input"
          style="width: 240px"
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
          style="width: 160px"
          @change="onSearchOrFilterChange"
        >
          <a-select-option v-for="org in ORG_OPTIONS" :key="org.code" :value="org.code">{{ org.label }}</a-select-option>
        </a-select>
        <a-select
          v-model:value="filters.status"
          placeholder="Status"
          allow-clear
          class="filter-input"
          style="width: 140px"
          @change="onSearchOrFilterChange"
        >
          <a-select-option v-for="s in STATUS_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</a-select-option>
        </a-select>
        <a-range-picker
          v-model:value="filters.dateRange"
          format="DD MMM YYYY"
          value-format="YYYY-MM-DD"
          allow-clear
          class="filter-input"
          @change="onSearchOrFilterChange"
        />
        <a-button v-if="selectedRowKeys.length > 0 && authStore.canEdit('attendance')" danger @click="handleBulkDelete">
          Delete {{ selectedRowKeys.length }} Selected
        </a-button>
        <a-button v-if="authStore.canEdit('attendance')" type="primary" @click="openCreate">
          <PlusOutlined /> Add Record
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
        :row-selection="authStore.canEdit('attendance') ? { selectedRowKeys, onChange: (keys) => selectedRowKeys = keys } : undefined"
        :scroll="{ x: 'max-content' }"
        @change="handleTableChange"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'organization'">
            <a-tag v-if="record.employee?.organization" :color="getOrgColor(record.employee.organization)" size="small">{{ record.employee.organization }}</a-tag>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'staff_id'">
            <span class="font-mono">{{ record.employee?.staff_id || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'employee'">
            <span class="cell-name">{{ record.employee?.first_name_en }} {{ record.employee?.last_name_en }}</span>
          </template>
          <template v-else-if="column.key === 'date'">
            {{ formatDate(record.date) }}
          </template>
          <template v-else-if="column.key === 'clock_in'">
            {{ record.clock_in || '—' }}
          </template>
          <template v-else-if="column.key === 'clock_out'">
            {{ record.clock_out || '—' }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)" size="small">{{ record.status || '—' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'notes'">
            {{ record.notes || '—' }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space v-if="authStore.canEdit('attendance')">
              <a-button size="small" type="link" @click="openEdit(record)">Edit</a-button>
              <a-button size="small" type="link" danger @click="handleDelete(record)">Delete</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingItem ? 'Edit Attendance' : 'Add Attendance'"
      :footer="null"
      :width="'min(95vw, 520px)'"
    >
      <a-form :model="form" layout="vertical" class="modal-form" @submit.prevent="handleSave">
        <a-form-item label="Employee" required>
          <a-select
            v-model:value="form.employee_id"
            placeholder="Search employee by name or staff ID..."
            show-search
            :filter-option="false"
            :loading="employeesLoading"
            :disabled="!!editingItem"
            :not-found-content="employeeSearchQuery ? 'No employees found' : 'Type to search...'"
            allow-clear
            style="width: 100%"
            @search="onEmployeeSearch"
          >
            <a-select-option
              v-for="emp in employees"
              :key="emp.id"
              :value="emp.id"
              :label="`${emp.first_name_en} ${emp.last_name_en} — ${emp.staff_id}`"
            >
              {{ emp.first_name_en }} {{ emp.last_name_en }}
              <span class="font-mono" style="color: var(--color-text-muted); font-size: 12px; margin-left: 6px">{{ emp.staff_id }}</span>
            </a-select-option>
          </a-select>
          <div v-if="editingItem" class="field-hint">Employee cannot be changed in edit mode</div>
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Date" required>
              <a-date-picker v-model:value="form.date" style="width: 100%" format="DD MMM YYYY" value-format="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Status" required>
              <a-select v-model:value="form.status" placeholder="Select status">
                <a-select-option v-for="s in STATUS_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Clock In">
              <a-time-picker v-model:value="form.clock_in" style="width: 100%" format="HH:mm" value-format="HH:mm" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Clock Out">
              <a-time-picker v-model:value="form.clock_out" style="width: 100%" format="HH:mm" value-format="HH:mm" />
            </a-form-item>
          </a-col>
        </a-row>
        <div v-if="hoursWorked" class="date-feedback" :class="{ 'date-feedback--warning': hoursWorked.hours >= 16 }">
          <span v-if="hoursWorked.isOvernight">Overnight: </span>
          <span class="font-mono">{{ hoursWorked.hours }}h {{ String(hoursWorked.minutes).padStart(2, '0') }}m</span>
          <span v-if="hoursWorked.hours >= 16"> — Unusually long shift</span>
        </div>
        <a-form-item label="Notes">
          <a-textarea v-model:value="form.notes" placeholder="Enter notes" :rows="2" />
        </a-form-item>
        <div class="modal-footer">
          <a-button @click="modalVisible = false">Cancel</a-button>
          <a-button v-if="!editingItem" :loading="savingAnother" :disabled="savingMain" @click="handleSaveAndAddAnother">Save &amp; Add Another</a-button>
          <a-button type="primary" html-type="submit" :loading="savingMain" :disabled="savingAnother">{{ editingItem ? 'Update' : 'Save' }}</a-button>
        </div>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, createVNode } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { SearchOutlined, PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { attendanceApi, employeeApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'
import { useSaveAnother } from '@/composables/useSaveAnother'
import { ORG_OPTIONS, getOrgColor } from '@/constants/organizations'
import { formatDate, calcHoursWorked } from '@/utils/formatters'

const appStore = useAppStore()
const authStore = useAuthStore()
const getSignal = useAbortController()
const getSearchSignal = useAbortController()

const STATUS_OPTIONS = [
  { value: 'Present', label: 'Present' },
  { value: 'Absent', label: 'Absent' },
  { value: 'Late', label: 'Late' },
  { value: 'Half Day', label: 'Half Day' },
  { value: 'On Leave', label: 'On Leave' },
]
const STATUS_COLOR_MAP = { Present: 'green', Absent: 'red', Late: 'orange', 'Half Day': 'blue', 'On Leave': 'purple' }

const items = ref([])
const selectedRowKeys = ref([])
const loading = ref(false)
const { savingMain, savingAnother, submitMain, submitAnother } = useSaveAnother({
  refresh: fetchItems, reset: resetForm,
})
const search = ref('')
const filters = reactive({ organization: undefined, status: undefined, dateRange: null })
const pagination = reactive({ current_page: 1, per_page: 20, total: 0 })
const modalVisible = ref(false)
const editingItem = ref(null)
const form = reactive({ employee_id: undefined, date: null, status: 'Present', clock_in: null, clock_out: null, notes: '' })

// Employee search for modal
const employees = ref([])
const employeesLoading = ref(false)
const employeeSearchQuery = ref('')
let employeeSearchTimer = null

const hoursWorked = computed(() => calcHoursWorked(form.clock_in, form.clock_out))

const columns = [
  { title: 'Organization', key: 'organization', width: 110, align: 'center' },
  { title: 'Staff ID', key: 'staff_id', width: 110 },
  { title: 'Employee', key: 'employee', width: 180 },
  { title: 'Date', key: 'date', width: 140 },
  { title: 'Clock In', key: 'clock_in', width: 100, align: 'center' },
  { title: 'Clock Out', key: 'clock_out', width: 100, align: 'center' },
  { title: 'Hours', dataIndex: 'total_hours', width: 80, align: 'center' },
  { title: 'Status', key: 'status', width: 110, align: 'center' },
  { title: 'Notes', key: 'notes', ellipsis: true },
  { title: '', key: 'actions', width: 140, align: 'right' },
]

const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showSizeChanger: true,
  showTotal: (total) => `${total} records`,
  pageSizeOptions: ['10', '20', '50', '100'],
}))

function statusColor(status) {
  return STATUS_COLOR_MAP[status] || 'default'
}

async function fetchItems() {
  loading.value = true
  try {
    const params = {
      page: pagination.current_page,
      per_page: pagination.per_page,
      ...(search.value && { search: search.value }),
      ...(filters.organization && { filter_organization: filters.organization }),
      ...(filters.status && { filter_status: filters.status }),
      ...(filters.dateRange?.[0] && { filter_date_from: filters.dateRange[0] }),
      ...(filters.dateRange?.[1] && { filter_date_to: filters.dateRange[1] }),
    }
    const { data } = await attendanceApi.list(params, { signal: getSignal() })
    items.value = data.data || []
    if (data.pagination) Object.assign(pagination, data.pagination)
  } catch (err) { if (err.name !== 'CanceledError') message.error('Failed to load attendance records') }
  loading.value = false
}

function onSearchOrFilterChange() {
  pagination.current_page = 1
  fetchItems()
}

function handleTableChange(pag) {
  pagination.current_page = pag.current
  pagination.per_page = pag.pageSize
  fetchItems()
}

// ── Employee Search ──────────────────────────────────────────────────────────

function onEmployeeSearch(query) {
  employeeSearchQuery.value = query
  if (employeeSearchTimer) clearTimeout(employeeSearchTimer)
  if (!query || query.length < 2) {
    employees.value = []
    return
  }
  employeeSearchTimer = setTimeout(() => searchEmployees(query), 300)
}

async function searchEmployees(query) {
  employeesLoading.value = true
  try {
    const { data } = await employeeApi.list({ search: query, per_page: 20 }, { signal: getSearchSignal() })
    employees.value = data?.data || []
  } catch (err) {
    if (err.name !== 'CanceledError') employees.value = []
  } finally {
    employeesLoading.value = false
  }
}

onUnmounted(() => {
  if (employeeSearchTimer) clearTimeout(employeeSearchTimer)
})

// ── CRUD ─────────────────────────────────────────────────────────────────────

function resetForm() {
  Object.assign(form, { employee_id: undefined, date: null, status: 'Present', clock_in: null, clock_out: null, notes: '' })
  employees.value = []
  employeeSearchQuery.value = ''
}

function openCreate() {
  editingItem.value = null
  resetForm()
  modalVisible.value = true
}

function openEdit(record) {
  editingItem.value = record
  Object.assign(form, {
    employee_id: record.employee_id || undefined,
    date: record.date || null,
    status: record.status || 'Present',
    clock_in: record.clock_in || null,
    clock_out: record.clock_out || null,
    notes: record.notes || '',
  })
  if (record.employee) {
    employees.value = [record.employee]
  }
  modalVisible.value = true
}

function validateForm() {
  if (!form.employee_id) { message.warning('Please select an employee'); return false }
  if (!form.date) { message.warning('Date is required'); return false }
  return true
}

async function handleSave() {
  if (!validateForm()) return
  await submitMain(async () => {
    if (editingItem.value) {
      await attendanceApi.update(editingItem.value.id, { ...form })
      message.success('Attendance updated')
    } else {
      await attendanceApi.store({ ...form })
      message.success('Attendance created')
    }
    modalVisible.value = false
  })
}

async function handleSaveAndAddAnother() {
  if (!validateForm()) return
  await submitAnother(async () => {
    await attendanceApi.store({ ...form })
    message.success('Attendance created — ready for next entry')
  })
}

function handleDelete(record) {
  Modal.confirm({
    title: 'Delete Attendance Record',
    content: `Delete attendance record for ${record.employee?.first_name_en || ''} on ${formatDate(record.date)}?`,
    okType: 'danger',
    onOk: async () => {
      try {
        await attendanceApi.destroy(record.id)
        message.success('Record deleted')
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
        await attendanceApi.destroyBatch(selectedRowKeys.value)
        message.success(`${selectedRowKeys.value.length} record(s) deleted successfully`)
        selectedRowKeys.value = []
        fetchItems()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to delete records')
      }
    },
  })
}

onMounted(() => {
  appStore.setPageMeta('Attendance')
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
.page-header-stats { display: flex; gap: 6px; }
.cell-name { font-weight: 600; font-size: 14px; }
.modal-form { margin-top: 16px; }
.field-hint { font-size: 12px; color: var(--color-text-muted); margin-top: 4px; }
</style>
