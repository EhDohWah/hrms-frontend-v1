<template>
  <div>
    <div class="budget-toolbar">
      <a-range-picker
        v-model:value="dateRange"
        picker="month"
        format="MMM YYYY"
        :placeholder="['Start Month', 'End Month']"
        @change="$emit('fetch')"
      />
      <a-select
        v-model:value="displayField"
        style="width: 170px"
      >
        <a-select-option value="gross_salary_by_fte">Gross by FTE</a-select-option>
        <a-select-option value="net_salary">Net Salary</a-select-option>
        <a-select-option value="gross_salary">Gross Salary</a-select-option>
      </a-select>
    </div>

    <a-table
      :columns="outerColumns"
      :data-source="data"
      :loading="loading"
      :pagination="false"
      :row-key="(r) => r.employee_id || `emp-${r.staff_id}`"
      size="small"
      :scroll="{ x: outerScrollX }"
      class="budget-table"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'employee'">
          <div class="cell-employee">
            <span class="cell-name">{{ record.employee_name }}</span>
            <span class="cell-sub font-mono">{{ record.staff_id }}</span>
          </div>
        </template>
        <template v-else-if="column.key === 'org'">
          <a-tag :color="getOrgColor(record.organization)" size="small">{{ record.organization }}</a-tag>
        </template>
        <template v-else-if="column.key === 'department'">
          {{ record.department || '—' }}
        </template>
        <template v-else-if="column.key === 'site'">
          {{ record.site || '—' }}
        </template>
        <template v-else-if="column.dataIndex?.startsWith?.('month_')">
          <div v-if="getMonthTotal(record, column.dataIndex) != null">
            <span class="font-mono">{{ formatCurrency(getMonthTotal(record, column.dataIndex)) }}</span>
            <div class="cell-sub">{{ getMonthAllocCount(record, column.dataIndex) }} grant{{ getMonthAllocCount(record, column.dataIndex) !== 1 ? 's' : '' }}</div>
          </div>
          <span v-else class="font-mono text-empty">—</span>
        </template>
        <template v-else-if="column.key === 'total'">
          <span class="font-mono font-semibold">{{ formatCurrency(getRowTotal(record)) }}</span>
        </template>
      </template>

      <!-- Expanded: per-allocation detail -->
      <template #expandedRowRender="{ record }">
        <a-table
          :columns="innerColumns"
          :data-source="buildAllocRows(record)"
          :row-key="(r) => `${r.allocation_id}_${r.grant_code}`"
          :pagination="false"
          :scroll="{ x: innerScrollX }"
          size="small"
          class="budget-inner-table"
        >
          <template #bodyCell="{ column, record: alloc }">
            <template v-if="column.key === 'grant_code'">
              <span class="font-mono" style="font-size: 12px">{{ alloc.grant_code || '—' }}</span>
            </template>
            <template v-else-if="column.key === 'grant_name'">
              <span style="font-size: 12px">{{ alloc.grant_name || '—' }}</span>
            </template>
            <template v-else-if="column.key === 'bl_code'">
              <span class="font-mono" style="font-size: 12px">{{ alloc.budget_line_code || '—' }}</span>
            </template>
            <template v-else-if="column.key === 'fte'">
              <span class="font-mono">{{ fmtFte(alloc.fte) }}</span>
            </template>
            <template v-else-if="column.dataIndex?.startsWith?.('month_')">
              <span
                class="font-mono"
                :class="{ 'text-empty': !getAllocMonthValue(alloc, column.dataIndex) }"
              >{{ formatCurrency(getAllocMonthValue(alloc, column.dataIndex)) }}</span>
            </template>
            <template v-else-if="column.key === 'alloc_total'">
              <span class="font-mono font-semibold">{{ formatCurrency(getAllocRowTotal(alloc)) }}</span>
            </template>
          </template>
        </a-table>
      </template>

      <!-- Summary footer -->
      <template #summary v-if="data.length > 0">
        <a-table-summary fixed>
          <a-table-summary-row class="summary-row">
            <a-table-summary-cell :col-span="5" :index="0">
              <strong>Total ({{ data.length }} employees, {{ totalAllocations }} allocations)</strong>
            </a-table-summary-cell>
            <a-table-summary-cell v-for="month in months" :key="month.key" :index="5 + months.indexOf(month)" align="right">
              <span class="font-mono font-semibold">{{ formatCurrency(getColumnTotal(month.key)) }}</span>
            </a-table-summary-cell>
            <a-table-summary-cell :index="5 + months.length" align="right">
              <span class="font-mono font-semibold">{{ formatCurrency(getGrandTotal()) }}</span>
            </a-table-summary-cell>
          </a-table-summary-row>
        </a-table-summary>
      </template>

      <!-- Empty state -->
      <template #emptyText>
        <div class="empty-state">
          <h3 class="empty-title">No budget history found</h3>
          <p class="empty-desc">Select a date range to view allocation history</p>
        </div>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getOrgColor } from '@/constants/organizations'
