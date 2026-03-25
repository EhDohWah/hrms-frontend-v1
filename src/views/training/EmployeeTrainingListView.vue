<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ pagination.total || 0 }} Total</a-tag>
      </div>
      <div class="filter-bar">
        <a-select
          v-model:value="filters.status"
          placeholder="Status"
          allow-clear
          class="filter-input"
          style="width: 160px"
          @change="onFilterChange"
        >
          <a-select-option v-for="s in ENROLLMENT_STATUSES" :key="s.value" :value="s.value">{{ s.label }}</a-select-option>
        </a-select>
        <a-button v-if="selectedRowKeys.length > 0 && authStore.canDelete('employee_training')" danger @click="handleBulkDelete">
          Delete {{ selectedRowKeys.length }} Selected
        </a-button>
        <a-button v-if="authStore.canCreate('employee_training')" type="primary" @click="openCreate">
          <PlusOutlined /> Enroll Employee
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
        :row-selection="authStore.canDelete('employee_training') ? { selectedRowKeys, onChange: (keys) => selectedRowKeys = keys } : undefined"
        :scroll="{ x: 'max-content' }"
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
          <template v-else-if="column.key === 'training'">
            <router-link
              v-if="record.training?.id"
              :to="{ name: 'training-detail', params: { id: record.training.id } }"
              class="cell-link"
            >
              <span class="cell-name">{{ record.training?.title }}</span>
            </router-link>
            <span v-else>{{ record.training?.title || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'period'">
            {{ formatDate(record.training?.start_date) }} → {{ formatDate(record.training?.end_date) }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="getEnrollmentStatusColor(record.status)" size="small">{{ record.status || '—' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'enrolled_at'">
            {{ formatDate(record.created_at) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button v-if="authStore.canUpdate('employee_training')" size="small" type="link" @click="openEdit(record)">Edit</a-button>
              <a-button v-if="authStore.canDelete('employee_training')" size="small" type="link" danger @click="handleDelete(record)">Remove</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Enroll / Edit Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingItem ? 'Edit Enrollment' : 'Enroll Employee'"
      @ok="handleSave"
      :confirm-loading="saving"
      :width="'min(95vw, 520px)'"
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
              {{ emp.first_name_en }} {{ emp.last_name_en || '' }}
              <span class="font-mono" style="color: var(--color-text-muted);">({{ emp.staff_id }})</span>
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Training" required>
          <a-select
            v-model:value="form.training_id"
            show-search
            :filter-option="false"
            placeholder="Search training by title..."
            :disabled="!!editingItem"
            :loading="trainingSearching"
            :not-found-content="trainingSearching ? undefined : null"
            @search="handleTrainingSearch"
          >
            <a-select-option v-for="t in trainingOptions" :key="t.id" :value="t.id">
              {{ t.title }}
              <span style="color: var(--color-text-muted);"> — {{ t.organizer }}</span>
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Status" required>
          <a-select v-model:value="form.status" placeholder="Select status">
            <a-select-option v-for="s in ENROLLMENT_STATUSES" :key="s.value" :value="s.value">{{ s.label }}</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, createVNode } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { employeeTrainingApi, employeeApi, trainingApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'
import { formatDate } from '@/utils/formatters'
import { cleanParams } from '@/utils/helpers'
import { PAGINATION_DEFAULTS } from '@/constants/config'
import { ENROLLMENT_STATUSES, getEnrollmentStatusColor } from '@/constants/training'

const appStore = useAppStore()
const authStore = useAuthStore()
const getSignal = useAbortController()

const items = ref([])
const loading = ref(false)
const saving = ref(false)
const filters = reactive({ status: undefined })
const pagination = reactive({ current_page: 1, per_page: PAGINATION_DEFAULTS.perPage, total: 0 })
const selectedRowKeys = ref([])
const modalVisible = ref(false)
const editingItem = ref(null)

const form = reactive({
  employee_id: undefined, training_id: undefined, status: 'Pending',
})

// Employee search
const employeeOptions = ref([])
const employeeSearching = ref(false)
let employeeSearchTimer = null

// Training search
const trainingOptions = ref([])
const trainingSearching = ref(false)
let trainingSearchTimer = null

const columns = [
  { title: 'Employee', key: 'employee', width: 220 },
  { title: 'Training', key: 'training', width: 220 },
  { title: 'Organizer', dataIndex: ['training', 'organizer'], width: 160 },
  { title: 'Period', key: 'period', width: 260 },
  { title: 'Status', key: 'status', width: 130, align: 'center' },
  { title: 'Enrolled On', key: 'enrolled_at', width: 140 },
  { title: '', key: 'actions', width: 150, align: 'right' },
]

const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showSizeChanger: true,
  showTotal: (total) => `${total} enrollments`,
  pageSizeOptions: PAGINATION_DEFAULTS.pageSizeOptions,
}))

async function fetchItems() {
  loading.value = true
  try {
    const params = cleanParams({
      page: pagination.current_page,
      per_page: pagination.per_page,
      filter_status: filters.status || null,
    })
    const { data } = await employeeTrainingApi.list(params, { signal: getSignal() })
    items.value = data.data || []
    if (data.pagination) Object.assign(pagination, data.pagination)
  } catch (err) {
    if (err.name !== 'CanceledError') message.error('Failed to load employee training records')
  } finally {
    loading.value = false
  }
}

function onFilterChange() {
  pagination.current_page = 1
  fetchItems()
}

function handleTableChange(pag) {
  pagination.current_page = pag.current
  pagination.per_page = pag.pageSize
  fetchItems()
}

// ---- Employee search ----
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

// ---- Training search ----
function handleTrainingSearch(val) {
  if (trainingSearchTimer) clearTimeout(trainingSearchTimer)
  if (!val || val.length < 2) {
    trainingOptions.value = []
    return
  }
  trainingSearching.value = true
  trainingSearchTimer = setTimeout(async () => {
    try {
      const { data } = await trainingApi.list({ search: val, per_page: 10 })
      trainingOptions.value = data.data || []
    } catch { /* ignore */ }
    trainingSearching.value = false
  }, 300)
}

function resetForm() {
  Object.assign(form, { employee_id: undefined, training_id: undefined, status: 'Pending' })
  employeeOptions.value = []
  trainingOptions.value = []
}

function openCreate() {
  editingItem.value = null
  resetForm()
  modalVisible.value = true
}

function openEdit(record) {
  editingItem.value = record
  if (record.employee) {
    employeeOptions.value = [{
      id: record.employee_id,
      staff_id: record.employee.staff_id,
      first_name_en: record.employee.first_name_en,
      last_name_en: record.employee.last_name_en,
    }]
  }
  if (record.training) {
    trainingOptions.value = [{
      id: record.training_id,
      title: record.training.title,
      organizer: record.training.organizer,
    }]
  }
  Object.assign(form, {
    employee_id: record.employee_id || undefined,
    training_id: record.training_id || undefined,
    status: record.status || 'Pending',
  })
  modalVisible.value = true
}

async function handleSave() {
  if (!form.employee_id) return message.warning('Please select an employee')
  if (!form.training_id) return message.warning('Please select a training')
  if (!form.status) return message.warning('Status is required')
  saving.value = true
  try {
    if (editingItem.value) {
      await employeeTrainingApi.update(editingItem.value.id, { status: form.status })
      message.success('Enrollment updated')
    } else {
      await employeeTrainingApi.store(cleanParams({ ...form }))
      message.success('Employee enrolled')
    }
    modalVisible.value = false
    fetchItems()
  } catch (err) {
    message.error(err.response?.data?.message || 'Failed to save enrollment')
  } finally {
    saving.value = false
  }
}

function handleDelete(record) {
  const name = `${record.employee?.first_name_en || ''} ${record.employee?.last_name_en || ''}`.trim()
  Modal.confirm({
    title: 'Remove Enrollment',
    content: `Are you sure you want to remove ${name || 'this employee'} from "${record.training?.title || 'this training'}"?`,
    okType: 'danger',
    onOk: async () => {
      try {
        await employeeTrainingApi.destroy(record.id)
        message.success('Enrollment removed')
        selectedRowKeys.value = []
        fetchItems()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to remove enrollment')
      }
    },
  })
}

function handleBulkDelete() {
  Modal.confirm({
    title: 'Delete Selected Records',
    icon: createVNode(ExclamationCircleOutlined),
    content: `Are you sure you want to remove ${selectedRowKeys.value.length} selected enrollment(s)? This action cannot be undone.`,
    okText: 'Delete',
    okType: 'danger',
    cancelText: 'Cancel',
    centered: true,
    async onOk() {
      try {
        await Promise.all(selectedRowKeys.value.map((id) => employeeTrainingApi.destroy(id)))
        message.success(`${selectedRowKeys.value.length} enrollment(s) removed successfully`)
        selectedRowKeys.value = []
        fetchItems()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to remove enrollments')
      }
    },
  })
}

onMounted(() => {
  appStore.setPageMeta('Employee Training')
  fetchItems()
})

onUnmounted(() => {
  if (employeeSearchTimer) clearTimeout(employeeSearchTimer)
  if (trainingSearchTimer) clearTimeout(trainingSearchTimer)
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
.cell-name { font-weight: 600; font-size: 14px; }
.cell-sub { font-size: 12px; color: var(--color-text-muted); }
.modal-form { margin-top: 16px; }
</style>
