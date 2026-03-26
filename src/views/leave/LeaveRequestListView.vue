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
          <a-select-option value="declined">Declined</a-select-option>
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
      :width="'min(95vw, 820px)'"
      :footer="null"
      destroy-on-close
      @cancel="closeModal"
    >
      <a-form layout="vertical" class="modal-form" @submit.prevent="handleSave">
        <!-- Employee -->
        <a-form-item label="Employee" required>
          <a-select
            v-model:value="form.employee_id"
            placeholder="Search employee by name or staff ID..."
            show-search
            :filter-option="false"
            :loading="employeesLoading"
            :disabled="!!editingId"
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
          <div v-if="editingId" class="field-hint">Employee cannot be changed in edit mode</div>
        </a-form-item>

        <!-- Leave Items -->
        <a-form-item required>
          <template #label>
            <div class="label-with-action">
              <span>Leave Request Details</span>
              <a-button type="link" size="small" @click="addItem"><PlusOutlined /> Add Leave Type</a-button>
            </div>
          </template>
          <div v-for="(item, index) in form.items" :key="index" class="leave-item-card">
            <div class="item-grid">
              <div>
                <div class="item-label">Leave Type <span class="required-mark">*</span></div>
                <a-select
                  v-model:value="item.leave_type_id"
                  placeholder="Select type"
                  :loading="leaveTypesLoading"
                  allow-clear
                  size="small"
                  style="width: 100%"
                  @change="onLeaveTypeChange(index)"
                >
                  <a-select-option v-for="lt in getAvailableLeaveTypes(index)" :key="lt.id" :value="lt.id">
                    {{ lt.name }}
                  </a-select-option>
                </a-select>
              </div>
              <div>
                <div class="item-label">From <span class="required-mark">*</span></div>
                <a-date-picker
                  v-model:value="item.start_date"
                  format="DD MMM YYYY"
                  value-format="YYYY-MM-DD"
                  size="small"
                  style="width: 100%"
                  placeholder="Start"
                  @change="onItemDateChange(index)"
                />
              </div>
              <div>
                <div class="item-label">To <span class="required-mark">*</span></div>
                <a-date-picker
                  v-model:value="item.end_date"
                  format="DD MMM YYYY"
                  value-format="YYYY-MM-DD"
                  size="small"
                  style="width: 100%"
                  placeholder="End"
                  @change="onItemDateChange(index)"
                />
              </div>
              <div>
                <div class="item-label">Days</div>
                <a-input
                  :value="item.days ?? '—'"
                  size="small"
                  read-only
                  class="days-readonly"
                />
              </div>
              <div>
                <div class="item-label">Balance</div>
                <div class="balance-badge" :class="balanceBadgeClass(item)">
                  <template v-if="itemBalances[item.leave_type_id] !== undefined">
                    {{ itemBalances[item.leave_type_id] }}d
                  </template>
                  <LoadingOutlined v-else-if="balanceLoading[item.leave_type_id]" />
                  <template v-else>—</template>
                </div>
              </div>
              <div>
                <div class="item-label" style="visibility: hidden">X</div>
                <a-button
                  type="text"
                  danger
                  size="small"
                  :disabled="form.items.length <= 1"
                  @click="removeItem(index)"
                >
                  <DeleteOutlined />
                </a-button>
              </div>
            </div>
            <!-- Balance warning -->
            <div
              v-if="item.leave_type_id && item.days > 0 && itemBalances[item.leave_type_id] !== undefined && item.days > itemBalances[item.leave_type_id]"
              class="balance-warning"
            >
              <WarningOutlined /> Insufficient balance — available: {{ itemBalances[item.leave_type_id] }}d, requested: {{ item.days }}d
            </div>
          </div>
        </a-form-item>

        <!-- Status + Reason -->
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="Status">
              <a-select v-model:value="form.status" placeholder="Select status" allow-clear>
                <a-select-option value="pending">Pending</a-select-option>
                <a-select-option value="approved">Approved</a-select-option>
                <a-select-option value="declined">Declined</a-select-option>
                <a-select-option value="cancelled">Cancelled</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="16">
            <a-form-item label="Reason">
              <a-textarea
                v-model:value="form.reason"
                placeholder="Enter reason for leave request"
                :rows="2"
                :maxlength="1000"
                show-count
              />
            </a-form-item>
          </a-col>
        </a-row>

        <!-- Approval Information -->
        <a-divider orientation="left" orientation-margin="0" style="font-size: 13px; color: var(--color-text-secondary)">
          Approval Information
        </a-divider>
        <div class="approval-hint">Record approval status and dates as shown on physical forms</div>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item>
              <a-checkbox v-model:checked="form.supervisor_approved">Supervisor Approved</a-checkbox>
            </a-form-item>
            <a-form-item v-if="form.supervisor_approved" label="Supervisor Approval Date">
              <a-date-picker
                v-model:value="form.supervisor_approved_date"
                format="DD MMM YYYY"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item>
              <a-checkbox v-model:checked="form.hr_site_admin_approved">HR/Site Admin Approved</a-checkbox>
            </a-form-item>
            <a-form-item v-if="form.hr_site_admin_approved" label="HR/Site Admin Approval Date">
              <a-date-picker
                v-model:value="form.hr_site_admin_approved_date"
                format="DD MMM YYYY"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <!-- Attachment Notes -->
        <a-form-item label="Attachment Notes">
          <a-textarea
            v-model:value="form.attachment_notes"
            placeholder="Reference any documents attached to the paper form (e.g., 'Medical certificate submitted')"
            :rows="2"
          />
        </a-form-item>

        <a-alert
          v-if="requiresAttachment && !form.attachment_notes?.trim()"
          message="This leave type requires attachment notes. Please describe any documents attached."
          type="warning"
          show-icon
          style="margin-bottom: 16px"
        />

        <!-- Overlap warning -->
        <a-alert
          v-if="overlapWarning"
          :message="overlapWarning"
          type="error"
          show-icon
          style="margin-bottom: 16px"
        />

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
import { ref, reactive, computed, onMounted, createVNode } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { leaveApi } from '@/api/leaveApi'
import { employeeApi } from '@/api/employeeApi'
import { useAbortController } from '@/composables/useAbortController'
import { formatDate } from '@/utils/formatters'
import {
  SearchOutlined, PlusOutlined, ExclamationCircleOutlined,
  DeleteOutlined, LoadingOutlined, WarningOutlined,
} from '@ant-design/icons-vue'

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

