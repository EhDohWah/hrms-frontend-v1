<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ filteredItems.length }} Total</a-tag>
      </div>
      <div class="filter-bar">
        <a-input
          v-model:value="search"
          placeholder="Search training types..."
          allow-clear
          class="filter-input"
          style="width: 240px"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-button v-if="selectedRowKeys.length > 0 && authStore.canDelete('training_types')" danger @click="handleBulkDelete">
          Delete {{ selectedRowKeys.length }} Selected
        </a-button>
        <a-button v-if="authStore.canCreate('training_types')" type="primary" @click="openCreate">
          <PlusOutlined /> Add Training Type
        </a-button>
      </div>
    </div>

    <a-card :body-style="{ padding: 0 }">
      <a-table
        :columns="columns"
        :data-source="filteredItems"
        :loading="loading"
        :row-key="(r) => r.id"
        :row-selection="authStore.canDelete('training_types') ? { selectedRowKeys, onChange: (keys) => selectedRowKeys = keys } : undefined"
        :pagination="false"
        :scroll="{ x: 'max-content' }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <span class="cell-name">{{ record.name }}</span>
          </template>
          <template v-else-if="column.key === 'is_active'">
            <a-tag :color="record.is_active ? 'green' : 'default'" size="small">{{ record.is_active ? 'Active' : 'Inactive' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button size="small" type="link" @click="openView(record)">View</a-button>
              <a-button v-if="authStore.canUpdate('training_types')" size="small" type="link" @click="openEdit(record)">Edit</a-button>
              <a-button v-if="authStore.canDelete('training_types')" size="small" type="link" danger @click="handleDelete(record)">Delete</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingItem ? 'Edit Training Type' : 'Add Training Type'"
      :footer="null"
      :width="'min(95vw, 480px)'"
    >
      <a-form :model="form" layout="vertical" class="modal-form" @submit.prevent="handleSave">
        <a-form-item label="Name" required>
          <a-input v-model:value="form.name" placeholder="e.g. Mandatory" />
        </a-form-item>
        <a-form-item label="Description">
          <a-textarea v-model:value="form.description" placeholder="Optional description" :rows="2" />
        </a-form-item>
        <a-form-item label="Active">
          <a-switch v-model:checked="form.is_active" />
        </a-form-item>
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
          :title="viewRecord.name"
          icon="category"
          badge="Training Type"
          :status="viewRecord.is_active ? 'active' : 'expired'"
          :status-label="viewRecord.is_active ? 'Active' : 'Inactive'"
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
import { useSaveAnother } from '@/composables/useSaveAnother'
import { trainingTypeApi } from '@/api'
import { formatDate } from '@/utils/formatters'
import RecordView from '@/components/common/RecordView.vue'

const appStore = useAppStore()
const authStore = useAuthStore()
const getSignal = useAbortController()

const items = ref([])
const loading = ref(false)
const { savingMain, savingAnother, submitMain, submitAnother } = useSaveAnother({
  refresh: fetchItems, reset: resetForm,
})
const search = ref('')
const selectedRowKeys = ref([])
const modalVisible = ref(false)
const editingItem = ref(null)
const form = reactive({
  name: '', description: '', is_active: true,
})

const columns = [
  { title: 'Name', key: 'name', width: 200 },
  { title: 'Description', dataIndex: 'description', width: 400, ellipsis: true },
  { title: 'Status', key: 'is_active', width: 100, align: 'center' },
  { title: '', key: 'actions', width: 180, align: 'right' },
]

const filteredItems = computed(() => {
  if (!search.value) return items.value
  const term = search.value.toLowerCase()
  return items.value.filter(
    (item) => item.name?.toLowerCase().includes(term) || item.description?.toLowerCase().includes(term)
  )
})

async function fetchItems() {
  loading.value = true
  try {
    const { data } = await trainingTypeApi.list({}, { signal: getSignal() })
    items.value = data.data || []
  } catch (err) {
    if (err.name !== 'CanceledError') message.error('Failed to load training types')
  } finally {
    loading.value = false
  }
}

function resetForm() {
  Object.assign(form, { name: '', description: '', is_active: true })
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
    description: record.description || '',
    is_active: record.is_active ?? true,
  })
  modalVisible.value = true
}

function validateForm() {
  if (!form.name) { message.warning('Name is required'); return false }
  return true
}

async function handleSave() {
  if (!validateForm()) return
  await submitMain(async () => {
    if (editingItem.value) {
      await trainingTypeApi.update(editingItem.value.id, { ...form })
      message.success('Training type updated')
    } else {
      await trainingTypeApi.store({ ...form })
      message.success('Training type created')
    }
    modalVisible.value = false
  })
}

async function handleSaveAndAddAnother() {
  if (!validateForm()) return
  await submitAnother(async () => {
    await trainingTypeApi.store({ ...form })
    message.success('Training type created — ready for next entry')
  })
}

function handleDelete(record) {
  Modal.confirm({
    title: 'Delete Training Type',
    content: `Are you sure you want to delete "${record.name}"?`,
    okType: 'danger',
    onOk: async () => {
      try {
        await trainingTypeApi.destroy(record.id)
        message.success('Training type deleted')
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
        await Promise.all(selectedRowKeys.value.map((id) => trainingTypeApi.destroy(id)))
        message.success(`${selectedRowKeys.value.length} record(s) deleted successfully`)
        selectedRowKeys.value = []
        fetchItems()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to delete records')
      }
    },
  })
}

// ── Record View Modal ────────────────────────────────────────────────────────

const viewModalVisible = ref(false)
const viewLoading = ref(false)
const viewRecord = ref(null)

const viewStatusMeta = computed(() => {
  const r = viewRecord.value
  if (!r) return []
  const meta = []
  const count = r.trainings?.length || 0
  meta.push({ icon: 'list', text: `${count} training(s)` })
  return meta
})

const viewSections = computed(() => {
  const r = viewRecord.value
  if (!r) return []
  const sections = []

  sections.push({
    title: 'Type Details', icon: 'category', type: 'fields',
    fields: [
      { label: 'Name', value: r.name },
      { label: 'Status', value: r.is_active ? 'Active' : 'Inactive' },
      ...(r.description ? [{ label: 'Description', value: r.description, fullWidth: true }] : []),
    ],
  })

  if (r.trainings?.length) {
    sections.push({
      title: 'Trainings', icon: 'school', type: 'table',
      headers: ['Title', 'Organizer', 'Start Date', 'End Date'],
      rows: r.trainings.map(t => [
        t.title,
        t.organizer || '—',
        formatDate(t.start_date),
        formatDate(t.end_date),
      ]),
    })
  }

  sections.push({
    title: 'Record Information', icon: 'info-circle', type: 'fields',
    fields: [
      { label: 'Created At', value: formatDate(r.created_at), mono: true },
      { label: 'Updated At', value: formatDate(r.updated_at), mono: true },
    ],
  })

  return sections
})

async function openView(record) {
  viewRecord.value = null
  viewModalVisible.value = true
  viewLoading.value = true
  try {
    const { data } = await trainingTypeApi.show(record.id)
    viewRecord.value = data.data || data
  } catch {
    message.error('Failed to load training type details')
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
  appStore.setPageMeta('Training Types')
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
.cell-name { font-weight: 600; font-size: 14px; }
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
  transition: all var(--transition-base);
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
