<template>
  <div class="page-container">
    <!-- Page header -->
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ filteredItems.length }} Records</a-tag>
        <template v-if="stats">
          <a-tag v-for="(count, model) in stats.by_model" :key="model" :color="modelTagColor(model)">
            {{ count }} {{ model }}
          </a-tag>
        </template>
      </div>
      <div class="filter-bar">
        <a-input
          v-model:value="search"
          placeholder="Search deleted records..."
          allow-clear
          class="filter-input"
          style="width: 240px"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-select
          v-model:value="filterModel"
          placeholder="All Types"
          allow-clear
          class="filter-input"
          style="width: 160px"
        >
          <a-select-option v-for="type in availableModelTypes" :key="type" :value="type">
            {{ type }}
          </a-select-option>
        </a-select>
        <a-button
          v-if="selectedRowKeys.length > 0 && authStore.canUpdate('recycle_bin_list')"
          type="primary"
          @click="handleBulkRestore"
          :loading="restoring"
        >
          <UndoOutlined /> Restore {{ selectedRowKeys.length }} Selected
        </a-button>
        <a-button
          v-if="selectedRowKeys.length > 0 && authStore.canDelete('recycle_bin_list')"
          danger
          @click="handleBulkDelete"
          :loading="deleting"
        >
          <DeleteOutlined /> Delete {{ selectedRowKeys.length }} Selected
        </a-button>
      </div>
    </div>

    <!-- Table -->
    <a-card :body-style="{ padding: 0 }">
      <a-table
        :columns="columns"
        :data-source="filteredItems"
        :loading="loading"
        :row-key="rowKey"
        :row-selection="authStore.canUpdate('recycle_bin_list') || authStore.canDelete('recycle_bin_list') ? rowSelection : undefined"
        :scroll="{ x: 'max-content' }"
        size="middle"
        :pagination="{
          showSizeChanger: true,
          showTotal: (total) => `${total} records`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'display_name'">
            <div>
              <div class="cell-name">{{ record.display_name }}</div>
              <div class="cell-sub font-mono">#{{ record.original_id }}</div>
            </div>
          </template>

          <template v-else-if="column.key === 'model_type'">
            <a-tag :color="modelTagColor(record.model_type)" size="small">
              {{ record.model_type }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'deleted_at'">
            <div>
              <div>{{ formatDateTime(record.deleted_at) }}</div>
              <div class="cell-sub">{{ record.deleted_ago }}</div>
            </div>
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space :size="0">
              <a-button v-if="authStore.canUpdate('recycle_bin_list')" size="small" type="link" @click="handleRestore(record)">Restore</a-button>
              <a-button v-if="authStore.canDelete('recycle_bin_list')" size="small" type="link" danger @click="handlePermanentDelete(record)">Delete</a-button>
            </a-space>
          </template>
        </template>

        <template #emptyText>
          <a-empty description="Recycle bin is empty" />
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
import { ref, computed, createVNode, onMounted } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { SearchOutlined, UndoOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { recycleBinApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'
import { formatDateTime } from '@/utils/formatters'

const getSignal = useAbortController()
const appStore = useAppStore()
const authStore = useAuthStore()

const items = ref([])
const stats = ref(null)
const loading = ref(false)
const restoring = ref(false)
const deleting = ref(false)
const search = ref('')
const filterModel = ref(undefined)
const selectedRowKeys = ref([])

const modelColorMap = {
  Employee: 'blue',
  Grant: 'green',
  Department: 'orange',
  Payroll: 'cyan',
  Interview: 'purple',
  JobOffer: 'magenta',
}

function modelTagColor(modelType) {
  return modelColorMap[modelType] || 'default'
}

const columns = [
  { title: 'Name', key: 'display_name', width: 260 },
  { title: 'Type', key: 'model_type', width: 130, align: 'center' },
  { title: 'Deleted At', key: 'deleted_at', width: 180 },
  { title: '', key: 'actions', width: 150, align: 'right' },
]

const availableModelTypes = computed(() =>
  stats.value ? Object.keys(stats.value.by_model).sort() : []
)

const filteredItems = computed(() => {
  let result = items.value

  if (filterModel.value) {
    result = result.filter(item => item.model_type === filterModel.value)
  }

  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter(item =>
      item.display_name?.toLowerCase().includes(q)
      || item.model_type?.toLowerCase().includes(q)
      || String(item.original_id).includes(q)
    )
  }

  return result
})

/** Unique key for each row — combines type info to avoid ID collisions across models */
function rowKey(record) {
  if (record.type === 'legacy') return `legacy-${record.deleted_record_id}`
  return `${record.model_type}-${record.original_id}`
}

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => { selectedRowKeys.value = keys },
}))

/** Resolve selected row keys to their source records */
function resolveSelectedRecords() {
  const keyToRecord = new Map(items.value.map(item => [rowKey(item), item]))
  return selectedRowKeys.value
    .map(key => keyToRecord.get(key))
    .filter(Boolean)
}

