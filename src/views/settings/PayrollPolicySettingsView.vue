<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ items.length }} Policies</a-tag>
      </div>
      <div class="filter-bar">
        <a-button v-if="authStore.canCreate('payroll_items')" type="primary" @click="openCreate">
          <PlusOutlined /> Add Policy
        </a-button>
      </div>
    </div>

    <a-card :body-style="{ padding: 0 }">
      <a-table
        :columns="columns"
        :data-source="items"
        :loading="loading"
        :row-key="(r) => r.id"
        :pagination="false"
        :scroll="{ x: 'max-content' }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'policy_name'">
            <span class="font-semibold">{{ categories[record.category] || record.policy_key }}</span>
            <div v-if="record.description" class="cell-sub">{{ record.description }}</div>
          </template>
          <template v-else-if="column.key === 'value'">
            <template v-if="record.setting_type === 'boolean'">
              <span class="text-muted">—</span>
            </template>
            <template v-else>
              <span class="font-mono font-semibold">{{ formatValue(record) }}</span>
            </template>
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
              <a-button v-if="authStore.canUpdate('payroll_items')" size="small" type="link" @click="openEdit(record)">Edit</a-button>
              <a-button v-if="authStore.canDelete('payroll_items')" size="small" type="link" danger @click="handleDelete(record)">Delete</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingItem ? 'Edit Policy' : 'Add Policy'"
      @ok="handleSave"
      :confirm-loading="saving"
    >
      <a-form :model="form" layout="vertical" class="modal-form">
        <a-form-item label="Policy Key" required>
          <a-input v-model:value="form.policy_key" placeholder="e.g. thirteenth_month" :disabled="!!editingItem" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Setting Type" required>
              <a-select v-model:value="form.setting_type" placeholder="Select type">
                <a-select-option value="boolean">Boolean (on/off only)</a-select-option>
                <a-select-option value="percentage">Percentage</a-select-option>
                <a-select-option value="numeric">Numeric</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Value" :required="form.setting_type !== 'boolean'">
              <template v-if="form.setting_type === 'boolean'">
                <a-input disabled placeholder="No value needed" />
              </template>
              <template v-else>
                <a-input-number
                  v-model:value="form.policy_value"
                  placeholder="Enter value"
                  :min="0"
                  :step="form.setting_type === 'percentage' ? 0.01 : 1"
                  style="width: 100%"
                />
              </template>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Category">
              <a-select v-model:value="form.category" placeholder="Select category" allow-clear>
                <a-select-option v-for="(label, key) in categories" :key="key" :value="key">{{ label }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Effective Date" required>
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
import { payrollPolicyApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'
import { formatDate } from '@/utils/formatters'

const getSignal = useAbortController()
const appStore = useAppStore()
const authStore = useAuthStore()

const items = ref([])
const categories = ref({})
const loading = ref(false)
const saving = ref(false)
const modalVisible = ref(false)
const editingItem = ref(null)
const form = reactive({
  policy_key: '',
  policy_value: null,
  setting_type: 'boolean',
  category: undefined,
  description: '',
  effective_date: null,
  is_active: true,
})

const columns = [
  { title: 'Policy', key: 'policy_name', ellipsis: true },
  { title: 'Value', key: 'value', width: 120, align: 'right' },
  { title: 'Type', key: 'type', width: 110, align: 'center' },
  { title: 'Effective Date', key: 'effective_date', width: 130 },
  { title: 'Status', key: 'status', width: 90, align: 'center' },
  { title: '', key: 'actions', width: 140, align: 'right' },
]

function formatValue(record) {
  if (record.setting_type === 'percentage') return `${record.policy_value}%`
  const n = Number(record.policy_value)
  return isNaN(n) ? String(record.policy_value ?? '—') : n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

async function fetchItems() {
  loading.value = true
  try {
    const { data } = await payrollPolicyApi.list(undefined, { signal: getSignal() })
    items.value = data.data || data || []
    if (data.categories) categories.value = data.categories
  } catch (err) {
    if (err.name !== 'CanceledError') message.error('Failed to load payroll policies')
  }
  loading.value = false
}

function resetForm() {
  Object.assign(form, {
    policy_key: '',
    policy_value: null,
    setting_type: 'boolean',
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
    policy_key: record.policy_key || '',
    policy_value: record.policy_value != null ? Number(record.policy_value) : null,
    setting_type: record.setting_type || 'boolean',
    category: record.category || undefined,
    description: record.description || '',
    effective_date: record.effective_date || null,
    is_active: record.is_active ?? true,
  })
  modalVisible.value = true
}

async function handleSave() {
  if (!form.policy_key) return message.warning('Policy key is required')
  if (form.setting_type !== 'boolean' && form.policy_value == null) return message.warning('Value is required')
  if (!form.effective_date) return message.warning('Effective date is required')
  saving.value = true
  try {
    const payload = { ...form }
    // Boolean policies don't need a value
    if (payload.setting_type === 'boolean') payload.policy_value = null
    if (editingItem.value) {
      await payrollPolicyApi.update(editingItem.value.id, payload)
      message.success('Policy updated')
    } else {
      await payrollPolicyApi.store(payload)
      message.success('Policy created')
    }
    modalVisible.value = false
    fetchItems()
  } catch (err) {
    message.error(err.response?.data?.message || 'Failed to save')
  }
  saving.value = false
}

function handleDelete(record) {
  const label = categories.value[record.category] || record.policy_key
  Modal.confirm({
    title: 'Delete Policy',
    icon: createVNode(ExclamationCircleOutlined),
    content: `Are you sure you want to delete "${label}"? This action cannot be undone.`,
    okText: 'Delete',
    okType: 'danger',
    cancelText: 'Cancel',
    centered: true,
    async onOk() {
      try {
        await payrollPolicyApi.destroy(record.id)
        message.success('Policy deleted')
        fetchItems()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to delete')
      }
    },
  })
}

onMounted(() => {
  appStore.setPageMeta('Payroll Policies')
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
