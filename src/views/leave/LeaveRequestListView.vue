<template>
  <div class="page-container">
    <div class="page-header">
      <div>
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
        <a-select v-model:value="filters.status" placeholder="Status" allow-clear class="filter-input" style="width: 140px" @change="onSearchOrFilterChange">
          <a-select-option value="pending">Pending</a-select-option>
          <a-select-option value="approved">Approved</a-select-option>
          <a-select-option value="rejected">Rejected</a-select-option>
          <a-select-option value="cancelled">Cancelled</a-select-option>
        </a-select>
        <a-button
          v-if="selectedRowKeys.length > 0 && authStore.canEdit('leaves_admin')"
          danger
          @click="handleBulkDelete"
        >
          Delete {{ selectedRowKeys.length }} Selected
        </a-button>
        <a-button v-if="authStore.canEdit('leaves_admin')" type="primary" @click="openCreate">
          <template #icon><PlusOutlined /></template>
          Add Leave Request
        </a-button>
      </div>
    </div>

    <a-card :body-style="{ padding: 0 }">
      <a-table
        :columns="columns"
        :data-source="requests"
        :loading="loading"
        :row-key="(r) => r.id"
        :pagination="tablePagination"
        :row-selection="authStore.canEdit('leaves_admin') ? { selectedRowKeys, onChange: (keys) => selectedRowKeys = keys } : undefined"
        :scroll="{ x: 'max-content', y: 600 }"
        :virtual="true"
        @change="handleTableChange"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'employee'">
            <div class="cell-employee">
              <span class="cell-name">{{ record.employee?.first_name_en }} {{ record.employee?.last_name_en }}</span>
              <span class="cell-staff-id font-mono">{{ record.employee?.staff_id }}</span>
            </div>
          </template>

          <template v-else-if="column.key === 'leave_type'">
            {{ record.items?.[0]?.leave_type?.name || '—' }}
          </template>

          <template v-else-if="column.key === 'dates'">
            {{ formatDate(record.start_date) }} → {{ formatDate(record.end_date) }}
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)" size="small">{{ record.status }}</a-tag>
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space :size="0">
              <a-button
                v-if="authStore.canEdit('leaves_admin')"
                size="small"
                type="link"
                @click="openEdit(record)"
              >
                Edit
              </a-button>
              <a-button
                v-if="authStore.canEdit('leaves_admin')"
                size="small"
                type="link"
                danger
                @click="handleDelete(record)"
              >
                Delete
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create / Edit Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingId ? 'Edit Leave Request' : 'Add Leave Request'"
      :width="'min(95vw, 680px)'"
      :footer="null"
      destroy-on-close
      @cancel="closeModal"
    >
      <a-form layout="vertical" @finish="handleSave">
        <a-row :gutter="16">
          <a-col :span="24">
            <a-form-item label="Employee" required>
              <a-select
                v-model:value="form.employee_id"
                placeholder="Search employee by name or staff ID..."
                show-search
                :filter-option="false"
                :loading="employeesLoading"
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
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Start Date" required>
              <a-date-picker
                v-model:value="form.start_date"
                format="DD MMM YYYY"
                value-format="YYYY-MM-DD"
                style="width: 100%"
                placeholder="Select start date"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="End Date" required>
              <a-date-picker
                v-model:value="form.end_date"
                format="DD MMM YYYY"
                value-format="YYYY-MM-DD"
                style="width: 100%"
                placeholder="Select end date"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Status">
              <a-select v-model:value="form.status" placeholder="Select status" allow-clear>
                <a-select-option value="pending">Pending</a-select-option>
                <a-select-option value="approved">Approved</a-select-option>
                <a-select-option value="rejected">Rejected</a-select-option>
                <a-select-option value="cancelled">Cancelled</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Reason">
              <a-input v-model:value="form.reason" placeholder="Enter reason (optional)" allow-clear />
            </a-form-item>
          </a-col>
        </a-row>

        <!-- Leave Items -->
        <a-form-item label="Leave Items" required>
          <div
            v-for="(item, index) in form.items"
            :key="index"
            class="leave-item-row"
          >
            <a-select
              v-model:value="item.leave_type_id"
              placeholder="Leave type"
              :loading="leaveTypesLoading"
              allow-clear
              style="flex: 1"
            >
              <a-select-option
                v-for="lt in leaveTypes"
                :key="lt.id"
                :value="lt.id"
              >
                {{ lt.name }}
              </a-select-option>
            </a-select>
            <a-input-number
              v-model:value="item.days"
              :min="0.5"
              :step="0.5"
              placeholder="Days"
              style="width: 100px"
            />
            <a-button
              v-if="form.items.length > 1"
              type="text"
              danger
              @click="removeItem(index)"
            >
              Remove
            </a-button>
          </div>
          <a-button type="dashed" style="width: 100%; margin-top: 8px" @click="addItem">
            <template #icon><PlusOutlined /></template>
            Add Leave Type
          </a-button>
        </a-form-item>

        <div class="modal-footer">
          <a-button @click="closeModal">Cancel</a-button>
          <a-button type="primary" html-type="submit" :loading="saving">
            {{ editingId ? 'Save Changes' : 'Create' }}
          </a-button>
        </div>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject, createVNode } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { leaveApi } from '@/api/leaveApi'
