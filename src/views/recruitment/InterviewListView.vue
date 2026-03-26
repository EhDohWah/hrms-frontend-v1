<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-stats">
        <a-select
          v-model:value="filters.year"
          style="width: 100px"
          @change="onSearchOrFilterChange"
        >
          <a-select-option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</a-select-option>
        </a-select>
        <a-tag color="default">{{ pagination.total || 0 }} Total</a-tag>
      </div>
      <div class="filter-bar">
        <a-input
          v-model:value="search"
          placeholder="Search interviews..."
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
          <a-select-option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.value }}</a-select-option>
        </a-select>
        <a-button v-if="selectedRowKeys.length > 0 && authStore.canDelete('interviews')" danger @click="handleBulkDelete">
          Delete {{ selectedRowKeys.length }} Selected
        </a-button>
        <a-button v-if="authStore.canCreate('interviews')" type="primary" @click="openCreate">
          <PlusOutlined /> Add Interview
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
        :row-selection="authStore.canDelete('interviews') ? { selectedRowKeys, onChange: (keys) => selectedRowKeys = keys } : undefined"
        @change="handleTableChange"
        :scroll="{ x: 'max-content' }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'candidate'">
            <div class="cell-employee">
              <span class="cell-name">{{ record.candidate_name }}</span>
              <span v-if="record.phone" class="cell-sub">{{ record.phone }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'position'">
            {{ record.job_position || '—' }}
          </template>
          <template v-else-if="column.key === 'interview_date'">
            {{ formatDate(record.interview_date) }}
            <span v-if="record.start_time" class="cell-sub"> {{ formatTime(record.start_time) }}–{{ formatTime(record.end_time) }}</span>
          </template>
          <template v-else-if="column.key === 'interviewer'">
            {{ record.interviewer_name || '—' }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.interview_status)" size="small">{{ record.interview_status || '—' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button v-if="authStore.canUpdate('interviews')" size="small" type="link" @click="openEdit(record)">Edit</a-button>
              <a-button v-if="authStore.canDelete('interviews')" size="small" type="link" danger @click="handleDelete(record)">Delete</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingItem ? 'Edit Interview' : 'Schedule Interview'"
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
            <a-form-item label="Phone">
              <a-input v-model:value="form.phone" placeholder="Phone number" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Position">
              <a-select
                v-model:value="form.job_position"
                show-search
                allow-clear
                placeholder="Select or type position"
                :filter-option="filterPositionOption"
              >
                <a-select-option v-for="pos in positionOptions" :key="pos.id" :value="pos.title">{{ pos.title }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Interview Mode">
              <a-select v-model:value="form.interview_mode">
                <a-select-option v-for="opt in modeOptions" :key="opt.value" :value="opt.value">{{ opt.value }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Interview Date" required>
              <a-date-picker v-model:value="form.interview_date" style="width: 100%" format="DD MMM YYYY" value-format="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Status">
              <a-select v-model:value="form.interview_status">
                <a-select-option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.value }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Start Time">
              <a-time-picker v-model:value="form.start_time" style="width: 100%" format="HH:mm" value-format="HH:mm:ss" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="End Time">
              <a-time-picker v-model:value="form.end_time" style="width: 100%" format="HH:mm" value-format="HH:mm:ss" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Interviewer(s)">
          <a-input v-model:value="form.interviewer_name" placeholder="e.g. John Smith, Jane Doe" />
        </a-form-item>
        <a-form-item label="Notes">
          <a-textarea v-model:value="form.feedback" placeholder="Enter notes" :rows="3" />
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
import { interviewApi, lookupApi, optionsApi } from '@/api'
import { formatDate } from '@/utils/formatters'
const appStore = useAppStore()
const authStore = useAuthStore()
const getSignal = useAbortController()

const statusOptions = ref([])
const modeOptions = ref([])
const positionOptions = ref([])
const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i)
const items = ref([])
const loading = ref(false)
const saving = ref(false)
const search = ref('')
const filters = reactive({ status: undefined, year: currentYear })
const pagination = reactive({ current_page: 1, per_page: 20, total: 0 })
const selectedRowKeys = ref([])
const modalVisible = ref(false)
const editingItem = ref(null)
const form = reactive({
  candidate_name: '', phone: '',
  job_position: null, interview_date: null, start_time: null, end_time: null,
  interview_mode: null, interviewer_name: '', interview_status: null, feedback: '',
})

const columns = [
  { title: 'Candidate', key: 'candidate', width: 200 },
  { title: 'Position', key: 'position', width: 180 },
  { title: 'Date & Time', key: 'interview_date', width: 180 },
  { title: 'Interviewer', key: 'interviewer', width: 160 },
  { title: 'Status', key: 'status', width: 110, align: 'center' },
  { title: '', key: 'actions', width: 140, align: 'right' },
]

const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showSizeChanger: true,
  showTotal: (total) => `${total} interviews`,
  pageSizeOptions: ['10', '20', '50'],
}))

