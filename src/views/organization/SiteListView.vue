<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ pagination.total || 0 }} Total</a-tag>
      </div>
      <div class="filter-bar">
        <a-input
          v-model:value="search"
          placeholder="Search sites..."
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
        <a-button v-if="selectedRowKeys.length > 0 && authStore.canDelete('sites')" danger @click="handleBulkDelete">
          Delete {{ selectedRowKeys.length }} Selected
        </a-button>
        <a-button v-if="authStore.canCreate('sites')" type="primary" @click="openCreate">
          <PlusOutlined /> Add Site
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
        :row-selection="authStore.canDelete('sites') ? { selectedRowKeys, onChange: (keys) => selectedRowKeys = keys } : undefined"
        @change="handleTableChange"
        :scroll="{ x: 'max-content' }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'code'">
            <span class="font-mono">{{ record.code || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'contact'">
            <template v-if="record.contact_person">
              <div>{{ record.contact_person }}</div>
              <div v-if="record.contact_phone" class="cell-sub">{{ record.contact_phone }}</div>
            </template>
            <span v-else class="text-muted">—</span>
          </template>
          <template v-else-if="column.key === 'is_active'">
            <a-tag :color="record.is_active ? 'green' : 'red'" size="small">
              {{ record.is_active ? 'Active' : 'Inactive' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button v-if="authStore.canUpdate('sites')" size="small" type="link" @click="openEdit(record)">Edit</a-button>
              <a-button v-if="authStore.canDelete('sites')" size="small" type="link" danger @click="handleDelete(record)">Delete</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingItem ? 'Edit Site' : 'Add Site'"
      @ok="handleSave"
      :confirm-loading="saving"
      :width="'min(95vw, 560px)'"
    >
      <a-form :model="form" layout="vertical" class="modal-form">
        <a-row :gutter="16">
          <a-col :span="16">
            <a-form-item label="Name" required>
              <a-input v-model:value="form.name" placeholder="Enter site name" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Code" required>
              <a-input v-model:value="form.code" placeholder="e.g. MWK" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Description">
          <a-textarea v-model:value="form.description" placeholder="Enter description" :rows="2" />
        </a-form-item>
        <a-form-item label="Address">
          <a-textarea v-model:value="form.address" placeholder="Enter address" :rows="2" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="Contact Person">
              <a-input v-model:value="form.contact_person" placeholder="Full name" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Contact Phone">
              <a-input v-model:value="form.contact_phone" placeholder="Phone number" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Contact Email">
              <a-input v-model:value="form.contact_email" placeholder="Email" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Active">
          <a-switch
            v-model:checked="form.is_active"
            checked-children="Active"
            un-checked-children="Inactive"
          />
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
import { siteApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'

const getSignal = useAbortController()
const appStore = useAppStore()
const authStore = useAuthStore()

const items = ref([])
const selectedRowKeys = ref([])
const loading = ref(false)
const saving = ref(false)
const search = ref('')
const filters = reactive({ is_active: undefined })
const pagination = reactive({ current_page: 1, per_page: 20, total: 0 })
const modalVisible = ref(false)
const editingItem = ref(null)
const form = reactive({
  name: '', code: '', description: '', address: '',
  contact_person: '', contact_phone: '', contact_email: '',
  is_active: true,
})

const sortField = ref(null)
const sortOrder = ref(null)

const columns = [
  { title: 'Name', dataIndex: 'name', width: 200, sorter: true },
  { title: 'Code', key: 'code', width: 100, sorter: true },
  { title: 'Description', dataIndex: 'description', ellipsis: true },
  { title: 'Address', dataIndex: 'address', width: 200, ellipsis: true },
  { title: 'Contact', key: 'contact', width: 180 },
  { title: 'Status', key: 'is_active', width: 100, align: 'center' },
  { title: '', key: 'actions', width: 140, align: 'right' },
]

const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showSizeChanger: true,
  showTotal: (total) => `${total} sites`,
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
    const { data } = await siteApi.list(params, { signal: getSignal() })
    items.value = data.data || []
    if (data.pagination) Object.assign(pagination, data.pagination)
  } catch (err) {
    if (err.name !== 'CanceledError') message.error('Failed to load sites')
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
    const sortMap = { name: 'name', code: 'code' }
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
    name: '', code: '', description: '', address: '',
    contact_person: '', contact_phone: '', contact_email: '',
    is_active: true,
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
    name: record.name || '',
    code: record.code || '',
    description: record.description || '',
    address: record.address || '',
    contact_person: record.contact_person || '',
    contact_phone: record.contact_phone || '',
    contact_email: record.contact_email || '',
    is_active: record.is_active !== false,
  })
  modalVisible.value = true
}

async function handleSave() {
  if (!form.name) return message.warning('Site name is required')
  if (!form.code) return message.warning('Site code is required')
  saving.value = true
  try {
    if (editingItem.value) {
      await siteApi.update(editingItem.value.id, { ...form })
      message.success('Site updated')
    } else {
      await siteApi.store({ ...form })
      message.success('Site created')
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
    title: 'Delete Site',
    content: `Are you sure you want to delete "${record.name}"?`,
    okType: 'danger',
    onOk: async () => {
      try {
        await siteApi.destroy(record.id)
        message.success('Site deleted')
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
        await siteApi.destroyBatch(selectedRowKeys.value)
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
  appStore.setPageMeta('Sites')
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
.cell-sub { font-size: 12px; color: var(--color-text-muted); }
.modal-form { margin-top: 16px; }
</style>
