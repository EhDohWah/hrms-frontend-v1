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
          v-model:value="filters.supervisor_approved"
          placeholder="Supervisor Status"
          allow-clear
          class="filter-input"
          style="width: 180px"
          @change="onSearchOrFilterChange"
        >
          <a-select-option value="pending">Pending</a-select-option>
          <a-select-option value="approved">Acknowledged</a-select-option>
          <a-select-option value="rejected">Declined</a-select-option>
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
        <a-button v-if="selectedRowKeys.length > 0 && authStore.canDelete('resignations')" danger @click="handleBulkDelete">
          Delete {{ selectedRowKeys.length }} Selected
        </a-button>
        <a-button v-if="authStore.canCreate('resignations')" type="primary" @click="openCreate">
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
        :row-selection="authStore.canDelete('resignations') ? { selectedRowKeys, onChange: (keys) => selectedRowKeys = keys } : undefined"
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
          <template v-else-if="column.key === 'status'">
            <a-tag :color="getResignationApprovalStatus(record).color" size="small">
              {{ getResignationApprovalStatus(record).label }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button v-if="authStore.canUpdate('resignations')" size="small" type="link" @click="openEdit(record)">Edit</a-button>
              <a-button v-if="authStore.canDelete('resignations')" size="small" type="link" danger @click="handleDelete(record)">Delete</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingItem ? 'Edit Resignation' : 'Submit Resignation'"
      :footer="null"
      :width="'min(95vw, 560px)'"
    >
      <a-form :model="form" layout="vertical" class="modal-form">
        <a-form-item label="Employee" required>
          <a-select
            v-model:value="form.employee_id"
            show-search
            :filter-option="false"
            placeholder="Search employee by name or staff ID..."
            :disabled="!!editingItem"
            :loading="employeeSearching"
            :not-found-content="employeeSearchQuery ? 'No employees found' : 'Type to search...'"
            allow-clear
            @search="handleEmployeeSearch"
          >
            <a-select-option
              v-for="emp in employeeOptions"
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
        <a-form-item label="Notes">
          <a-textarea v-model:value="form.notes" placeholder="Notes (optional)" :rows="3" />
        </a-form-item>
        <!-- Acknowledgement Information -->
        <a-divider orientation="left" orientation-margin="0" style="font-size: 13px; color: var(--color-text-secondary)">
          Acknowledgement Information
        </a-divider>
        <div class="approval-hint">Record acknowledgement status and dates as shown on physical forms</div>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Supervisor Acknowledgement">
              <a-select
                v-model:value="form.supervisorStatus"
                :options="ACKNOWLEDGEMENT_OPTIONS"
                @change="(val) => onAcknowledgementChange(val, 'supervisor_approved_at')"
              />
            </a-form-item>
            <a-form-item v-if="form.supervisorStatus !== 'pending'" label="Date">
              <a-date-picker v-model:value="form.supervisor_approved_at" format="DD MMM YYYY" value-format="YYYY-MM-DD" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="HR Acknowledgement">
              <a-select
                v-model:value="form.hrStatus"
                :options="ACKNOWLEDGEMENT_OPTIONS"
                @change="(val) => onAcknowledgementChange(val, 'hr_manager_approved_at')"
              />
            </a-form-item>
            <a-form-item v-if="form.hrStatus !== 'pending'" label="Date">
              <a-date-picker v-model:value="form.hr_manager_approved_at" format="DD MMM YYYY" value-format="YYYY-MM-DD" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <div class="modal-footer">
          <a-button @click="modalVisible = false">Cancel</a-button>
          <a-button v-if="!editingItem" :loading="savingAnother" :disabled="savingMain" @click="handleSaveAndAddAnother">Save &amp; Add Another</a-button>
          <a-button type="primary" :loading="savingMain" :disabled="savingAnother" @click="handleSave">{{ editingItem ? 'Update' : 'Save' }}</a-button>
        </div>
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
import { useSaveAnother } from '@/composables/useSaveAnother'
import { resignationApi, departmentApi, employeeApi } from '@/api'
import { formatDate } from '@/utils/formatters'
import { getOrgColor } from '@/constants/organizations'
import { getResignationApprovalStatus, ACKNOWLEDGEMENT_OPTIONS, booleanToAcknowledgement, buildResignationPayload } from '@/constants/resignations'

const appStore = useAppStore()
const authStore = useAuthStore()
const getSignal = useAbortController()

const items = ref([])
const selectedRowKeys = ref([])
const loading = ref(false)
const { savingMain, savingAnother, submitMain, submitAnother } = useSaveAnother({
  refresh: fetchItems, reset: resetForm,
})
const search = ref('')
const filters = reactive({ supervisor_approved: undefined, department_id: undefined })
const departmentOptions = ref([])
const sortState = reactive({ field: 'resignation_date', order: 'descend' })
const pagination = reactive({ current_page: 1, per_page: 20, total: 0 })
const modalVisible = ref(false)
const editingItem = ref(null)
const employeeOptions = ref([])
const employeeSearching = ref(false)
const employeeSearchQuery = ref('')
let employeeSearchTimer = null

const form = reactive({
  employee_id: undefined, resignation_date: null, last_working_date: null,
  notes: '',
  supervisorStatus: 'pending', supervisor_approved_at: null,
  hrStatus: 'pending', hr_manager_approved_at: null,
})

const columns = computed(() => [
  { title: 'Employee', key: 'employee', width: 220 },
  { title: 'Department', key: 'department', width: 150 },
  { title: 'Position', key: 'position', width: 150 },
  { title: 'Resignation Date', key: 'resignation_date', width: 140, sorter: true, sortOrder: sortState.field === 'resignation_date' ? sortState.order : null },
  { title: 'Last Working Date', key: 'last_working_date', width: 140, sorter: true, sortOrder: sortState.field === 'last_working_date' ? sortState.order : null },
  { title: 'Notes', dataIndex: 'notes', ellipsis: true },
  { title: 'Status', key: 'status', width: 120, align: 'center' },
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


const SORT_FIELD_MAP = { resignation_date: 'resignation_date', last_working_date: 'last_working_date' }

async function fetchItems() {
  loading.value = true
  try {
    const params = {
      page: pagination.current_page,
      per_page: pagination.per_page,
      ...(search.value && { search: search.value }),
      ...(filters.supervisor_approved && { supervisor_approved: filters.supervisor_approved }),
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

function handleEmployeeSearch(query) {
  employeeSearchQuery.value = query
  if (employeeSearchTimer) clearTimeout(employeeSearchTimer)
  if (!query || query.length < 2) {
    employeeOptions.value = []
    return
  }
  employeeSearchTimer = setTimeout(() => searchEmployees(query), 300)
}

async function searchEmployees(query) {
  employeeSearching.value = true
  try {
    const { data } = await employeeApi.list({ search: query, per_page: 20 })
    employeeOptions.value = data?.data || []
  } catch {
    employeeOptions.value = []
  } finally {
    employeeSearching.value = false
  }
}

function resetForm() {
  Object.assign(form, {
    employee_id: undefined, resignation_date: null, last_working_date: null,
    notes: '',
    supervisorStatus: 'pending', supervisor_approved_at: null,
    hrStatus: 'pending', hr_manager_approved_at: null,
  })
  employeeOptions.value = []
  employeeSearchQuery.value = ''
}

function onAcknowledgementChange(val, dateField) {
  if (val === 'pending') form[dateField] = null
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
      first_name_en: record.employee.first_name_en || '',
      last_name_en: record.employee.last_name_en || '',
    }]
  }
  Object.assign(form, {
    employee_id: record.employee_id || undefined,
    resignation_date: record.resignation_date || null,
    last_working_date: record.last_working_date || null,
    notes: record.notes || '',
    supervisorStatus: booleanToAcknowledgement(record.supervisor_approved),
    supervisor_approved_at: record.supervisor_approved_at ? record.supervisor_approved_at.substring(0, 10) : null,
    hrStatus: booleanToAcknowledgement(record.hr_manager_approved),
    hr_manager_approved_at: record.hr_manager_approved_at ? record.hr_manager_approved_at.substring(0, 10) : null,
  })
  modalVisible.value = true
}

function validateForm() {
  if (!form.employee_id) { message.warning('Please select an employee'); return false }
  if (!form.resignation_date) { message.warning('Resignation date is required'); return false }
  if (!form.last_working_date) { message.warning('Last working date is required'); return false }
  return true
}

async function handleSave() {
  if (!validateForm()) return
  await submitMain(async () => {
    const payload = buildResignationPayload(form, form.employee_id)
    if (editingItem.value) {
      await resignationApi.update(editingItem.value.id, payload)
      message.success('Resignation updated')
    } else {
      await resignationApi.store(payload)
      message.success('Resignation saved')
    }
    modalVisible.value = false
  })
}

async function handleSaveAndAddAnother() {
  if (!validateForm()) return
  await submitAnother(async () => {
    await resignationApi.store(buildResignationPayload(form, form.employee_id))
    message.success('Resignation saved')
  })
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
.cell-name { font-weight: 600; font-size: 13px; }
.cell-sub { font-size: 12px; color: var(--color-text-muted); display: flex; align-items: center; gap: 4px; }
.org-tag-inline { margin: 0; font-size: 10px; line-height: 1; }
.modal-form { margin-top: 16px; }
.approval-hint { font-size: 12px; color: var(--color-text-muted); margin-bottom: 12px; margin-top: -8px; }
.field-hint { font-size: 12px; color: var(--color-text-muted); margin-top: 4px; }
</style>