function formatTime(t) { return t ? t.substring(0, 5) : '' }

function statusColor(status) {
  const map = { scheduled: 'blue', completed: 'green', cancelled: 'orange', terminated: 'red' }
  return map[status?.toLowerCase()] || 'default'
}

function filterPositionOption(input, option) {
  return option.value?.toLowerCase().includes(input.toLowerCase())
}

async function fetchItems() {
  loading.value = true
  try {
    const params = {
      page: pagination.current_page,
      per_page: pagination.per_page,
      ...(search.value && { search: search.value }),
      ...(filters.status && { filter_interview_status: filters.status }),
      ...(filters.year && { filter_year: filters.year }),
    }
    const { data } = await interviewApi.list(params, { signal: getSignal() })
    items.value = data.data || []
    const meta = data.meta || data.pagination
    if (meta) Object.assign(pagination, meta)
  } catch (err) { if (err.name !== 'CanceledError') message.error('Failed to load interviews') }
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
    candidate_name: '', phone: '',
    job_position: null, interview_date: null, start_time: null, end_time: null,
    interview_mode: modeOptions.value[0]?.value || null,
    interviewer_name: '',
    interview_status: statusOptions.value[0]?.value || null,
    feedback: '',
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
    phone: record.phone || '',
    job_position: record.job_position || null,
    interview_date: record.interview_date || null,
    start_time: record.start_time?.substring(0, 8) || null,
    end_time: record.end_time?.substring(0, 8) || null,
    interview_mode: record.interview_mode || modeOptions.value[0]?.value || null,
    interviewer_name: record.interviewer_name || '',
    interview_status: record.interview_status || statusOptions.value[0]?.value || null,
    feedback: record.feedback || '',
  })
  modalVisible.value = true
}

async function handleSave() {
  if (!form.candidate_name) return message.warning('Candidate name is required')
  if (!form.interview_date) return message.warning('Interview date is required')
  saving.value = true
  try {
    if (editingItem.value) {
      await interviewApi.update(editingItem.value.id, { ...form })
      message.success('Interview updated')
    } else {
      await interviewApi.store({ ...form })
      message.success('Interview scheduled')
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
    title: 'Delete Interview',
    content: `Are you sure you want to delete this interview for "${record.candidate_name}"?`,
    okType: 'danger',
    onOk: async () => {
      try {
        await interviewApi.destroy(record.id)
        message.success('Interview deleted')
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
        await interviewApi.destroyBatch(selectedRowKeys.value)
        message.success(`${selectedRowKeys.value.length} record(s) deleted successfully`)
        selectedRowKeys.value = []
        fetchItems()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to delete records')
      }
    },
  })
}

async function fetchLookups() {
  try {
    const [statusRes, modeRes, posRes] = await Promise.all([
      lookupApi.byType('interview_status'),
      lookupApi.byType('interview_mode'),
      optionsApi.positions(),
    ])
    statusOptions.value = statusRes.data?.data || []
    modeOptions.value = modeRes.data?.data || []
    positionOptions.value = posRes.data?.data || []
  } catch { /* silent — dropdowns fall back to empty */ }
}

onMounted(() => {
  appStore.setPageMeta('Interviews')
  fetchLookups()
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
.cell-employee { display: flex; flex-direction: column; }
.cell-name { font-weight: 600; font-size: 13.5px; }
.cell-sub { font-size: 12px; color: var(--color-text-muted); }
.modal-form { margin-top: 16px; }
</style>
