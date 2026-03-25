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
          style="width: 160px"
          @change="onSearchOrFilterChange"
        >
          <a-select-option value="Pending">Pending</a-select-option>
          <a-select-option value="Accepted">Accepted</a-select-option>
          <a-select-option value="Declined">Declined</a-select-option>
          <a-select-option value="Expired">Expired</a-select-option>
          <a-select-option value="Withdrawn">Withdrawn</a-select-option>
          <a-select-option value="Under Review">Under Review</a-select-option>
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
            <span class="cell-name">{{ record.candidate_name }}</span>
          </template>
          <template v-else-if="column.key === 'position_name'">
            {{ record.position_name || '—' }}
          </template>
          <template v-else-if="column.key === 'probation_salary'">
            {{ formatCurrency(record.probation_salary) }}
          </template>
          <template v-else-if="column.key === 'date'">
            {{ formatDate(record.date) }}
          </template>
          <template v-else-if="column.key === 'acceptance_deadline'">
            {{ formatDate(record.acceptance_deadline) }}
          </template>
          <template v-else-if="column.key === 'acceptance_status'">
            <a-tag :color="statusColor(record.acceptance_status)" size="small">{{ record.acceptance_status || '—' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-tooltip title="Download PDF">
                <a-button size="small" type="link" :loading="downloadingId === record.id" @click="handleDownloadPdf(record)">
                  <template #icon><FilePdfOutlined /></template>
                </a-button>
              </a-tooltip>
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
            <a-form-item label="Position Name" required>
              <a-input v-model:value="form.position_name" placeholder="e.g. Software Engineer" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Probation Salary" required>
              <a-input-number v-model:value="form.probation_salary" placeholder="0.00" style="width: 100%" :min="0" :precision="2" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Post-Probation Salary" required>
              <a-input-number v-model:value="form.pass_probation_salary" placeholder="0.00" style="width: 100%" :min="0" :precision="2" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Offer Date" required>
              <a-date-picker v-model:value="form.date" style="width: 100%" format="DD MMM YYYY" value-format="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Acceptance Deadline" required>
              <a-date-picker v-model:value="form.acceptance_deadline" style="width: 100%" format="DD MMM YYYY" value-format="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Acceptance Status" required>
          <a-select v-model:value="form.acceptance_status" placeholder="Select status">
            <a-select-option value="Pending">Pending</a-select-option>
            <a-select-option value="Accepted">Accepted</a-select-option>
            <a-select-option value="Declined">Declined</a-select-option>
            <a-select-option value="Expired">Expired</a-select-option>
            <a-select-option value="Withdrawn">Withdrawn</a-select-option>
            <a-select-option value="Under Review">Under Review</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Note" required>
          <a-textarea v-model:value="form.note" placeholder="Enter notes" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, createVNode } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { SearchOutlined, PlusOutlined, ExclamationCircleOutlined, FilePdfOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { useAbortController } from '@/composables/useAbortController'
import { jobOfferApi, reportApi } from '@/api'
import { formatCurrency, formatDate } from '@/utils/formatters'

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
const downloadingId = ref(null)
const modalVisible = ref(false)
const editingItem = ref(null)
const form = reactive({
  candidate_name: '',
  position_name: '',
  probation_salary: null,
  pass_probation_salary: null,
  date: null,
  acceptance_deadline: null,
  acceptance_status: 'Pending',
  note: '',
})

const columns = [
  { title: 'Candidate', key: 'candidate', width: 200 },
  { title: 'Position', key: 'position_name', width: 180 },
  { title: 'Probation Salary', key: 'probation_salary', width: 150, align: 'right' },
  { title: 'Date', key: 'date', width: 130 },
  { title: 'Deadline', key: 'acceptance_deadline', width: 130 },
  { title: 'Status', key: 'acceptance_status', width: 120, align: 'center' },
  { title: '', key: 'actions', width: 180, align: 'right' },
]

const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showSizeChanger: true,
  showTotal: (total) => `${total} offers`,
  pageSizeOptions: ['10', '20', '50'],
}))

function statusColor(status) {
  const map = {
    Pending: 'blue',
    Accepted: 'green',
    Declined: 'red',
    Expired: 'orange',
    Withdrawn: 'default',
    'Under Review': 'purple',
  }
  return map[status] || 'default'
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
    candidate_name: '',
    position_name: '',
    probation_salary: null,
    pass_probation_salary: null,
    date: null,
    acceptance_deadline: null,
    acceptance_status: 'Pending',
    note: '',
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
    position_name: record.position_name || '',
    probation_salary: record.probation_salary || null,
    pass_probation_salary: record.pass_probation_salary || null,
    date: record.date || null,
    acceptance_deadline: record.acceptance_deadline || null,
    acceptance_status: record.acceptance_status || 'Pending',
    note: record.note || '',
  })
  modalVisible.value = true
}

async function handleSave() {
  if (!form.candidate_name) return message.warning('Candidate name is required')
  if (!form.position_name) return message.warning('Position name is required')
  if (!form.date) return message.warning('Offer date is required')
  if (!form.acceptance_deadline) return message.warning('Acceptance deadline is required')
  if (!form.acceptance_status) return message.warning('Acceptance status is required')
  if (form.probation_salary == null) return message.warning('Probation salary is required')
  if (form.pass_probation_salary == null) return message.warning('Post-probation salary is required')
  if (!form.note) return message.warning('Note is required')

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

async function handleDownloadPdf(record) {
  downloadingId.value = record.id
  try {
    const res = await jobOfferApi.pdf(record.custom_offer_id)
    reportApi.downloadBlob(res, `job-offer-${record.candidate_name || record.id}.pdf`)
  } catch {
    message.error('Failed to download PDF')
  }
  downloadingId.value = null
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
.modal-form { margin-top: 16px; }
</style>
