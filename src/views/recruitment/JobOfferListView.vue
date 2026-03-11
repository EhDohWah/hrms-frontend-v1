<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ pagination.total || 0 }} Total</a-tag>
      </div>
      <div class="filter-bar">
        <a-input
          v-model:value="search"
          placeholder="Search job offers..."
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
          <a-select-option value="draft">Draft</a-select-option>
          <a-select-option value="sent">Sent</a-select-option>
          <a-select-option value="accepted">Accepted</a-select-option>
          <a-select-option value="rejected">Rejected</a-select-option>
          <a-select-option value="expired">Expired</a-select-option>
        </a-select>
        <a-button v-if="selectedRowKeys.length > 0 && authStore.canDelete('job_offers')" danger @click="handleBulkDelete">
          Delete {{ selectedRowKeys.length }} Selected
        </a-button>
        <a-button v-if="authStore.canCreate('job_offers')" type="primary" @click="openCreate">
          <PlusOutlined /> Add Job Offer
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
        :row-selection="authStore.canDelete('job_offers') ? { selectedRowKeys, onChange: (keys) => selectedRowKeys = keys } : undefined"
        @change="handleTableChange"
        :scroll="{ x: 'max-content' }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'candidate'">
            <div class="cell-employee">
              <span class="cell-name">{{ record.candidate_name }}</span>
              <span class="cell-sub">{{ record.candidate_email }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'position'">
            {{ record.position?.title || record.position_title || '—' }}
          </template>
          <template v-else-if="column.key === 'salary'">
            {{ record.salary ? `฿${Number(record.salary).toLocaleString()}` : '—' }}
          </template>
          <template v-else-if="column.key === 'offer_date'">
            {{ formatDate(record.offer_date) }}
          </template>
          <template v-else-if="column.key === 'expiry_date'">
            {{ formatDate(record.expiry_date) }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)" size="small">{{ record.status || '—' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button v-if="authStore.canUpdate('job_offers')" size="small" type="link" @click="openEdit(record)">Edit</a-button>
              <a-button v-if="authStore.canDelete('job_offers')" size="small" type="link" danger @click="handleDelete(record)">Delete</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingItem ? 'Edit Job Offer' : 'Create Job Offer'"
      @ok="handleSave"
      :confirm-loading="saving"
      :width="'min(95vw, 600px)'"
    >
      <a-form :model="form" layout="vertical" class="modal-form">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Candidate Name" required>
              <a-input v-model:value="form.candidate_name" placeholder="Full name" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Candidate Email">
              <a-input v-model:value="form.candidate_email" placeholder="email@example.com" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Position">
          <a-select v-model:value="form.position_id" placeholder="Select position" allow-clear show-search option-filter-prop="label">
            <a-select-option v-for="p in positionOptions" :key="p.id" :value="p.id" :label="p.title">{{ p.title }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Salary">
              <a-input-number v-model:value="form.salary" placeholder="0.00" style="width: 100%" :min="0" :precision="2" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Status">
              <a-select v-model:value="form.status" placeholder="Select status">
                <a-select-option value="draft">Draft</a-select-option>
                <a-select-option value="sent">Sent</a-select-option>
                <a-select-option value="accepted">Accepted</a-select-option>
                <a-select-option value="rejected">Rejected</a-select-option>
                <a-select-option value="expired">Expired</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Offer Date">
              <a-date-picker v-model:value="form.offer_date" style="width: 100%" format="DD MMM YYYY" value-format="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Expiry Date">
              <a-date-picker v-model:value="form.expiry_date" style="width: 100%" format="DD MMM YYYY" value-format="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Start Date">
          <a-date-picker v-model:value="form.start_date" style="width: 100%" format="DD MMM YYYY" value-format="YYYY-MM-DD" />
        </a-form-item>
        <a-form-item label="Notes">
          <a-textarea v-model:value="form.notes" placeholder="Enter additional notes" :rows="3" />
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
import { jobOfferApi, positionApi } from '@/api'

const dayjs = inject('$dayjs')
const appStore = useAppStore()
const authStore = useAuthStore()
const getSignal = useAbortController()

const items = ref([])
const positionOptions = ref([])
const loading = ref(false)
const saving = ref(false)
const search = ref('')
const filters = reactive({ status: undefined })
const pagination = reactive({ current_page: 1, per_page: 20, total: 0 })
const selectedRowKeys = ref([])
const modalVisible = ref(false)
const editingItem = ref(null)
const form = reactive({
  candidate_name: '', candidate_email: '', position_id: undefined,
  salary: null, status: 'draft', offer_date: null, expiry_date: null,
  start_date: null, notes: '',
})

const columns = [
  { title: 'Candidate', key: 'candidate', width: 200 },
  { title: 'Position', key: 'position', width: 180 },
  { title: 'Salary', key: 'salary', width: 130, align: 'right' },
  { title: 'Offer Date', key: 'offer_date', width: 130 },
  { title: 'Expiry', key: 'expiry_date', width: 130 },
  { title: 'Status', key: 'status', width: 100, align: 'center' },
  { title: '', key: 'actions', width: 140, align: 'right' },
]

const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showSizeChanger: true,
  showTotal: (total) => `${total} offers`,
  pageSizeOptions: ['10', '20', '50'],
}))

function formatDate(d) { return d ? dayjs(d).format('DD MMM YYYY') : '—' }

function statusColor(status) {
  const map = { draft: 'default', sent: 'blue', accepted: 'green', rejected: 'red', expired: 'orange' }
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
    const { data } = await jobOfferApi.list(params, { signal: getSignal() })
    items.value = data.data || []
    if (data.pagination) Object.assign(pagination, data.pagination)
  } catch (err) { if (err.name !== 'CanceledError') message.error('Failed to load job offers') }
  loading.value = false
}

async function fetchPositionOptions() {
  try {
    const { data } = await positionApi.options()
    positionOptions.value = data.data || data || []
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
  Object.assign(form, {
    candidate_name: '', candidate_email: '', position_id: undefined,
    salary: null, status: 'draft', offer_date: null, expiry_date: null,
    start_date: null, notes: '',
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
    candidate_name: record.candidate_name || '',
    candidate_email: record.candidate_email || '',
    position_id: record.position_id || undefined,
    salary: record.salary || null,
    status: record.status || 'draft',
    offer_date: record.offer_date || null,
    expiry_date: record.expiry_date || null,
    start_date: record.start_date || null,
    notes: record.notes || '',
  })
  modalVisible.value = true
}

async function handleSave() {
  if (!form.candidate_name) return message.warning('Candidate name is required')
  saving.value = true
  try {
    if (editingItem.value) {
      await jobOfferApi.update(editingItem.value.id, { ...form })
      message.success('Job offer updated')
    } else {
      await jobOfferApi.store({ ...form })
      message.success('Job offer created')
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
    title: 'Delete Job Offer',
    content: `Are you sure you want to delete the offer for "${record.candidate_name}"?`,
    okType: 'danger',
    onOk: async () => {
      try {
        await jobOfferApi.destroy(record.id)
        message.success('Job offer deleted')
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
        await jobOfferApi.destroyBatch(selectedRowKeys.value)
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
  appStore.setPageMeta('Job Offers')
  fetchItems()
  fetchPositionOptions()
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
.cell-employee { display: flex; flex-direction: column; }
.cell-name { font-weight: 600; font-size: 13.5px; }
.cell-sub { font-size: 12px; color: var(--color-text-muted); }
.modal-form { margin-top: 16px; }
</style>