import { employeeApi } from '@/api/employeeApi'
import { useAbortController } from '@/composables/useAbortController'
import { SearchOutlined, PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'

const dayjs = inject('$dayjs')
const appStore = useAppStore()
const authStore = useAuthStore()
const getSignal = useAbortController()

// ── Table state ───────────────────────────────────────────────────────────────

const requests = ref([])
const selectedRowKeys = ref([])
const loading = ref(false)
const search = ref('')
const filters = reactive({ status: undefined })
const pagination = reactive({ current_page: 1, per_page: 20, total: 0 })

const columns = [
  { title: 'Employee', key: 'employee', width: 200 },
  { title: 'Leave Type', key: 'leave_type', width: 160 },
  { title: 'Dates', key: 'dates', width: 240 },
  { title: 'Total Days', dataIndex: 'total_days', width: 100, align: 'center' },
  { title: 'Reason', dataIndex: 'reason', ellipsis: true },
  { title: 'Status', key: 'status', width: 110 },
  { title: 'Actions', key: 'actions', width: 130, align: 'right' },
]

const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showSizeChanger: true,
  showTotal: (total) => `${total} requests`,
  pageSizeOptions: ['10', '20', '50', '100'],
}))

// ── Modal state ───────────────────────────────────────────────────────────────

const modalVisible = ref(false)
const editingId = ref(null)
const saving = ref(false)

const defaultForm = () => ({
  employee_id: undefined,
  start_date: null,
  end_date: null,
  status: undefined,
  reason: '',
  items: [{ leave_type_id: undefined, days: null }],
})

const form = reactive(defaultForm())

// ── Options for dropdowns ─────────────────────────────────────────────────────

const employees = ref([])
const employeesLoading = ref(false)
const employeeSearchQuery = ref('')
let employeeSearchTimer = null
const leaveTypes = ref([])
const leaveTypesLoading = ref(false)

async function loadModalOptions() {
  if (leaveTypes.value.length) return
  leaveTypesLoading.value = true
  try {
    const { data } = await leaveApi.typeOptions()
    leaveTypes.value = data?.data || []
  } catch {
    message.error('Failed to load leave types')
  } finally {
    leaveTypesLoading.value = false
  }
}

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
    const { data } = await employeeApi.list({ search: query, per_page: 20 })
    employees.value = data?.data || []
  } catch {
    employees.value = []
  } finally {
    employeesLoading.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d) { return d ? dayjs(d).format('DD MMM YYYY') : '—' }

