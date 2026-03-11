<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ pagination.total || 0 }} Total</a-tag>
      </div>
      <div class="filter-bar">
        <a-input
          v-model:value="search"
          placeholder="Search by employee..."
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
          style="width: 140px"
          @change="onSearchOrFilterChange"
        >
          <a-select-option value="present">Present</a-select-option>
          <a-select-option value="absent">Absent</a-select-option>
          <a-select-option value="late">Late</a-select-option>
          <a-select-option value="half_day">Half Day</a-select-option>
          <a-select-option value="on_leave">On Leave</a-select-option>
        </a-select>
        <a-date-picker
          v-model:value="filters.date"
          placeholder="Date"
          format="DD MMM YYYY"
          value-format="YYYY-MM-DD"
          allow-clear
          class="filter-input"
          @change="onSearchOrFilterChange"
        />
        <a-button v-if="selectedRowKeys.length > 0 && authStore.canEdit('attendance_admin')" danger @click="handleBulkDelete">
          Delete {{ selectedRowKeys.length }} Selected
        </a-button>
        <a-button v-if="authStore.canEdit('attendance_admin')" type="primary" @click="openCreate">
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
        :row-selection="authStore.canEdit('attendance_admin') ? { selectedRowKeys, onChange: (keys) => selectedRowKeys = keys } : undefined"
        :scroll="{ x: 'max-content', y: 600 }"
        :virtual="true"
        @change="handleTableChange"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'employee'">
            <div class="cell-employee">
              <span class="cell-name">{{ record.employee?.first_name_en }} {{ record.employee?.last_name_en }}</span>
              <span class="cell-sub font-mono">{{ record.employee?.staff_id }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'date'">
            {{ formatDate(record.date) }}
          </template>
          <template v-else-if="column.key === 'check_in'">
            {{ record.check_in || '—' }}
          </template>
          <template v-else-if="column.key === 'check_out'">
            {{ record.check_out || '—' }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)" size="small">{{ record.status || '—' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space v-if="authStore.canEdit('attendance_admin')">
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
      @ok="handleSave"
      :confirm-loading="saving"
      :width="'min(95vw, 520px)'"
    >
      <a-form :model="form" layout="vertical" class="modal-form">
        <a-form-item label="Employee ID" required>
          <a-input v-model:value="form.employee_id" placeholder="Enter employee ID" :disabled="!!editingItem" />
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
                <a-select-option value="present">Present</a-select-option>
                <a-select-option value="absent">Absent</a-select-option>
                <a-select-option value="late">Late</a-select-option>
                <a-select-option value="half_day">Half Day</a-select-option>
                <a-select-option value="on_leave">On Leave</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Check In">
              <a-time-picker v-model:value="form.check_in" style="width: 100%" format="HH:mm" value-format="HH:mm" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Check Out">
              <a-time-picker v-model:value="form.check_out" style="width: 100%" format="HH:mm" value-format="HH:mm" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Remarks">
          <a-textarea v-model:value="form.remarks" placeholder="Enter remarks" :rows="2" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject, createVNode } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { SearchOutlined, PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { attendanceApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'

const dayjs = inject('$dayjs')
const appStore = useAppStore()
const authStore = useAuthStore()
const getSignal = useAbortController()

const items = ref([])
const selectedRowKeys = ref([])
const loading = ref(false)
const saving = ref(false)
const search = ref('')
const filters = reactive({ status: undefined, date: null })
const pagination = reactive({ current_page: 1, per_page: 20, total: 0 })
const modalVisible = ref(false)
const editingItem = ref(null)
const form = reactive({ employee_id: '', date: null, status: 'present', check_in: null, check_out: null, remarks: '' })

const columns = [
  { title: 'Employee', key: 'employee', width: 200 },
  { title: 'Date', key: 'date', width: 140 },
  { title: 'Check In', key: 'check_in', width: 100, align: 'center' },
  { title: 'Check Out', key: 'check_out', width: 100, align: 'center' },
  { title: 'Hours', dataIndex: 'total_hours', width: 80, align: 'center' },
  { title: 'Status', key: 'status', width: 110, align: 'center' },
  { title: 'Remarks', dataIndex: 'remarks', ellipsis: true },
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

function formatDate(d) { return d ? dayjs(d).format('DD MMM YYYY') : '—' }

function statusColor(status) {
  const map = { present: 'green', absent: 'red', late: 'orange', half_day: 'blue', on_leave: 'purple' }
  return map[status?.toLowerCase()] || 'default'
}

async function fetchItems() {
  loading.value = true
  try {
    const params = {
      page: pagination.current_page,
      per_page: pagination.per_page,
      ...(search.value && { search: search.value }),
      ...(filters.status && { filter_status: filters.status }),
      ...(filters.date && { filter_date_from: filters.date, filter_date_to: filters.date }),
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

function resetForm() {
  Object.assign(form, { employee_id: '', date: null, status: 'present', check_in: null, check_out: null, remarks: '' })
}

function openCreate() {
  editingItem.value = null
  resetForm()
  modalVisible.value = true
}

function openEdit(record) {
  editingItem.value = record
  Object.assign(form, {
    employee_id: record.employee_id || '',
    date: record.date || null,
    status: record.status || 'present',
    check_in: record.check_in || null,
    check_out: record.check_out || null,
    remarks: record.remarks || '',
  })
  modalVisible.value = true
}

async function handleSave() {
  if (!form.employee_id) return message.warning('Employee ID is required')
  if (!form.date) return message.warning('Date is required')
  saving.value = true
  try {
    if (editingItem.value) {
      await attendanceApi.update(editingItem.value.id, { ...form })
      message.success('Attendance updated')
    } else {
      await attendanceApi.store({ ...form })
      message.success('Attendance created')
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
.cell-employee { display: flex; flex-direction: column; }
.cell-name { font-weight: 600; font-size: 13.5px; }
.cell-sub { font-size: 12px; color: var(--color-text-muted); }
.modal-form { margin-top: 16px; }
</style>
