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
          <a-select-option v-for="opt in acceptanceStatusOptions" :key="opt.value" :value="opt.value">{{ opt.value }}</a-select-option>
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
              <a-button size="small" type="link" :loading="previewLoadingId === record.id" @click="openPdfPreview(record)">
                <template #icon><EyeOutlined /></template>
                Preview
              </a-button>
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
      :footer="null"
      :width="'min(95vw, 600px)'"
    >
      <a-form :model="form" layout="vertical" class="modal-form" @submit.prevent="handleSave">
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
            <a-select-option v-for="opt in acceptanceStatusOptions" :key="opt.value" :value="opt.value">{{ opt.value }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Note" required>
          <a-textarea v-model:value="form.note" placeholder="Enter notes" :rows="3" />
        </a-form-item>
        <div class="modal-footer">
          <a-button @click="modalVisible = false">Cancel</a-button>
          <a-button v-if="!editingItem" :loading="savingAnother" :disabled="savingMain" @click="handleSaveAndAddAnother">Save &amp; Add Another</a-button>
          <a-button type="primary" html-type="submit" :loading="savingMain" :disabled="savingAnother">{{ editingItem ? 'Update' : 'Save' }}</a-button>
        </div>
      </a-form>
    </a-modal>

    <!-- PDF Preview Modal -->
    <a-modal
      v-model:open="pdfPreviewVisible"
      :footer="null"
      :width="'min(95vw, 860px)'"
      :body-style="{ padding: 0 }"
      :closable="false"
      :mask-closable="true"
      wrap-class-name="pdf-preview-modal"
      centered
    >
      <div class="pdf-viewer">
        <div class="pdf-toolbar">
          <div class="pdf-toolbar-info">
            <FilePdfOutlined class="pdf-toolbar-icon" />
            <div>
              <div class="pdf-toolbar-title">{{ previewRecord?.candidate_name }}</div>
              <div class="pdf-toolbar-sub">{{ previewRecord?.position_name }} &middot; {{ formatDate(previewRecord?.date) }}</div>
            </div>
            <a-tag v-if="previewRecord?.acceptance_status" :color="statusColor(previewRecord.acceptance_status)" size="small" style="margin-left: 8px">
              {{ previewRecord.acceptance_status }}
            </a-tag>
          </div>
          <div class="pdf-toolbar-actions">
            <a-button size="small" @click="handleDownloadFromPreview">
              <DownloadOutlined /> Download
            </a-button>
            <a-button size="small" @click="closePdfPreview">
              Close
            </a-button>
          </div>
        </div>
        <div class="pdf-frame-wrap">
          <div v-if="pdfLoading" class="pdf-loading">
            <a-spin tip="Loading PDF..." />
          </div>
          <iframe
            v-else-if="pdfUrl"
            :src="pdfUrl"
            class="pdf-iframe"
            title="Job Offer PDF Preview"
          />
          <div v-else class="pdf-error">
            <a-empty description="Failed to load PDF" />
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, createVNode } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { SearchOutlined, PlusOutlined, ExclamationCircleOutlined, FilePdfOutlined, EyeOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { useAbortController } from '@/composables/useAbortController'
import { useSaveAnother } from '@/composables/useSaveAnother'
import { jobOfferApi, reportApi, lookupApi } from '@/api'
import { formatCurrency, formatDate } from '@/utils/formatters'

const appStore = useAppStore()
const authStore = useAuthStore()
const getSignal = useAbortController()

const acceptanceStatusOptions = ref([])

const items = ref([])
const loading = ref(false)
const { savingMain, savingAnother, submitMain, submitAnother } = useSaveAnother({
  refresh: fetchItems, reset: resetForm,
})
const search = ref('')
const filters = reactive({ status: undefined })
const pagination = reactive({ current_page: 1, per_page: 20, total: 0 })
const selectedRowKeys = ref([])
const previewLoadingId = ref(null)
const pdfPreviewVisible = ref(false)
const pdfLoading = ref(false)
const pdfUrl = ref(null)
const pdfBlob = ref(null)
const previewRecord = ref(null)
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
    acceptance_status: acceptanceStatusOptions.value[0]?.value || 'Pending',
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

function validateForm() {
  if (!form.candidate_name) { message.warning('Candidate name is required'); return false }
  if (!form.position_name) { message.warning('Position name is required'); return false }
  if (!form.date) { message.warning('Offer date is required'); return false }
  if (!form.acceptance_deadline) { message.warning('Acceptance deadline is required'); return false }
  if (!form.acceptance_status) { message.warning('Acceptance status is required'); return false }
  if (form.probation_salary == null) { message.warning('Probation salary is required'); return false }
  if (form.pass_probation_salary == null) { message.warning('Post-probation salary is required'); return false }
  if (!form.note) { message.warning('Note is required'); return false }
  return true
}

async function handleSave() {
  if (!validateForm()) return
  await submitMain(async () => {
    if (editingItem.value) {
      await jobOfferApi.update(editingItem.value.id, { ...form })
      message.success('Job offer updated')
    } else {
      await jobOfferApi.store({ ...form })
      message.success('Job offer created')
    }
    modalVisible.value = false
  })
}

async function handleSaveAndAddAnother() {
  if (!validateForm()) return
  await submitAnother(async () => {
    await jobOfferApi.store({ ...form })
    message.success('Job offer created — ready for next entry')
  })
}

async function openPdfPreview(record) {
  previewRecord.value = record
  pdfUrl.value = null
  pdfBlob.value = null
  pdfLoading.value = true
  pdfPreviewVisible.value = true
  previewLoadingId.value = record.id
  try {
    const res = await jobOfferApi.pdf(record.custom_offer_id)
    pdfBlob.value = res
    const blob = new Blob([res.data], { type: 'application/pdf' })
    pdfUrl.value = URL.createObjectURL(blob)
  } catch {
    message.error('Failed to load PDF')
  }
  pdfLoading.value = false
  previewLoadingId.value = null
}

function closePdfPreview() {
  pdfPreviewVisible.value = false
  if (pdfUrl.value) {
    URL.revokeObjectURL(pdfUrl.value)
    pdfUrl.value = null
  }
  pdfBlob.value = null
  previewRecord.value = null
}

function handleDownloadFromPreview() {
  if (pdfBlob.value && previewRecord.value) {
    reportApi.downloadBlob(pdfBlob.value, `job-offer-${previewRecord.value.candidate_name || previewRecord.value.id}.pdf`)
  }
}

// Cleanup blob URL when modal closes via any method (backdrop, button, etc.)
watch(pdfPreviewVisible, (open) => {
  if (!open) closePdfPreview()
})

onBeforeUnmount(() => {
  if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value)
})

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

