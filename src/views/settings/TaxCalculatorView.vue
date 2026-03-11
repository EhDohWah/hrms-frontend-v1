<template>
  <div class="page-container">
    <a-tabs v-model:activeKey="activeTab" class="calc-tabs">

      <!-- ── Tab 1: Full Income Tax Calculator ── -->
      <a-tab-pane key="income" tab="Income Tax Calculator">
        <a-row :gutter="24">

          <!-- Input Panel -->
          <a-col :xs="24" :lg="8">
            <a-card class="input-card">
              <template #title>
                <span>Full Tax Calculator</span>
              </template>

              <!-- Gross Income -->
              <div class="form-section">
                <div class="form-label">Annual Gross Income (฿)</div>
                <a-input-number
                  v-model:value="incomeForm.annual_gross_income"
                  placeholder="e.g. 600,000"
                  :min="0"
                  :formatter="(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                  :parser="(v) => v.replace(/,/g, '')"
                  style="width: 100%"
                  size="large"
                />
                <div class="field-hint">Before any deductions</div>
              </div>

              <!-- Tax Year -->
              <div class="form-section">
                <div class="form-label">Tax Year</div>
                <a-select v-model:value="incomeForm.tax_year" style="width: 100%">
                  <a-select-option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</a-select-option>
                </a-select>
              </div>

              <!-- ── Personal Allowances ── -->
              <a-divider orientation="left" class="section-divider">Personal Allowances</a-divider>

              <!-- Marital Status -->
              <div class="form-section">
                <div class="form-label">Marital Status</div>
                <a-radio-group v-model:value="incomeForm.is_married" button-style="solid" style="width: 100%">
                  <a-radio-button :value="false" style="width: 50%; text-align: center">Single</a-radio-button>
                  <a-radio-button :value="true" style="width: 50%; text-align: center">Married</a-radio-button>
                </a-radio-group>
                <div v-if="incomeForm.is_married" class="field-hint applied">
                  Spouse allowance ฿60,000 will be applied
                </div>
              </div>

              <!-- Number of Children -->
              <div class="form-section">
                <div class="form-label">
                  Number of Children
                  <a-tooltip title="1st child: ฿30,000. Subsequent children born 2018+: ฿60,000 each. Others: ฿30,000 each.">
                    <QuestionCircleOutlined class="help-icon" />
                  </a-tooltip>
                </div>
                <div class="stepper-row">
                  <a-button @click="decrement('num_children', 0)" :disabled="incomeForm.num_children <= 0" size="small">−</a-button>
                  <span class="stepper-value">{{ incomeForm.num_children }}</span>
                  <a-button @click="increment('num_children', 10)" size="small">+</a-button>
                  <span class="stepper-unit">{{ incomeForm.num_children === 1 ? 'child' : 'children' }}</span>
                </div>

                <!-- Sub-field: children born 2018+ (only when > 1 child) -->
                <div v-if="incomeForm.num_children > 1" class="sub-field">
                  <div class="form-label sub-label">
                    Of those, 2nd+ children born from 2018
                    <a-tooltip title="Children from 2nd onwards who were born in 2018 or later qualify for ฿60,000 each. Others (born before 2018) get ฿30,000 each.">
                      <QuestionCircleOutlined class="help-icon" />
                    </a-tooltip>
                  </div>
                  <div class="stepper-row">
                    <a-button @click="decrement('num_children_born_2018_plus', 0)" :disabled="incomeForm.num_children_born_2018_plus <= 0" size="small">−</a-button>
                    <span class="stepper-value">{{ incomeForm.num_children_born_2018_plus }}</span>
                    <a-button @click="increment('num_children_born_2018_plus', incomeForm.num_children - 1)" size="small">+</a-button>
                    <span class="stepper-unit">born 2018+</span>
                  </div>
                  <div class="field-hint">
                    {{ incomeForm.num_children_born_2018_plus }} × ฿60,000 +
                    {{ (incomeForm.num_children - 1) - incomeForm.num_children_born_2018_plus }} × ฿30,000
                  </div>
                </div>
              </div>

              <!-- Eligible Parents -->
              <div class="form-section">
                <div class="form-label">
                  Eligible Parents
                  <a-tooltip title="Each parent must be: age 60 or older, annual income under ฿30,000, and registered as your dependent. Maximum 4.">
                    <QuestionCircleOutlined class="help-icon" />
                  </a-tooltip>
                </div>
                <div class="stepper-row">
                  <a-button @click="decrement('num_eligible_parents', 0)" :disabled="incomeForm.num_eligible_parents <= 0" size="small">−</a-button>
                  <span class="stepper-value">{{ incomeForm.num_eligible_parents }}</span>
                  <a-button @click="increment('num_eligible_parents', 4)" size="small">+</a-button>
                  <span class="stepper-unit">{{ incomeForm.num_eligible_parents === 1 ? 'parent' : 'parents' }}</span>
                </div>
                <div v-if="incomeForm.num_eligible_parents > 0" class="field-hint applied">
                  {{ incomeForm.num_eligible_parents }} × ฿30,000 = ฿{{ (incomeForm.num_eligible_parents * 30000).toLocaleString() }}
                </div>
                <div v-else class="field-hint">Age 60+, income &lt; ฿30,000/year</div>
              </div>

              <!-- ── Employment Type ── -->
              <a-divider orientation="left" class="section-divider">Employment Type</a-divider>

              <div class="form-section">
                <a-radio-group v-model:value="incomeForm.employee_type" class="employee-type-group">
                  <div class="radio-option">
                    <a-radio value="local_id">
                      <span class="radio-label">Thai Citizen (Local ID)</span>
                    </a-radio>
                    <span class="radio-desc">SSF + PVD Fund (7.5%)</span>
                  </div>
                  <div class="radio-option">
                    <a-radio value="local_non_id">
                      <span class="radio-label">Non-Thai with Work Permit</span>
                    </a-radio>
                    <span class="radio-desc">SSF + Saving Fund (7.5%)</span>
                  </div>
                  <div class="radio-option">
                    <a-radio value="expat">
                      <span class="radio-label">Expatriate</span>
                    </a-radio>
                    <span class="radio-desc">No SSF, No PVD / Saving Fund</span>
                  </div>
                </a-radio-group>
              </div>

              <a-button
                type="primary"
                :loading="incomeLoading"
                block
                size="large"
                style="margin-top: 8px"
                @click="calculateIncomeTax"
              >
                Calculate Tax
              </a-button>
            </a-card>
          </a-col>

          <!-- Results Panel -->
          <a-col :xs="24" :lg="16">
            <div v-if="incomeLoading" class="loading-state"><a-spin size="large" /></div>

            <template v-else-if="incomeResult">

              <!-- Summary Cards — 3 × 2 grid -->
              <div class="summary-cards income-cards">
                <div class="summary-card">
                  <div class="summary-label">Monthly Gross</div>
                  <div class="summary-value font-mono">{{ fmtCurrency(incomeResult.monthly_gross_income) }}</div>
                </div>
                <div class="summary-card">
                  <div class="summary-label">Taxable Income</div>
                  <div class="summary-value font-mono">{{ fmtCurrency(incomeResult.taxable_income) }}</div>
                </div>
                <div class="summary-card">
                  <div class="summary-label">Annual Tax</div>
                  <div class="summary-value font-mono accent">{{ fmtCurrency(incomeResult.annual_tax) }}</div>
                </div>
                <div class="summary-card">
                  <div class="summary-label">Monthly Tax</div>
                  <div class="summary-value font-mono accent">{{ fmtCurrency(incomeResult.monthly_tax) }}</div>
                </div>
                <div class="summary-card highlight">
                  <div class="summary-label">Est. Net Monthly</div>
                  <div class="summary-value font-mono font-semibold">{{ fmtCurrency(incomeResult.net_monthly_salary) }}</div>
                </div>
                <div class="summary-card">
                  <div class="summary-label">Effective Rate</div>
                  <div class="summary-value font-mono">{{ incomeResult.effective_rate }}%</div>
                  <div class="summary-sub">on gross income</div>
                </div>
              </div>

              <!-- Income Breakdown Waterfall -->
              <a-card title="Annual Income Breakdown" class="result-card">
                <div class="waterfall">
                  <div class="waterfall-row gross">
                    <span class="waterfall-label">Annual Gross Income</span>
                    <span class="font-mono font-semibold">{{ fmtCurrency(incomeResult.annual_gross_income) }}</span>
                  </div>

                  <div class="waterfall-divider" />

                  <div class="waterfall-row deduction">
                    <span class="waterfall-label indent">
                      Employment Deduction
                      <span class="waterfall-note">{{ incomeResult.employment_deductions_rate }}% of gross, max ฿{{ Number(incomeResult.employment_deductions_max).toLocaleString() }}</span>
                    </span>
                    <span class="font-mono deduction-amount">−{{ fmtCurrency(incomeResult.employment_deductions) }}</span>
                  </div>

                  <div class="waterfall-row deduction">
                    <span class="waterfall-label indent">
                      Personal Allowances
                      <span class="waterfall-note">{{ allowancesAppliedSummary }}</span>
                    </span>
                    <span class="font-mono deduction-amount">−{{ fmtCurrency(incomeResult.personal_allowances_total) }}</span>
                  </div>

                  <div v-if="incomeResult.social_security_annual > 0" class="waterfall-row deduction">
                    <span class="waterfall-label indent">Social Security Fund (Annual)</span>
                    <span class="font-mono deduction-amount">−{{ fmtCurrency(incomeResult.social_security_annual) }}</span>
                  </div>

                  <div v-if="incomeResult.provident_fund_annual > 0" class="waterfall-row deduction">
                    <span class="waterfall-label indent">
                      {{ incomeResult.provident_fund_type }}
                      <span class="waterfall-note">{{ incomeResult.provident_fund_rate }}%</span>
                    </span>
                    <span class="font-mono deduction-amount">−{{ fmtCurrency(incomeResult.provident_fund_annual) }}</span>
                  </div>

                  <div class="waterfall-divider" />

                  <div class="waterfall-row total-deductions">
                    <span class="waterfall-label">Total Deductions</span>
                    <span class="font-mono font-semibold deduction-amount">−{{ fmtCurrency(incomeResult.total_deductions) }}</span>
                  </div>

                  <div class="waterfall-row taxable">
                    <span class="waterfall-label">Taxable Income</span>
                    <span class="font-mono font-semibold">{{ fmtCurrency(incomeResult.taxable_income) }}</span>
                  </div>
                </div>
              </a-card>

              <!-- Personal Allowances Detail -->
              <a-card
                v-if="incomeAllowancesBreakdown.length > 0"
                title="Personal Allowances Detail"
                class="result-card"
              >
                <div class="allowances-grid">
                  <div
                    v-for="item in incomeAllowancesBreakdown"
                    :key="item.setting_key"
                    class="allowance-row"
                    :class="{ dimmed: !item.applied }"
                  >
                    <span class="allowance-name">
                      {{ item.setting_name }}
                      <a-tag :color="item.applied ? 'green' : 'default'" size="small" style="margin-left: 6px">
                        {{ item.applied ? 'Applied' : 'N/A' }}
                      </a-tag>
                    </span>
                    <div class="allowance-right">
                      <span class="font-mono allowance-amount" :class="{ muted: !item.applied }">
                        {{ item.formatted_amount }}
                      </span>
                      <span class="allowance-reason">{{ item.reason }}</span>
                    </div>
                  </div>
                  <div class="allowance-divider" />
                  <div class="allowance-row total-row">
                    <span class="allowance-name font-semibold">Total Personal Allowances</span>
                    <span class="font-mono font-semibold deduction-amount">
                      −{{ fmtCurrency(incomeResult.personal_allowances_total) }}
                    </span>
                  </div>
                </div>
              </a-card>

              <!-- Tax Bracket Breakdown -->
              <a-card title="Tax Bracket Breakdown" class="result-card" :body-style="{ padding: 0 }">
                <a-table
                  :columns="bracketColumns"
                  :data-source="incomeResult.tax_breakdown?.brackets || []"
                  :row-key="(r) => r.bracket_order"
                  :pagination="false"
                  size="small"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'range'">
                      <span class="font-mono" style="font-size: 12.5px">{{ record.income_range }}</span>
                    </template>
                    <template v-else-if="column.key === 'rate'">
                      <a-tag :color="rateColor(record.tax_rate)" size="small">{{ record.tax_rate }}</a-tag>
                    </template>
                    <template v-else-if="column.key === 'income_in_bracket'">
                      <span class="font-mono">{{ record.formatted_taxable_income }}</span>
                    </template>
                    <template v-else-if="column.key === 'tax'">
                      <span class="font-mono font-semibold">{{ record.formatted_tax_amount }}</span>
                    </template>
                  </template>
                  <template #summary>
                    <a-table-summary fixed>
                      <a-table-summary-row>
                        <a-table-summary-cell :col-span="3">
                          <strong>Total Annual Tax</strong>
                        </a-table-summary-cell>
                        <a-table-summary-cell align="right">
                          <strong class="font-mono">{{ incomeResult.tax_breakdown?.summary?.formatted_annual_tax || fmtCurrency(incomeResult.annual_tax) }}</strong>
                        </a-table-summary-cell>
                      </a-table-summary-row>
                    </a-table-summary>
                  </template>
                </a-table>
              </a-card>

            </template>

            <a-empty v-else description="Fill in the details on the left and click Calculate Tax" />
          </a-col>
        </a-row>
      </a-tab-pane>

      <!-- ── Tab 2: Employee Payroll Tax ── -->
      <a-tab-pane key="payroll" tab="Employee Payroll Tax">
        <a-row :gutter="24">
          <!-- Input Panel -->
          <a-col :xs="24" :lg="8">
            <a-card title="Calculate Payroll Tax" class="input-card">
              <a-form layout="vertical">
                <a-form-item label="Employee">
                  <a-select
                    v-model:value="payrollForm.employee_id"
                    placeholder="Search by name or staff ID..."
                    show-search
                    :filter-option="false"
                    :options="employeeOptions"
                    :loading="employeeSearchLoading"
                    @search="handleEmployeeSearch"
                    style="width: 100%"
                    allow-clear
                  />
                </a-form-item>
                <a-form-item label="Monthly Gross Salary (฿)">
                  <a-input-number
                    v-model:value="payrollForm.gross_salary"
                    placeholder="e.g. 50,000"
                    :min="0"
                    :formatter="(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                    :parser="(v) => v.replace(/,/g, '')"
                    style="width: 100%"
                    size="large"
                  />
                </a-form-item>
                <a-form-item label="Tax Year">
                  <a-select v-model:value="payrollForm.tax_year" style="width: 100%">
                    <a-select-option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</a-select-option>
                  </a-select>
                </a-form-item>
                <a-button type="primary" :loading="payrollLoading" block @click="calculatePayrollTax">
                  Calculate Payroll Tax
                </a-button>
              </a-form>
            </a-card>
          </a-col>

          <!-- Results Panel -->
          <a-col :xs="24" :lg="16">
            <div v-if="payrollLoading" class="loading-state"><a-spin size="large" /></div>

            <template v-else-if="payrollResult">
              <!-- Summary Cards -->
              <div class="summary-cards payroll-cards">
                <div class="summary-card">
                  <div class="summary-label">Monthly Gross</div>
                  <div class="summary-value font-mono">{{ fmtCurrency(payrollResult.gross_salary) }}</div>
                </div>
                <div class="summary-card">
                  <div class="summary-label">Monthly Tax</div>
                  <div class="summary-value font-mono accent">{{ fmtCurrency(payrollResult.monthly_tax_amount) }}</div>
                </div>
                <div class="summary-card">
                  <div class="summary-label">Monthly SSF</div>
                  <div class="summary-value font-mono">{{ fmtCurrency(payrollResult.social_security_monthly) }}</div>
                </div>
                <div class="summary-card highlight">
                  <div class="summary-label">Net Salary</div>
                  <div class="summary-value font-mono font-semibold">{{ fmtCurrency(payrollResult.net_salary) }}</div>
                </div>
              </div>

              <!-- Deductions Breakdown -->
              <a-card title="Annual Deductions Breakdown" class="result-card">
                <div class="waterfall">
                  <div class="waterfall-row gross">
                    <span class="waterfall-label">Annual Gross Salary</span>
                    <span class="font-mono font-semibold">{{ fmtCurrency(payrollResult.annual_gross_salary) }}</span>
                  </div>
                  <div class="waterfall-divider" />
                  <div class="waterfall-row deduction">
                    <span class="waterfall-label indent">Employment Deductions (50%, max ฿100k)</span>
                    <span class="font-mono deduction-amount">−{{ fmtCurrency(payrollResult.employment_deductions) }}</span>
                  </div>
                  <div class="waterfall-row deduction">
                    <span class="waterfall-label indent">Personal Allowances</span>
                    <span class="font-mono deduction-amount">−{{ fmtCurrency(payrollResult.personal_allowances_total) }}</span>
                  </div>
                  <div class="waterfall-row deduction">
                    <span class="waterfall-label indent">Social Security (Annual)</span>
                    <span class="font-mono deduction-amount">−{{ fmtCurrency(payrollResult.social_security_annual) }}</span>
                  </div>
                  <div class="waterfall-row deduction">
                    <span class="waterfall-label indent">{{ payrollResult.provident_fund_type || 'Provident Fund' }}</span>
                    <span class="font-mono deduction-amount">−{{ fmtCurrency(payrollResult.provident_fund_annual) }}</span>
                  </div>
                  <div class="waterfall-divider" />
                  <div class="waterfall-row total-deductions">
                    <span class="waterfall-label">Total Deductions</span>
                    <span class="font-mono font-semibold">{{ fmtCurrency(payrollResult.total_deductions) }}</span>
                  </div>
                  <div class="waterfall-row taxable">
                    <span class="waterfall-label">Taxable Income</span>
                    <span class="font-mono font-semibold">{{ fmtCurrency(payrollResult.taxable_income) }}</span>
                  </div>
                </div>
              </a-card>

              <!-- Personal Allowances Detail -->
              <a-card v-if="payrollAllowancesBreakdown.length > 0" title="Personal Allowances Detail" class="result-card">
                <div class="allowances-grid">
                  <div
                    v-for="item in payrollAllowancesBreakdown"
                    :key="item.setting_key"
                    class="allowance-row"
                    :class="{ dimmed: !item.applied }"
                  >
                    <span class="allowance-name">
                      {{ item.setting_name }}
                      <a-tag :color="item.applied ? 'green' : 'default'" size="small" style="margin-left: 6px">
                        {{ item.applied ? 'Applied' : 'N/A' }}
                      </a-tag>
                    </span>
                    <div class="allowance-right">
                      <span class="font-mono allowance-amount" :class="{ muted: !item.applied }">
                        {{ item.formatted_amount }}
                      </span>
                      <span class="allowance-reason">{{ item.reason }}</span>
                    </div>
                  </div>
                </div>
              </a-card>

              <!-- Bracket Breakdown Table -->
              <a-card title="Tax Bracket Breakdown" class="result-card" :body-style="{ padding: 0 }">
                <a-table
                  :columns="bracketColumns"
                  :data-source="payrollResult.tax_calculation_breakdown?.brackets || []"
                  :row-key="(r) => r.bracket_order"
                  :pagination="false"
                  size="small"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'range'">
                      <span class="font-mono" style="font-size: 12.5px">{{ record.income_range }}</span>
                    </template>
                    <template v-else-if="column.key === 'rate'">
                      <a-tag :color="rateColor(record.tax_rate)" size="small">{{ record.tax_rate }}</a-tag>
                    </template>
                    <template v-else-if="column.key === 'income_in_bracket'">
                      <span class="font-mono">{{ record.formatted_taxable_income }}</span>
                    </template>
                    <template v-else-if="column.key === 'tax'">
                      <span class="font-mono font-semibold">{{ record.formatted_tax_amount }}</span>
                    </template>
                  </template>
                  <template #summary>
                    <a-table-summary fixed>
                      <a-table-summary-row>
                        <a-table-summary-cell :col-span="2">
                          <strong>Annual Tax</strong>
                        </a-table-summary-cell>
                        <a-table-summary-cell align="right">
                          <strong class="font-mono">{{ fmtCurrency(payrollResult.annual_tax_amount) }}</strong>
                        </a-table-summary-cell>
                        <a-table-summary-cell align="right">
                          <strong class="font-mono">{{ fmtCurrency(payrollResult.monthly_tax_amount) }} /mo</strong>
                        </a-table-summary-cell>
                      </a-table-summary-row>
                    </a-table-summary>
                  </template>
                </a-table>
              </a-card>

              <!-- Calculation Method Note -->
              <a-alert
                v-if="payrollResult.calculation_method"
                type="info"
                show-icon
                class="result-card"
              >
                <template #message>
                  <span style="font-size: 12.5px">{{ payrollResult.calculation_method }}</span>
                </template>
              </a-alert>
            </template>

            <a-empty v-else description="Select an employee and enter salary to calculate payroll tax" />
          </a-col>
        </a-row>
      </a-tab-pane>

    </a-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { QuestionCircleOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { taxCalculationApi, employeeApi } from '@/api'
import { useAbortController } from '@/composables/useAbortController'

const getSignal = useAbortController()
const appStore = useAppStore()

const activeTab = ref('income')
const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i)

