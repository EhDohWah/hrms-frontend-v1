<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ pagination.total || 0 }} Total</a-tag>
      </div>
      <div class="filter-bar">
        <a-input
          v-model:value="search"
          placeholder="Search positions..."
          allow-clear
          class="filter-input"
          style="width: 240px"
          @pressEnter="onSearchOrFilterChange"
          @clear="onSearchOrFilterChange"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-select
          v-model:value="filters.department_id"
          placeholder="Department"
          allow-clear
          show-search
          option-filter-prop="label"
          class="filter-input"
          style="width: 180px"
          @change="onSearchOrFilterChange"
        >
          <a-select-option v-for="d in departmentOptions" :key="d.id" :value="d.id" :label="d.name">{{ d.name }}</a-select-option>
        </a-select>
        <a-select
          v-model:value="filters.is_active"
          placeholder="Status"
          allow-clear
          class="filter-input"
          style="width: 130px"
          @change="onSearchOrFilterChange"
        >
          <a-select-option :value="true">Active</a-select-option>
          <a-select-option :value="false">Inactive</a-select-option>
        </a-select>
        <a-select
          v-model:value="filters.is_manager"
          placeholder="Role"
          allow-clear
          class="filter-input"
          style="width: 130px"
          @change="onSearchOrFilterChange"
        >
          <a-select-option :value="true">Manager</a-select-option>
          <a-select-option :value="false">Staff</a-select-option>
        </a-select>
        <a-button v-if="selectedRowKeys.length > 0 && authStore.canDelete('positions')" danger @click="handleBulkDelete">
          Delete {{ selectedRowKeys.length }} Selected
        </a-button>
        <a-button v-if="authStore.canCreate('positions')" type="primary" @click="openCreate">
          <PlusOutlined /> Add Position
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
        :row-selection="authStore.canDelete('positions') ? { selectedRowKeys, onChange: (keys) => selectedRowKeys = keys } : undefined"
        :scroll="{ x: 'max-content' }"
        @change="handleTableChange"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'department'">
            {{ record.department?.name || '—' }}
          </template>
          <template v-else-if="column.key === 'is_manager'">
            <a-tag v-if="record.is_department_head" color="purple" size="small">Head</a-tag>
            <a-tag v-else-if="record.is_manager" color="blue" size="small">Manager</a-tag>
            <span v-else class="text-muted">Staff</span>
          </template>
          <template v-else-if="column.key === 'manager_name'">
            {{ record.manager_name || '—' }}
          </template>
          <template v-else-if="column.key === 'is_active'">
            <a-tag :color="record.is_active ? 'green' : 'red'" size="small">
              {{ record.is_active ? 'Active' : 'Inactive' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button v-if="authStore.canUpdate('positions')" size="small" type="link" @click="openEdit(record)">Edit</a-button>
              <a-button v-if="authStore.canDelete('positions')" size="small" type="link" danger @click="handleDelete(record)">Delete</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingItem ? 'Edit Position' : 'Add Position'"
      @ok="handleSave"
      :confirm-loading="saving"
      :width="'min(95vw, 560px)'"
    >
      <a-form :model="form" layout="vertical" class="modal-form">
        <a-form-item label="Title" required>
          <a-input v-model:value="form.title" placeholder="Enter position title" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Department" required>
              <a-select
                v-model:value="form.department_id"
                placeholder="Select department"
                show-search
                option-filter-prop="label"
                @change="onFormDepartmentChange"
              >
                <a-select-option v-for="d in departmentOptions" :key="d.id" :value="d.id" :label="d.name">{{ d.name }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Reports To">
              <a-select
                v-model:value="form.reports_to_position_id"
                placeholder="Select supervisor"
                allow-clear
                show-search
                option-filter-prop="label"
                :disabled="!form.department_id"
                :loading="loadingSupervisors"
              >
                <a-select-option
                  v-for="p in supervisorOptions"
                  :key="p.id"
                  :value="p.id"
                  :label="p.title"
                >{{ p.title }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Manager">
              <a-switch
                v-model:checked="form.is_manager"
                checked-children="Yes"
                un-checked-children="No"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Active">
              <a-switch
                v-model:checked="form.is_active"
                checked-children="Active"
                un-checked-children="Inactive"
              />
            </a-form-item>
          </a-col>
        </a-row>
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
import { positionApi, departmentApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'

const getSignal = useAbortController()
const appStore = useAppStore()
const authStore = useAuthStore()

const items = ref([])
const selectedRowKeys = ref([])
const departmentOptions = ref([])
const supervisorOptions = ref([])
const loadingSupervisors = ref(false)
const loading = ref(false)
const saving = ref(false)
const search = ref('')
const filters = reactive({ department_id: undefined, is_active: undefined, is_manager: undefined })
const pagination = reactive({ current_page: 1, per_page: 20, total: 0 })
const modalVisible = ref(false)
const editingItem = ref(null)
const form = reactive({
  title: '',
  department_id: undefined,
  reports_to_position_id: undefined,
  is_manager: false,
  is_active: true,
})

const sortField = ref(null)
const sortOrder = ref(null)

const columns = [
  { title: 'Title', dataIndex: 'title', width: 220, sorter: true },
  { title: 'Department', key: 'department', width: 180 },
  { title: 'Role', key: 'is_manager', width: 100, align: 'center' },
  { title: 'Reports To', key: 'manager_name', width: 180 },
  { title: 'Direct Reports', dataIndex: 'direct_reports_count', width: 120, align: 'center', sorter: true },
  { title: 'Status', key: 'is_active', width: 100, align: 'center' },
  { title: '', key: 'actions', width: 140, align: 'right' },
]

const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showSizeChanger: true,
  showTotal: (total) => `${total} positions`,
  pageSizeOptions: ['10', '20', '50'],
}))

async function fetchSupervisorOptions(departmentId) {
  if (!departmentId) {
    supervisorOptions.value = []
    return
  }
  loadingSupervisors.value = true
  try {
    const { data } = await positionApi.options({ department_id: departmentId, is_active: true })
    const opts = data.data || data || []
    const editingId = editingItem.value?.id
    supervisorOptions.value = editingId ? opts.filter(p => p.id !== editingId) : opts
  } catch { supervisorOptions.value = [] }
  loadingSupervisors.value = false
}

async function fetchItems() {
  loading.value = true
  try {
    const params = {
      page: pagination.current_page,
      per_page: pagination.per_page,
      ...(search.value && { search: search.value }),
      ...(filters.department_id && { department_id: filters.department_id }),
      ...(filters.is_active !== undefined && filters.is_active !== null && { is_active: filters.is_active }),
      ...(filters.is_manager !== undefined && filters.is_manager !== null && { is_manager: filters.is_manager }),
      ...(sortField.value && { sort_by: sortField.value }),
      ...(sortOrder.value && { sort_direction: sortOrder.value === 'ascend' ? 'asc' : 'desc' }),
    }
    const { data } = await positionApi.list(params, { signal: getSignal() })
    items.value = data.data || []
    if (data.pagination) Object.assign(pagination, data.pagination)
  } catch (err) {
    if (err.name !== 'CanceledError') message.error('Failed to load positions')
  }
  loading.value = false
}

async function fetchDepartmentOptions() {
  try {
    const { data } = await departmentApi.options()
    departmentOptions.value = data.data || data || []
  } catch { /* silent */ }
}

function onSearchOrFilterChange() {
  pagination.current_page = 1
  fetchItems()
}

function handleTableChange(pag, _filters, sorter) {
  pagination.current_page = pag.current
  pagination.per_page = pag.pageSize

  if (sorter && sorter.columnKey) {
    const sortMap = { title: 'title', direct_reports_count: 'direct_reports_count' }
    sortField.value = sortMap[sorter.columnKey] || null
    sortOrder.value = sorter.order || null
  } else {
    sortField.value = null
    sortOrder.value = null
  }

  fetchItems()
}

function resetForm() {
  Object.assign(form, {
    title: '', department_id: undefined, reports_to_position_id: undefined,
    is_manager: false, is_active: true,
  })
}

function openCreate() {
  editingItem.value = null
  resetForm()
  modalVisible.value = true
}

async function openEdit(record) {
  editingItem.value = record
  // Fetch full detail to get reports_to_position_id (not in list resource)
  let reportsTo = undefined
  try {
    const { data } = await positionApi.show(record.id)
    const detail = data.data || data
    reportsTo = detail.reports_to_position_id || undefined
  } catch { /* use what we have */ }

  Object.assign(form, {
    title: record.title || '',
    department_id: record.department_id || undefined,
    reports_to_position_id: reportsTo,
    is_manager: !!record.is_manager,
    is_active: record.is_active !== false,
  })
  modalVisible.value = true
  if (form.department_id) fetchSupervisorOptions(form.department_id)
}

function onFormDepartmentChange() {
  form.reports_to_position_id = undefined
  fetchSupervisorOptions(form.department_id)
}

async function handleSave() {
  if (!form.title) return message.warning('Position title is required')
  if (!form.department_id) return message.warning('Department is required')
  saving.value = true
  try {
    if (editingItem.value) {
      await positionApi.update(editingItem.value.id, { ...form })
      message.success('Position updated')
    } else {
      await positionApi.store({ ...form })
      message.success('Position created')
    }
    modalVisible.value = false
    fetchItems()
  } catch (err) {
    const resp = err.response?.data
    if (resp?.errors) {
      const firstErr = Object.values(resp.errors)[0]
      message.error(Array.isArray(firstErr) ? firstErr[0] : firstErr)
    } else {
      message.error(resp?.message || 'Failed to save')
    }
  }
  saving.value = false
}

function handleDelete(record) {
  Modal.confirm({
    title: 'Delete Position',
    content: `Are you sure you want to delete "${record.title}"?`,
    okType: 'danger',
    onOk: async () => {
      try {
        await positionApi.destroy(record.id)
        message.success('Position deleted')
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
        await positionApi.destroyBatch(selectedRowKeys.value)
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
  appStore.setPageMeta('Positions')
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
.modal-form { margin-top: 16px; }
</style>