const defaultItem = () => ({ leave_type_id: undefined, start_date: null, end_date: null, days: null })

const defaultForm = () => ({
  employee_id: undefined,
  status: undefined,
  reason: '',
  items: [defaultItem()],
  supervisor_approved: false,
  supervisor_approved_date: null,
  hr_site_admin_approved: false,
  hr_site_admin_approved_date: null,
  attachment_notes: '',
})

const form = reactive(defaultForm())

// ── Options for dropdowns ─────────────────────────────────────────────────────

const employees = ref([])
const employeesLoading = ref(false)
const employeeSearchQuery = ref('')
let employeeSearchTimer = null
const leaveTypes = ref([])
const leaveTypesLoading = ref(false)

// ── Balance + calculation state ──────────────────────────────────────────────

const itemBalances = reactive({})
const balanceLoading = reactive({})
const overlapWarning = ref(null)

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

function statusColor(status) {
  const map = { pending: 'orange', approved: 'green', declined: 'red', cancelled: 'default' }
  return map[status?.toLowerCase()] || 'default'
}

const requiresAttachment = computed(() =>
  form.items.some(item => {
    const lt = leaveTypes.value.find(t => t.id === item.leave_type_id)
    return lt?.requires_attachment
  })
)

function getAvailableLeaveTypes(currentIndex) {
  const selectedIds = form.items
    .map((item, i) => i !== currentIndex ? item.leave_type_id : null)
    .filter(Boolean)
  return leaveTypes.value.filter(lt => !selectedIds.includes(lt.id))
}