// ── Income Tax Calculator ──────────────────────────────────────────────────

const incomeForm = reactive({
  annual_gross_income: null,
  tax_year: currentYear,
  is_married: false,
  num_children: 0,
  num_children_born_2018_plus: 0,
  num_eligible_parents: 0,
  employee_type: 'local_id',
})

const incomeLoading = ref(false)
const incomeResult = ref(null)

// Stepper helpers
function increment(field, max) {
  if (incomeForm[field] < max) incomeForm[field]++
}
function decrement(field, min) {
  if (incomeForm[field] > min) incomeForm[field]--
}

// Cap born_2018_plus when children count drops
watch(() => incomeForm.num_children, (val) => {
  if (val <= 1) {
    incomeForm.num_children_born_2018_plus = 0
  } else if (incomeForm.num_children_born_2018_plus > val - 1) {
    incomeForm.num_children_born_2018_plus = val - 1
  }
})

// Compute applied allowances list (excludes 'total' and 'summary' keys)
const incomeAllowancesBreakdown = computed(() => {
  if (!incomeResult.value?.personal_allowances_breakdown) return []
  const bd = incomeResult.value.personal_allowances_breakdown
  return Object.entries(bd)
    .filter(([key]) => !['total', 'summary'].includes(key))
    .map(([, item]) => item)
})

