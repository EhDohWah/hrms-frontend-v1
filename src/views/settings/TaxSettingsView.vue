<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ pagination.total || 0 }} Total</a-tag>
      </div>
      <div class="filter-bar">
        <a-input
          v-model:value="search"
          placeholder="Search settings..."
          allow-clear
          class="filter-input"
          style="width: 200px"
          @pressEnter="onSearchOrFilterChange"
          @clear="onSearchOrFilterChange"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-select
          v-model:value="filters.effective_year"
          placeholder="Year"
          allow-clear
          class="filter-input"
          style="width: 110px"
          @change="onSearchOrFilterChange"
        >
          <a-select-option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</a-select-option>
        </a-select>
        <a-select
          v-model:value="filters.setting_type"
          placeholder="Type"
          allow-clear
          class="filter-input"
          style="width: 130px"
          @change="onSearchOrFilterChange"
        >
          <a-select-option value="DEDUCTION">Deduction</a-select-option>
          <a-select-option value="RATE">Rate</a-select-option>
          <a-select-option value="LIMIT">Limit</a-select-option>
        </a-select>
        <a-select
          v-model:value="filters.is_selected"
          placeholder="Enabled"
          allow-clear
          class="filter-input"
          style="width: 120px"
          @change="onSearchOrFilterChange"
        >
          <a-select-option value="true">Enabled</a-select-option>
          <a-select-option value="false">Disabled</a-select-option>
        </a-select>
        <a-button v-if="selectedRowKeys.length > 0 && authStore.canDelete('tax_settings')" danger @click="handleBulkDelete">
          Delete {{ selectedRowKeys.length }} Selected
        </a-button>
        <a-button v-if="authStore.canCreate('tax_settings')" type="primary" @click="openCreate">
          <PlusOutlined /> Add Setting
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
        :row-selection="authStore.canDelete('tax_settings') ? { selectedRowKeys, onChange: (keys) => selectedRowKeys = keys } : undefined"
        :scroll="{ x: 'max-content' }"
        @change="handleTableChange"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'setting_key'">
            <span class="font-mono" style="font-size: 12.5px">{{ record.setting_key }}</span>
            <div v-if="record.description" class="cell-sub">{{ record.description }}</div>
          </template>
          <template v-else-if="column.key === 'value'">
            <span class="font-mono font-semibold">{{ record.formatted_value || formatValue(record) }}</span>
          </template>
          <template v-else-if="column.key === 'type'">
            <a-tag size="small" :color="typeColor(record.setting_type)">{{ record.setting_type }}</a-tag>
          </template>
          <template v-else-if="column.key === 'category'">
            <span style="font-size: 12.5px">{{ record.setting_category || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'year'">
            <span class="font-mono">{{ record.effective_year || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-switch
              v-if="authStore.canUpdate('tax_settings')"
              :checked="record.is_selected"
              size="small"
              :loading="togglingId === record.id"
              @change="handleToggle(record)"
            />
            <a-tag v-else :color="record.is_selected ? 'green' : 'default'" size="small">
              {{ record.is_selected ? 'Enabled' : 'Disabled' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button v-if="authStore.canUpdate('tax_settings')" size="small" type="link" @click="openEdit(record)">Edit</a-button>
              <a-button v-if="authStore.canDelete('tax_settings')" size="small" type="link" danger @click="handleDelete(record)">Delete</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingItem ? 'Edit Tax Setting' : 'Add Tax Setting'"
      @ok="handleSave"
      :confirm-loading="saving"
    >
      <a-form :model="form" layout="vertical" class="modal-form">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Setting Key" required>
              <a-input v-model:value="form.setting_key" placeholder="e.g. PERSONAL_ALLOWANCE" :disabled="!!editingItem" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Effective Year" required>
              <a-select v-model:value="form.effective_year" placeholder="Select year">
                <a-select-option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Value" required>
              <a-input-number
                v-model:value="form.setting_value"
                placeholder="Enter value"
                :min="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Setting Type" required>
              <a-select v-model:value="form.setting_type" placeholder="Select type">
                <a-select-option value="DEDUCTION">Deduction</a-select-option>
                <a-select-option value="RATE">Rate</a-select-option>
                <a-select-option value="LIMIT">Limit</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Description">
          <a-input v-model:value="form.description" placeholder="Enter description" />
        </a-form-item>
        <a-form-item label="Enabled">
          <a-switch v-model:checked="form.is_selected" />
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
import { taxSettingApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'
import { formatCurrency } from '@/utils/formatters'

const getSignal = useAbortController()
const appStore = useAppStore()
const authStore = useAuthStore()

const items = ref([])
const selectedRowKeys = ref([])
const loading = ref(false)
const saving = ref(false)
const togglingId = ref(null)
const search = ref('')
const filters = reactive({ effective_year: undefined, setting_type: undefined, is_selected: undefined })
const pagination = reactive({ current_page: 1, per_page: 20, total: 0 })
const modalVisible = ref(false)
const editingItem = ref(null)
const form = reactive({
  setting_key: '',
  setting_value: null,
  setting_type: undefined,
  description: '',
  effective_year: new Date().getFullYear(),
  is_selected: true,
})

const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i)

const columns = [
  { title: 'Setting Key', key: 'setting_key', width: 240 },
  { title: 'Value', key: 'value', width: 140, align: 'right' },
  { title: 'Type', key: 'type', width: 100, align: 'center' },
  { title: 'Category', key: 'category', width: 160 },
  { title: 'Year', key: 'year', width: 80, align: 'center' },
  { title: 'Enabled', key: 'status', width: 80, align: 'center' },
  { title: '', key: 'actions', width: 140, align: 'right' },
]

const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showSizeChanger: true,
  showTotal: (total) => `${total} settings`,
  pageSizeOptions: ['10', '20', '50', '100'],
}))

function typeColor(type) {
  const map = { DEDUCTION: 'blue', RATE: 'green', LIMIT: 'orange', ALLOWANCE: 'purple' }
  return map[type] || 'default'
}

function formatValue(record) {
  if (record.setting_type === 'RATE') return `${record.setting_value}%`
  const n = Number(record.setting_value)
  return isNaN(n) ? String(record.setting_value) : formatCurrency(n)
}

async function fetchItems() {
  loading.value = true
  try {
    const params = {
      page: pagination.current_page,
      per_page: pagination.per_page,
      ...(search.value && { search: search.value }),
      ...(filters.effective_year && { filter_effective_year: filters.effective_year }),
      ...(filters.setting_type && { filter_setting_type: filters.setting_type }),
      ...(filters.is_selected !== undefined && filters.is_selected !== null && { filter_is_selected: filters.is_selected }),
    }
    const { data } = await taxSettingApi.list(params, { signal: getSignal() })
    items.value = data.data || []
    if (data.pagination) Object.assign(pagination, data.pagination)
  } catch (err) {
    if (err.name !== 'CanceledError') message.error('Failed to load tax settings')
  }
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
    setting_key: '',
    setting_value: null,
    setting_type: undefined,
    description: '',
    effective_year: currentYear,
    is_selected: true,
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
    setting_key: record.setting_key || '',
    setting_value: record.setting_value != null ? Number(record.setting_value) : null,
    setting_type: record.setting_type || undefined,
    description: record.description || '',
    effective_year: record.effective_year || currentYear,
    is_selected: record.is_selected ?? true,
  })
  modalVisible.value = true
}

async function handleSave() {
  if (!form.setting_key) return message.warning('Setting key is required')
  if (form.setting_value == null) return message.warning('Value is required')
  if (!form.setting_type) return message.warning('Setting type is required')
  if (!form.effective_year) return message.warning('Effective year is required')
  saving.value = true
  try {
    const payload = { ...form }
    if (editingItem.value) {
      await taxSettingApi.update(editingItem.value.id, payload)
      message.success('Setting updated')
    } else {
      await taxSettingApi.store(payload)
      message.success('Setting created')
    }
    modalVisible.value = false
    fetchItems()
  } catch (err) {
    message.error(err.response?.data?.message || 'Failed to save')
  }
  saving.value = false
}

async function handleToggle(record) {
  togglingId.value = record.id
  try {
    await taxSettingApi.toggleSelection(record.id)
    record.is_selected = !record.is_selected
    message.success(`Setting ${record.is_selected ? 'enabled' : 'disabled'}`)
  } catch (err) {
    message.error(err.response?.data?.message || 'Failed to toggle')
  }
  togglingId.value = null
}

function handleBulkDelete() {
  Modal.confirm({
    title: 'Delete Selected Settings',
    icon: createVNode(ExclamationCircleOutlined),
    content: `Are you sure you want to delete ${selectedRowKeys.value.length} selected setting(s)? This action cannot be undone.`,
    okText: 'Delete',
    okType: 'danger',
    cancelText: 'Cancel',
    centered: true,
    async onOk() {
      try {
        await Promise.all(selectedRowKeys.value.map((id) => taxSettingApi.destroy(id)))
        message.success(`${selectedRowKeys.value.length} setting(s) deleted`)
        selectedRowKeys.value = []
        fetchItems()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to delete settings')
      }
    },
  })
}

function handleDelete(record) {
  Modal.confirm({
    title: 'Delete Tax Setting',
    icon: createVNode(ExclamationCircleOutlined),
    content: `Are you sure you want to delete "${record.setting_key}" (${record.effective_year})? This action cannot be undone.`,
    okText: 'Delete',
    okType: 'danger',
    cancelText: 'Cancel',
    centered: true,
    async onOk() {
      try {
        await taxSettingApi.destroy(record.id)
        message.success('Setting deleted')
        fetchItems()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to delete')
      }
    },
  })
}

onMounted(() => {
  appStore.setPageMeta('Tax Settings')
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
.modal-form { margin-top: 16px; }
.cell-sub { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
</style>
