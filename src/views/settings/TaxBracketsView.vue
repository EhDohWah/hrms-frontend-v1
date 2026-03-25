<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ pagination.total || 0 }} Total</a-tag>
      </div>
      <div class="filter-bar">
        <a-select
          v-model:value="filters.effective_year"
          placeholder="Year"
          allow-clear
          class="filter-input"
          style="width: 110px"
          @change="onFilterChange"
        >
          <a-select-option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</a-select-option>
        </a-select>
        <a-select
          v-model:value="filters.is_active"
          placeholder="Status"
          allow-clear
          class="filter-input"
          style="width: 120px"
          @change="onFilterChange"
        >
          <a-select-option value="true">Active</a-select-option>
          <a-select-option value="false">Inactive</a-select-option>
        </a-select>
        <a-button v-if="selectedRowKeys.length > 0 && authStore.canDelete('tax_settings')" danger @click="handleBulkDelete">
          Delete {{ selectedRowKeys.length }} Selected
        </a-button>
        <a-button v-if="authStore.canCreate('tax_settings')" type="primary" @click="openCreate">
          <PlusOutlined /> Add Bracket
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
          <template v-if="column.key === 'order'">
            <span class="font-mono">{{ record.bracket_order }}</span>
          </template>
          <template v-else-if="column.key === 'income_range'">
            <span class="font-mono" style="font-size: 12.5px">
              {{ record.income_range || formatRange(record) }}
            </span>
          </template>
          <template v-else-if="column.key === 'tax_rate'">
            <span class="font-mono font-semibold">{{ record.formatted_rate || `${record.tax_rate}%` }}</span>
          </template>
          <template v-else-if="column.key === 'base_tax'">
            <span class="font-mono">{{ formatCurrency(record.base_tax) }}</span>
          </template>
          <template v-else-if="column.key === 'year'">
            <span class="font-mono">{{ record.effective_year || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.is_active ? 'green' : 'default'" size="small">
              {{ record.is_active ? 'Active' : 'Inactive' }}
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
      :title="editingItem ? 'Edit Tax Bracket' : 'Add Tax Bracket'"
      :width="'min(95vw, 640px)'"
      :footer="null"
      destroy-on-close
    >
      <a-form :model="form" layout="vertical" class="modal-form" @finish="handleSave">
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="Bracket Order" required>
              <a-input-number v-model:value="form.bracket_order" placeholder="e.g. 1" :min="1" :max="20" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Tax Rate (%)" required>
              <a-input-number v-model:value="form.tax_rate" placeholder="e.g. 5" :min="0" :max="100" :precision="2" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Effective Year" required>
              <a-select v-model:value="form.effective_year" placeholder="Select year">
                <a-select-option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Min Income (฿)" required>
              <a-input-number
                v-model:value="form.min_income"
                placeholder="e.g. 0"
                :min="0"
                :formatter="(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                :parser="(v) => v.replace(/,/g, '')"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Max Income (฿)">
              <a-input-number
                v-model:value="form.max_income"
                placeholder="Leave empty for highest bracket"
                :min="0"
                :formatter="(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                :parser="(v) => v.replace(/,/g, '')"
                style="width: 100%"
                allow-clear
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
          <a-button type="primary" html-type="submit" :loading="saving">Save</a-button>
        </div>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, createVNode } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { taxBracketApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'
import { formatCurrency } from '@/utils/formatters'

const getSignal = useAbortController()
const appStore = useAppStore()
const authStore = useAuthStore()

const items = ref([])
const selectedRowKeys = ref([])
const loading = ref(false)
const saving = ref(false)
const filters = reactive({ effective_year: undefined, is_active: undefined })
const pagination = reactive({ current_page: 1, per_page: 20, total: 0 })
const modalVisible = ref(false)
const editingItem = ref(null)
const form = reactive({
  bracket_order: null,
  min_income: null,
  max_income: null,
  tax_rate: null,
  effective_year: new Date().getFullYear(),
  description: '',
  is_active: true,
})

const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i)

const columns = [
  { title: '#', key: 'order', width: 60, align: 'center' },
  { title: 'Income Range', key: 'income_range', width: 240 },
  { title: 'Tax Rate', key: 'tax_rate', width: 100, align: 'center' },
  { title: 'Base Tax', key: 'base_tax', width: 130, align: 'right' },
  { title: 'Year', key: 'year', width: 80, align: 'center' },
  { title: 'Status', key: 'status', width: 90, align: 'center' },
  { title: '', key: 'actions', width: 140, align: 'right' },
]

const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showSizeChanger: true,
  showTotal: (total) => `${total} brackets`,
  pageSizeOptions: ['10', '20', '50'],
}))

