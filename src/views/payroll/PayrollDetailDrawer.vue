<template>
  <a-drawer
    :open="open"
    title="Payroll Detail"
    placement="right"
    :width="appStore.isMobile ? '100%' : 800"
    :body-style="{ padding: '16px 24px' }"
    @close="$emit('update:open', false)"
  >
    <template v-if="firstPayroll">
      <!-- Employee Info (from snapshot display object) -->
      <div class="drawer-section">
        <a-descriptions :column="appStore.isMobile ? 1 : 3" size="small" bordered>
          <a-descriptions-item label="Staff ID">
            <span class="font-mono">{{ firstPayroll.display?.staff_id }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="Name">
            {{ firstPayroll.display?.employee_name }}
          </a-descriptions-item>
          <a-descriptions-item label="Organization">
            {{ firstPayroll.organization || '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="Department">
            {{ firstPayroll.display?.department }}
          </a-descriptions-item>
          <a-descriptions-item label="Position">
            {{ firstPayroll.display?.position }}
          </a-descriptions-item>
          <a-descriptions-item label="Pay Period">
            {{ formatDate(firstPayroll.pay_period_date) }}
          </a-descriptions-item>
        </a-descriptions>
      </div>

      <!-- Allocations Table -->
      <div class="drawer-section">
        <div class="drawer-section-title">
          Allocations ({{ payrolls.length }})
        </div>
        <a-table
          :columns="allocColumns"
          :data-source="payrolls"
          :row-key="(r) => r.id"
          :pagination="false"
          size="small"
          class="alloc-table"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'grant'">
              <div>
                {{ record.display?.grant_code || '—' }}
                <div class="cell-sub">{{ record.display?.budget_line_code || '' }}</div>
              </div>
            </template>
            <template v-else-if="column.key === 'fte'">
              {{ fmtFte(record.display?.fte) }}
            </template>
            <template v-else-if="column.key === 'gross'">
              {{ formatCurrency(record.gross_salary_by_FTE) }}
            </template>
            <template v-else-if="column.key === 'income'">
              {{ formatCurrency(record.total_income) }}
            </template>
            <template v-else-if="column.key === 'deduction'">
              {{ formatCurrency(record.total_deduction) }}
            </template>
            <template v-else-if="column.key === 'employer'">
              {{ formatCurrency(record.employer_contribution) }}
            </template>
            <template v-else-if="column.key === 'net'">
              <strong style="color: var(--color-success)">{{ formatCurrency(record.net_salary) }}</strong>
            </template>
            <template v-else-if="column.key === 'total'">
              <strong>{{ formatCurrency(record.total_salary) }}</strong>
            </template>
            <template v-else-if="column.key === 'action'">
              <a
                :class="{ 'link-disabled': payslipLoadingIds.includes(record.id) }"
                @click="$emit('download-payslip', record.id)"
              >
                <LoadingOutlined v-if="payslipLoadingIds.includes(record.id)" />
                <FilePdfOutlined v-else />
              </a>
            </template>
          </template>

          <!-- Expanded row: full breakdown -->
          <template #expandedRowRender="{ record }">
            <div class="breakdown-grid">
              <div class="breakdown-col">
                <div class="breakdown-title">Income</div>
                <div class="breakdown-row"><span>Gross Salary</span><span>{{ formatCurrency(record.gross_salary) }}</span></div>
                <div class="breakdown-row"><span>Gross by FTE</span><span>{{ formatCurrency(record.gross_salary_by_FTE) }}</span></div>
                <div class="breakdown-row"><span>Retroactive Sal.</span><span>{{ formatCurrency(record.retroactive_salary) }}</span></div>
                <div class="breakdown-row"><span>13th Month</span><span>{{ formatCurrency(record.thirteen_month_salary) }}</span></div>
                <div class="breakdown-row"><span>13th Month Accrued</span><span>{{ formatCurrency(record.thirteen_month_salary_accured) }}</span></div>
                <div class="breakdown-row"><span>Salary Increase</span><span>{{ formatCurrency(record.salary_increase) }}</span></div>
                <div class="breakdown-row total"><span>Total Income</span><span>{{ formatCurrency(record.total_income) }}</span></div>
              </div>
              <div class="breakdown-col">
                <div class="breakdown-title">Deductions</div>
                <div class="breakdown-row"><span>PVD</span><span>{{ formatCurrency(record.pvd) }}</span></div>
                <div class="breakdown-row"><span>Saving Fund</span><span>{{ formatCurrency(record.saving_fund) }}</span></div>
                <div class="breakdown-row"><span>Social Security</span><span>{{ formatCurrency(record.employee_social_security) }}</span></div>
                <div class="breakdown-row"><span>Health Welfare</span><span>{{ formatCurrency(record.employee_health_welfare) }}</span></div>
                <div class="breakdown-row"><span>Income Tax</span><span>{{ formatCurrency(record.tax) }}</span></div>
                <div class="breakdown-row total"><span>Total Deductions</span><span>{{ formatCurrency(record.total_deduction) }}</span></div>
              </div>
              <div class="breakdown-col">
                <div class="breakdown-title">Employer</div>
                <div class="breakdown-row"><span>PVD (Employer)</span><span>{{ formatCurrency(record.pvd_employer) }}</span></div>
                <div class="breakdown-row"><span>Saving Fund (Employer)</span><span>{{ formatCurrency(record.saving_fund_employer) }}</span></div>
                <div class="breakdown-row"><span>Social Security</span><span>{{ formatCurrency(record.employer_social_security) }}</span></div>
                <div class="breakdown-row"><span>Health Welfare</span><span>{{ formatCurrency(record.employer_health_welfare) }}</span></div>
                <div class="breakdown-row total"><span>Total Employer</span><span>{{ formatCurrency(record.employer_contribution) }}</span></div>
                <div class="breakdown-title" style="margin-top: 12px">PVD & Saving Fund</div>
                <div class="breakdown-row"><span>Total PVD</span><span>{{ formatCurrency(record.total_pvd) }}</span></div>
                <div class="breakdown-row"><span>Total Saving Fund</span><span>{{ formatCurrency(record.total_saving_fund) }}</span></div>
              </div>
            </div>
          </template>

          <!-- Summary row -->
          <template #summary v-if="payrolls.length > 1">
            <a-table-summary fixed>
              <a-table-summary-row class="summary-row">
                <a-table-summary-cell :index="0" :col-span="2">
                  <strong>Total ({{ payrolls.length }} allocations)</strong>
                </a-table-summary-cell>
                <a-table-summary-cell :index="2" align="right">
                  <span class="font-mono">{{ formatCurrency(totals.gross) }}</span>
                </a-table-summary-cell>
                <a-table-summary-cell :index="3" align="right">
                  <span class="font-mono">{{ formatCurrency(totals.income) }}</span>
                </a-table-summary-cell>
                <a-table-summary-cell :index="4" align="right">
                  <span class="font-mono">{{ formatCurrency(totals.deduction) }}</span>
                </a-table-summary-cell>
                <a-table-summary-cell :index="5" align="right">
                  <span class="font-mono">{{ formatCurrency(totals.employer) }}</span>
                </a-table-summary-cell>
                <a-table-summary-cell :index="6" align="right">
                  <strong class="font-mono" style="color: var(--color-success)">{{ formatCurrency(totals.net) }}</strong>
                </a-table-summary-cell>
                <a-table-summary-cell :index="7" align="right">
                  <strong class="font-mono">{{ formatCurrency(totals.total) }}</strong>
                </a-table-summary-cell>
                <a-table-summary-cell :index="8" />
              </a-table-summary-row>
            </a-table-summary>
          </template>
        </a-table>
      </div>

      <!-- Notes (show if any record has notes) -->
      <div v-if="allNotes.length" class="drawer-section">
        <div class="drawer-section-title">Notes</div>
        <p v-for="note in allNotes" :key="note" style="margin: 0 0 4px; color: var(--color-text-secondary)">
          {{ note }}
        </p>
      </div>
    </template>
  </a-drawer>
</template>

<script setup>
import { computed } from 'vue'
import { FilePdfOutlined, LoadingOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { formatCurrency, formatDate, fmtFte } from '@/utils/formatters'

const appStore = useAppStore()

const props = defineProps({
  open: Boolean,
  employeeGroup: Object,
  payslipLoadingIds: { type: Array, default: () => [] },
})

defineEmits(['update:open', 'download-payslip'])

const payrolls = computed(() => props.employeeGroup?.payrolls || [])
const firstPayroll = computed(() => payrolls.value[0] || null)

const totals = computed(() => {
  const sum = (field) => payrolls.value.reduce((s, r) => s + (Number(r[field]) || 0), 0)
  return {
    gross: sum('gross_salary_by_FTE'),
    income: sum('total_income'),
    deduction: sum('total_deduction'),
    employer: sum('employer_contribution'),
    net: sum('net_salary'),
    total: sum('total_salary'),
  }
})

const allNotes = computed(() =>
  payrolls.value.map((r) => r.notes).filter(Boolean)
)

const allocColumns = [
  { title: 'Grant / BL', key: 'grant', width: 140 },
  { title: 'FTE', key: 'fte', width: 55, align: 'center' },
  { title: 'Gross', key: 'gross', width: 85, align: 'right' },
  { title: 'Income', key: 'income', width: 85, align: 'right' },
  { title: 'Deductions', key: 'deduction', width: 85, align: 'right' },
  { title: 'Employer', key: 'employer', width: 80, align: 'right' },
  { title: 'Net Salary', key: 'net', width: 95, align: 'right' },
  { title: 'Total Cost', key: 'total', width: 90, align: 'right' },
  { title: '', key: 'action', width: 40, align: 'center' },
]

</script>

<style scoped>
.drawer-section { margin-bottom: 20px; }
.drawer-section-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  margin-bottom: 8px;
}
.font-mono { font-family: 'SF Mono', 'Consolas', monospace; }
.cell-sub { font-size: 11px; color: var(--color-text-muted); }

/* Allocation table */
.alloc-table :deep(.ant-table-thead > tr > th) {
  font-size: 11px;
  padding: 6px 8px;
}
.alloc-table :deep(.ant-table-tbody > tr > td) {
  font-size: 12.5px;
  font-family: 'SF Mono', 'Consolas', monospace;
  padding: 8px;
}
.summary-row :deep(td) {
  background: #fafafa;
  border-top: 2px solid #e8e8e8;
}

/* Expanded breakdown grid */
.breakdown-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  padding: 8px 0;
}
@media (min-width: 768px) {
  .breakdown-grid {
    grid-template-columns: 1fr 1fr 1fr;
  }
}
.breakdown-col { min-width: 0; }
.breakdown-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--color-text-muted);
  padding-bottom: 4px;
  margin-bottom: 4px;
  border-bottom: 1px solid #f0f0f0;
}
.breakdown-row {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
  font-size: 12px;
}
.breakdown-row span:first-child { color: var(--color-text-secondary); }
.breakdown-row span:last-child { font-family: 'SF Mono', 'Consolas', monospace; }
.breakdown-row.total {
  border-top: 1px solid #e8e8e8;
  padding-top: 6px;
  margin-top: 4px;
  font-weight: 600;
}
.breakdown-row.total span:first-child { color: var(--color-text); }

.link-disabled { pointer-events: none; opacity: 0.5; }
</style>