import { formatCurrency, fmtFte } from '@/utils/formatters'

const props = defineProps({
  data: { type: Array, default: () => [] },
  months: { type: Array, default: () => [] },
  loading: Boolean,
})

defineEmits(['fetch'])

const dateRange = defineModel('dateRange')
const displayField = defineModel('displayField', { default: 'gross_salary_by_fte' })

// ═══════════════════════════ Outer table (employee rows) ═══════════════════════════

const outerFixedCols = [
  { title: 'Employee', key: 'employee', width: 170, fixed: 'left' },
  { title: 'Org', key: 'org', width: 65, align: 'center' },
  { title: 'Dept', key: 'department', width: 110, ellipsis: true },
  { title: 'Site', key: 'site', width: 80, ellipsis: true },
]

const outerColumns = computed(() => {
  const monthCols = props.months.map(m => ({
    title: m.label,
    dataIndex: `month_${m.key}`,
    key: `month_${m.key}`,
    width: 130,
    align: 'right',
  }))
  const totalCol = { title: 'Total', key: 'total', width: 130, align: 'right', fixed: 'right' }
  return [...outerFixedCols, ...monthCols, totalCol]
})

const outerScrollX = computed(() => {
  const fixedWidth = 170 + 65 + 110 + 80 + 130
  return fixedWidth + props.months.length * 130 + 40
})

// ═══════════════════════════ Inner table (allocation rows) ═══════════════════════════

const innerFixedCols = [
  { title: 'Grant Code', key: 'grant_code', fixed: 'left', width: 110 },
  { title: 'Grant Name', key: 'grant_name', width: 160, ellipsis: true },
  { title: 'BL Code', key: 'bl_code', width: 90 },
  { title: 'FTE', key: 'fte', width: 55, align: 'center' },
]

const innerColumns = computed(() => {
  const monthCols = props.months.map(m => ({
    title: m.label,
    dataIndex: `month_${m.key}`,
    key: `inner_month_${m.key}`,
    width: 120,
    align: 'right',
  }))
  const totalCol = { title: 'Total', key: 'alloc_total', width: 120, align: 'right', fixed: 'right' }
  return [...innerFixedCols, ...monthCols, totalCol]
})

const innerScrollX = computed(() => {
  const fixedWidth = 110 + 160 + 90 + 55 + 120
  return fixedWidth + props.months.length * 120 + 40
})

// ═══════════════════════════ Data helpers ═══════════════════════════

/** Get the display-field total for an employee in a given month */
function getMonthTotal(record, dataIndex) {
  const monthKey = dataIndex.replace('month_', '')
  const monthData = record.monthly_data?.[monthKey]
  if (!monthData) return null
  if (displayField.value === 'gross_salary_by_fte') return monthData.total_gross_by_fte
  if (displayField.value === 'net_salary') return monthData.total_net
  return monthData.total_gross
}

