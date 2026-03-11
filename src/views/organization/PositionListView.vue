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
          class="filter-input"
          style="width: 180px"
          @change="onSearchOrFilterChange"
        >
          <a-select-option v-for="d in departmentOptions" :key="d.id" :value="d.id">{{ d.name }}</a-select-option>
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
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.status === 'active' ? 'green' : 'red'" size="small">
              {{ record.status || '—' }}
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
    >
      <a-form :model="form" layout="vertical" class="modal-form">
        <a-form-item label="Title" required>
          <a-input v-model:value="form.title" placeholder="Enter position title" />
        </a-form-item>
        <a-form-item label="Code">
          <a-input v-model:value="form.code" placeholder="Enter position code" />
        </a-form-item>
        <a-form-item label="Department">
          <a-select v-model:value="form.department_id" placeholder="Select department" allow-clear show-search option-filter-prop="label">
            <a-select-option v-for="d in departmentOptions" :key="d.id" :value="d.id" :label="d.name">{{ d.name }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Grade">
          <a-input v-model:value="form.grade" placeholder="Enter grade" />
        </a-form-item>
        <a-form-item label="Description">
          <a-textarea v-model:value="form.description" placeholder="Enter description" :rows="2" />
        </a-form-item>
        <a-form-item label="Status">
          <a-select v-model:value="form.status" placeholder="Select status">
            <a-select-option value="active">Active</a-select-option>
            <a-select-option value="inactive">Inactive</a-select-option>
          </a-select>
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
import { positionApi, departmentApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'

const getSignal = useAbortController()
const appStore = useAppStore()
const authStore = useAuthStore()

const items = ref([])
const selectedRowKeys = ref([])
const departmentOptions = ref([])
const loading = ref(false)
const saving = ref(false)
const search = ref('')
const filters = reactive({ department_id: undefined })
const pagination = reactive({ current_page: 1, per_page: 20, total: 0 })
const modalVisible = ref(false)
const editingItem = ref(null)
const form = reactive({ title: '', code: '', department_id: undefined, grade: '', description: '', status: 'active' })

const columns = [
  { title: 'Title', dataIndex: 'title', width: 220 },
  { title: 'Code', dataIndex: 'code', width: 120 },
  { title: 'Department', key: 'department', width: 180 },
  { title: 'Grade', dataIndex: 'grade', width: 100 },
  { title: 'Status', key: 'status', width: 100, align: 'center' },
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

async function fetchItems() {
  loading.value = true
  try {
    const params = {
      page: pagination.current_page,
      per_page: pagination.per_page,
      ...(search.value && { search: search.value }),
      ...(filters.department_id && { department_id: filters.department_id }),
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

function handleTableChange(pag) {
  pagination.current_page = pag.current
  pagination.per_page = pag.pageSize
  fetchItems()
}

function resetForm() {
  Object.assign(form, { title: '', code: '', department_id: undefined, grade: '', description: '', status: 'active' })
}

function openCreate() {
  editingItem.value = null
  resetForm()
  modalVisible.value = true
}

function openEdit(record) {
  editingItem.value = record
  Object.assign(form, {
    title: record.title || '',
    code: record.code || '',
    department_id: record.department_id || undefined,
    grade: record.grade || '',
    description: record.description || '',
    status: record.status || 'active',
  })
  modalVisible.value = true
}

async function handleSave() {
  if (!form.title) return message.warning('Title is required')
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
    message.error(err.response?.data?.message || 'Failed to save')
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