// Short summary text for the waterfall row
const allowancesAppliedSummary = computed(() => {
  const items = incomeAllowancesBreakdown.value.filter((i) => i.applied)
  if (!items.length) return 'none applied'
  return items.map((i) => i.setting_name.replace(' Allowance', '')).join(', ')
})

async function calculateIncomeTax() {
  if (incomeForm.annual_gross_income == null || incomeForm.annual_gross_income < 0) {
    return message.warning('Please enter a valid annual gross income')
  }
  incomeLoading.value = true
  incomeResult.value = null
  try {
    const { data } = await taxCalculationApi.calculateIncomeTax({
      annual_gross_income:         incomeForm.annual_gross_income,
      tax_year:                    incomeForm.tax_year,
      is_married:                  incomeForm.is_married,
      num_children:                incomeForm.num_children,
      num_children_born_2018_plus: incomeForm.num_children_born_2018_plus,
      num_eligible_parents:        incomeForm.num_eligible_parents,
      employee_type:               incomeForm.employee_type,
    })
    incomeResult.value = data.data || data
  } catch (err) {
    message.error(err.response?.data?.message || 'Failed to calculate income tax')
  }
  incomeLoading.value = false
}

// ── Employee Payroll Tax ───────────────────────────────────────────────────

const payrollForm = reactive({ employee_id: undefined, gross_salary: null, tax_year: currentYear })
const payrollLoading = ref(false)
const payrollResult = ref(null)

