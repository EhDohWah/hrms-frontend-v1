<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ filteredItems.length }} Total</a-tag>
      </div>
      <div class="filter-bar">
        <a-input
          v-model:value="search"
          placeholder="Search training types..."
          allow-clear
          class="filter-input"
          style="width: 240px"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-button v-if="selectedRowKeys.length > 0 && authStore.canDelete('training_types')" danger @click="handleBulkDelete">
          Delete {{ selectedRowKeys.length }} Selected
        </a-button>
        <a-button v-if="authStore.canCreate('training_types')" type="primary" @click="openCreate">
          <PlusOutlined /> Add Training Type
        </a-button>
      </div>
    </div>

    <a-card :body-style="{ padding: 0 }">
      <a-table
        :columns="columns"
        :data-source="filteredItems"
        :loading="loading"
        :row-key="(r) => r.id"
        :row-selection="authStore.canDelete('training_types') ? { selectedRowKeys, onChange: (keys) => selectedRowKeys = keys } : undefined"
        :pagination="false"
        :scroll="{ x: 'max-content' }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <span class="cell-name">{{ record.name }}</span>
          </template>
          <template v-else-if="column.key === 'code'">
            <code class="cell-code">{{ record.code }}</code>
          </template>
          <template v-else-if="column.key === 'is_active'">
            <a-tag :color="record.is_active ? 'green' : 'default'" size="small">{{ record.is_active ? 'Active' : 'Inactive' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button v-if="authStore.canUpdate('training_types')" size="small" type="link" @click="openEdit(record)">Edit</a-button>
              <a-button v-if="authStore.canDelete('training_types')" size="small" type="link" danger @click="handleDelete(record)">Delete</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingItem ? 'Edit Training Type' : 'Add Training Type'"
      @ok="handleSave"
      :confirm-loading="saving"
      :width="'min(95vw, 480px)'"
    >
      <a-form :model="form" layout="vertical" class="modal-form">
        <a-form-item label="Name" required>
          <a-input v-model:value="form.name" placeholder="e.g. Mandatory" />
        </a-form-item>
        <a-form-item label="Code">
          <a-input v-model:value="form.code" placeholder="Auto-generated from name if empty" />
        </a-form-item>
        <a-form-item label="Description">
          <a-textarea v-model:value="form.description" placeholder="Optional description" :rows="2" />
        </a-form-item>
        <a-form-item label="Active">
          <a-switch v-model:checked="form.is_active" />
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
import { useAbortController } from '@/composables/useAbortController'
import { trainingTypeApi } from '@/api'

const appStore = useAppStore()
const authStore = useAuthStore()
const getSignal = useAbortController()

const items = ref([])
const loading = ref(false)
const saving = ref(false)
const search = ref('')
const selectedRowKeys = ref([])
const modalVisible = ref(false)
const editingItem = ref(null)
const form = reactive({
  name: '', code: '', description: '', is_active: true,
})

const columns = [
  { title: 'Name', key: 'name', width: 200 },
  { title: 'Code', key: 'code', width: 200 },
  { title: 'Description', dataIndex: 'description', width: 300, ellipsis: true },
  { title: 'Status', key: 'is_active', width: 100, align: 'center' },
  { title: '', key: 'actions', width: 140, align: 'right' },
]

const filteredItems = computed(() => {
  if (!search.value) return items.value
  const term = search.value.toLowerCase()
  return items.value.filter(
    (item) => item.name?.toLowerCase().includes(term) || item.code?.toLowerCase().includes(term)
  )
})

async function fetchItems() {
  loading.value = true
  try {
    const { data } = await trainingTypeApi.list({}, { signal: getSignal() })
    items.value = data.data || []
  } catch (err) {
    if (err.name !== 'CanceledError') message.error('Failed to load training types')
  } finally {
    loading.value = false
  }
}

function resetForm() {
  Object.assign(form, { name: '', code: '', description: '', is_active: true })
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
    is_active: record.is_active ?? true,
  })
  modalVisible.value = true
}

async function handleSave() {
  if (!form.name) return message.warning('Name is required')
  saving.value = true
  try {
    if (editingItem.value) {
      await trainingTypeApi.update(editingItem.value.id, { ...form })
      message.success('Training type updated')
    } else {
      await trainingTypeApi.store({ ...form })
      message.success('Training type created')
    }
    modalVisible.value = false
    fetchItems()
  } catch (err) {
    message.error(err.response?.data?.message || 'Failed to save')
  } finally {
    saving.value = false
  }
}

function handleDelete(record) {
  Modal.confirm({
    title: 'Delete Training Type',
    content: `Are you sure you want to delete "${record.name}"?`,
    okType: 'danger',
    onOk: async () => {
      try {
        await trainingTypeApi.destroy(record.id)
        message.success('Training type deleted')
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
        await Promise.all(selectedRowKeys.value.map((id) => trainingTypeApi.destroy(id)))
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
  appStore.setPageMeta('Training Types')
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
.cell-name { font-weight: 600; font-size: 13.5px; }
.cell-code { font-size: 12px; padding: 1px 6px; background: var(--color-bg-secondary); border-radius: 3px; }
.modal-form { margin-top: 16px; }
</style>
