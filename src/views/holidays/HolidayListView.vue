<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ pagination.total || 0 }} Total</a-tag>
      </div>
      <div class="filter-bar">
        <a-input
          v-model:value="search"
          placeholder="Search holidays..."
          allow-clear
          class="filter-input"
          style="width: 240px"
          @pressEnter="onSearchOrFilterChange"
          @clear="onSearchOrFilterChange"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-select
          v-model:value="filters.year"
          placeholder="Year"
          allow-clear
          class="filter-input"
          style="width: 110px"
          @change="onSearchOrFilterChange"
        >
          <a-select-option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</a-select-option>
        </a-select>
        <a-button v-if="selectedRowKeys.length > 0 && authStore.canDelete('holidays')" danger @click="handleBulkDelete">
          Delete {{ selectedRowKeys.length }} Selected
        </a-button>
        <a-button v-if="authStore.canCreate('holidays')" type="primary" @click="openCreate">
          <PlusOutlined /> Add Holiday
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
        :row-selection="authStore.canDelete('holidays') ? { selectedRowKeys, onChange: (keys) => selectedRowKeys = keys } : undefined"
        :scroll="{ x: 'max-content' }"
        @change="handleTableChange"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'date'">
            {{ formatDate(record.date) }}
          </template>
          <template v-else-if="column.key === 'type'">
            <a-tag :color="record.type === 'public' ? 'blue' : (record.type === 'company' ? 'purple' : 'default')" size="small">
              {{ record.type || '—' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button v-if="authStore.canUpdate('holidays')" size="small" type="link" @click="openEdit(record)">Edit</a-button>
              <a-button v-if="authStore.canDelete('holidays')" size="small" type="link" danger @click="handleDelete(record)">Delete</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingItem ? 'Edit Holiday' : 'Add Holiday'"
      :footer="null"
    >
      <a-form :model="form" layout="vertical" class="modal-form" @submit.prevent="handleSave">
        <a-form-item label="Name" required>
          <a-input v-model:value="form.name" placeholder="Enter holiday name" />
        </a-form-item>
        <a-form-item label="Date" required>
          <a-date-picker v-model:value="form.date" style="width: 100%" format="DD MMM YYYY" value-format="YYYY-MM-DD" />
        </a-form-item>
        <a-form-item label="Type">
          <a-select v-model:value="form.type" placeholder="Select type">
            <a-select-option value="public">Public</a-select-option>
            <a-select-option value="company">Company</a-select-option>
            <a-select-option value="optional">Optional</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Description">
          <a-textarea v-model:value="form.description" placeholder="Enter description" :rows="2" />
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
import { ref, reactive, computed, onMounted, inject, createVNode } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { SearchOutlined, PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { useAbortController } from '@/composables/useAbortController'
import { useSaveAnother } from '@/composables/useSaveAnother'
import { holidayApi } from '@/api'

const dayjs = inject('$dayjs')
const appStore = useAppStore()
const authStore = useAuthStore()
const getSignal = useAbortController()

const items = ref([])
const loading = ref(false)
const { savingMain, savingAnother, submitMain, submitAnother } = useSaveAnother({
  refresh: fetchItems, reset: resetForm,
})
const search = ref('')
const filters = reactive({ year: undefined })
const pagination = reactive({ current_page: 1, per_page: 20, total: 0 })
const selectedRowKeys = ref([])
const modalVisible = ref(false)
const editingItem = ref(null)
const form = reactive({ name: '', date: null, type: 'public', description: '' })

const currentYear = new Date().getFullYear()
const yearOptions = [currentYear - 1, currentYear, currentYear + 1]

const columns = [
  { title: 'Name', dataIndex: 'name', width: 240 },
  { title: 'Date', key: 'date', width: 160 },
  { title: 'Type', key: 'type', width: 120, align: 'center' },
  { title: 'Description', dataIndex: 'description', ellipsis: true },
  { title: '', key: 'actions', width: 140, align: 'right' },
]

const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showSizeChanger: true,
  showTotal: (total) => `${total} holidays`,
  pageSizeOptions: ['10', '20', '50'],
}))

function formatDate(d) { return d ? dayjs(d).format('DD MMM YYYY') : '—' }

async function fetchItems() {
  loading.value = true
  try {
    const params = {
      page: pagination.current_page,
      per_page: pagination.per_page,
      ...(search.value && { search: search.value }),
      ...(filters.year && { year: filters.year }),
    }
    const { data } = await holidayApi.list(params, { signal: getSignal() })
    items.value = data.data || []
    if (data.pagination) Object.assign(pagination, data.pagination)
  } catch (err) { if (err.name !== 'CanceledError') message.error('Failed to load holidays') }
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
  Object.assign(form, { name: '', date: null, type: 'public', description: '' })
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
    date: record.date || null,
    type: record.type || 'public',
    description: record.description || '',
  })
  modalVisible.value = true
}

function validateForm() {
  if (!form.name) { message.warning('Name is required'); return false }
  if (!form.date) { message.warning('Date is required'); return false }
  return true
}

async function handleSave() {
  if (!validateForm()) return
  await submitMain(async () => {
    if (editingItem.value) {
      await holidayApi.update(editingItem.value.id, { ...form })
      message.success('Holiday updated')
    } else {
      await holidayApi.store({ ...form })
      message.success('Holiday created')
    }
    modalVisible.value = false
  })
}

async function handleSaveAndAddAnother() {
  if (!validateForm()) return
  await submitAnother(async () => {
    await holidayApi.store({ ...form })
    message.success('Holiday created — ready for next entry')
  })
}

function handleDelete(record) {
  Modal.confirm({
    title: 'Delete Holiday',
    content: `Are you sure you want to delete "${record.name}"?`,
    okType: 'danger',
    onOk: async () => {
      try {
        await holidayApi.destroy(record.id)
        message.success('Holiday deleted')
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
        await holidayApi.destroyBatch(selectedRowKeys.value)
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
  appStore.setPageMeta('Holidays')
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
