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
          <template v-if="column.key === 'title'">
            <router-link :to="{ name: 'training-detail', params: { id: record.id } }" class="cell-link">
              <span class="cell-name">{{ record.title }}</span>
            </router-link>
          </template>
          <template v-else-if="column.key === 'dates'">
            {{ formatDate(record.start_date) }} → {{ formatDate(record.end_date) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button v-if="authStore.canUpdate('training_list')" size="small" type="link" @click.stop="openEdit(record)">Edit</a-button>
              <a-button v-if="authStore.canDelete('training_list')" size="small" type="link" danger @click.stop="handleDelete(record)">Delete</a-button>
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
        <a-form-item label="Organizer" required>
          <a-input v-model:value="form.organizer" placeholder="Enter organizer name" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Start Date" required>
              <a-date-picker v-model:value="form.start_date" style="width: 100%" format="DD MMM YYYY" value-format="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="End Date" required>
              <a-date-picker v-model:value="form.end_date" style="width: 100%" format="DD MMM YYYY" value-format="YYYY-MM-DD" />
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
import { trainingApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'
import { formatDate } from '@/utils/formatters'
import { cleanParams } from '@/utils/helpers'
import { PAGINATION_DEFAULTS } from '@/constants/config'

const appStore = useAppStore()
const authStore = useAuthStore()
const getSignal = useAbortController()

const items = ref([])
const loading = ref(false)
const saving = ref(false)
const search = ref('')
const pagination = reactive({ current_page: 1, per_page: PAGINATION_DEFAULTS.perPage, total: 0 })
const selectedRowKeys = ref([])
const modalVisible = ref(false)
const editingItem = ref(null)
const form = reactive({
  title: '', organizer: '', start_date: null, end_date: null,
})

const columns = [
  { title: 'Title', key: 'title', width: 260 },
  { title: 'Organizer', dataIndex: 'organizer', width: 200 },
  { title: 'Period', key: 'dates', width: 260 },
  { title: '', key: 'actions', width: 140, align: 'right' },
]

const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showSizeChanger: true,
  showTotal: (total) => `${total} trainings`,
  pageSizeOptions: PAGINATION_DEFAULTS.pageSizeOptions,
}))

async function fetchItems() {
  loading.value = true
  try {
    const params = cleanParams({
      page: pagination.current_page,
      per_page: pagination.per_page,
      search: search.value || null,
    })
    const { data } = await trainingApi.list(params, { signal: getSignal() })
    items.value = data.data || []
    if (data.pagination) Object.assign(pagination, data.pagination)
  } catch (err) {
    if (err.name !== 'CanceledError') message.error('Failed to load training records')
  } finally {
    loading.value = false
  }
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
    title: '', organizer: '', start_date: null, end_date: null,
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
    organizer: record.organizer || '',
    start_date: record.start_date || null,
    end_date: record.end_date || null,
  })
  modalVisible.value = true
}

async function handleSave() {
  if (!form.title) return message.warning('Title is required')
  if (!form.organizer) return message.warning('Organizer is required')
  if (!form.start_date) return message.warning('Start date is required')
  if (!form.end_date) return message.warning('End date is required')
  saving.value = true
  try {
    const payload = cleanParams({ ...form })
    if (editingItem.value) {
      await trainingApi.update(editingItem.value.id, payload)
      message.success('Training updated')
    } else {
      await trainingApi.store(payload)
      message.success('Training created')
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
.cell-link { text-decoration: none; color: inherit; }
.cell-name { font-weight: 600; font-size: 14px; }
.modal-form { margin-top: 16px; }
</style>