async function fetchLookups() {
  try {
    const res = await lookupApi.byType('job_offer_acceptance_status')
    acceptanceStatusOptions.value = res.data?.data || []
  } catch { /* silent — dropdown falls back to empty */ }
}

onMounted(() => {
  appStore.setPageMeta('Job Offers')
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
.cell-name { font-weight: 600; font-size: 13.5px; }
.modal-form { margin-top: 16px; }

/* ── PDF Viewer ── */
.pdf-viewer {
  display: flex;
  flex-direction: column;
  height: calc(90vh - 48px);
  min-height: 400px;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: #525659;
}
.pdf-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  background: var(--color-primary);
  color: #fff;
  flex-shrink: 0;
}
.pdf-toolbar-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.pdf-toolbar-icon {
  font-size: 20px;
  opacity: 0.7;
  flex-shrink: 0;
}
.pdf-toolbar-title {
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pdf-toolbar-sub {
  font-size: 12px;
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pdf-toolbar-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.pdf-frame-wrap {
  flex: 1;
  position: relative;
  min-height: 0;
}
.pdf-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}
.pdf-loading,
.pdf-error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #f4f5f6;
}
</style>

<!-- Unscoped: Ant modal overrides for PDF preview -->
<style>
.pdf-preview-modal .ant-modal {
  padding: 24px 0;
}
.pdf-preview-modal .ant-modal-content {
  padding: 0 !important;
  overflow: hidden;
  border-radius: 10px !important;
}
.pdf-preview-modal .ant-modal-body {
  padding: 0 !important;
}
.pdf-preview-modal .ant-modal-header {
  display: none !important;
}
.pdf-preview-modal .ant-modal-close {
  display: none !important;
}
</style>