function statusColor(status) {
  const map = { pending: 'orange', approved: 'green', rejected: 'red', cancelled: 'default' }
  return map[status?.toLowerCase()] || 'default'
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchRequests() {
  loading.value = true
  try {
    const params = {
      page: pagination.current_page,
      per_page: pagination.per_page,
      ...(search.value && { search: search.value }),
      ...(filters.status && { status: filters.status }),
    }
    const { data } = await leaveApi.requests(params, { signal: getSignal() })
    requests.value = data.data || []
    if (data.pagination) Object.assign(pagination, data.pagination)
  } catch (err) { if (err.name !== 'CanceledError') message.error('Failed to load leave requests') }
  finally { loading.value = false }
}

function onSearchOrFilterChange() {
  pagination.current_page = 1
  fetchRequests()
}

function handleTableChange(pag) {
  pagination.current_page = pag.current
  pagination.per_page = pag.pageSize
  fetchRequests()
}

// ── Modal open / close ────────────────────────────────────────────────────────

function openCreate() {
  editingId.value = null
  Object.assign(form, defaultForm())
  modalVisible.value = true
  loadModalOptions()
}

function openEdit(record) {
  editingId.value = record.id
  form.employee_id = record.employee?.id ?? undefined
  form.start_date = record.start_date || null
  form.end_date = record.end_date || null
  form.status = record.status || undefined
  form.reason = record.reason || ''
  form.items = record.items?.length
    ? record.items.map((i) => ({ leave_type_id: i.leave_type?.id ?? i.leave_type_id, days: i.days }))
    : [{ leave_type_id: undefined, days: null }]
  if (record.employee) {
    employees.value = [record.employee]
  }
  modalVisible.value = true
  loadModalOptions()
}

function closeModal() {
  modalVisible.value = false
  editingId.value = null
}

// ── Leave item rows ───────────────────────────────────────────────────────────

function addItem() {
  form.items.push({ leave_type_id: undefined, days: null })
}

function removeItem(index) {
  form.items.splice(index, 1)
}

// ── Create / Update ───────────────────────────────────────────────────────────

async function handleSave() {
  if (!form.employee_id) { message.warning('Please select an employee'); return }
  if (!form.start_date || !form.end_date) { message.warning('Please select a date range'); return }
  if (form.items.some((i) => !i.leave_type_id || !i.days)) {
    message.warning('Please fill in all leave type items')
    return
  }

  saving.value = true
  try {
    const payload = {
      employee_id: form.employee_id,
      start_date: form.start_date,
      end_date: form.end_date,
      ...(form.status && { status: form.status }),
      ...(form.reason.trim() && { reason: form.reason.trim() }),
      items: form.items.map((i) => ({ leave_type_id: i.leave_type_id, days: i.days })),
    }

    if (editingId.value) {
      await leaveApi.requestUpdate(editingId.value, payload)
      message.success('Leave request updated successfully')
    } else {
      await leaveApi.requestStore(payload)
      message.success('Leave request created successfully')
    }

    closeModal()
    fetchRequests()
  } catch (err) {
    const errors = err.response?.data?.errors
    const firstError = errors ? Object.values(errors)[0]?.[0] : null
    message.error(firstError || err.response?.data?.message || 'Failed to save leave request')
  } finally {
    saving.value = false
  }
}

// ── Delete (single row) ───────────────────────────────────────────────────────

function handleDelete(record) {
  const name = `${record.employee?.first_name_en || ''} ${record.employee?.last_name_en || ''}`.trim() || `#${record.id}`
  Modal.confirm({
    title: 'Delete Leave Request',
    icon: createVNode(ExclamationCircleOutlined),
    content: `Are you sure you want to delete the leave request for "${name}"? This action cannot be undone.`,
    okText: 'Delete',
    okType: 'danger',
    cancelText: 'Cancel',
    centered: true,
    async onOk() {
      try {
        await leaveApi.requestDestroy(record.id)
        message.success('Leave request deleted successfully')
        fetchRequests()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to delete leave request')
      }
    },
  })
}

// ── Bulk delete ───────────────────────────────────────────────────────────────

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
        await leaveApi.requestDestroyBatch(selectedRowKeys.value)
        message.success(`${selectedRowKeys.value.length} record(s) deleted successfully`)
        selectedRowKeys.value = []
        fetchRequests()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to delete records')
      }
    },
  })
}

onMounted(() => { appStore.setPageMeta('Leave Requests'); fetchRequests() })
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

.cell-employee { display: flex; flex-direction: column; }
.cell-name { font-weight: 600; font-size: 13.5px; }
.cell-staff-id { font-size: 12px; color: var(--color-text-muted); }

.leave-item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-light);
}
</style>
