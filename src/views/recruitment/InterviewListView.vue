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
          <template v-else-if="column.key === 'score'">
            <span v-if="record.score != null" class="font-mono">{{ Number(record.score).toFixed(0) }}</span>
            <span v-else class="text-muted">—</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.interview_status)" size="small">{{ record.interview_status || '—' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'hired_status'">
            <a-tag v-if="record.hired_status" :color="hiredColor(record.hired_status)" size="small">{{ record.hired_status }}</a-tag>
            <span v-else class="text-muted">—</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button size="small" type="link" @click="openView(record)">View</a-button>
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
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Hired Status">
              <a-select v-model:value="form.hired_status" allow-clear placeholder="Select status">
                <a-select-option v-for="opt in hiredStatusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Score (0–100)">
              <a-input-number v-model:value="form.score" :min="0" :max="100" :precision="2" placeholder="e.g. 85" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Feedback / Notes">
          <a-textarea v-model:value="form.feedback" placeholder="Enter interview feedback or notes" :rows="3" />
        </a-form-item>
        <a-form-item label="Reference Info">
          <a-textarea v-model:value="form.reference_info" placeholder="Enter reference information" :rows="2" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Interview Record View Modal -->
    <a-modal
      v-model:open="viewModalVisible"
      :footer="null"
      :width="'min(95vw, 920px)'"
      :body-style="{ padding: 0, background: 'transparent' }"
      :closable="false"
      :mask-closable="true"
      wrap-class-name="record-view-modal"
      centered
    >
      <div v-if="viewLoading" class="view-loading-state">
        <a-spin tip="Loading record..." />
      </div>
      <div v-else-if="viewRecord" class="view-modal-wrap">
        <button class="view-close-btn" @click="viewModalVisible = false" aria-label="Close">
          <i class="ti ti-x"></i>
        </button>
        <RecordView
          :title="viewRecord.candidate_name"
          icon="users"
          badge="Interview Record"
          :status="viewStatusKey"
          :status-label="viewRecord.interview_status || 'Unknown'"
          :status-meta="viewStatusMeta"
          :sections="viewSections"
          @print="handleViewPrint"
          @edit="openEditFromView"
        />
      </div>
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
import RecordView from '@/components/common/RecordView.vue'
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
const hiredStatusOptions = [
  { value: 'Hired', label: 'Hired' },
  { value: 'Not Hired', label: 'Not Hired' },
  { value: 'Pending', label: 'Pending' },
]

const form = reactive({
  candidate_name: '', phone: '',
  job_position: null, interview_date: null, start_time: null, end_time: null,
  interview_mode: null, interviewer_name: '', interview_status: null,
  hired_status: null, score: null, feedback: '', reference_info: '',
})