/** Get number of allocations for an employee in a given month */
function getMonthAllocCount(record, dataIndex) {
  const monthKey = dataIndex.replace('month_', '')
  return record.monthly_data?.[monthKey]?.allocations?.length ?? 0
}

/** Sum all months for one employee row */
function getRowTotal(record) {
  if (!record.monthly_data) return 0
  return Object.keys(record.monthly_data).reduce((sum, mk) => {
    return sum + (getMonthTotal(record, `month_${mk}`) || 0)
  }, 0)
}

/** Column total across all employees for one month */
function getColumnTotal(monthKey) {
  return props.data.reduce((sum, r) => {
    return sum + (getMonthTotal(r, `month_${monthKey}`) || 0)
  }, 0)
}

/** Grand total across all employees and months */
function getGrandTotal() {
  return props.data.reduce((sum, r) => sum + getRowTotal(r), 0)
}

/** Total unique allocation+grant combos across all employees */
const totalAllocations = computed(() => {
  const keys = new Set()
  for (const emp of props.data) {
    for (const month of Object.values(emp.monthly_data || {})) {
      for (const alloc of month.allocations || []) {
        keys.add(`${alloc.allocation_id}_${alloc.grant_code}`)
      }
    }
  }
  return keys.size
})

// ═══════════════════════════ Expanded row: build allocation rows ═══════════════════════════

/**
 * Flatten monthly_data into one row per unique allocation across all months.
 * Each row has: grant info + a `months` map of { monthKey → allocation data }.
 */
function buildAllocRows(record) {
  const map = new Map()
  for (const [monthKey, monthData] of Object.entries(record.monthly_data || {})) {
    for (const alloc of monthData.allocations || []) {
      // Key by allocation_id + grant_code so grant changes create separate rows
      const key = `${alloc.allocation_id}_${alloc.grant_code}`
      if (!map.has(key)) {
        map.set(key, {
          allocation_id: alloc.allocation_id,
          grant_code: alloc.grant_code,
          grant_name: alloc.grant_name,
          budget_line_code: alloc.budget_line_code,
          fte: alloc.fte,
          months: {},
        })
      }
      const row = map.get(key)
      row.months[monthKey] = alloc
      if (alloc.fte != null) row.fte = alloc.fte
    }
  }
  return Array.from(map.values())
}

/** Get the display-field value for one allocation in one month */
function getAllocMonthValue(alloc, dataIndex) {
  const monthKey = dataIndex.replace('month_', '')
  const monthAlloc = alloc.months?.[monthKey]
  if (!monthAlloc) return null
  return monthAlloc[displayField.value] ?? null
}

/** Sum all months for one allocation row */
function getAllocRowTotal(alloc) {
  return Object.values(alloc.months || {}).reduce((sum, m) => {
    return sum + (Number(m?.[displayField.value]) || 0)
  }, 0)
}
</script>

<style scoped>
.budget-toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
.cell-employee { display: flex; flex-direction: column; }
.cell-name { font-weight: 600; font-size: 13px; }
.cell-sub { font-size: 11px; color: var(--color-text-muted); }
.text-empty { color: #d9d9d9; }
.budget-table :deep(.ant-table-thead > tr > th) {
  font-size: 11.5px;
  padding: 8px 10px;
  white-space: nowrap;
}
.budget-table :deep(.ant-table-tbody > tr > td) {
  padding: 6px 10px;
  font-size: 12.5px;
}
.budget-inner-table :deep(.ant-table-thead > tr > th) {
  font-size: 11px;
  padding: 6px 8px;
  white-space: nowrap;
}
.budget-inner-table :deep(.ant-table-tbody > tr > td) {
  padding: 4px 8px;
  font-size: 12px;
}
.summary-row { background: #f8faff; }
.summary-row :deep(td) { border-top: 2px solid #d6e4ff; }
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 16px;
}
.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 4px;
}
.empty-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0;
}
</style>
