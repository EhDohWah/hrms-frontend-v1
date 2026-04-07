<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ items.length }} Total</a-tag>
      </div>
      <div class="filter-bar">
        <a-select
          v-model:value="filters.category"
          placeholder="Category"
          allow-clear
          class="filter-input"
          style="width: 180px"
          @change="fetchItems"
        >
          <a-select-option value="social_security">Social Security</a-select-option>
          <a-select-option value="provident_fund">Provident Fund</a-select-option>
          <a-select-option value="saving_fund">Saving Fund</a-select-option>
          <a-select-option value="health_welfare">Health & Welfare</a-select-option>
        </a-select>
        <a-select
          v-model:value="filters.filter_is_active"
          placeholder="Status"
          allow-clear
          class="filter-input"
          style="width: 120px"
          @change="fetchItems"
        >
          <a-select-option :value="true">Active</a-select-option>
          <a-select-option :value="false">Inactive</a-select-option>
        </a-select>
        <a-button v-if="selectedRowKeys.length > 0 && authStore.canDelete('benefit_settings')" danger @click="handleBulkDelete">
          Delete {{ selectedRowKeys.length }} Selected
        </a-button>
        <a-button v-if="authStore.canCreate('benefit_settings')" type="primary" @click="openCreate">
          <PlusOutlined /> Add Setting
        </a-button>
      </div>
    </div>

    <a-card :body-style="{ padding: 0 }">
      <a-table
        :columns="columns"
        :data-source="items"
        :loading="loading"
        :row-key="(r) => r.id"
        :row-selection="authStore.canDelete('benefit_settings') ? { selectedRowKeys, onChange: (keys) => selectedRowKeys = keys } : undefined"
        :pagination="false"
        :scroll="{ x: 'max-content' }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'setting_key'">
            <span class="font-mono" style="font-size: 12.5px">{{ record.setting_key }}</span>
            <div v-if="record.description" class="cell-sub">{{ record.description }}</div>
          </template>
          <template v-else-if="column.key === 'category'">
            <a-tag :color="categoryColor(record.category)" size="small">
              {{ record.category_label || categoryLabels[record.category] || record.category || '—' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'value'">
            <span class="font-mono font-semibold">{{ record.formatted_value || formatValue(record) }}</span>
          </template>
          <template v-else-if="column.key === 'type'">
            <a-tag size="small">{{ record.setting_type }}</a-tag>
          </template>
          <template v-else-if="column.key === 'effective_date'">
            {{ record.effective_date ? formatDate(record.effective_date) : '—' }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.is_active ? 'green' : 'default'" size="small">
              {{ record.is_active ? 'Active' : 'Inactive' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button v-if="authStore.canUpdate('benefit_settings')" size="small" type="link" @click="openEdit(record)">Edit</a-button>
              <a-button v-if="authStore.canDelete('benefit_settings')" size="small" type="link" danger @click="handleDelete(record)">Delete</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingItem ? 'Edit Benefit Setting' : 'Add Benefit Setting'"
      :footer="null"
    >
      <a-form :model="form" layout="vertical" class="modal-form" @submit.prevent="handleSave">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Category" required>
              <a-select v-model:value="form.category" placeholder="Select category">
                <a-select-option value="social_security">Social Security</a-select-option>
                <a-select-option value="provident_fund">Provident Fund</a-select-option>
                <a-select-option value="saving_fund">Saving Fund</a-select-option>
                <a-select-option value="health_welfare">Health & Welfare</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Setting Type" required>
              <a-select v-model:value="form.setting_type" placeholder="Select type">
                <a-select-option value="percentage">Percentage</a-select-option>
                <a-select-option value="numeric">Numeric</a-select-option>
                <a-select-option value="boolean">Boolean</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Setting Key" required>
          <a-input v-model:value="form.setting_key" placeholder="e.g. ssf_employee_rate" :disabled="!!editingItem" />
        </a-form-item>
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
            <a-form-item label="Effective Date">
              <a-date-picker
                v-model:value="form.effective_date"
                format="DD MMM YYYY"
                value-format="YYYY-MM-DD"
                placeholder="Select date"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Description">
          <a-input v-model:value="form.description" placeholder="Enter description" />
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, createVNode } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { benefitSettingApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'
import { useSaveAnother } from '@/composables/useSaveAnother'
import { formatCurrency, formatDate } from '@/utils/formatters'

const getSignal = useAbortController()
const appStore = useAppStore()
const authStore = useAuthStore()

const items = ref([])
const selectedRowKeys = ref([])
const loading = ref(false)
const { savingMain, savingAnother, submitMain, submitAnother } = useSaveAnother({
  refresh: fetchItems, reset: resetForm,
})
const filters = reactive({ category: undefined, filter_is_active: undefined })
const modalVisible = ref(false)
const editingItem = ref(null)
const form = reactive({
  setting_key: '',
  setting_value: null,
  setting_type: 'percentage',
  category: undefined,
  description: '',
  effective_date: null,
  is_active: true,
})

const categoryLabels = {
  social_security: 'Social Security',
  provident_fund: 'Provident Fund',
  saving_fund: 'Saving Fund',
  health_welfare: 'Health & Welfare',
}

const columns = [
  { title: 'Setting Key', key: 'setting_key', width: 260 },
  { title: 'Category', key: 'category', width: 150 },
  { title: 'Value', key: 'value', width: 130, align: 'right' },
  { title: 'Type', key: 'type', width: 110, align: 'center' },
  { title: 'Effective Date', key: 'effective_date', width: 130 },
  { title: 'Status', key: 'status', width: 90, align: 'center' },
  { title: '', key: 'actions', width: 140, align: 'right' },
]

function categoryColor(cat) {
  const map = { social_security: 'blue', provident_fund: 'purple', saving_fund: 'cyan', health_welfare: 'green' }
  return map[cat] || 'default'
}

function formatValue(record) {
  if (record.setting_type === 'percentage') return `${record.setting_value}%`
  if (record.setting_type === 'boolean') return Number(record.setting_value) ? 'Yes' : 'No'
  const n = Number(record.setting_value)
  return isNaN(n) ? String(record.setting_value) : formatCurrency(n)
}

async function fetchItems() {
  loading.value = true
  try {
    const params = {
      ...(filters.category && { filter_category: filters.category }),
      ...(filters.filter_is_active !== undefined && filters.filter_is_active !== null && { filter_is_active: filters.filter_is_active }),
    }
    const { data } = await benefitSettingApi.list(params, { signal: getSignal() })
    items.value = data.data || data || []
  } catch (err) {
    if (err.name !== 'CanceledError') message.error('Failed to load benefit settings')
  }
  loading.value = false
}

function resetForm() {
  Object.assign(form, {
    setting_key: '',
    setting_value: null,
    setting_type: 'percentage',
    category: undefined,
    description: '',
    effective_date: null,
    is_active: true,
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
    setting_type: record.setting_type || 'percentage',
    category: record.category || undefined,
    description: record.description || '',
    effective_date: record.effective_date || null,
    is_active: record.is_active ?? true,
  })
  modalVisible.value = true
}

function validateForm() {
  if (!form.setting_key || !form.category) { message.warning('Setting key and category are required'); return false }
  if (form.setting_value == null) { message.warning('Value is required'); return false }
  return true
}

async function handleSave() {
  if (!validateForm()) return
  const payload = { ...form }
  await submitMain(async () => {
    if (editingItem.value) {
      await benefitSettingApi.update(editingItem.value.id, payload)
      message.success('Setting updated')
    } else {
      await benefitSettingApi.store(payload)
      message.success('Setting created')
    }
    modalVisible.value = false
  })
}

async function handleSaveAndAddAnother() {
  if (!validateForm()) return
  const payload = { ...form }
  await submitAnother(async () => {
    await benefitSettingApi.store(payload)
    message.success('Setting created — ready for next entry')
  })
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
        await Promise.all(selectedRowKeys.value.map((id) => benefitSettingApi.destroy(id)))
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
    title: 'Delete Setting',
    icon: createVNode(ExclamationCircleOutlined),
    content: `Are you sure you want to delete "${record.setting_key}"? This action cannot be undone.`,
    okText: 'Delete',
    okType: 'danger',
    cancelText: 'Cancel',
    centered: true,
    async onOk() {
      try {
        await benefitSettingApi.destroy(record.id)
        message.success('Setting deleted')
        fetchItems()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to delete')
      }
    },
  })
}

onMounted(() => {
  appStore.setPageMeta('Benefit Settings')
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
