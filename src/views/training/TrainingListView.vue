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
          v-model:value="filters.training_type_id"
          placeholder="Type"
          allow-clear
          class="filter-input"
          style="width: 180px"
          @change="onSearchOrFilterChange"
        >
          <a-select-option v-for="t in typeOptions" :key="t.id" :value="t.id">{{ t.name }}</a-select-option>
        </a-select>
        <a-button v-if="selectedRowKeys.length > 0 && authStore.canDelete('trainings')" danger @click="handleBulkDelete">
          Delete {{ selectedRowKeys.length }} Selected
        </a-button>
        <a-button v-if="authStore.canCreate('trainings')" type="primary" @click="openCreate">
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
        :row-selection="authStore.canDelete('trainings') ? { selectedRowKeys, onChange: (keys) => selectedRowKeys = keys } : undefined"
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
          <template v-else-if="column.key === 'training_type'">
            <a-tag v-if="record.training_type" size="small">{{ record.training_type.name }}</a-tag>
            <span v-else class="cell-sub">—</span>
          </template>
          <template v-else-if="column.key === 'dates'">
            {{ formatDate(record.start_date) }} → {{ formatDate(record.end_date) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button size="small" type="link" @click.stop="openView(record)">View</a-button>
              <a-button v-if="authStore.canUpdate('trainings')" size="small" type="link" @click.stop="openEdit(record)">Edit</a-button>
              <a-button v-if="authStore.canDelete('trainings')" size="small" type="link" danger @click.stop="handleDelete(record)">Delete</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingItem ? 'Edit Training' : 'Add Training'"
      :footer="null"
      :width="'min(95vw, 560px)'"
    >
      <a-form :model="form" layout="vertical" class="modal-form" @submit.prevent="handleSave">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Training Type">
              <a-select v-model:value="form.training_type_id" placeholder="Select type" allow-clear>
                <a-select-option v-for="t in typeOptions" :key="t.id" :value="t.id">{{ t.name }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Organizer" required>
              <a-input v-model:value="form.organizer" placeholder="Enter organizer name" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Title" required>
          <a-input v-model:value="form.title" placeholder="Enter training title" />
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
        <div class="modal-footer">
          <a-button @click="modalVisible = false">Cancel</a-button>
          <a-button v-if="!editingItem" :loading="savingAnother" :disabled="savingMain" @click="handleSaveAndAddAnother">Save &amp; Add Another</a-button>
          <a-button type="primary" html-type="submit" :loading="savingMain" :disabled="savingAnother">{{ editingItem ? 'Update' : 'Save' }}</a-button>
        </div>
      </a-form>
    </a-modal>

    <!-- Record View Modal -->
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
          :title="viewRecord.title"
          icon="school"
          badge="Training Record"
          :status="viewStatus.key"
          :status-label="viewStatus.label"
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
import { trainingApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'
import { useSaveAnother } from '@/composables/useSaveAnother'
import { formatDate, formatDateTime } from '@/utils/formatters'
import { cleanParams } from '@/utils/helpers'
import { PAGINATION_DEFAULTS } from '@/constants/config'
import RecordView from '@/components/common/RecordView.vue'

const appStore = useAppStore()
const authStore = useAuthStore()
const getSignal = useAbortController()

const typeOptions = ref([])
const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i)
const items = ref([])
const loading = ref(false)
const { savingMain, savingAnother, submitMain, submitAnother } = useSaveAnother({
  refresh: fetchItems, reset: resetForm,
})
const search = ref('')
const filters = reactive({ year: currentYear, training_type_id: undefined })
const pagination = reactive({ current_page: 1, per_page: PAGINATION_DEFAULTS.perPage, total: 0 })
const selectedRowKeys = ref([])
const modalVisible = ref(false)
const editingItem = ref(null)
const form = reactive({
  training_type_id: null, title: '', organizer: '', start_date: null, end_date: null,
})

const columns = [
  { title: 'Title', key: 'title', width: 260 },
  { title: 'Type', key: 'training_type', width: 160 },
  { title: 'Organizer', dataIndex: 'organizer', width: 200 },
  { title: 'Period', key: 'dates', width: 260 },
  { title: '', key: 'actions', width: 180, align: 'right' },
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
      filter_year: filters.year || null,
      filter_training_type_id: filters.training_type_id || null,
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
    training_type_id: null, title: '', organizer: '', start_date: null, end_date: null,
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
    training_type_id: record.training_type_id || null,
    title: record.title || '',
    organizer: record.organizer || '',
    start_date: record.start_date || null,
    end_date: record.end_date || null,
  })
  modalVisible.value = true
}

function validateForm() {
  if (!form.title) { message.warning('Title is required'); return false }
  if (!form.organizer) { message.warning('Organizer is required'); return false }
  if (!form.start_date) { message.warning('Start date is required'); return false }
  if (!form.end_date) { message.warning('End date is required'); return false }
  return true
}

async function handleSave() {
  if (!validateForm()) return
  await submitMain(async () => {
    const payload = cleanParams({ ...form })
    if (editingItem.value) {
      await trainingApi.update(editingItem.value.id, payload)
      message.success('Training updated')
    } else {
      await trainingApi.store(payload)
      message.success('Training created')
    }
    modalVisible.value = false
  })
}

async function handleSaveAndAddAnother() {
  if (!validateForm()) return
  await submitAnother(async () => {
    await trainingApi.store(cleanParams({ ...form }))
    message.success('Training created — ready for next entry')
  })
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

async function fetchTypeOptions() {
  try {
    const { data } = await trainingApi.typeOptions()
    typeOptions.value = data.data || []
  } catch { /* silent */ }
}

// ── Record View Modal ────────────────────────────────────────────────────────

const viewModalVisible = ref(false)
const viewLoading = ref(false)
const viewRecord = ref(null)

const viewStatus = computed(() => {
  const r = viewRecord.value
  if (!r) return { key: 'active', label: '' }
  const today = new Date().toISOString().slice(0, 10)
  if (r.end_date && r.end_date < today) return { key: 'expired', label: 'Completed' }
  if (r.start_date && r.start_date <= today) return { key: 'active', label: 'In Progress' }
  return { key: 'ending-soon', label: 'Upcoming' }
})

const viewStatusMeta = computed(() => {
  const r = viewRecord.value
  if (!r) return []
  const meta = []
  if (r.start_date && r.end_date) {
    meta.push({ icon: 'calendar', text: `${formatDate(r.start_date)} → ${formatDate(r.end_date)}` })
  }
  if (r.organizer) meta.push({ icon: 'building', text: r.organizer })
  if (r.training_type) meta.push({ icon: 'tag', text: r.training_type.name })
  const enrollCount = r.employee_trainings?.length || 0
  if (enrollCount > 0) meta.push({ icon: 'users', text: `${enrollCount} enrolled` })
  return meta
})

const viewSections = computed(() => {
  const r = viewRecord.value
  if (!r) return []
  const sections = []

  sections.push({
    title: 'Training Details', icon: 'school', type: 'fields',
    fields: [
      { label: 'Title', value: r.title },
      { label: 'Organizer', value: r.organizer },
      { label: 'Type', value: r.training_type?.name },
      { label: 'Start Date', value: formatDate(r.start_date), mono: true },
      { label: 'End Date', value: formatDate(r.end_date), mono: true },
    ],
  })

  if (r.employee_trainings?.length) {
    sections.push({
      title: 'Attendance', icon: 'clipboard-check', type: 'table',
      headers: ['Employee', 'Staff ID', 'Status', 'Enrolled On'],
      rows: r.employee_trainings.map(et => [
        `${et.employee?.first_name_en || ''} ${et.employee?.last_name_en || ''}`.trim() || '—',
        et.employee?.staff_id || '—',
        et.status || '—',
        formatDate(et.created_at),
      ]),
      monoCols: [1, 3],
    })
  }

  sections.push({
    title: 'Record Information', icon: 'info-circle', type: 'fields',
    fields: [
      { label: 'Created By', value: r.created_by },
      { label: 'Updated By', value: r.updated_by },
      { label: 'Created At', value: formatDateTime(r.created_at), mono: true },
      { label: 'Updated At', value: formatDateTime(r.updated_at), mono: true },
    ],
  })

  return sections
})

async function openView(record) {
  viewRecord.value = null
  viewModalVisible.value = true
  viewLoading.value = true
  try {
    const { data } = await trainingApi.show(record.id)
    viewRecord.value = data.data || data
  } catch {
    message.error('Failed to load training details')
    viewModalVisible.value = false
  } finally {
    viewLoading.value = false
  }
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

onMounted(() => {
  appStore.setPageMeta('Training')
  fetchTypeOptions()
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

/* ── Record View Modal ── */
.view-loading-state { display: flex; justify-content: center; align-items: center; padding: 64px 0; }
.view-modal-wrap { position: relative; max-width: 880px; margin: 0 auto; }
.view-close-btn {
  position: absolute; top: 12px; right: 12px; z-index: 10;
  width: 34px; height: 34px; border-radius: 50%; border: none;
  background: rgba(255,255,255,0.18); backdrop-filter: blur(8px);
  color: rgba(255,255,255,0.9); font-size: 16px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all var(--transition-base);
}
.view-close-btn:hover { background: rgba(255,255,255,0.35); color: #fff; transform: scale(1.08); }
.view-close-btn:focus-visible { outline: 2px solid rgba(255,255,255,0.6); outline-offset: 2px; }
</style>
