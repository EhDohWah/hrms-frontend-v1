<template>
  <div class="page-container">
    <div class="page-header">
      <div class="filter-bar">
        <a-select
          v-model:value="filters.year"
          placeholder="Year"
          allow-clear
          style="width: 110px"
          @change="onFilterChange"
        >
          <a-select-option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</a-select-option>
        </a-select>
        <a-select
          v-model:value="filters.organization"
          placeholder="Organization"
          allow-clear
          style="width: 150px"
          @change="onFilterChange"
        >
          <a-select-option v-for="org in ORG_OPTIONS" :key="org.code" :value="org.code">{{ org.label }}</a-select-option>
        </a-select>
        <a-select
          v-model:value="filters.training_id"
          placeholder="Training"
          allow-clear
          show-search
          :options="trainingDropdownOptions"
          :filter-option="(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())"
          style="width: 220px"
          @change="onFilterChange"
        />
        <a-select
          v-model:value="filters.status"
          placeholder="Status"
          allow-clear
          style="width: 140px"
          @change="onFilterChange"
        >
          <a-select-option v-for="s in ENROLLMENT_STATUSES" :key="s.value" :value="s.value">{{ s.label }}</a-select-option>
        </a-select>
        <a-input-search
          v-model:value="filters.search"
          placeholder="Search name, ID, training..."
          allow-clear
          style="width: 240px"
          @search="onFilterChange"
        />
      </div>
      <div class="page-header-actions">
        <a-tag color="default">{{ pagination.total || 0 }} Total</a-tag>
        <a-button v-if="selectedRowKeys.length > 0 && authStore.canDelete('employee_training')" danger @click="handleBulkDelete">
          Delete {{ selectedRowKeys.length }}
        </a-button>
        <a-button v-if="authStore.canCreate('employee_training')" type="primary" @click="openCreate">
          <PlusOutlined /> Enroll Employee
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
        :row-selection="authStore.canDelete('employee_training') ? { selectedRowKeys, onChange: (keys) => selectedRowKeys = keys } : undefined"
        :scroll="{ x: 'max-content' }"
        @change="handleTableChange"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'organization'">
            <a-tag :color="getOrgColor(record.employee?.organization)" size="small">{{ record.employee?.organization || '—' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'staff_id'">
            <span class="font-mono">{{ record.employee?.staff_id || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'staff_name'">
            <span class="cell-name">{{ record.employee?.first_name_en }} {{ record.employee?.last_name_en }}</span>
          </template>
          <template v-else-if="column.key === 'gender'">
            {{ genderLabel(record.employee?.gender) }}
          </template>
          <template v-else-if="column.key === 'training'">
            <router-link
              v-if="record.training?.id"
              :to="{ name: 'training-detail', params: { id: record.training.id } }"
              class="cell-link"
            >
              {{ record.training?.title }}
            </router-link>
            <span v-else>{{ record.training?.title || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'period'">
            {{ formatDate(record.training?.start_date) }} → {{ formatDate(record.training?.end_date) }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="getEnrollmentStatusColor(record.status)" size="small">{{ record.status || '—' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button size="small" type="link" @click="openView(record)">View</a-button>
              <a-button v-if="authStore.canUpdate('employee_training')" size="small" type="link" @click="openEdit(record)">Edit</a-button>
              <a-button v-if="authStore.canDelete('employee_training')" size="small" type="link" danger @click="handleDelete(record)">Remove</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Enroll / Edit Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingItem ? 'Edit Enrollment' : 'Enroll Employee'"
      :footer="null"
      :width="'min(95vw, 520px)'"
    >
      <a-form :model="form" layout="vertical" class="modal-form" @submit.prevent="handleSave">
        <a-form-item label="Employee" required>
          <a-select
            v-model:value="form.employee_id"
            show-search
            :filter-option="false"
            placeholder="Search by name or staff ID..."
            :disabled="!!editingItem"
            :loading="employeeSearching"
            :not-found-content="employeeSearching ? undefined : null"
            @search="handleEmployeeSearch"
          >
            <a-select-option v-for="emp in employeeOptions" :key="emp.id" :value="emp.id">
              {{ emp.first_name_en }} {{ emp.last_name_en || '' }}
              <span class="font-mono" style="color: var(--color-text-muted);">({{ emp.staff_id }})</span>
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Training" required>
          <a-select
            v-model:value="form.training_id"
            show-search
            :filter-option="false"
            placeholder="Search training by title..."
            :disabled="!!editingItem"
            :loading="trainingSearching"
            :not-found-content="trainingSearching ? undefined : null"
            @search="handleTrainingSearch"
          >
            <a-select-option v-for="t in trainingOptions" :key="t.id" :value="t.id">
              {{ t.title }}
              <span style="color: var(--color-text-muted);"> — {{ t.organizer }}</span>
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Status" required>
          <a-select v-model:value="form.status" placeholder="Select status">
            <a-select-option v-for="s in ENROLLMENT_STATUSES" :key="s.value" :value="s.value">{{ s.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <div class="modal-footer">
          <a-button @click="modalVisible = false">Cancel</a-button>
          <a-button v-if="!editingItem" :loading="savingAnother" :disabled="savingMain" @click="handleSaveAndAddAnother">Save &amp; Add Another</a-button>
          <a-button type="primary" html-type="submit" :loading="savingMain" :disabled="savingAnother">{{ editingItem ? 'Update' : 'Enroll' }}</a-button>
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
          :title="viewEmployeeName"
          icon="certificate"
          badge="Employee Training"
          :status="viewStatusKey"
          :status-label="viewRecord.status || 'Unknown'"
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
import { ref, reactive, computed, onMounted, onUnmounted, createVNode } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { employeeTrainingApi, employeeApi, trainingApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'
import { useSaveAnother } from '@/composables/useSaveAnother'
import { formatDate, formatDateTime, genderLabel } from '@/utils/formatters'
import { cleanParams } from '@/utils/helpers'
import { PAGINATION_DEFAULTS } from '@/constants/config'
import { ENROLLMENT_STATUSES, getEnrollmentStatusColor } from '@/constants/training'
import { ORG_OPTIONS, getOrgColor } from '@/constants/organizations'
import RecordView from '@/components/common/RecordView.vue'

const appStore = useAppStore()
const authStore = useAuthStore()
const getSignal = useAbortController()

const items = ref([])
const loading = ref(false)
const { savingMain, savingAnother, submitMain, submitAnother } = useSaveAnother({
  refresh: fetchItems, reset: resetForm,
})
const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i)
const trainingDropdownOptions = ref([])
const filters = reactive({
  year: currentYear,
  organization: undefined,
  training_id: undefined,
  status: undefined,
  search: '',
})
const pagination = reactive({ current_page: 1, per_page: PAGINATION_DEFAULTS.perPage, total: 0 })
const selectedRowKeys = ref([])
const modalVisible = ref(false)
const editingItem = ref(null)

const form = reactive({
  employee_id: undefined, training_id: undefined, status: 'Pending',
})

// Employee search
const employeeOptions = ref([])
const employeeSearching = ref(false)
let employeeSearchTimer = null

// Training search
const trainingOptions = ref([])
const trainingSearching = ref(false)
let trainingSearchTimer = null

const columns = [
  { title: 'Organization', key: 'organization', width: 110, align: 'center' },
  { title: 'Staff ID', key: 'staff_id', width: 120 },
  { title: 'Staff Name', key: 'staff_name', width: 190 },
  { title: 'Gender', key: 'gender', width: 90, align: 'center' },
  { title: 'Training', key: 'training', width: 220 },
  { title: 'Organizer', dataIndex: ['training', 'organizer'], width: 160 },
  { title: 'Period', key: 'period', width: 240 },
  { title: 'Status', key: 'status', width: 110, align: 'center' },
  { title: '', key: 'actions', width: 180, align: 'right' },
]

const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showSizeChanger: true,
  showTotal: (total) => `${total} enrollments`,
  pageSizeOptions: PAGINATION_DEFAULTS.pageSizeOptions,
}))

async function fetchItems() {
  loading.value = true
  try {
    const params = cleanParams({
      page: pagination.current_page,
      per_page: pagination.per_page,
      filter_year: filters.year || null,
      filter_organization: filters.organization || null,
      filter_training_id: filters.training_id || null,
      filter_status: filters.status || null,
      search: filters.search || null,
    })
    const { data } = await employeeTrainingApi.list(params, { signal: getSignal() })
    items.value = data.data || []
    if (data.pagination) Object.assign(pagination, data.pagination)
  } catch (err) {
    if (err.name !== 'CanceledError') message.error('Failed to load employee training records')
  } finally {
    loading.value = false
  }
}

function onFilterChange() {
  pagination.current_page = 1
  fetchItems()
}

function handleTableChange(pag) {
  pagination.current_page = pag.current
  pagination.per_page = pag.pageSize
  fetchItems()
}

// ── Employee search ──
function handleEmployeeSearch(val) {
  if (employeeSearchTimer) clearTimeout(employeeSearchTimer)
  if (!val || val.length < 2) {
    employeeOptions.value = []
    return
  }
  employeeSearching.value = true
  employeeSearchTimer = setTimeout(async () => {
    try {
      const { data } = await employeeApi.list({ search: val, per_page: 10 })
      employeeOptions.value = data.data?.data || data.data || []
    } catch { /* ignore */ }
    employeeSearching.value = false
  }, 300)
}

// ── Training search ──
function handleTrainingSearch(val) {
  if (trainingSearchTimer) clearTimeout(trainingSearchTimer)
  if (!val || val.length < 2) {
    trainingOptions.value = []
    return
  }
  trainingSearching.value = true
  trainingSearchTimer = setTimeout(async () => {
    try {
      const { data } = await trainingApi.list({ search: val, per_page: 10 })
      trainingOptions.value = data.data || []
    } catch { /* ignore */ }
    trainingSearching.value = false
  }, 300)
}

function resetForm() {
  Object.assign(form, { employee_id: undefined, training_id: undefined, status: 'Pending' })
  employeeOptions.value = []
  trainingOptions.value = []
}

function openCreate() {
  editingItem.value = null
  resetForm()
  modalVisible.value = true
}

function openEdit(record) {
  editingItem.value = record
  if (record.employee) {
    employeeOptions.value = [{
      id: record.employee_id,
      staff_id: record.employee.staff_id,
      first_name_en: record.employee.first_name_en,
      last_name_en: record.employee.last_name_en,
    }]
  }
  if (record.training) {
    trainingOptions.value = [{
      id: record.training_id,
      title: record.training.title,
      organizer: record.training.organizer,
    }]
  }
  Object.assign(form, {
    employee_id: record.employee_id || undefined,
    training_id: record.training_id || undefined,
    status: record.status || 'Pending',
  })
  modalVisible.value = true
}

function validateForm() {
  if (!form.employee_id) { message.warning('Please select an employee'); return false }
  if (!form.training_id) { message.warning('Please select a training'); return false }
  if (!form.status) { message.warning('Status is required'); return false }
  return true
}

async function handleSave() {
  if (!validateForm()) return
  await submitMain(async () => {
    if (editingItem.value) {
      await employeeTrainingApi.update(editingItem.value.id, { status: form.status })
      message.success('Enrollment updated')
    } else {
      await employeeTrainingApi.store(cleanParams({ ...form }))
      message.success('Employee enrolled')
    }
    modalVisible.value = false
  })
}

async function handleSaveAndAddAnother() {
  if (!validateForm()) return
  await submitAnother(async () => {
    await employeeTrainingApi.store(cleanParams({ ...form }))
    message.success('Employee enrolled — ready for next entry')
  })
}

function handleDelete(record) {
  const name = `${record.employee?.first_name_en || ''} ${record.employee?.last_name_en || ''}`.trim()
  Modal.confirm({
    title: 'Remove Enrollment',
    content: `Are you sure you want to remove ${name || 'this employee'} from "${record.training?.title || 'this training'}"?`,
    okType: 'danger',
    onOk: async () => {
      try {
        await employeeTrainingApi.destroy(record.id)
        message.success('Enrollment removed')
        selectedRowKeys.value = []
        fetchItems()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to remove enrollment')
      }
    },
  })
}

function handleBulkDelete() {
  Modal.confirm({
    title: 'Delete Selected Records',
    icon: createVNode(ExclamationCircleOutlined),
    content: `Are you sure you want to remove ${selectedRowKeys.value.length} selected enrollment(s)? This action cannot be undone.`,
    okText: 'Delete',
    okType: 'danger',
    cancelText: 'Cancel',
    centered: true,
    async onOk() {
      try {
        await Promise.all(selectedRowKeys.value.map((id) => employeeTrainingApi.destroy(id)))
        message.success(`${selectedRowKeys.value.length} enrollment(s) removed successfully`)
        selectedRowKeys.value = []
        fetchItems()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to remove enrollments')
      }
    },
  })
}

async function fetchTrainingDropdownOptions() {
  try {
    const { data } = await trainingApi.options()
    trainingDropdownOptions.value = (data.data || []).map(t => ({ value: t.id, label: t.title }))
  } catch { /* ignore */ }
}

// ── Record View Modal ────────────────────────────────────────────────────────

const viewModalVisible = ref(false)
const viewLoading = ref(false)
const viewRecord = ref(null)

const viewEmployeeName = computed(() => {
  const r = viewRecord.value
  if (!r?.employee) return '—'
  return `${r.employee.first_name_en || ''} ${r.employee.last_name_en || ''}`.trim()
})

const viewStatusKey = computed(() => {
  const s = viewRecord.value?.status?.toLowerCase()
  const map = { completed: 'active', 'in progress': 'ending-soon', pending: 'ending-soon' }
  return map[s] || 'active'
})

const viewStatusMeta = computed(() => {
  const r = viewRecord.value
  if (!r) return []
  const meta = []
  if (r.employee?.staff_id) meta.push({ icon: 'id', text: r.employee.staff_id })
  if (r.employee?.organization) meta.push({ icon: 'building', text: r.employee.organization })
  if (r.training?.title) meta.push({ icon: 'school', text: r.training.title })
  if (r.training?.start_date && r.training?.end_date) {
    meta.push({ icon: 'calendar', text: `${formatDate(r.training.start_date)} → ${formatDate(r.training.end_date)}` })
  }
  return meta
})

const viewSections = computed(() => {
  const r = viewRecord.value
  if (!r) return []
  const sections = []

  if (r.employee) {
    const emp = r.employee
    const initials = `${(emp.first_name_en || '')[0] || ''}${(emp.last_name_en || '')[0] || ''}`.toUpperCase()
    sections.push({
      title: 'Employee', icon: 'user', type: 'avatar_fields',
      initials,
      name: `${emp.first_name_en || ''} ${emp.last_name_en || ''}`.trim(),
      subtitle: emp.staff_id,
      fields: [
        { label: 'Staff ID', value: emp.staff_id, mono: true },
        { label: 'Organization', value: emp.organization },
        { label: 'Gender', value: genderLabel(emp.gender) },
      ],
    })
  }

  if (r.training) {
    sections.push({
      title: 'Training Details', icon: 'school', type: 'fields',
      fields: [
        { label: 'Title', value: r.training.title },
        { label: 'Organizer', value: r.training.organizer },
        { label: 'Start Date', value: formatDate(r.training.start_date), mono: true },
        { label: 'End Date', value: formatDate(r.training.end_date), mono: true },
      ],
    })
  }

  sections.push({
    title: 'Enrollment', icon: 'clipboard-check', type: 'fields',
    fields: [
      { label: 'Status', value: r.status },
      { label: 'Enrolled On', value: formatDateTime(r.created_at), mono: true },
      { label: 'Last Updated', value: formatDateTime(r.updated_at), mono: true },
    ],
  })

  return sections
})

async function openView(record) {
  viewRecord.value = null
  viewModalVisible.value = true
  viewLoading.value = true
  try {
    const { data } = await employeeTrainingApi.show(record.id)
    viewRecord.value = data.data || data
  } catch {
    message.error('Failed to load enrollment details')
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
  appStore.setPageMeta('Employee Training')
  fetchItems()
  fetchTrainingDropdownOptions()
})

onUnmounted(() => {
  if (employeeSearchTimer) clearTimeout(employeeSearchTimer)
  if (trainingSearchTimer) clearTimeout(trainingSearchTimer)
})
</script>

<style scoped>
.page-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}
@media (min-width: 1024px) {
  .page-header {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}
.page-header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}
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
