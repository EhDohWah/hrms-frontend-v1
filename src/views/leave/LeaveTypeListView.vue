<template>
  <div class="page-container">
    <div class="page-header">
      <div />
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
        :scroll="{ x: 'max-content' }"
        @change="handleTableChange"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'requires_attachment'">
            <a-tag :color="record.requires_attachment ? 'orange' : 'default'" size="small">
              {{ record.requires_attachment ? 'Yes' : 'No' }}
            </a-tag>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, createVNode } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { leaveApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'
import { SearchOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'

const appStore = useAppStore()
const authStore = useAuthStore()
const getSignal = useAbortController()

const leaveTypes = ref([])
const selectedRowKeys = ref([])
const loading = ref(false)
const search = ref('')
const pagination = reactive({ current_page: 1, per_page: 20, total: 0 })

const columns = [
  { title: 'Name', dataIndex: 'name', width: 200 },
  { title: 'Default Duration', dataIndex: 'default_duration', width: 140, align: 'center' },
  { title: 'Description', dataIndex: 'description', ellipsis: true },
  { title: 'Requires Attachment', key: 'requires_attachment', width: 160, align: 'center' },
]

const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showTotal: (total) => `${total} leave types`,
}))

async function fetchTypes() {
  loading.value = true
  try {
    const params = {
      page: pagination.current_page,
      per_page: pagination.per_page,
      ...(search.value && { search: search.value }),
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

function handleTableChange(pag) {
  pagination.current_page = pag.current
  pagination.per_page = pag.pageSize
  fetchTypes()
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
</style>
