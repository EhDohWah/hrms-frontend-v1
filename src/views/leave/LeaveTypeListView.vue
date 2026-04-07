<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ pagination.total || 0 }} Total</a-tag>
      </div>
      <div class="filter-bar">
        <a-input
          v-model:value="search"
          placeholder="Search leave types..."
          allow-clear
          class="filter-input"
          style="width: 240px"
          @pressEnter="onSearchOrFilterChange"
          @clear="onSearchOrFilterChange"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-button v-if="selectedRowKeys.length > 0 && authStore.canDelete('leave_types')" danger @click="handleBulkDelete">
          Delete {{ selectedRowKeys.length }} Selected
        </a-button>
        <a-button v-if="authStore.canCreate('leave_types')" type="primary" @click="openCreate">
          <PlusOutlined /> Add Leave Type
        </a-button>
      </div>
    </div>

    <a-card :body-style="{ padding: 0 }">
      <a-table
        :columns="columns"
        :data-source="leaveTypes"
        :loading="loading"
        :row-key="(r) => r.id"
        :pagination="tablePagination"
        :row-selection="authStore.canDelete('leave_types') ? { selectedRowKeys, onChange: (keys) => selectedRowKeys = keys } : undefined"
        :scroll="{ x: 800 }"
        @change="handleTableChange"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'default_duration'">
            {{ record.default_duration != null ? record.default_duration + ' days' : '—' }}
          </template>
          <template v-else-if="column.key === 'description'">
            <a-tooltip :title="record.description || undefined" placement="topLeft">
              {{ record.description || '—' }}
            </a-tooltip>
          </template>
          <template v-else-if="column.key === 'requires_attachment'">
            <a-tag :color="record.requires_attachment ? 'orange' : 'default'" size="small">
              {{ record.requires_attachment ? 'Yes' : 'No' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button v-if="authStore.canUpdate('leave_types')" size="small" type="link" @click="openEdit(record)">Edit</a-button>
              <a-button v-if="authStore.canDelete('leave_types')" size="small" type="link" danger @click="handleDelete(record)">Delete</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingItem ? 'Edit Leave Type' : 'Add Leave Type'"
      :footer="null"
      destroy-on-close
    >
      <a-form :model="form" layout="vertical" class="modal-form" @submit.prevent="handleSave">
        <a-form-item label="Name" required>
          <a-input ref="nameInputRef" v-model:value="form.name" placeholder="Enter leave type name" :maxlength="100" />
        </a-form-item>
        <a-form-item label="Default Duration (days)">
          <a-input-number
            v-model:value="form.default_duration"
            :min="0"
            :step="0.5"
            placeholder="e.g. 12"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="Description">
          <a-textarea v-model:value="form.description" placeholder="Enter description" :rows="2" :maxlength="1000" show-count />
        </a-form-item>
        <a-form-item label="Requires Attachment">
          <a-switch
            v-model:checked="form.requires_attachment"
            checked-children="Yes"
            un-checked-children="No"
          />
        </a-form-item>
        <div class="modal-footer">
          <a-button @click="modalVisible = false">Cancel</a-button>
          <a-button
            v-if="!editingItem"
            :loading="savingAnother"
            :disabled="saving"
            @click="handleSaveAndAddAnother"
          >
            Save & Add Another
          </a-button>
          <a-button type="primary" html-type="submit" :loading="saving" :disabled="savingAnother">
            {{ editingItem ? 'Update' : 'Save' }}
          </a-button>
        </div>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, createVNode, onMounted, nextTick } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { SearchOutlined, PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { leaveApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'
import { useSaveAnother } from '@/composables/useSaveAnother'

const appStore = useAppStore()
const authStore = useAuthStore()
const getSignal = useAbortController()

const leaveTypes = ref([])
const selectedRowKeys = ref([])
const loading = ref(false)
const { savingMain: saving, savingAnother, submitMain, submitAnother } = useSaveAnother({
  refresh: fetchTypes, reset: resetForm, focus: () => nextTick(() => nameInputRef.value?.focus?.()),
})
const nameInputRef = ref(null)
const search = ref('')
const pagination = reactive({ current_page: 1, per_page: 20, total: 0 })
const modalVisible = ref(false)
const editingItem = ref(null)
const form = reactive({ name: '', default_duration: null, description: '', requires_attachment: false })

const columns = [
  { title: 'Name', dataIndex: 'name', width: 200, sorter: true },
  { title: 'Default Duration', key: 'default_duration', width: 140, align: 'center' },
  { title: 'Description', key: 'description', ellipsis: { showTitle: false } },
  { title: 'Requires Attachment', key: 'requires_attachment', width: 160, align: 'center' },
  { title: '', key: 'actions', width: 140, align: 'right' },
]

const sortField = ref(null)
const sortOrder = ref(null)

const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showSizeChanger: true,
  showTotal: (total) => `${total} leave types`,
  pageSizeOptions: ['10', '20', '50'],
}))

