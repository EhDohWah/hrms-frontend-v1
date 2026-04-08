<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-stats">
        <a-select v-model:value="filters.year" class="filter-input" style="width: 110px" @change="onFilterChange">
          <a-select-option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</a-select-option>
        </a-select>
        <a-tag color="default">{{ groupedData.length }} employees</a-tag>
      </div>
      <div class="filter-bar">
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
    </div>

    <a-card :body-style="{ padding: 0 }">
      <a-table
        :columns="outerColumns"
        :data-source="paginatedGroups"
        :loading="loading"
        :pagination="false"
        :row-key="(r) => r.employeeKey"
        :expanded-row-keys="expandedKeys"
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
              <span class="cell-sub font-mono">{{ record.staff_id }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'leave_count'">
            {{ record.balances.length }} types
          </template>
          <template v-else-if="column.key === 'total_used'">
            {{ formatNumber(record.totalUsed) }}
          </template>
          <template v-else-if="column.key === 'total_remaining'">
            <span class="font-semibold" :style="{ color: remainingColor(record.totalRemaining) }">
              {{ formatNumber(record.totalRemaining) }}
            </span>
          </template>
        </template>

        <template #expandedRowRender="{ record }">
          <a-table
            :columns="innerColumns"
            :data-source="record.balances"
            :row-key="(r) => r.id"
            :pagination="false"
            size="small"
          >
            <template #bodyCell="{ column, record: bal }">
              <template v-if="column.key === 'leave_type'">
                {{ bal.leave_type?.name || '—' }}
              </template>
              <template v-else-if="column.key === 'remaining'">
                <span class="font-semibold" :style="{ color: remainingColor(bal.remaining_days) }">
                  {{ bal.remaining_days }}
                </span>
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-button
                  v-if="canAdjustBalances"
                  size="small"
                  type="link"
                  @click="openAdjust(bal, record)"
                >
                  Adjust
                </a-button>
              </template>
            </template>
            <template #emptyText>
              <span class="text-muted">No leave balances for this employee</span>
            </template>
          </a-table>
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

    <!-- Balance Adjustment Modal -->
    <a-modal
      v-model:open="adjustModalVisible"
      :title="adjustTitle"
      :footer="null"
      destroy-on-close
    >
      <a-form layout="vertical" class="modal-form" @submit.prevent="handleAdjustSave">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Total Days" required>
              <a-input-number
                v-model:value="adjustForm.total_days"
                :min="0"
                :step="0.5"
                :precision="1"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Used Days">
              <a-input-number
                v-model:value="adjustForm.used_days"
                :min="0"
                :step="0.5"
                :precision="1"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <div class="adjust-preview">
          <span class="adjust-preview-label">Remaining:</span>
          <span
            class="adjust-preview-value font-semibold font-mono"
            :style="{ color: remainingColor(adjustRemaining) }"
          >
            {{ adjustRemaining }} days
          </span>
        </div>
        <div class="modal-footer">
          <a-button @click="adjustModalVisible = false">Cancel</a-button>
          <a-button type="primary" html-type="submit" :loading="adjustSaving">
            Save Adjustment
          </a-button>
        </div>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/auth'
import { leaveApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'
import { ORG_OPTIONS, getOrgColor } from '@/constants/organizations'
import { formatNumber } from '@/utils/formatters'

const appStore = useAppStore()
const authStore = useAuthStore()
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
  { title: 'Organization', key: 'organization' },
  { title: 'Employee', key: 'employee' },
  { title: 'Leave Types', key: 'leave_count' },
  { title: 'Total Used', key: 'total_used' },
  { title: 'Total Remaining', key: 'total_remaining' },
]

const canAdjustBalances = authStore.canUpdate('leave_balances')
const innerColumns = [
  { title: 'Leave Type', key: 'leave_type' },
  { title: 'Total Days', dataIndex: 'total_days' },
  { title: 'Used', dataIndex: 'used_days' },
  { title: 'Remaining', key: 'remaining' },
  ...(canAdjustBalances ? [{ title: '', key: 'actions' }] : []),
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
}

// ── Balance Adjustment Modal ─────────────────────────────────────────────────

const adjustModalVisible = ref(false)
const adjustSaving = ref(false)
const adjustBalanceId = ref(null)
const adjustForm = reactive({ total_days: 0, used_days: 0 })
const adjustTitle = ref('Adjust Balance')

const adjustRemaining = computed(() => {
  const remaining = (adjustForm.total_days || 0) - (adjustForm.used_days || 0)
  return Math.round(remaining * 10) / 10
})

function openAdjust(bal, employeeGroup) {
  adjustBalanceId.value = bal.id
  adjustForm.total_days = Number(bal.total_days) || 0
  adjustForm.used_days = Number(bal.used_days) || 0
  adjustTitle.value = `Adjust Balance — ${employeeGroup.name} — ${bal.leave_type?.name || 'Leave'}`
  adjustModalVisible.value = true
}

async function handleAdjustSave() {
  if (!(adjustForm.total_days >= 0)) {
    message.warning('Total days must be 0 or greater')
    return
  }
  adjustSaving.value = true
  try {
    const { data } = await leaveApi.balanceUpdate(adjustBalanceId.value, {
      total_days: adjustForm.total_days,
      used_days: adjustForm.used_days,
    })
    const updated = data?.data
    if (updated) {
      const idx = items.value.findIndex(b => b.id === adjustBalanceId.value)
      if (idx !== -1) Object.assign(items.value[idx], updated)
    } else {
      fetchBalances()
    }
    message.success('Balance adjusted successfully')
    adjustModalVisible.value = false
  } catch (err) {
    message.error(err.response?.data?.message || 'Failed to adjust balance')
  } finally {
    adjustSaving.value = false
  }
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

.page-header-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.cell-employee { display: flex; flex-direction: column; }
.cell-name { font-weight: 600; font-size: 13px; }
.cell-sub { font-size: 12px; color: var(--color-text-muted); }

.balance-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid var(--color-border-light);
}

.modal-form { margin-top: 16px; }

.adjust-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
}
.adjust-preview-label {
  font-size: 13px;
  color: var(--color-text-secondary);
}
.adjust-preview-value {
  font-size: 15px;
}
</style>