function balanceBadgeClass(item) {
  const bal = itemBalances[item.leave_type_id]
  if (bal === undefined) return ''
  if (item.days && item.days > bal) return 'balance-danger'
  if (bal <= 3) return 'balance-warning-color'
  return 'balance-ok'
}

// ── Balance fetching ─────────────────────────────────────────────────────────

async function fetchBalance(leaveTypeId) {
  if (!form.employee_id || !leaveTypeId) return
  if (balanceLoading[leaveTypeId]) return
  balanceLoading[leaveTypeId] = true
  try {
    const { data } = await leaveApi.balanceShow(form.employee_id, leaveTypeId)
    const bal = data?.data
    itemBalances[leaveTypeId] = bal?.remaining_days ?? 0
  } catch {
    itemBalances[leaveTypeId] = 0
  } finally {
    balanceLoading[leaveTypeId] = false
  }
}

function onLeaveTypeChange(index) {
  const item = form.items[index]
  if (item.leave_type_id && form.employee_id) {
    fetchBalance(item.leave_type_id)
  }
}

async function fetchAllBalances() {
  for (const item of form.items) {
    if (item.leave_type_id) fetchBalance(item.leave_type_id)
  }
}

// ── Per-item days calculation ────────────────────────────────────────────────

async function onItemDateChange(index) {
  const item = form.items[index]
  item.days = null
  if (!item.start_date || !item.end_date) return
  try {
    const { data } = await leaveApi.calculateDays({ start_date: item.start_date, end_date: item.end_date })
    item.days = data?.data?.working_days ?? null
  } catch { /* silent */ }
}

/** Derive request-level start/end from all items */
function getDerivedDateRange() {
  const starts = form.items.map(i => i.start_date).filter(Boolean).sort()
  const ends = form.items.map(i => i.end_date).filter(Boolean).sort()
  return {
    start_date: starts[0] || null,
    end_date: ends[ends.length - 1] || null,
  }
}

// ── Overlap check ────────────────────────────────────────────────────────────