const columns = [
  { title: 'Candidate', key: 'candidate', width: 200 },
  { title: 'Position', key: 'position', width: 180 },
  { title: 'Date & Time', key: 'interview_date', width: 180 },
  { title: 'Interviewer', key: 'interviewer', width: 160 },
  { title: 'Score', key: 'score', width: 80, align: 'center' },
  { title: 'Status', key: 'status', width: 110, align: 'center' },
  { title: 'Hired', key: 'hired_status', width: 110, align: 'center' },
  { title: '', key: 'actions', width: 160, align: 'right' },
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

function hiredColor(status) {
  const map = { hired: 'green', 'not hired': 'red', pending: 'orange' }
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
    hired_status: null, score: null, feedback: '', reference_info: '',
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
    hired_status: record.hired_status || null,
    score: record.score != null ? Number(record.score) : null,
    feedback: record.feedback || '',
    reference_info: record.reference_info || '',
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

// ---- Record View Modal ----
const viewModalVisible = ref(false)
const viewLoading = ref(false)
const viewRecord = ref(null)

const viewStatusKey = computed(() => {
  const s = viewRecord.value?.interview_status?.toLowerCase()
  const map = { scheduled: 'active', completed: 'active', cancelled: 'ending-soon', terminated: 'expired' }
  return map[s] || 'active'
})

const viewStatusMeta = computed(() => {
  const r = viewRecord.value
  if (!r) return []
  const meta = []
  if (r.interview_date) {
    meta.push({ icon: 'calendar', text: formatDate(r.interview_date) })
  }
  if (r.start_time && r.end_time) {
    meta.push({ icon: 'clock', text: `${formatTime(r.start_time)} – ${formatTime(r.end_time)}` })
  }
  if (r.interview_mode) {
    meta.push({ icon: 'device-laptop', text: r.interview_mode })
  }
  if (r.hired_status) {
    meta.push({ icon: 'briefcase', text: `Hired: ${r.hired_status}` })
  }
  return meta
})

const viewSections = computed(() => {
  const r = viewRecord.value
  if (!r) return []

  const result = []

  // Candidate & Interview Details
  result.push({
    title: 'Interview Details', icon: 'users', type: 'fields',
    fields: [
      { label: 'Candidate', value: r.candidate_name },
      { label: 'Phone', value: r.phone, mono: true },
      { label: 'Position', value: r.job_position },
      { label: 'Interview Mode', value: r.interview_mode },
      { label: 'Date', value: formatDate(r.interview_date), mono: true },
      { label: 'Time', value: r.start_time && r.end_time ? `${formatTime(r.start_time)} – ${formatTime(r.end_time)}` : null, mono: true },
      { label: 'Interviewer(s)', value: r.interviewer_name },
      { label: 'Status', value: r.interview_status },
    ],
  })

  // Evaluation
  const hasEval = r.score != null || r.hired_status || r.feedback || r.reference_info
  if (hasEval) {
    result.push({
      title: 'Evaluation', icon: 'clipboard-check', type: 'fields',
      fields: [
        ...(r.score != null ? [{ label: 'Score', value: `${r.score} / 100`, mono: true }] : []),
        ...(r.hired_status ? [{ label: 'Hired Status', value: r.hired_status }] : []),
        ...(r.feedback ? [{ label: 'Feedback', value: r.feedback, fullWidth: true }] : []),
        ...(r.reference_info ? [{ label: 'Reference Info', value: r.reference_info, fullWidth: true }] : []),
      ],
    })
  }

  // Record Information
  result.push({
    title: 'Record Information', icon: 'info-circle', type: 'fields',
    fields: [
      { label: 'Created By', value: r.created_by },
      { label: 'Updated By', value: r.updated_by },
      { label: 'Created At', value: formatDate(r.created_at), mono: true },
      { label: 'Updated At', value: formatDate(r.updated_at), mono: true },
    ],
  })

  return result
})

async function openView(record) {
  viewRecord.value = null
  viewModalVisible.value = true
  viewLoading.value = true
  try {
    const { data } = await interviewApi.show(record.id)
    viewRecord.value = data.data || data
  } catch {
    message.error('Failed to load interview details')
    viewModalVisible.value = false
  }
  viewLoading.value = false
}

function handleViewPrint() {
  window.print()
}

function openEditFromView() {
  const id = viewRecord.value?.id
  viewModalVisible.value = false
  if (id) {
    const record = items.value.find(i => i.id === id)
    if (record) openEdit(record)
  }
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

/* ── Record View Modal ── */
.view-loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 64px 0;
}
.view-modal-wrap {
  position: relative;
  max-width: 880px;
  margin: 0 auto;
}
.view-close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.18);
  backdrop-filter: blur(8px);
  color: rgba(255,255,255,0.9);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}
.view-close-btn:hover {
  background: rgba(255,255,255,0.35);
  color: #fff;
  transform: scale(1.08);
}
.view-close-btn:focus-visible {
  outline: 2px solid rgba(255,255,255,0.6);
  outline-offset: 2px;
}
</style>

<!-- Unscoped: Ant modal chrome overrides for record-view-modal -->
<style>
.record-view-modal .ant-modal-wrap {
  overflow: auto;
}
.record-view-modal .ant-modal {
  padding: 24px 0;
}
.record-view-modal .ant-modal-content {
  padding: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 10px !important;
  overflow: visible !important;
}
.record-view-modal .ant-modal-body {
  padding: 0 !important;
  background: transparent !important;
}
.record-view-modal .ant-modal-header {
  display: none !important;
}
.record-view-modal .ant-modal-close {
  display: none !important;
}
</style>
