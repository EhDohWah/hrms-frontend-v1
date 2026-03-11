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
        style="width: 160px"
      >
        <a-select-option value="net_salary">Net Salary</a-select-option>
        <a-select-option value="gross_salary">Gross Salary</a-select-option>
      </a-select>
    </div>

    <a-table
      :columns="dynamicColumns"
      :data-source="data"
      :loading="loading"
      :pagination="false"
      :row-key="(r) => `${r.employment_id}-${r.employee_funding_allocation_id}`"
      size="small"
      :scroll="{ x: scrollX }"
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
          <a-tag :color="record.organization === 'SMRU' ? 'blue' : 'green'" size="small">{{ record.organization }}</a-tag>
        </template>
        <template v-else-if="column.key === 'grant'">
          <span class="font-mono" style="font-size: 12px">{{ record.grant_name || '—' }}</span>
        </template>
        <template v-else-if="column.key === 'fte'">
          <span class="font-mono">{{ record.fte != null ? `${(Number(record.fte) * 100).toFixed(0)}%` : '—' }}</span>
        </template>
        <template v-else-if="column.dataIndex?.startsWith?.('month_')">
          <span class="font-mono" :class="{ 'text-empty': !getMonthValue(record, column.dataIndex) }">
            {{ fmtCurrency(getMonthValue(record, column.dataIndex)) }}
          </span>
        </template>
        <template v-else-if="column.key === 'total'">
          <span class="font-mono font-semibold">{{ fmtCurrency(getRowTotal(record)) }}</span>
        </template>
      </template>

      <template #summary v-if="data.length > 0">
        <a-table-summary fixed>
          <a-table-summary-row class="summary-row">
            <a-table-summary-cell :col-span="4" :index="0">
              <strong>Total ({{ data.length }} rows)</strong>
            </a-table-summary-cell>
            <a-table-summary-cell v-for="month in months" :key="month.key" :index="4 + months.indexOf(month)" align="right">
              <span class="font-mono font-semibold">{{ fmtCurrency(getColumnTotal(month.key)) }}</span>
            </a-table-summary-cell>
            <a-table-summary-cell :index="4 + months.length" align="right">
              <span class="font-mono font-semibold">{{ fmtCurrency(getGrandTotal()) }}</span>
            </a-table-summary-cell>
          </a-table-summary-row>
        </a-table-summary>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  data: { type: Array, default: () => [] },
  months: { type: Array, default: () => [] },
  loading: Boolean,
})

defineEmits(['fetch'])

const dateRange = defineModel('dateRange')
const displayField = defineModel('displayField', { default: 'net_salary' })

const fixedCols = [
  { title: 'Employee', key: 'employee', width: 180, fixed: 'left' },
  { title: 'Org', key: 'org', width: 70, align: 'center' },
  { title: 'Grant', key: 'grant', width: 140 },
  { title: 'FTE', key: 'fte', width: 60, align: 'center' },
]

const dynamicColumns = computed(() => {
  const monthCols = props.months.map(m => ({
    title: m.label,
    dataIndex: `month_${m.key}`,
    key: `month_${m.key}`,
    width: 120,
    align: 'right',
  }))
  const totalCol = { title: 'Total', key: 'total', width: 130, align: 'right', fixed: 'right' }
  return [...fixedCols, ...monthCols, totalCol]
})

const scrollX = computed(() => {
  const fixedWidth = 180 + 70 + 140 + 60 + 130
  return fixedWidth + props.months.length * 120 + 40
})

function getMonthValue(record, dataIndex) {
  const monthKey = dataIndex.replace('month_', '')
  return record.monthly_data?.[monthKey]?.[displayField.value] ?? null
}

function getRowTotal(record) {
  if (!record.monthly_data) return 0
  return Object.values(record.monthly_data).reduce((sum, m) => {
    return sum + (Number(m?.[displayField.value]) || 0)
  }, 0)
}

function getColumnTotal(monthKey) {
  return props.data.reduce((sum, r) => {
    return sum + (Number(r.monthly_data?.[monthKey]?.[displayField.value]) || 0)
  }, 0)
}

function getGrandTotal() {
  return props.data.reduce((sum, r) => sum + getRowTotal(r), 0)
}

function fmtCurrency(val) {
  if (val == null || val === '' || val === 0) return '—'
  const n = Number(val)
  return isNaN(n) ? '—' : `฿${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
.font-mono { font-family: 'SF Mono', 'Consolas', monospace; }
.font-semibold { font-weight: 600; }
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
.summary-row { background: #f8faff; }
.summary-row :deep(td) { border-top: 2px solid #d6e4ff; }
</style>
