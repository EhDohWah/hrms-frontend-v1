<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ pagination.total || 0 }} Total</a-tag>
      </div>
      <div class="filter-bar">
        <a-input
          v-model:value="search"
          placeholder="Search trainings..."
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
          style="width: 140px"
          @change="onSearchOrFilterChange"
        >
          <a-select-option value="planned">Planned</a-select-option>
          <a-select-option value="ongoing">Ongoing</a-select-option>
          <a-select-option value="completed">Completed</a-select-option>
          <a-select-option value="cancelled">Cancelled</a-select-option>
        </a-select>
        <a-button v-if="selectedRowKeys.length > 0 && authStore.canDelete('training_list')" danger @click="handleBulkDelete">
          Delete {{ selectedRowKeys.length }} Selected
        </a-button>
        <a-button v-if="authStore.canCreate('training_list')" type="primary" @click="openCreate">
          <PlusOutlined /> Add Training
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
        :row-selection="authStore.canDelete('training_list') ? { selectedRowKeys, onChange: (keys) => selectedRowKeys = keys } : undefined"
        :scroll="{ x: 'max-content' }"
        @change="handleTableChange"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'dates'">
            {{ formatDate(record.start_date) }} → {{ formatDate(record.end_date) }}
          </template>
          <template v-else-if="column.key === 'type'">
            <a-tag size="small">{{ record.type || '—' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)" size="small">{{ record.status || '—' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button v-if="authStore.canUpdate('training_list')" size="small" type="link" @click="openEdit(record)">Edit</a-button>
              <a-button v-if="authStore.canDelete('training_list')" size="small" type="link" danger @click="handleDelete(record)">Delete</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingItem ? 'Edit Training' : 'Add Training'"
      @ok="handleSave"
      :confirm-loading="saving"
      :width="'min(95vw, 560px)'"
    >
      <a-form :model="form" layout="vertical" class="modal-form">
        <a-form-item label="Title" required>
          <a-input v-model:value="form.title" placeholder="Enter training title" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Type">
              <a-select v-model:value="form.type" placeholder="Select type" allow-clear>
                <a-select-option value="internal">Internal</a-select-option>
                <a-select-option value="external">External</a-select-option>
                <a-select-option value="online">Online</a-select-option>
                <a-select-option value="workshop">Workshop</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Status">
              <a-select v-model:value="form.status" placeholder="Select status">
                <a-select-option value="planned">Planned</a-select-option>
                <a-select-option value="ongoing">Ongoing</a-select-option>
                <a-select-option value="completed">Completed</a-select-option>
                <a-select-option value="cancelled">Cancelled</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Start Date">
              <a-date-picker v-model:value="form.start_date" style="width: 100%" format="DD MMM YYYY" value-format="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="End Date">
              <a-date-picker v-model:value="form.end_date" style="width: 100%" format="DD MMM YYYY" value-format="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Trainer">
          <a-input v-model:value="form.trainer" placeholder="Enter trainer name" />
        </a-form-item>
        <a-form-item label="Location">
          <a-input v-model:value="form.location" placeholder="Enter location" />
        </a-form-item>
        <a-form-item label="Description">
          <a-textarea v-model:value="form.description" placeholder="Enter description" :rows="3" />
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
import { trainingApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'

const dayjs = inject('$dayjs')
const appStore = useAppStore()
const authStore = useAuthStore()
const getSignal = useAbortController()

const items = ref([])
const loading = ref(false)
const saving = ref(false)
const search = ref('')
const filters = reactive({ status: undefined })
const pagination = reactive({ current_page: 1, per_page: 20, total: 0 })
const selectedRowKeys = ref([])
const modalVisible = ref(false)
const editingItem = ref(null)
const form = reactive({
  title: '', type: undefined, status: 'planned', start_date: null, end_date: null,
  trainer: '', location: '', description: '',
})

const columns = [
  { title: 'Title', dataIndex: 'title', width: 240 },
  { title: 'Type', key: 'type', width: 110, align: 'center' },
  { title: 'Dates', key: 'dates', width: 240 },
  { title: 'Trainer', dataIndex: 'trainer', width: 160 },
  { title: 'Location', dataIndex: 'location', width: 160, ellipsis: true },
  { title: 'Status', key: 'status', width: 110, align: 'center' },
  { title: '', key: 'actions', width: 140, align: 'right' },
]

const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showSizeChanger: true,
  showTotal: (total) => `${total} trainings`,
  pageSizeOptions: ['10', '20', '50'],
}))

function formatDate(d) { return d ? dayjs(d).format('DD MMM YYYY') : '—' }

function statusColor(status) {
  const map = { planned: 'blue', ongoing: 'orange', completed: 'green', cancelled: 'red' }
  return map[status?.toLowerCase()] || 'default'
}

async function fetchItems() {
  loading.value = true
  try {
    const params = {
      page: pagination.current_page,
      per_page: pagination.per_page,
      ...(search.value && { search: search.value }),
      ...(filters.status && { filter_status: filters.status }),
    }
    const { data } = await trainingApi.list(params, { signal: getSignal() })
    items.value = data.data || []
    if (data.pagination) Object.assign(pagination, data.pagination)
  } catch (err) { if (err.name !== 'CanceledError') message.error('Failed to load training records') }
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
    title: '', type: undefined, status: 'planned', start_date: null, end_date: null,
    trainer: '', location: '', description: '',
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
    title: record.title || '',
    type: record.type || undefined,
    status: record.status || 'planned',
    start_date: record.start_date || null,
    end_date: record.end_date || null,
    trainer: record.trainer || '',
    location: record.location || '',
    description: record.description || '',
  })
  modalVisible.value = true
}

async function handleSave() {
  if (!form.title) return message.warning('Title is required')
  saving.value = true
  try {
    if (editingItem.value) {
      await trainingApi.update(editingItem.value.id, { ...form })
      message.success('Training updated')
    } else {
      await trainingApi.store({ ...form })
      message.success('Training created')
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
    title: 'Delete Training',
    content: `Are you sure you want to delete "${record.title}"?`,
    okType: 'danger',
    onOk: async () => {
      try {
        await trainingApi.destroy(record.id)
        message.success('Training deleted')
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
        await trainingApi.destroyBatch(selectedRowKeys.value)
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
  appStore.setPageMeta('Training')
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
