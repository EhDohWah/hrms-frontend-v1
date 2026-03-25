<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ pagination.total || 0 }} Total</a-tag>
      </div>
      <div class="filter-bar">
        <a-select
          v-model:value="filters.from_organization"
          placeholder="From Org"
          allow-clear
          class="filter-input"
          style="width: 130px"
          @change="onFilterChange"
        >
          <a-select-option v-for="org in ORG_OPTIONS" :key="org.code" :value="org.code">{{ org.label }}</a-select-option>
        </a-select>
        <a-select
          v-model:value="filters.to_organization"
          placeholder="To Org"
          allow-clear
          class="filter-input"
          style="width: 130px"
          @change="onFilterChange"
        >
          <a-select-option v-for="org in ORG_OPTIONS" :key="org.code" :value="org.code">{{ org.label }}</a-select-option>
        </a-select>
        <a-input
          v-model:value="search"
          placeholder="Search employee..."
          allow-clear
          class="filter-input"
          style="width: 220px"
          @pressEnter="onFilterChange"
          @clear="onFilterChange"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
      </div>
    </div>

    <a-card :body-style="{ padding: 0 }">
      <a-table
        :columns="columns"
        :data-source="items"
        :loading="loading"
        :pagination="tablePagination"
        :row-key="(r) => r.id"
        :scroll="{ x: 'max-content' }"
        @change="handleTableChange"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'employee'">
            <div class="cell-employee">
              <router-link
                v-if="record.employee?.id"
                :to="{ name: 'employee-detail', params: { id: record.employee.id } }"
                class="cell-name cell-link"
              >
                {{ record.employee?.first_name_en }} {{ record.employee?.last_name_en }}
              </router-link>
              <span v-else class="cell-name">{{ record.employee?.first_name_en }} {{ record.employee?.last_name_en || '—' }}</span>
              <span class="cell-sub font-mono">{{ record.employee?.staff_id || '—' }}</span>
            </div>
          </template>

          <template v-else-if="column.key === 'from_org'">
            <a-tag :color="getOrgColor(record.from_organization)" size="small">
              {{ record.from_organization || '—' }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'to_org'">
            <a-tag :color="getOrgColor(record.to_organization)" size="small">
              {{ record.to_organization || '—' }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'from_date'">
            {{ formatDate(record.from_start_date) }}
          </template>

          <template v-else-if="column.key === 'to_date'">
            {{ formatDate(record.to_start_date) }}
          </template>

          <template v-else-if="column.key === 'reason'">
            <span class="cell-reason">{{ record.reason || '—' }}</span>
          </template>

          <template v-else-if="column.key === 'created_by'">
            {{ record.creator?.name || '—' }}
          </template>

          <template v-else-if="column.key === 'created_at'">
            {{ formatDate(record.created_at) }}
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button size="small" type="link" @click="openDetail(record)">View</a-button>
              <a-button
                v-if="canDelete"
                size="small"
                type="link"
                danger
                @click="handleDelete(record)"
              >Delete</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Detail Modal -->
    <a-modal
      v-model:open="detailModalVisible"
      title="Transfer Details"
      :footer="null"
      :width="'min(95vw, 600px)'"
      destroy-on-close
    >
      <template v-if="detailItem">
        <a-descriptions :column="2" bordered size="small" class="detail-descriptions">
          <a-descriptions-item label="Employee">
            {{ detailItem.employee?.first_name_en }} {{ detailItem.employee?.last_name_en || '' }}
          </a-descriptions-item>
          <a-descriptions-item label="Staff ID">
            <span class="font-mono">{{ detailItem.employee?.staff_id || '—' }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="From Organization">
            <a-tag :color="getOrgColor(detailItem.from_organization)">
              {{ detailItem.from_organization }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="To Organization">
            <a-tag :color="getOrgColor(detailItem.to_organization)">
              {{ detailItem.to_organization }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="From Start Date">
            {{ formatDate(detailItem.from_start_date) }}
          </a-descriptions-item>
          <a-descriptions-item label="To Start Date">
            {{ formatDate(detailItem.to_start_date) }}
          </a-descriptions-item>
          <a-descriptions-item label="Reason" :span="2">
            {{ detailItem.reason || '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="Created By">
            {{ detailItem.creator?.name || '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="Created At">
            {{ formatDate(detailItem.created_at) }}
          </a-descriptions-item>
        </a-descriptions>
      </template>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { transferApi } from '@/api'
import { ORG_OPTIONS, getOrgColor } from '@/constants/organizations'

const dayjs = inject('$dayjs')
const appStore = useAppStore()
const authStore = useAuthStore()

const items = ref([])
const loading = ref(false)
const search = ref('')
const filters = reactive({ from_organization: undefined, to_organization: undefined })
const pagination = reactive({ current_page: 1, per_page: 20, total: 0 })

const canDelete = computed(() => authStore.canDelete('transfer'))

const columns = [
  { title: 'Employee', key: 'employee', width: 200 },
  { title: 'From', key: 'from_org', width: 100, align: 'center' },
  { title: 'To', key: 'to_org', width: 100, align: 'center' },
  { title: 'SMRU/BHF Start Date', key: 'from_date', width: 150 },
  { title: 'Effective Date', key: 'to_date', width: 130 },
  { title: 'Reason', key: 'reason', width: 200 },
  { title: 'Created By', key: 'created_by', width: 140 },
  { title: 'Date', key: 'created_at', width: 120 },
  { title: '', key: 'actions', width: 130, align: 'right' },
]

const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showSizeChanger: true,
  showTotal: (total) => `${total} transfers`,
  pageSizeOptions: ['10', '20', '50', '100'],
}))

function formatDate(d) {
  return d ? dayjs(d).format('DD MMM YYYY') : '—'
}

async function fetchItems() {
  loading.value = true
  try {
    const params = {
      page: pagination.current_page,
      per_page: pagination.per_page,
      ...(search.value && { search: search.value }),
      ...(filters.from_organization && { from_organization: filters.from_organization }),
      ...(filters.to_organization && { to_organization: filters.to_organization }),
    }
    const { data } = await transferApi.list(params)
    items.value = data.data?.data || data.data || []
    const pag = data.data?.meta || data.pagination || data.data
    if (pag) {
      pagination.current_page = pag.current_page ?? pagination.current_page
      pagination.per_page = pag.per_page ?? pagination.per_page
      pagination.total = pag.total ?? pagination.total
    }
  } catch {
    // silent
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

// Detail modal
const detailModalVisible = ref(false)
const detailItem = ref(null)

function openDetail(record) {
  detailItem.value = { ...record }
  detailModalVisible.value = true
}

// Delete
function handleDelete(record) {
  const empName = record.employee
    ? `${record.employee.first_name_en} ${record.employee.last_name_en || ''}`.trim()
    : 'this transfer'
  Modal.confirm({
    title: 'Delete Transfer',
    content: `Are you sure you want to delete the transfer for "${empName}"?`,
    okType: 'danger',
    okText: 'Delete',
    onOk: async () => {
      try {
        await transferApi.destroy(record.id)
        message.success('Transfer deleted')
        fetchItems()
      } catch (err) {
        const resp = err.response?.data
        if (resp?.errors) {
          const firstErr = Object.values(resp.errors)[0]
          message.error(Array.isArray(firstErr) ? firstErr[0] : firstErr)
        } else {
          message.error(resp?.message || 'Failed to delete transfer')
        }
      }
    },
  })
}

onMounted(() => {
  appStore.setPageMeta('Transfers')
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

.cell-employee { display: flex; flex-direction: column; }
.cell-name { font-weight: 600; font-size: 13.5px; }
.cell-sub { font-size: 12px; color: var(--color-text-muted); }
.cell-link {
  text-decoration: none;
  color: inherit;
}
.cell-link:hover { color: var(--color-primary); }
.cell-reason {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.detail-descriptions { margin-top: 16px; }
</style>
