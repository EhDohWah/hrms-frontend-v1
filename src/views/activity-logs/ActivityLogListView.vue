<template>
  <div class="page-container">
    <!-- Page header -->
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ pagination.total || 0 }} Total</a-tag>
      </div>
      <div class="filter-bar">
        <a-input
          v-model:value="search"
          placeholder="Search..."
          allow-clear
          class="filter-input"
          style="width: 220px"
          @pressEnter="onFilterChange"
          @clear="onFilterChange"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-select
          v-model:value="filters.subject_type"
          placeholder="Record Type"
          allow-clear
          class="filter-input"
          style="width: 150px"
          @change="onFilterChange"
        >
          <a-select-option value="employee">Employee</a-select-option>
          <a-select-option value="employment">Employment</a-select-option>
          <a-select-option value="grant">Grant</a-select-option>
          <a-select-option value="payroll">Payroll</a-select-option>
        </a-select>
        <a-select
          v-model:value="filters.action"
          placeholder="Action"
          allow-clear
          class="filter-input"
          style="width: 130px"
          @change="onFilterChange"
        >
          <a-select-option value="created">Created</a-select-option>
          <a-select-option value="updated">Updated</a-select-option>
          <a-select-option value="deleted">Deleted</a-select-option>
          <a-select-option value="transferred">Transferred</a-select-option>
          <a-select-option value="imported">Imported</a-select-option>
        </a-select>
        <a-range-picker
          v-model:value="dateRange"
          format="DD MMM YYYY"
          value-format="YYYY-MM-DD"
          style="width: 260px"
          @change="onFilterChange"
        />
      </div>
    </div>

    <!-- Table -->
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
          <template v-if="column.key === 'user'">
            <span class="cell-name">{{ record.user?.name || 'System' }}</span>
          </template>

          <template v-else-if="column.key === 'action'">
            <a-tag :color="actionColor(record.action)" size="small">
              {{ record.action_label || record.action }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'subject'">
            <div class="cell-subject">
              <a-tag size="small">{{ record.subject_type_short }}</a-tag>
              <span class="cell-subject-name">{{ record.subject_name || `#${record.subject_id}` }}</span>
            </div>
          </template>

          <template v-else-if="column.key === 'description'">
            {{ record.description || '—' }}
          </template>

          <template v-else-if="column.key === 'changes'">
            <template v-if="record.properties?.changes?.length">
              <a-popover trigger="click" placement="bottomLeft">
                <template #content>
                  <div class="changes-popover">
                    <div v-for="field in record.properties.changes" :key="field" class="change-row">
                      <span class="change-field">{{ formatFieldName(field) }}:</span>
                      <span class="change-old">{{ formatValue(record.properties.old?.[field]) }}</span>
                      <span class="change-arrow">&rarr;</span>
                      <span class="change-new">{{ formatValue(record.properties.new?.[field]) }}</span>
                    </div>
                  </div>
                </template>
                <a-tag size="small" class="changes-tag">{{ record.properties.changes.length }} field(s)</a-tag>
              </a-popover>
            </template>
            <span v-else class="text-muted">—</span>
          </template>

          <template v-else-if="column.key === 'ip_address'">
            <span class="text-muted">{{ record.ip_address || '—' }}</span>
          </template>

          <template v-else-if="column.key === 'created_at'">
            <a-tooltip :title="formatDateTime(record.created_at)">
              {{ relativeTime(record.created_at) }}
            </a-tooltip>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { activityLogApi } from '@/api'
import { formatDateTime } from '@/utils/formatters'
import { cleanParams } from '@/utils/helpers'
import { ACTION_COLOR_MAP, formatFieldName, formatValue } from '@/utils/activityLog'
import { PAGINATION_DEFAULTS } from '@/constants/config'

const dayjs = inject('$dayjs')
const appStore = useAppStore()

const items = ref([])
const loading = ref(false)
const search = ref('')
const dateRange = ref(null)
const filters = reactive({ subject_type: undefined, action: undefined })
const pagination = reactive({ current_page: 1, per_page: PAGINATION_DEFAULTS.perPage, total: 0 })

const columns = [
  { title: 'User', key: 'user', width: 160 },
  { title: 'Action', key: 'action', width: 100, align: 'center' },
  { title: 'Record', key: 'subject', width: 220 },
  { title: 'Description', key: 'description', width: 250 },
  { title: 'Changes', key: 'changes', width: 120, align: 'center' },
  { title: 'IP Address', key: 'ip_address', width: 130 },
  { title: 'When', key: 'created_at', width: 140 },
]

const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showSizeChanger: true,
  showTotal: (total) => `${total} entries`,
  pageSizeOptions: PAGINATION_DEFAULTS.pageSizeOptions,
}))

function actionColor(action) {
  return ACTION_COLOR_MAP[action] || 'default'
}

function relativeTime(d) {
  return d ? dayjs(d).fromNow() : '—'
}

async function fetchItems() {
  loading.value = true
  try {
    const params = cleanParams({
      page: pagination.current_page,
      per_page: pagination.per_page,
      search: search.value || null,
      subject_type: filters.subject_type,
      action: filters.action,
      date_from: dateRange.value?.[0] || null,
      date_to: dateRange.value?.[1] || null,
    })
    const { data } = await activityLogApi.list(params)
    items.value = data.data?.data || data.data || []
    const pag = data.data?.meta || data.data
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

onMounted(() => {
  appStore.setPageMeta('Activity Log')
  fetchItems()
})
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.page-header-stats { display: flex; gap: 6px; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

.cell-name { font-weight: 600; font-size: 13.5px; }
.cell-subject { display: flex; align-items: center; gap: 6px; }
.cell-subject-name { font-weight: 500; font-size: 13px; }
.text-muted { color: var(--color-text-muted); font-size: 12.5px; }

.changes-tag { cursor: pointer; }
.changes-popover { max-width: 400px; font-size: 12.5px; }
.change-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 3px 0;
  flex-wrap: wrap;
}
.change-field { font-weight: 600; color: var(--color-text-secondary); }
.change-old { color: var(--color-text-muted); text-decoration: line-through; }
.change-arrow { color: var(--color-text-muted); }
.change-new { font-weight: 600; color: var(--color-primary); }
</style>
