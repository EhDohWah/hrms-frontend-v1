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
          <a-select-option value="pending">Pending</a-select-option>
          <a-select-option value="acknowledged">Acknowledged</a-select-option>
          <a-select-option value="approved">Approved</a-select-option>
          <a-select-option value="rejected">Rejected</a-select-option>
          <a-select-option value="completed">Completed</a-select-option>
        </a-select>
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
                <span class="cell-sub font-mono">{{ record.employee?.staff_id }}</span>
              </div>
            </router-link>
          </template>
          <template v-else-if="column.key === 'resignation_date'">
            {{ formatDate(record.resignation_date) }}
          </template>
          <template v-else-if="column.key === 'last_working_date'">
            {{ formatDate(record.last_working_date) }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)" size="small">{{ record.status || '—' }}</a-tag>
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
        <a-form-item label="Employee ID" required>
          <a-input v-model:value="form.employee_id" placeholder="Enter employee ID" :disabled="!!editingItem" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Resignation Date" required>
              <a-date-picker v-model:value="form.resignation_date" style="width: 100%" format="DD MMM YYYY" value-format="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Last Working Date">
              <a-date-picker v-model:value="form.last_working_date" style="width: 100%" format="DD MMM YYYY" value-format="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Reason" required>
          <a-textarea v-model:value="form.reason" placeholder="Enter reason for resignation" :rows="3" />
        </a-form-item>
        <a-form-item label="Status">
          <a-select v-model:value="form.status" placeholder="Select status">
            <a-select-option value="pending">Pending</a-select-option>
            <a-select-option value="acknowledged">Acknowledged</a-select-option>
            <a-select-option value="approved">Approved</a-select-option>
            <a-select-option value="rejected">Rejected</a-select-option>
            <a-select-option value="completed">Completed</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Notes">
          <a-textarea v-model:value="form.notes" placeholder="Additional notes" :rows="2" />
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
import { useAbortController } from '@/composables/useAbortController'
import { resignationApi } from '@/api'

const dayjs = inject('$dayjs')
const appStore = useAppStore()
const authStore = useAuthStore()
const getSignal = useAbortController()

const items = ref([])
const selectedRowKeys = ref([])
const loading = ref(false)
const saving = ref(false)
const search = ref('')
const filters = reactive({ status: undefined })
const pagination = reactive({ current_page: 1, per_page: 20, total: 0 })
const modalVisible = ref(false)
const editingItem = ref(null)
const form = reactive({
  employee_id: '', resignation_date: null, last_working_date: null,
  reason: '', status: 'pending', notes: '',
})

const columns = [
  { title: 'Employee', key: 'employee', width: 200 },
  { title: 'Resignation Date', key: 'resignation_date', width: 150 },
  { title: 'Last Working Date', key: 'last_working_date', width: 150 },
  { title: 'Reason', dataIndex: 'reason', ellipsis: true },
  { title: 'Status', key: 'status', width: 120, align: 'center' },
  { title: '', key: 'actions', width: 140, align: 'right' },
]

const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showSizeChanger: true,
  showTotal: (total) => `${total} resignations`,
  pageSizeOptions: ['10', '20', '50'],
}))

function formatDate(d) { return d ? dayjs(d).format('DD MMM YYYY') : '—' }

function statusColor(status) {
  const map = { pending: 'orange', acknowledged: 'blue', approved: 'green', rejected: 'red', completed: 'default' }
  return map[status?.toLowerCase()] || 'default'
}

async function fetchItems() {
  loading.value = true
  try {
    const params = {
      page: pagination.current_page,
      per_page: pagination.per_page,
      ...(search.value && { search: search.value }),
      ...(filters.status && { acknowledgement_status: filters.status }),
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

function handleTableChange(pag) {
  pagination.current_page = pag.current
  pagination.per_page = pag.pageSize
  fetchItems()
}

function resetForm() {
  Object.assign(form, {
    employee_id: '', resignation_date: null, last_working_date: null,
    reason: '', status: 'pending', notes: '',
  })
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
    resignation_date: record.resignation_date || null,
    last_working_date: record.last_working_date || null,
    reason: record.reason || '',
    status: record.status || 'pending',
    notes: record.notes || '',
  })
  modalVisible.value = true
}

async function handleSave() {
  if (!form.employee_id) return message.warning('Employee ID is required')
  if (!form.resignation_date) return message.warning('Resignation date is required')
  if (!form.reason) return message.warning('Reason is required')
  saving.value = true
  try {
    if (editingItem.value) {
      await resignationApi.update(editingItem.value.id, { ...form })
      message.success('Resignation updated')
    } else {
      await resignationApi.store({ ...form })
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

onMounted(() => {
  appStore.setPageMeta('Resignations')
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
.cell-link { text-decoration: none; color: inherit; }
.cell-employee { display: flex; flex-direction: column; }
.cell-name { font-weight: 600; font-size: 13.5px; }
.cell-sub { font-size: 12px; color: var(--color-text-muted); }
.modal-form { margin-top: 16px; }
</style>