async function fetchTypes() {
  loading.value = true
  try {
    const params = {
      page: pagination.current_page,
      per_page: pagination.per_page,
      ...(search.value && { search: search.value }),
      ...(sortField.value && { sort_by: sortField.value }),
      ...(sortOrder.value && { sort_order: sortOrder.value === 'ascend' ? 'asc' : 'desc' }),
    }
    const { data } = await leaveApi.types(params, { signal: getSignal() })
    leaveTypes.value = data.data || []
    if (data.pagination) Object.assign(pagination, data.pagination)
  } catch (err) { if (err.name !== 'CanceledError') message.error('Failed to load leave types') }
  loading.value = false
}

function onSearchOrFilterChange() {
  pagination.current_page = 1
  fetchTypes()
}

function handleTableChange(pag, _filters, sorter) {
  pagination.current_page = pag.current
  pagination.per_page = pag.pageSize

  if (sorter && sorter.columnKey) {
    const sortMap = { name: 'name' }
    sortField.value = sortMap[sorter.columnKey] || null
    sortOrder.value = sorter.order || null
  } else {
    sortField.value = null
    sortOrder.value = null
  }

  fetchTypes()
}

function resetForm() {
  Object.assign(form, { name: '', default_duration: null, description: '', requires_attachment: false })
}

function focusName() {
  nextTick(() => { nameInputRef.value?.focus?.() })
}

function openCreate() {
  editingItem.value = null
  resetForm()
  modalVisible.value = true
  focusName()
}

function openEdit(record) {
  editingItem.value = record
  Object.assign(form, {
    name: record.name || '',
    default_duration: record.default_duration ?? null,
    description: record.description || '',
    requires_attachment: record.requires_attachment || false,
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
      await leaveApi.typeUpdate(editingItem.value.id, { ...form })
      message.success('Leave type updated')
    } else {
      await leaveApi.typeStore({ ...form })
      message.success('Leave type created')
    }
    modalVisible.value = false
  })
}

async function handleSaveAndAddAnother() {
  if (!validateForm()) return
  await submitAnother(async () => {
    await leaveApi.typeStore({ ...form })
    message.success('Leave type created — ready for next entry')
  })
}

function handleDelete(record) {
  Modal.confirm({
    title: 'Delete Leave Type',
    content: `Are you sure you want to delete "${record.name}"?`,
    okType: 'danger',
    onOk: async () => {
      try {
        await leaveApi.typeDestroy(record.id)
        message.success('Leave type deleted')
        selectedRowKeys.value = []
        fetchTypes()
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
        await leaveApi.typeDestroyBatch(selectedRowKeys.value)
        message.success(`${selectedRowKeys.value.length} record(s) deleted successfully`)
        selectedRowKeys.value = []
        fetchTypes()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to delete records')
      }
    },
  })
}

onMounted(() => { appStore.setPageMeta('Leave Types'); fetchTypes() })
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