const employeeSearchLoading = ref(false)
const employeeOptions = ref([])
let employeeSearchTimer = null

function handleEmployeeSearch(query) {
  if (employeeSearchTimer) clearTimeout(employeeSearchTimer)
  if (!query || query.length < 2) {
    employeeOptions.value = []
    return
  }
  employeeSearchTimer = setTimeout(async () => {
    employeeSearchLoading.value = true
    try {
      const { data } = await employeeApi.list({ search: query, per_page: 20 })
      const list = data.data || []
      employeeOptions.value = list.map((e) => ({
        value: e.id,
        label: `${e.first_name_en} ${e.last_name_en} (${e.staff_id})`,
      }))
    } catch { /* silent */ }
    employeeSearchLoading.value = false
  }, 300)
}

const payrollAllowancesBreakdown = computed(() => {
  if (!payrollResult.value?.personal_allowances_breakdown) return []
  const bd = payrollResult.value.personal_allowances_breakdown
  return Object.entries(bd)
    .filter(([key]) => !['total', 'summary'].includes(key))
    .map(([, item]) => item)
})

async function calculatePayrollTax() {
  if (!payrollForm.employee_id) return message.warning('Please select an employee')
  if (payrollForm.gross_salary == null || payrollForm.gross_salary < 0) {
    return message.warning('Please enter a valid gross salary')
  }
  payrollLoading.value = true
  payrollResult.value = null
  try {
    const { data } = await taxCalculationApi.calculatePayroll({
      employee_id:  payrollForm.employee_id,
      gross_salary: payrollForm.gross_salary,
      tax_year:     payrollForm.tax_year,
    })
    payrollResult.value = data.data || data
  } catch (err) {
    message.error(err.response?.data?.message || 'Failed to calculate payroll tax')
  }
  payrollLoading.value = false
}

