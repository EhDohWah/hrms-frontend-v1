<template>
  <div class="page-container">
    <div class="page-header">
      <div class="filter-bar">
        <a-select v-model:value="filters.year" class="filter-input" style="width: 110px" @change="onFilterChange">
          <a-select-option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</a-select-option>
        </a-select>
        <a-select
          v-model:value="filters.organization"
          placeholder="All Organizations"
          allow-clear
          class="filter-input"
          style="width: 180px"
          @change="onFilterChange"
        >
          <a-select-option v-for="org in ORG_OPTIONS" :key="org.code" :value="org.code">{{ org.label }}</a-select-option>
        </a-select>
      </div>
      <a-input
        v-model:value="search"
        placeholder="Search employee..."
        allow-clear
        class="filter-input"
        style="width: 240px"
        @pressEnter="onFilterChange"
        @clear="onFilterChange"
      >
        <template #prefix><SearchOutlined /></template>
      </a-input>
    </div>

    <a-card :body-style="{ padding: 0 }">
      <a-table
        :columns="outerColumns"
        :data-source="paginatedGroups"
        :loading="loading"
        :pagination="false"
        :row-key="(r) => r.employeeKey"
        :expandedRowKeys="expandedKeys"
        @expandedRowsChange="(keys) => expandedKeys = keys"
        size="middle"
        class="balance-nested-table"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'organization'">
            <a-tag :color="getOrgColor(record.organization)" size="small">{{ record.organization }}</a-tag>
          </template>
          <template v-else-if="column.key === 'employee'">
            <div class="cell-employee">
              <span class="cell-name">{{ record.name }}</span>
              <span class="cell-staff-id font-mono">{{ record.staff_id }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'leave_count'">
            {{ record.balances.length }} types
          </template>
          <template v-else-if="column.key === 'total_used'">
            {{ formatNumber(record.totalUsed) }}
          </template>
          <template v-else-if="column.key === 'total_remaining'">
            <span
              class="font-semibold"
              :style="{ color: remainingColor(record.totalRemaining) }"
            >
              {{ formatNumber(record.totalRemaining) }}
            </span>
          </template>
        </template>

        <template #expandedRowRender="{ record }">
          <div class="expanded-section">
            <div class="expanded-header">
              <span class="expanded-title">Leave Balances</span>
            </div>
            <a-table
              :columns="innerColumns"
              :data-source="record.balances"
              :row-key="(r) => r.id"
              :pagination="false"
              size="small"
              :bordered="true"
            >
              <template #bodyCell="{ column, record: bal }">
                <template v-if="column.key === 'leave_type'">
                  {{ bal.leave_type?.name || '—' }}
                </template>
                <template v-else-if="column.key === 'remaining'">
                  <span
                    class="font-semibold"
                    :style="{ color: remainingColor(bal.remaining_days) }"
                  >
                    {{ bal.remaining_days }}
                  </span>
                </template>
              </template>
              <template #emptyText>
                <span class="text-muted">No leave balances</span>
              </template>
            </a-table>
          </div>
        </template>
      </a-table>

      <div class="balance-pagination">
        <a-pagination
          :current="page"
          :page-size="perPage"
          :total="groupedData.length"
          :show-size-changer="true"
          :show-total="(total) => `${total} employees`"
          :page-size-options="['10', '20', '50', '100']"
          size="small"
          @change="onPageChange"
          @showSizeChange="onPageChange"
        />
      </div>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { leaveApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'
import { ORG_OPTIONS, getOrgColor } from '@/constants/organizations'
import { formatNumber } from '@/utils/formatters'

const appStore = useAppStore()
const getSignal = useAbortController()

const items = ref([])
const loading = ref(false)
const search = ref('')
const expandedKeys = ref([])
const page = ref(1)
const perPage = ref(20)
const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i)
const filters = reactive({ year: currentYear, organization: undefined })

const outerColumns = [
  { title: 'Organization', key: 'organization', width: 120, align: 'center' },
  { title: 'Employee', key: 'employee', width: 220 },
  { title: 'Leave Types', key: 'leave_count', width: 110, align: 'center' },
  { title: 'Total Used', key: 'total_used', width: 110, align: 'center' },
  { title: 'Total Remaining', key: 'total_remaining', width: 130, align: 'center' },
]

const innerColumns = [
  { title: 'Leave Type', key: 'leave_type' },
  { title: 'Total Days', dataIndex: 'total_days', width: 110, align: 'center' },
  { title: 'Used', dataIndex: 'used_days', width: 110, align: 'center' },
  { title: 'Remaining', key: 'remaining', width: 110, align: 'center' },
]

const groupedData = computed(() => {
  const map = new Map()
  for (const bal of items.value) {
    const empId = bal.employee_id
    if (!map.has(empId)) {
      const emp = bal.employee || {}
      map.set(empId, {
        employeeKey: `emp-${empId}`,
        name: `${emp.first_name_en || ''} ${emp.last_name_en || ''}`.trim() || '—',
        staff_id: emp.staff_id || '—',
        organization: emp.organization || '—',
        balances: [],
        totalUsed: 0,
        totalRemaining: 0,
      })
    }
    const group = map.get(empId)
    group.balances.push(bal)
    group.totalUsed += Number(bal.used_days) || 0
    group.totalRemaining += Number(bal.remaining_days) || 0
  }
  return Array.from(map.values())
})

const paginatedGroups = computed(() => {
  const start = (page.value - 1) * perPage.value
  return groupedData.value.slice(start, start + perPage.value)
})

function remainingColor(days) {
  if (days <= 0) return 'var(--color-danger)'
  if (days <= 3) return 'var(--color-warning)'
  return 'var(--color-success)'
}

async function fetchBalances() {
  loading.value = true
  try {
    const params = {
      page: 1,
      per_page: 10000,
      year: filters.year,
      ...(filters.organization && { organization: filters.organization }),
      ...(search.value && { search: search.value }),
    }
    const { data } = await leaveApi.balances(params, { signal: getSignal() })
    items.value = data.data || []
  } catch (err) { if (err.name !== 'CanceledError') message.error('Failed to load leave balances') }
  loading.value = false
}

function onFilterChange() {
  page.value = 1
  expandedKeys.value = []
  fetchBalances()
}

function onPageChange(newPage, newPerPage) {
  page.value = newPage
  perPage.value = newPerPage
  expandedKeys.value = []
}

onMounted(() => { appStore.setPageMeta('Leave Balances'); fetchBalances() })
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

.cell-employee { display: flex; flex-direction: column; }
.cell-name { font-weight: 600; font-size: 14px; }
.cell-staff-id { font-size: 12px; color: var(--color-text-muted); }

.expanded-section {
  padding: 4px 0;
}
.expanded-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.expanded-title {
  font-weight: 600;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.balance-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid var(--color-border-light);
}
</style>