function formatRange(record) {
  const min = formatCurrency(record.min_income)
  if (record.max_income == null) return `${min} +`
  return `${min} — ${formatCurrency(record.max_income)}`
}

async function fetchItems() {
  loading.value = true
  try {
    const params = {
      page: pagination.current_page,
      per_page: pagination.per_page,
      ...(filters.effective_year && { filter_effective_year: filters.effective_year }),
      ...(filters.is_active !== undefined && filters.is_active !== null && { filter_is_active: filters.is_active }),
    }
    const { data } = await taxBracketApi.list(params, { signal: getSignal() })
    items.value = data.data || []
    if (data.pagination) Object.assign(pagination, data.pagination)
  } catch (err) {
    if (err.name !== 'CanceledError') message.error('Failed to load tax brackets')
  }
  loading.value = false
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

function resetForm() {
  Object.assign(form, {
    bracket_order: null,
    min_income: null,
    max_income: null,
    tax_rate: null,
    effective_year: currentYear,
    description: '',
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
    bracket_order: record.bracket_order,
    min_income: record.min_income != null ? Number(record.min_income) : null,
    max_income: record.max_income != null ? Number(record.max_income) : null,
    tax_rate: record.tax_rate != null ? Number(record.tax_rate) : null,
    effective_year: record.effective_year || currentYear,
    description: record.description || '',
    is_active: record.is_active ?? true,
  })
  modalVisible.value = true
}

async function handleSave() {
  if (form.bracket_order == null) return message.warning('Bracket order is required')
  if (form.min_income == null) return message.warning('Minimum income is required')
  if (form.tax_rate == null) return message.warning('Tax rate is required')
  if (!form.effective_year) return message.warning('Effective year is required')
  saving.value = true
  try {
    const payload = { ...form }
    if (editingItem.value) {
      await taxBracketApi.update(editingItem.value.id, payload)
      message.success('Tax bracket updated')
    } else {
      await taxBracketApi.store(payload)
      message.success('Tax bracket created')
    }
    modalVisible.value = false
    fetchItems()
  } catch (err) {
    message.error(err.response?.data?.message || 'Failed to save')
  }
  saving.value = false
}

function handleBulkDelete() {
  Modal.confirm({
    title: 'Delete Selected Brackets',
    icon: createVNode(ExclamationCircleOutlined),
    content: `Are you sure you want to delete ${selectedRowKeys.value.length} selected bracket(s)? This action cannot be undone.`,
    okText: 'Delete',
    okType: 'danger',
    cancelText: 'Cancel',
    centered: true,
    async onOk() {
      try {
        await Promise.all(selectedRowKeys.value.map((id) => taxBracketApi.destroy(id)))
        message.success(`${selectedRowKeys.value.length} bracket(s) deleted`)
        selectedRowKeys.value = []
        fetchItems()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to delete brackets')
      }
    },
  })
}

function handleDelete(record) {
  const label = record.income_range || formatRange(record)
  Modal.confirm({
    title: 'Delete Tax Bracket',
    icon: createVNode(ExclamationCircleOutlined),
    content: `Are you sure you want to delete bracket #${record.bracket_order} (${label})? This action cannot be undone.`,
    okText: 'Delete',
    okType: 'danger',
    cancelText: 'Cancel',
    centered: true,
    async onOk() {
      try {
        await taxBracketApi.destroy(record.id)
        message.success('Tax bracket deleted')
        fetchItems()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to delete')
      }
    },
  })
}

onMounted(() => {
  appStore.setPageMeta('Tax Brackets')
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
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-light);
}
</style>
