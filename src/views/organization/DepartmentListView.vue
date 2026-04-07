<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ pagination.total || 0 }} Total</a-tag>
      </div>
      <div class="filter-bar">
        <a-input
          v-model:value="search"
          placeholder="Search departments..."
          allow-clear
          class="filter-input"
          style="width: 240px"
          @pressEnter="onSearchOrFilterChange"
          @clear="onSearchOrFilterChange"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-select
          v-model:value="filters.is_active"
          placeholder="Status"
          allow-clear
          class="filter-input"
          style="width: 140px"
          @change="onSearchOrFilterChange"
        >
          <a-select-option :value="true">Active</a-select-option>
          <a-select-option :value="false">Inactive</a-select-option>
        </a-select>
        <a-button v-if="selectedRowKeys.length > 0 && authStore.canDelete('departments')" danger @click="handleBulkDelete">
          Delete {{ selectedRowKeys.length }} Selected
        </a-button>
        <a-button v-if="authStore.canCreate('departments')" type="primary" @click="openCreate">
          <PlusOutlined /> Add Department
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
        :row-selection="authStore.canDelete('departments') ? { selectedRowKeys, onChange: (keys) => selectedRowKeys = keys } : undefined"
        @change="handleTableChange"
        :scroll="{ x: 'max-content' }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'description'">
            {{ record.description || '—' }}
          </template>
          <template v-else-if="column.key === 'is_active'">
            <a-tag :color="record.is_active ? 'green' : 'red'" size="small">
              {{ record.is_active ? 'Active' : 'Inactive' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button v-if="authStore.canUpdate('departments')" size="small" type="link" @click="openEdit(record)">Edit</a-button>
              <a-button v-if="authStore.canDelete('departments')" size="small" type="link" danger @click="handleDelete(record)">Delete</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingItem ? 'Edit Department' : 'Add Department'"
      :footer="null"
    >
      <a-form :model="form" layout="vertical" class="modal-form" @submit.prevent="handleSave">
        <a-form-item label="Name" required>
          <a-input v-model:value="form.name" placeholder="Enter department name" />
        </a-form-item>
        <a-form-item label="Description">
          <a-textarea v-model:value="form.description" placeholder="Enter description" :rows="2" />
        </a-form-item>
        <a-form-item label="Active">
          <a-switch
            v-model:checked="form.is_active"
            checked-children="Active"
            un-checked-children="Inactive"
          />
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
import { ref, reactive, computed, onMounted, createVNode } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { SearchOutlined, PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { departmentApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'
import { useSaveAnother } from '@/composables/useSaveAnother'

const getSignal = useAbortController()
const appStore = useAppStore()
const authStore = useAuthStore()

const items = ref([])
const selectedRowKeys = ref([])
const loading = ref(false)
const { savingMain, savingAnother, submitMain, submitAnother } = useSaveAnother({
  refresh: fetchItems, reset: resetForm,
})
const search = ref('')
const filters = reactive({ is_active: undefined })
const pagination = reactive({ current_page: 1, per_page: 20, total: 0 })
const modalVisible = ref(false)
const editingItem = ref(null)
const form = reactive({ name: '', description: '', is_active: true })

const columns = [
  { title: 'Name', dataIndex: 'name', width: 220, sorter: true },
  { title: 'Description', key: 'description', ellipsis: true },
  { title: 'Positions', dataIndex: 'positions_count', width: 100, align: 'center' },
  { title: 'Active Positions', dataIndex: 'active_positions_count', width: 130, align: 'center' },
  { title: 'Status', key: 'is_active', width: 100, align: 'center' },
  { title: '', key: 'actions', width: 140, align: 'right' },
]

const sortField = ref(null)
const sortOrder = ref(null)

const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showSizeChanger: true,
  showTotal: (total) => `${total} departments`,
  pageSizeOptions: ['10', '20', '50'],
}))

async function fetchItems() {
  loading.value = true
  try {
    const params = {
      page: pagination.current_page,
      per_page: pagination.per_page,
      ...(search.value && { search: search.value }),
      ...(filters.is_active !== undefined && filters.is_active !== null && { is_active: filters.is_active }),
      ...(sortField.value && { sort_by: sortField.value }),
      ...(sortOrder.value && { sort_direction: sortOrder.value === 'ascend' ? 'asc' : 'desc' }),
    }
    const { data } = await departmentApi.list(params, { signal: getSignal() })
    items.value = data.data || []
    if (data.pagination) Object.assign(pagination, data.pagination)
  } catch (err) {
    if (err.name !== 'CanceledError') message.error('Failed to load departments')
  }
  loading.value = false
}

function onSearchOrFilterChange() {
  pagination.current_page = 1
  fetchItems()
}

function handleTableChange(pag, _filters, sorter) {
  pagination.current_page = pag.current
  pagination.per_page = pag.pageSize

  if (sorter && sorter.columnKey) {
    const sortMap = { name: 'name' }
    sortField.value = sortMap[sorter.columnKey] || null
    sortOrder.value = sorter.order || null
  } else {
    sortField.value = null
    sortOrder.value = null
  }

  fetchItems()
}

function resetForm() {
  Object.assign(form, { name: '', description: '', is_active: true })
}

function openCreate() {
  editingItem.value = null
  resetForm()
  modalVisible.value = true
}

function openEdit(record) {
  editingItem.value = record
  Object.assign(form, {
    name: record.name || '',
    description: record.description || '',
    is_active: record.is_active !== false,
  })
  modalVisible.value = true
}

function validateForm() {
  if (!form.name) { message.warning('Name is required'); return false }
  return true
}

async function handleSave() {
  if (!validateForm()) return
  await submitMain(async () => {
    if (editingItem.value) {
      await departmentApi.update(editingItem.value.id, { ...form })
      message.success('Department updated')
    } else {
      await departmentApi.store({ ...form })
      message.success('Department created')
    }
    modalVisible.value = false
  })
}

async function handleSaveAndAddAnother() {
  if (!validateForm()) return
  await submitAnother(async () => {
    await departmentApi.store({ ...form })
    message.success('Department created — ready for next entry')
  })
}

function handleDelete(record) {
  Modal.confirm({
    title: 'Delete Department',
    content: `Are you sure you want to delete "${record.name}"?`,
    okType: 'danger',
    onOk: async () => {
      try {
        await departmentApi.destroy(record.id)
        message.success('Department moved to recycle bin')
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
        await departmentApi.destroyBatch(selectedRowKeys.value)
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
  appStore.setPageMeta('Departments')
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
.modal-form { margin-top: 16px; }
</style>