// ── Shared ─────────────────────────────────────────────────────────────────

const bracketColumns = [
  { title: 'Income Range',      key: 'range',            width: 220 },
  { title: 'Rate',              key: 'rate',             width: 90,  align: 'center' },
  { title: 'Income in Bracket', key: 'income_in_bracket', width: 160, align: 'right' },
  { title: 'Tax Amount',        key: 'tax',              width: 140, align: 'right' },
]

function fmtCurrency(val) {
  if (val == null || val === '') return '—'
  const n = Number(val)
  return isNaN(n) ? '—' : `฿${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function rateColor(rate) {
  const pct = parseFloat(rate)
  if (pct === 0) return 'default'
  if (pct <= 5) return 'green'
  if (pct <= 15) return 'blue'
  if (pct <= 25) return 'orange'
  return 'red'
}

onMounted(() => {
  appStore.setPageMeta('Tax Calculator')
})
</script>

<style scoped>
.calc-tabs {
  margin-top: -8px;
}

/* ── Input Form ── */
.form-section {
  margin-bottom: 16px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.help-icon {
  color: var(--color-text-muted);
  font-size: 13px;
  cursor: help;
}

.field-hint {
  font-size: 11.5px;
  color: var(--color-text-muted);
  margin-top: 4px;
}
.field-hint.applied {
  color: var(--color-success, #52c41a);
  font-weight: 500;
}

.section-divider {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 16px 0 12px;
}

/* Stepper */
.stepper-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.stepper-value {
  font-size: 18px;
  font-weight: 600;
  min-width: 28px;
  text-align: center;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}
.stepper-unit {
  font-size: 13px;
  color: var(--color-text-secondary);
}

/* Sub-field (children born 2018+) */
.sub-field {
  margin-top: 10px;
  padding: 10px 12px;
  background: var(--color-bg-surface, #f5f5f5);
  border-radius: var(--radius-md, 6px);
  border-left: 3px solid var(--color-primary);
}
.sub-label {
  font-size: 12.5px;
}

/* Employee type radio group */
.employee-type-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.radio-option {
  display: flex;
  flex-direction: column;
  padding: 8px 10px;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md, 6px);
  cursor: pointer;
  transition: border-color 0.2s;
}
.radio-option:has(.ant-radio-checked) {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 5%, transparent);
}
.radio-label {
  font-size: 13px;
  font-weight: 500;
}
.radio-desc {
  font-size: 11.5px;
  color: var(--color-text-muted);
  margin-left: 22px;
  margin-top: 2px;
}

/* Input Card */
.input-card {
  position: sticky;
  top: 80px;
}

/* ── Summary Cards ── */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.income-cards {
  grid-template-columns: repeat(2, 1fr);
}
@media (min-width: 1024px) {
  .income-cards {
    grid-template-columns: repeat(3, 1fr);
  }
}
.payroll-cards {
  grid-template-columns: repeat(2, 1fr);
}
@media (min-width: 1024px) {
  .payroll-cards {
    grid-template-columns: repeat(4, 1fr);
  }
}
.summary-card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: 14px 16px;
}
.summary-card.highlight {
  background: var(--color-primary);
  border-color: var(--color-primary);
}
.summary-card.highlight .summary-label,
.summary-card.highlight .summary-sub {
  color: rgba(255, 255, 255, 0.7);
}
.summary-card.highlight .summary-value {
  color: var(--color-text-inverse);
}
.summary-label {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}
.summary-value {
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text);
}
.summary-value.accent {
  color: var(--color-danger);
}
.summary-sub {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 2px;
}

/* ── Result Cards ── */
.result-card {
  margin-bottom: 16px;
}

/* ── Waterfall Breakdown ── */
.waterfall {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.waterfall-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 4px 0;
}
.waterfall-row.gross {
  font-size: 14px;
}
.waterfall-row.deduction .waterfall-label {
  color: var(--color-text-secondary);
}
.waterfall-row.total-deductions {
  font-size: 13.5px;
}
.waterfall-row.taxable {
  font-size: 14.5px;
  padding-top: 6px;
  border-top: 2px solid var(--color-border);
}
.waterfall-label {
  font-size: 13.5px;
  color: var(--color-text);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.waterfall-label.indent {
  padding-left: 16px;
}
.waterfall-note {
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 400;
}
.waterfall-divider {
  height: 1px;
  background: var(--color-border-light);
  margin: 4px 0;
}
.deduction-amount {
  color: var(--color-danger);
}

/* ── Personal Allowances Detail ── */
.allowances-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.allowance-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 6px 0;
  border-bottom: 1px solid var(--color-border-light);
}
.allowance-row:last-child {
  border-bottom: none;
}
.allowance-row.dimmed {
  opacity: 0.55;
}
.allowance-row.total-row {
  padding-top: 8px;
}
.allowance-name {
  font-size: 13.5px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}
.allowance-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}
.allowance-amount {
  font-size: 13.5px;
}
.allowance-amount.muted {
  color: var(--color-text-muted);
}
.allowance-reason {
  font-size: 11px;
  color: var(--color-text-muted);
  text-align: right;
  max-width: 200px;
}
.allowance-divider {
  height: 1px;
  background: var(--color-border);
  margin: 4px 0;
}

/* Loading */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
}

</style>