async function fetchData() {
  loading.value = true
  try {
    const signal = getSignal()
    const [listRes, statsRes] = await Promise.all([
      recycleBinApi.list({ signal }),
      recycleBinApi.stats({ signal }),
    ])
    items.value = listRes.data?.data?.items || []
    stats.value = statsRes.data?.data || null
  } catch (err) {
    if (err.name !== 'CanceledError') message.error('Failed to load recycle bin')
  }
  loading.value = false
}

function handleRestore(record) {
  Modal.confirm({
    title: 'Restore Record',
    icon: createVNode(ExclamationCircleOutlined),
    content: `Are you sure you want to restore "${record.display_name}" (${record.model_type})?`,
    okText: 'Restore',
    cancelText: 'Cancel',
    centered: true,
    async onOk() {
      try {
        if (record.type === 'legacy') {
          await recycleBinApi.restoreLegacy(record.deleted_record_id)
        } else {
          await recycleBinApi.restore(record.model_type.toLowerCase(), record.original_id)
        }
        message.success(`${record.model_type} restored successfully`)
        selectedRowKeys.value = []
        fetchData()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to restore record')
      }
    },
  })
}

function handlePermanentDelete(record) {
  Modal.confirm({
    title: 'Permanently Delete',
    icon: createVNode(ExclamationCircleOutlined),
    content: `Are you sure you want to permanently delete "${record.display_name}"? This action cannot be undone.`,
    okText: 'Delete Permanently',
    okType: 'danger',
    cancelText: 'Cancel',
    centered: true,
    async onOk() {
      try {
        if (record.type === 'legacy') {
          await recycleBinApi.permanentDeleteLegacy(record.deleted_record_id)
        } else {
          await recycleBinApi.permanentDelete(record.model_type.toLowerCase(), record.original_id)
        }
        message.success('Record permanently deleted')
        selectedRowKeys.value = []
        fetchData()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to delete record')
      }
    },
  })
}

function handleBulkRestore() {
  const records = resolveSelectedRecords()
  const softDeleteItems = []
  const legacyItems = []

  for (const record of records) {
    if (record.type === 'legacy') {
      legacyItems.push({ deleted_record_id: record.deleted_record_id })
    } else {
      softDeleteItems.push({ model_type: record.model_type.toLowerCase(), id: record.original_id })
    }
  }

  const total = softDeleteItems.length + legacyItems.length

  Modal.confirm({
    title: 'Bulk Restore',
    icon: createVNode(ExclamationCircleOutlined),
    content: `Are you sure you want to restore ${total} selected record(s)?`,
    okText: 'Restore All',
    cancelText: 'Cancel',
    centered: true,
    async onOk() {
      restoring.value = true
      try {
        const promises = []
        if (softDeleteItems.length > 0) {
          promises.push(recycleBinApi.bulkRestore(softDeleteItems))
        }
        if (legacyItems.length > 0) {
          promises.push(recycleBinApi.bulkRestoreLegacy(legacyItems))
        }
        await Promise.all(promises)
        message.success(`${total} record(s) restored successfully`)
        selectedRowKeys.value = []
        fetchData()
      } catch (err) {
        message.error(err.response?.data?.message || 'Some records failed to restore')
        fetchData()
      }
      restoring.value = false
    },
  })
}

function handleBulkDelete() {
  const records = resolveSelectedRecords()
  const deleteItems = records.map(record =>
    record.type === 'legacy'
      ? { type: 'legacy', deleted_record_id: record.deleted_record_id }
      : { type: 'soft_delete', model_type: record.model_type.toLowerCase(), id: record.original_id }
  )

  Modal.confirm({
    title: 'Permanently Delete Selected',
    icon: createVNode(ExclamationCircleOutlined),
    content: `Are you sure you want to permanently delete ${deleteItems.length} selected record(s)? This action cannot be undone.`,
    okText: 'Delete Permanently',
    okType: 'danger',
    cancelText: 'Cancel',
    centered: true,
    async onOk() {
      deleting.value = true
      try {
        const res = await recycleBinApi.bulkPermanentDelete(deleteItems)
        const { failed } = res.data?.data ?? {}
        if (failed?.length) {
          message.warning(res.data?.message || `${failed.length} record(s) failed to delete`)
        } else {
          message.success(`${deleteItems.length} record(s) permanently deleted`)
        }
        selectedRowKeys.value = []
        fetchData()
      } catch (err) {
        message.error(err.response?.data?.message || 'Some records failed to delete')
        fetchData()
      }
      deleting.value = false
    },
  })
}

onMounted(() => {
  appStore.setPageMeta('Recycle Bin')
  fetchData()
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
.page-header-stats {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.cell-name {
  font-weight: 600;
  font-size: 13.5px;
  color: var(--color-text);
}
.cell-sub {
  font-size: 12px;
  color: var(--color-text-muted);
}
</style>