async function checkOverlap() {
  const { start_date, end_date } = getDerivedDateRange()
  if (!form.employee_id || !start_date || !end_date) return true
  try {
    const payload = {
      employee_id: form.employee_id,
      start_date,
      end_date,
      ...(editingId.value && { exclude_request_id: editingId.value }),
    }
    const { data } = await leaveApi.checkOverlap(payload)
    if (data?.data?.has_overlap) {
      overlapWarning.value = data.data.message || 'This date range overlaps with an existing leave request.'
      return false
    }
    overlapWarning.value = null
    return true
  } catch {
    return true
  }
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

function resetModalState() {
  Object.keys(itemBalances).forEach(k => delete itemBalances[k])
  Object.keys(balanceLoading).forEach(k => delete balanceLoading[k])
  overlapWarning.value = null
}

function openCreate() {
  editingId.value = null
  Object.assign(form, defaultForm())
  resetModalState()
  modalVisible.value = true
  loadModalOptions()
}

function openEdit(record) {
  editingId.value = record.id
  resetModalState()
  form.employee_id = record.employee?.id ?? undefined
  form.status = record.status || undefined
  form.reason = record.reason || ''
  form.items = record.items?.length
    ? record.items.map((i) => ({
        leave_type_id: i.leave_type?.id ?? i.leave_type_id,
        start_date: record.start_date || null,
        end_date: record.end_date || null,
        days: i.days,
      }))
    : [defaultItem()]
  form.supervisor_approved = record.supervisor_approved || false
  form.supervisor_approved_date = record.supervisor_approved_date || null
  form.hr_site_admin_approved = record.hr_site_admin_approved || false
  form.hr_site_admin_approved_date = record.hr_site_admin_approved_date || null
  form.attachment_notes = record.attachment_notes || ''
  if (record.employee) {
    employees.value = [record.employee]
  }
  modalVisible.value = true
  loadModalOptions()
  if (form.employee_id) fetchAllBalances()
}

function closeModal() {
  modalVisible.value = false
  editingId.value = null
}

// ── Leave item rows ───────────────────────────────────────────────────────────

function addItem() {
  form.items.push(defaultItem())
}

function removeItem(index) {
  const removed = form.items[index]
  form.items.splice(index, 1)
  if (removed.leave_type_id) {
    delete itemBalances[removed.leave_type_id]
    delete balanceLoading[removed.leave_type_id]
  }
}

// ── Create / Update ───────────────────────────────────────────────────────────

async function handleSave() {
  if (!form.employee_id) { message.warning('Please select an employee'); return }
  const incompleteItem = form.items.some((i) => !i.leave_type_id || !i.start_date || !i.end_date || !i.days)
  if (incompleteItem) {
    message.warning('Please fill in all fields for each leave item (type, dates)')
    return
  }
  if (requiresAttachment.value && !form.attachment_notes?.trim()) {
    message.warning('Attachment notes are required for the selected leave type')
    return
  }

  saving.value = true

  // Overlap check
  const noOverlap = await checkOverlap()
  if (!noOverlap) { saving.value = false; return }
  try {
    const { start_date, end_date } = getDerivedDateRange()
    const payload = {
      employee_id: form.employee_id,
      start_date,
      end_date,
      ...(form.status && { status: form.status }),
      ...(form.reason?.trim() && { reason: form.reason.trim() }),
      items: form.items.map((i) => ({ leave_type_id: i.leave_type_id, days: i.days })),
      supervisor_approved: form.supervisor_approved,
      ...(form.supervisor_approved && form.supervisor_approved_date && { supervisor_approved_date: form.supervisor_approved_date }),
      hr_site_admin_approved: form.hr_site_admin_approved,
      ...(form.hr_site_admin_approved && form.hr_site_admin_approved_date && { hr_site_admin_approved_date: form.hr_site_admin_approved_date }),
      ...(form.attachment_notes?.trim() && { attachment_notes: form.attachment_notes.trim() }),
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

.modal-form { margin-top: 16px; }

.field-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 4px;
}

.label-with-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.leave-item-card {
  padding: 14px 16px;
  border: 1.5px solid var(--color-border-light);
  border-radius: var(--radius-md);
  margin-bottom: 10px;
  background: var(--color-bg-subtle);
  transition: border-color var(--transition-base);
}
.leave-item-card:hover { border-color: #c7d2fe; }

.item-grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr 1fr 0.7fr 0.7fr 40px;
  gap: 10px;
  align-items: end;
}
@media (max-width: 768px) {
  .item-grid { grid-template-columns: 1fr 1fr; }
}

.item-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}
.required-mark { color: var(--color-danger); }

.days-readonly {
  text-align: center;
  background: var(--color-bg-muted) !important;
  cursor: default;
}
.days-readonly :deep(input) {
  text-align: center;
  cursor: default;
}

.balance-badge {
  font-size: 12px;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: var(--radius-sm);
  text-align: center;
  white-space: nowrap;
  background: var(--color-bg-muted);
  color: var(--color-text-secondary);
}
.balance-ok { background: #f0fdf4; color: #16a34a; }
.balance-warning-color { background: #fffbeb; color: #d97706; }
.balance-danger { background: #fef2f2; color: #dc2626; }

.balance-warning {
  font-size: 12px;
  color: #d97706;
  margin-top: 8px;
  padding: 8px 12px;
  background: #fffbeb;
  border: 1px solid #fed7aa;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  gap: 6px;
}

.approval-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 12px;
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
