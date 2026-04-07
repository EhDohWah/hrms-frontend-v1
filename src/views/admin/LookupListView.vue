<template>
  <div class="page-container">
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ pagination.total || 0 }} Items</a-tag>
      </div>
      <div class="filter-bar">
        <a-input
          v-model:value="search"
          placeholder="Search value..."
          allow-clear
          class="filter-input"
          style="width: 200px"
          @pressEnter="onFilterChange"
          @clear="onFilterChange"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-select
          v-model:value="filterType"
          placeholder="All Types"
          allow-clear
          show-search
          class="filter-input"
          style="width: 200px"
          @change="onFilterChange"
        >
          <a-select-option v-for="t in lookupTypes" :key="t" :value="t">
            {{ formatType(t) }}
          </a-select-option>
        </a-select>
        <a-button v-if="authStore.canCreate('lookups')" type="primary" @click="openCreate">
          <PlusOutlined /> Add Lookup
        </a-button>
      </div>
    </div>

    <!-- Bulk Actions -->
    <div v-if="selectedRowKeys.length > 0 && authStore.canDelete('lookups')" class="bulk-bar">
      <span class="bulk-count">{{ selectedRowKeys.length }} selected</span>
      <a-button size="small" danger @click="handleBulkDelete">Delete Selected</a-button>
      <a-button size="small" type="link" @click="selectedRowKeys = []">Clear</a-button>
    </div>

    <!-- Table -->
    <a-card :body-style="{ padding: 0 }">
      <a-table
        :columns="columns"
        :data-source="items"
        :loading="loading"
        :pagination="tablePagination"
        :row-key="(r) => r.id"
        :row-selection="authStore.canDelete('lookups') ? { selectedRowKeys, onChange: (keys) => selectedRowKeys = keys } : undefined"
        @change="handleTableChange"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'type'">
            <a-tag color="blue" size="small">{{ formatType(record.type) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'value'">
            <span class="cell-name">{{ record.value }}</span>
          </template>
          <template v-else-if="column.key === 'updated_at'">
            {{ formatDate(record.updated_at) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button v-if="authStore.canUpdate('lookups')" size="small" type="link" @click="openEdit(record)">Edit</a-button>
              <a-button v-if="authStore.canDelete('lookups')" size="small" type="link" danger @click="handleDelete(record)">Delete</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Modal -->
    <a-modal v-model:open="modalVisible" :title="editingItem ? 'Edit Lookup' : 'Add Lookup'" :footer="null" :width="440">
      <a-form :model="form" layout="vertical" class="modal-form" @submit.prevent="handleSave">
        <a-form-item label="Type" required>
          <a-auto-complete
            v-model:value="form.type"
            :options="typeOptions"
            placeholder="e.g. gender, nationality, bank_name"
            :filter-option="filterOption"
          />
          <div class="form-hint">Use snake_case. Pick an existing type or create a new one.</div>
        </a-form-item>
        <a-form-item label="Value" required>
          <a-input v-model:value="form.value" placeholder="Display value" />
        </a-form-item>
        <div class="modal-footer">
          <a-button @click="modalVisible = false">Cancel</a-button>
          <a-button type="primary" html-type="submit" :loading="saving">{{ editingItem ? 'Update' : 'Create' }}</a-button>
        </div>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { SearchOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { lookupApi } from '@/api'
import { formatDate } from '@/utils/formatters'
import { cleanParams } from '@/utils/helpers'
import { PAGINATION_DEFAULTS } from '@/constants/config'

const appStore = useAppStore()
const authStore = useAuthStore()

// ── Filters ──
const search = ref('')
const filterType = ref(undefined)
const lookupTypes = ref([])

// ── Selection ──
const selectedRowKeys = ref([])

// ── Pagination ──
const items = ref([])
const loading = ref(false)
const pagination = reactive({ current_page: 1, per_page: PAGINATION_DEFAULTS.perPage, total: 0 })

const columns = [
  { title: 'Type', key: 'type', width: 200 },
  { title: 'Value', key: 'value', width: 300 },
  { title: 'Last Updated', key: 'updated_at', width: 140 },
  { title: '', key: 'actions', width: 140, align: 'right' },
]

const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showSizeChanger: true,
  showTotal: (total) => `${total} items`,
  pageSizeOptions: PAGINATION_DEFAULTS.pageSizeOptions,
}))

async function fetchItems() {
  loading.value = true
  try {
    const params = cleanParams({
      page: pagination.current_page,
      per_page: pagination.per_page,
      search: search.value || null,
      filter_type: filterType.value,
    })
    const { data } = await lookupApi.list(params)
    items.value = data.data?.data || data.data || []
    const pag = data.data?.meta || data.data
    if (pag) {
      pagination.current_page = pag.current_page ?? pagination.current_page
      pagination.per_page = pag.per_page ?? pagination.per_page
      pagination.total = pag.total ?? pagination.total
    }
  } catch {
    items.value = []
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

// ── Lookup types for filter + autocomplete ──
const typeOptions = computed(() =>
  lookupTypes.value.map(t => ({ value: t, label: formatType(t) }))
)

function filterOption(input, option) {
  return option.value.toLowerCase().includes(input.toLowerCase())
}

async function fetchTypes() {
  try {
    const res = await lookupApi.types()
    lookupTypes.value = res.data.data || res.data || []
  } catch { /* silent */ }
}

// ── CRUD ──
const modalVisible = ref(false)
const editingItem = ref(null)
const saving = ref(false)
const form = reactive({ type: '', value: '' })

function openCreate() {
  editingItem.value = null
  form.type = filterType.value || ''
  form.value = ''
  modalVisible.value = true
}

function openEdit(record) {
  editingItem.value = record
  form.type = record.type
  form.value = record.value
  modalVisible.value = true
}

async function handleSave() {
  if (!form.type?.trim() || !form.value?.trim()) {
    message.warning('Type and value are required')
    return
  }
  saving.value = true
  try {
    if (editingItem.value) {
      await lookupApi.update(editingItem.value.id, { type: form.type, value: form.value })
      message.success('Lookup updated')
    } else {
      await lookupApi.store({ type: form.type, value: form.value })
      message.success('Lookup created')
    }
    modalVisible.value = false
    fetchItems()
    fetchTypes()
  } catch (err) {
    const resp = err.response?.data
    if (resp?.errors) {
      const firstErr = Object.values(resp.errors)[0]
      message.error(Array.isArray(firstErr) ? firstErr[0] : firstErr)
    } else {
      message.error(resp?.message || 'Failed to save')
    }
  }
  saving.value = false
}

function handleDelete(record) {
  Modal.confirm({
    title: `Delete "${record.value}"?`,
    content: `This will remove the "${formatType(record.type)}" lookup value.`,
    okText: 'Delete',
    okType: 'danger',
    onOk: async () => {
      try {
        await lookupApi.destroy(record.id)
        message.success('Lookup deleted')
        fetchItems()
        fetchTypes()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to delete')
      }
    },
  })
}

function handleBulkDelete() {
  Modal.confirm({
    title: `Delete ${selectedRowKeys.value.length} lookups?`,
    content: 'This action cannot be undone.',
    okText: 'Delete All',
    okType: 'danger',
    onOk: async () => {
      const results = await Promise.allSettled(
        selectedRowKeys.value.map(id => lookupApi.destroy(id))
      )
      const deleted = results.filter(r => r.status === 'fulfilled').length
      message.success(`${deleted} lookups deleted`)
      selectedRowKeys.value = []
      fetchItems()
      fetchTypes()
    },
  })
}

function formatType(type) {
  if (!type) return ''
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ── Init ──
onMounted(() => {
  appStore.setPageMeta('Lookup Data', [{ title: 'Administration' }, { title: 'Lookup Data' }])
  fetchItems()
  fetchTypes()
})
</script>

<style scoped>
.form-hint {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 4px;
}
</style>
