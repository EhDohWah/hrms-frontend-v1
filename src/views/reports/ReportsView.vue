<template>
  <div class="page-container">
    <div class="page-header">
      <a-input-search
        v-model:value="searchQuery"
        placeholder="Search reports..."
        allow-clear
        style="width: 280px"
      />
      <div class="page-header-actions">
        <a-tag color="default">{{ totalReportCount }} Reports</a-tag>
      </div>
    </div>

    <a-card :body-style="{ padding: 0 }" class="reports-card">
      <template v-for="(group, gi) in filteredGroups" :key="group.key">
        <div class="group-header" :class="{ 'group-header--first': gi === 0 }">
          {{ group.label }}
        </div>
        <div
          v-for="(report, ri) in group.reports"
          :key="report.key"
          class="report-row"
          :class="{ 'report-row--active': selectedReport?.key === report.key && drawerVisible }"
          :style="animStyle(gi, ri)"
          tabindex="0"
          role="button"
          @click="openDrawer(report, group.key)"
          @keydown.enter.prevent="openDrawer(report, group.key)"
        >
          <div class="report-row__icon" :class="`report-icon--${group.key}`">
            <component :is="report.icon" />
          </div>
          <div class="report-row__body">
            <div class="report-row__title">{{ report.title }}</div>
            <div class="report-row__desc">{{ report.description }}</div>
          </div>
          <div class="report-row__formats">
            <span
              v-for="fmt in report.formats"
              :key="fmt"
              class="format-badge"
              :class="`format-badge--${fmt.toLowerCase()}`"
            >{{ fmt }}</span>
          </div>
          <RightOutlined class="report-row__arrow" />
        </div>
      </template>

      <div v-if="filteredGroups.length === 0" class="reports-empty">
        <SearchOutlined class="reports-empty__icon" />
        <p>No reports match "<strong>{{ searchQuery }}</strong>"</p>
      </div>
    </a-card>

    <!-- Report Configuration Drawer -->
    <a-drawer
      v-model:open="drawerVisible"
      placement="right"
      :width="'min(95vw, 460px)'"
      :closable="false"
      :header-style="{ display: 'none' }"
      :body-style="{ padding: 0 }"
    >
      <template v-if="selectedReport">
        <div class="drawer-hero" :class="`drawer-hero--${selectedReport.groupKey}`">
          <button class="drawer-close" @click="drawerVisible = false" aria-label="Close drawer">
            <CloseOutlined />
          </button>
          <div class="drawer-hero__icon">
            <component :is="selectedReport.icon" />
          </div>
          <h3 class="drawer-hero__title">{{ selectedReport.title }}</h3>
          <p class="drawer-hero__desc">{{ selectedReport.fullDescription }}</p>
        </div>

        <div class="drawer-form">
          <!-- Interview Report -->
          <template v-if="selectedReport.key === 'interview'">
            <a-form layout="vertical">
              <a-form-item label="Date Range" required>
                <a-range-picker
                  v-model:value="interview.dateRange"
                  format="DD MMM YYYY"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                  :allow-clear="true"
                />
              </a-form-item>
            </a-form>
          </template>

          <!-- Job Offer Report -->
          <template v-else-if="selectedReport.key === 'jobOffer'">
            <a-form layout="vertical">
              <a-form-item label="Date Range" required>
                <a-range-picker
                  v-model:value="jobOffer.dateRange"
                  format="DD MMM YYYY"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                  :allow-clear="true"
                />
              </a-form-item>
            </a-form>
          </template>

          <!-- Department Leave Report -->
          <template v-else-if="selectedReport.key === 'deptLeave'">
            <a-form layout="vertical">
              <a-form-item label="Date Range" required>
                <a-range-picker
                  v-model:value="deptLeave.dateRange"
                  format="DD MMM YYYY"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                  :allow-clear="true"
                />
              </a-form-item>
              <a-row :gutter="12">
                <a-col :span="12">
                  <a-form-item label="Site (Work Location)" required>
                    <a-select
                      v-model:value="deptLeave.site"
                      placeholder="Select site"
                      :options="siteOptions"
                      :loading="optionsLoading"
                      allow-clear
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="Department" required>
                    <a-select
                      v-model:value="deptLeave.department"
                      placeholder="Select department"
                      :options="departmentOptions"
                      :loading="optionsLoading"
                      allow-clear
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form>
          </template>

          <!-- Individual Leave Report -->
          <template v-else-if="selectedReport.key === 'individualLeave'">
            <a-form layout="vertical">
              <a-form-item label="Date Range" required>
                <a-range-picker
                  v-model:value="individualLeave.dateRange"
                  format="DD MMM YYYY"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                  :allow-clear="true"
                />
              </a-form-item>
              <a-form-item label="Staff ID" required>
                <a-input
                  v-model:value="individualLeave.staffId"
                  placeholder="Enter staff ID (e.g. EMP001)"
                  allow-clear
                />
              </a-form-item>
            </a-form>
          </template>

          <!-- Payroll Registration Report -->
          <template v-else-if="selectedReport.key === 'payrollRegistration'">
            <a-form layout="vertical">
              <a-row :gutter="12">
                <a-col :span="12">
                  <a-form-item label="Organization" required>
                    <a-select v-model:value="payrollRegistration.organization" placeholder="Select" style="width: 100%">
                      <a-select-option v-for="org in ORG_OPTIONS" :key="org.code" :value="org.code">{{ org.label }}</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="Pay Period" required>
                    <a-date-picker
                      v-model:value="payrollRegistration.payPeriod"
                      picker="month"
                      format="MMM YYYY"
                      placeholder="Select month"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form>
          </template>

          <!-- Grant Headcount Report -->
          <template v-else-if="selectedReport.key === 'grantHeadcount'">
            <a-form layout="vertical">
              <a-row :gutter="12">
                <a-col :span="12">
                  <a-form-item label="Organization" required>
                    <a-select v-model:value="grantHeadcount.organization" placeholder="Select" style="width: 100%">
                      <a-select-option v-for="org in ORG_OPTIONS" :key="org.code" :value="org.code">{{ org.label }}</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="Pay Period" required>
                    <a-date-picker
                      v-model:value="grantHeadcount.payPeriod"
                      picker="month"
                      format="MMM YYYY"
                      placeholder="Select month"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form>
          </template>

          <!-- Payroll Register Excel (per Grant) -->
          <template v-else-if="selectedReport.key === 'payrollRegisterExcel'">
            <a-form layout="vertical">
              <a-row :gutter="12">
                <a-col :span="12">
                  <a-form-item label="Organization" required>
                    <a-select v-model:value="payrollRegisterExcel.organization" placeholder="Select" style="width: 100%">
                      <a-select-option v-for="org in ORG_OPTIONS" :key="org.code" :value="org.code">{{ org.label }}</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="Pay Period" required>
                    <a-date-picker
                      v-model:value="payrollRegisterExcel.payPeriod"
                      picker="month"
                      format="MMM YYYY"
                      placeholder="Select month"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
              <a-form-item label="Grant" required>
                <a-select
                  v-model:value="payrollRegisterExcel.grantCode"
                  placeholder="Select grant"
                  :options="grantOptions"
                  :loading="grantsLoading"
                  show-search
                  :filter-option="(input, option) => option.label.toLowerCase().includes(input.toLowerCase())"
                  allow-clear
                  style="width: 100%"
                />
              </a-form-item>
            </a-form>
          </template>

          <!-- Total Grant Budget & FTE -->
          <template v-else-if="selectedReport.key === 'totalGrantBudgetFte'">
            <a-form layout="vertical">
              <a-row :gutter="12">
                <a-col :span="12">
                  <a-form-item label="Organization" required>
                    <a-select v-model:value="totalGrantBudgetFte.organization" placeholder="Select" style="width: 100%">
                      <a-select-option v-for="org in ORG_OPTIONS" :key="org.code" :value="org.code">{{ org.label }}</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="Pay Period" required>
                    <a-date-picker
                      v-model:value="totalGrantBudgetFte.payPeriod"
                      picker="month"
                      format="MMM YYYY"
                      placeholder="Select month"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form>
          </template>

          <!-- Budget Request Report -->
          <template v-else-if="selectedReport.key === 'budgetRequest'">
            <a-form layout="vertical">
              <a-row :gutter="12">
                <a-col :span="12">
                  <a-form-item label="Organization" required>
                    <a-select v-model:value="budgetRequest.organization" placeholder="Select" style="width: 100%">
                      <a-select-option v-for="org in ORG_OPTIONS" :key="org.code" :value="org.code">{{ org.label }}</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="Pay Period" required>
                    <a-date-picker
                      v-model:value="budgetRequest.payPeriod"
                      picker="month"
                      format="MMM YYYY"
                      placeholder="Select month"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form>
          </template>

          <!-- PND91 Annual Tax Report -->
          <template v-else-if="selectedReport.key === 'pnd91'">
            <a-form layout="vertical">
              <a-row :gutter="12">
                <a-col :span="12">
                  <a-form-item label="Organization" required>
                    <a-select v-model:value="pnd91.organization" placeholder="Select" style="width: 100%">
                      <a-select-option v-for="org in ORG_OPTIONS" :key="org.code" :value="org.code">{{ org.label }}</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="Tax Year" required>
                    <a-date-picker
                      v-model:value="pnd91.year"
                      picker="year"
                      format="YYYY"
                      placeholder="Select year"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form>
          </template>
        </div>
      </template>

      <template #footer>
        <div v-if="selectedReport" class="drawer-footer">
          <a-button @click="drawerVisible = false">Cancel</a-button>
          <div class="drawer-footer__actions">
            <template v-if="selectedReport.key === 'interview'">
              <a-button :loading="interview.loadingExcel" :disabled="!interview.dateRange" @click="downloadInterviewExcel">
                <FileExcelOutlined /> Excel
              </a-button>
              <a-button type="primary" :loading="interview.loadingPdf" :disabled="!interview.dateRange" @click="downloadInterviewPdf">
                <FilePdfOutlined /> Export PDF
              </a-button>
            </template>
            <template v-else-if="selectedReport.key === 'jobOffer'">
              <a-button type="primary" :loading="jobOffer.loadingPdf" :disabled="!jobOffer.dateRange" @click="downloadJobOfferPdf">
                <FilePdfOutlined /> Export PDF
              </a-button>
            </template>
            <template v-else-if="selectedReport.key === 'deptLeave'">
              <a-button type="primary" :loading="deptLeave.loadingPdf" :disabled="!deptLeave.dateRange || !deptLeave.site || !deptLeave.department" @click="downloadDeptLeavePdf">
                <FilePdfOutlined /> Export PDF
              </a-button>
            </template>
            <template v-else-if="selectedReport.key === 'individualLeave'">
              <a-button type="primary" :loading="individualLeave.loadingPdf" :disabled="!individualLeave.dateRange || !individualLeave.staffId" @click="downloadIndividualLeavePdf">
                <FilePdfOutlined /> Export PDF
              </a-button>
            </template>
            <template v-else-if="selectedReport.key === 'payrollRegistration'">
              <a-button type="primary" :loading="payrollRegistration.loadingPdf" :disabled="!payrollRegistration.organization || !payrollRegistration.payPeriod" @click="downloadPayrollRegistrationPdf">
                <FilePdfOutlined /> Export PDF
              </a-button>
            </template>
            <template v-else-if="selectedReport.key === 'grantHeadcount'">
              <a-button type="primary" :loading="grantHeadcount.loadingPdf" :disabled="!grantHeadcount.organization || !grantHeadcount.payPeriod" @click="downloadGrantHeadcountPdf">
                <FilePdfOutlined /> Export PDF
              </a-button>
            </template>
            <template v-else-if="selectedReport.key === 'payrollRegisterExcel'">
              <a-button type="primary" :loading="payrollRegisterExcel.loadingExcel" :disabled="!payrollRegisterExcel.organization || !payrollRegisterExcel.payPeriod || !payrollRegisterExcel.grantCode" @click="downloadPayrollRegisterExcel">
                <FileExcelOutlined /> Export Excel
              </a-button>
            </template>
            <template v-else-if="selectedReport.key === 'totalGrantBudgetFte'">
              <a-button :loading="totalGrantBudgetFte.loadingExcel" :disabled="!totalGrantBudgetFte.organization || !totalGrantBudgetFte.payPeriod" @click="downloadTotalGrantBudgetFteExcel">
                <FileExcelOutlined /> Excel
              </a-button>
              <a-button type="primary" :loading="totalGrantBudgetFte.loadingPdf" :disabled="!totalGrantBudgetFte.organization || !totalGrantBudgetFte.payPeriod" @click="downloadTotalGrantBudgetFtePdf">
                <FilePdfOutlined /> Export PDF
              </a-button>
            </template>
            <template v-else-if="selectedReport.key === 'budgetRequest'">
              <a-button type="primary" :loading="budgetRequest.loadingDocx" :disabled="!budgetRequest.organization || !budgetRequest.payPeriod" @click="downloadBudgetRequestDocx">
                <FileWordOutlined /> Export DOCX
              </a-button>
            </template>
            <template v-else-if="selectedReport.key === 'pnd91'">
              <a-button type="primary" :loading="pnd91.loadingFile" :disabled="!pnd91.organization || !pnd91.year" @click="downloadPND91">
                <FilePdfOutlined /> Export File
              </a-button>
            </template>
          </div>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<script setup>
import { reactive, ref, computed, watch, onMounted, markRaw } from 'vue'
import { message } from 'ant-design-vue'
import {
  UsergroupAddOutlined,
  SolutionOutlined,
  CalendarOutlined,
  UserOutlined,
  DollarOutlined,
  TeamOutlined,
  AuditOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  RightOutlined,
  CloseOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { reportApi } from '@/api/reportApi'
import { optionsApi } from '@/api/optionsApi'
import { ORG_OPTIONS } from '@/constants/organizations'
import { parseBlobError } from '@/utils/helpers'

const appStore = useAppStore()

// ── Report registry ──────────────────────────────────────────────────────────

const REPORT_GROUPS = [
  {
    key: 'recruitment',
    label: 'Recruitment',
    reports: [
      {
        key: 'interview',
        title: 'Interview Report',
        description: 'Interviews with candidate details, status, and positions',
        fullDescription: 'Export a summary of all interviews within a date range, including candidate details, interview status, position applied, and interviewers.',
        icon: markRaw(UsergroupAddOutlined),
        formats: ['PDF', 'Excel'],
      },
      {
        key: 'jobOffer',
        title: 'Job Offer Report',
        description: 'Job offers with salary details and acceptance status',
        fullDescription: 'Export a summary of all job offers within a date range, including candidate name, position, probation salary, post-probation salary, and acceptance status.',
        icon: markRaw(SolutionOutlined),
        formats: ['PDF'],
      },
    ],
  },
  {
    key: 'leave',
    label: 'Leave & Attendance',
    reports: [
      {
        key: 'deptLeave',
        title: 'Department Leave Report',
        description: 'Leave balances per employee by site and department',
        fullDescription: 'Export a department-level leave report showing used and remaining leave balances per employee, filtered by site and department.',
        icon: markRaw(CalendarOutlined),
        formats: ['PDF'],
      },
      {
        key: 'individualLeave',
        title: 'Individual Leave Report',
        description: 'Per-employee leave requests and remaining balances',
        fullDescription: 'Export a per-employee leave report showing their leave requests and remaining balances across all leave types within a date range.',
        icon: markRaw(UserOutlined),
        formats: ['PDF'],
      },
    ],
  },
  {
    key: 'payroll',
    label: 'Payroll & Tax',
    reports: [
      {
        key: 'payrollRegistration',
        title: 'Payroll Registration Report',
        description: 'Payroll summary by department with salary and deductions',
        fullDescription: 'Export a payroll summary grouped by department with subtotals and grand total. Shows salary, deductions, and net pay for all employees in the selected pay period.',
        icon: markRaw(DollarOutlined),
        formats: ['PDF'],
      },
      {
        key: 'grantHeadcount',
        title: 'Grant Headcount Report',
        description: 'Staff FTE allocation per grant grouped by employee status',
        fullDescription: 'Export a monthly headcount report showing FTE allocation per grant, broken down by employee status (Expats Oxford, Expats Local, Thai ID Staff, Local non Thai ID Staff) with totals.',
        icon: markRaw(TeamOutlined),
        formats: ['PDF'],
      },
      {
        key: 'payrollRegisterExcel',
        title: 'Payroll Register (per Grant)',
        description: 'Per-grant payroll register with formulas grouped by position',
        fullDescription: 'Export an Excel payroll register for a specific grant. Shows one row per funding allocation, grouped by grant position, with live Excel formulas for provident fund, social insurance, health welfare, and net pay calculations.',
        icon: markRaw(FileExcelOutlined),
        formats: ['Excel'],
      },
      {
        key: 'totalGrantBudgetFte',
        title: 'Total Grant Budget & FTE',
        description: 'Summary of payroll costs per grant with FTE counts',
        fullDescription: 'Export a comprehensive report showing total payroll costs grouped by grant and payment method (bank transfer vs cheque). Includes salary, deductions, employer contributions, tax, and net pay across 20 financial columns with FTE counts.',
        icon: markRaw(DollarOutlined),
        formats: ['PDF', 'Excel'],
      },
      {
        key: 'budgetRequest',
        title: 'Budget Request Report',
        description: 'Accounting record for salaries & 13th month salary per grant',
        fullDescription: 'Export a DOCX budget request report (SMRU accounting form) showing salary costs grouped by grant with accrued 13th month salary, plus a check section summarizing deductions by payment method.',
        icon: markRaw(FileWordOutlined),
        formats: ['DOCX'],
      },
      {
        key: 'pnd91',
        title: 'PND91 Annual Tax Report',
        description: 'Annual tax filing data for Thai Revenue Department',
        fullDescription: 'Export the PND91 annual personal income tax filing data for submission to the Thai Revenue Department. Contains citizen ID, income, tax withheld, and SSF per employee.',
        icon: markRaw(AuditOutlined),
        formats: ['File'],
      },
    ],
  },
]

const totalReportCount = REPORT_GROUPS.reduce((sum, g) => sum + g.reports.length, 0)

// ── Search and selection ─────────────────────────────────────────────────────

const searchQuery = ref('')
const selectedReport = ref(null)
const drawerVisible = ref(false)

const filteredGroups = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return REPORT_GROUPS
  return REPORT_GROUPS
    .map((group) => ({
      ...group,
      reports: group.reports.filter(
        (r) => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q),
      ),
    }))
    .filter((group) => group.reports.length > 0)
})

function openDrawer(report, groupKey) {
  selectedReport.value = { ...report, groupKey }
  drawerVisible.value = true
  if (report.key === 'payrollRegisterExcel') loadGrantOptions()
}

function animStyle(gi, ri) {
  return { animationDelay: `${(gi * 3 + ri) * 40}ms` }
}

// ── Filter state per report ──────────────────────────────────────────────────

const interview = reactive({
  dateRange: null,
  loadingPdf: false,
  loadingExcel: false,
})

const jobOffer = reactive({
  dateRange: null,
  loadingPdf: false,
})

const deptLeave = reactive({
  dateRange: null,
  site: null,
  department: null,
  loadingPdf: false,
})

const individualLeave = reactive({
  dateRange: null,
  staffId: '',
  loadingPdf: false,
})

const payrollRegistration = reactive({
  organization: null,
  payPeriod: null,
  loadingPdf: false,
})

const grantHeadcount = reactive({
  organization: null,
  payPeriod: null,
  loadingPdf: false,
})

const payrollRegisterExcel = reactive({
  organization: null,
  payPeriod: null,
  grantCode: null,
  loadingExcel: false,
})

const totalGrantBudgetFte = reactive({
  organization: null,
  payPeriod: null,
  loadingPdf: false,
  loadingExcel: false,
})

const budgetRequest = reactive({
  organization: null,
  payPeriod: null,
  loadingDocx: false,
})

const pnd91 = reactive({
  organization: null,
  year: null,
  loadingFile: false,
})

// ── Dropdown options ─────────────────────────────────────────────────────────

const siteOptions = ref([])
const departmentOptions = ref([])
const allGrants = ref([])
const optionsLoading = ref(false)
const grantsLoading = ref(false)

const grantOptions = computed(() => {
  const org = payrollRegisterExcel.organization
  if (!org) return allGrants.value
  return allGrants.value.filter((g) => g.organization === org)
})

// Clear grant selection when organization changes (grants are org-specific)
watch(() => payrollRegisterExcel.organization, () => {
  payrollRegisterExcel.grantCode = null
})

async function loadOptions() {
  optionsLoading.value = true
  try {
    const [sitesRes, deptsRes] = await Promise.all([
      optionsApi.sites(),
      optionsApi.departments(),
    ])
    siteOptions.value = (sitesRes.data?.data || []).map((s) => ({
      value: s.name,
      label: s.name,
    }))
    departmentOptions.value = (deptsRes.data?.data || []).map((d) => ({
      value: d.name,
      label: d.name,
    }))
  } catch {
    message.error('Failed to load filter options')
  } finally {
    optionsLoading.value = false
  }
}

async function loadGrantOptions() {
  if (allGrants.value.length > 0) return
  grantsLoading.value = true
  try {
    const res = await optionsApi.grants()
    allGrants.value = (res.data?.data || []).map((g) => ({
      value: g.code,
      label: `${g.code} — ${g.name}`,
      organization: g.organization,
    }))
  } catch {
    message.error('Failed to load grant options')
  } finally {
    grantsLoading.value = false
  }
}

// ── Download handlers ────────────────────────────────────────────────────────

async function downloadInterviewPdf() {
  if (!interview.dateRange) return
  interview.loadingPdf = true
  try {
    const res = await reportApi.exportInterviewPdf({
      start_date: interview.dateRange[0],
      end_date: interview.dateRange[1],
    })
    reportApi.downloadBlob(res, `interview_report.pdf`)
  } catch (err) {
    message.error(await parseBlobError(err) || 'Failed to export interview PDF')
  } finally {
    interview.loadingPdf = false
  }
}

async function downloadInterviewExcel() {
  if (!interview.dateRange) return
  interview.loadingExcel = true
  try {
    const res = await reportApi.exportInterviewExcel({
      start_date: interview.dateRange[0],
      end_date: interview.dateRange[1],
    })
    reportApi.downloadBlob(res, `interview_report.xlsx`)
  } catch (err) {
    message.error(await parseBlobError(err) || 'Failed to export interview Excel')
  } finally {
    interview.loadingExcel = false
  }
}

async function downloadJobOfferPdf() {
  if (!jobOffer.dateRange) return
  jobOffer.loadingPdf = true
  try {
    const res = await reportApi.exportJobOfferPdf({
      start_date: jobOffer.dateRange[0],
      end_date: jobOffer.dateRange[1],
    })
    reportApi.downloadBlob(res, `job_offer_report.pdf`)
  } catch (err) {
    message.error(await parseBlobError(err) || 'Failed to export job offer PDF')
  } finally {
    jobOffer.loadingPdf = false
  }
}

async function downloadDeptLeavePdf() {
  if (!deptLeave.dateRange || !deptLeave.site || !deptLeave.department) return
  deptLeave.loadingPdf = true
  try {
    const res = await reportApi.exportDepartmentLeavePdf({
      start_date: deptLeave.dateRange[0],
      end_date: deptLeave.dateRange[1],
      work_location: deptLeave.site,
      department: deptLeave.department,
    })
    reportApi.downloadBlob(res, `department_leave_report.pdf`)
  } catch (err) {
    message.error(await parseBlobError(err) || 'Failed to export department leave PDF')
  } finally {
    deptLeave.loadingPdf = false
  }
}

async function downloadIndividualLeavePdf() {
  if (!individualLeave.dateRange || !individualLeave.staffId.trim()) return
  individualLeave.loadingPdf = true
  try {
    const res = await reportApi.exportIndividualLeavePdf({
      start_date: individualLeave.dateRange[0],
      end_date: individualLeave.dateRange[1],
      staff_id: individualLeave.staffId.trim(),
    })
    reportApi.downloadBlob(res, `individual_leave_report.pdf`)
  } catch (err) {
    const status = err.response?.status
    if (status === 404) {
      message.error('Employee not found. Please check the Staff ID.')
    } else if (status === 422) {
      message.error(await parseBlobError(err) || 'Invalid input. Please check the form.')
    } else {
      message.error(await parseBlobError(err) || 'Failed to export individual leave PDF')
    }
  } finally {
    individualLeave.loadingPdf = false
  }
}

async function downloadPayrollRegistrationPdf() {
  if (!payrollRegistration.organization || !payrollRegistration.payPeriod) return
  payrollRegistration.loadingPdf = true
  try {
    const period = payrollRegistration.payPeriod.format('YYYY-MM')
    const res = await reportApi.exportPayrollRegistrationPdf({
      organization: payrollRegistration.organization,
      pay_period_date: period,
    })
    reportApi.downloadBlob(res, `payroll_registration_report_${payrollRegistration.organization}_${period}.pdf`)
  } catch (err) {
    if (err.response?.status === 404) {
      message.error('No payroll records found for the selected period.')
    } else {
      message.error(await parseBlobError(err) || 'Failed to export payroll registration report')
    }
  } finally {
    payrollRegistration.loadingPdf = false
  }
}

async function downloadGrantHeadcountPdf() {
  if (!grantHeadcount.organization || !grantHeadcount.payPeriod) return
  grantHeadcount.loadingPdf = true
  try {
    const period = grantHeadcount.payPeriod.format('YYYY-MM')
    const res = await reportApi.exportGrantHeadcountPdf({
      organization: grantHeadcount.organization,
      pay_period_date: period,
    })
    reportApi.downloadBlob(res, `grant_headcount_report_${grantHeadcount.organization}_${period}.pdf`)
  } catch (err) {
    message.error(await parseBlobError(err) || 'Failed to export grant headcount report')
  } finally {
    grantHeadcount.loadingPdf = false
  }
}

async function downloadPayrollRegisterExcel() {
  if (!payrollRegisterExcel.organization || !payrollRegisterExcel.payPeriod || !payrollRegisterExcel.grantCode) return
  payrollRegisterExcel.loadingExcel = true
  try {
    const period = payrollRegisterExcel.payPeriod.format('YYYY-MM')
    const grantCode = payrollRegisterExcel.grantCode
    const res = await reportApi.exportPayrollRegisterExcel({
      organization: payrollRegisterExcel.organization,
      pay_period_date: period,
      grant_code: grantCode,
    })
    reportApi.downloadBlob(res, `payroll_register_${payrollRegisterExcel.organization}_${period}_${grantCode}.xlsx`)
  } catch (err) {
    if (err.response?.status === 404) {
      message.error('No payroll records found for the selected period and grant code.')
    } else {
      message.error(await parseBlobError(err) || 'Failed to export payroll register Excel')
    }
  } finally {
    payrollRegisterExcel.loadingExcel = false
  }
}

async function downloadTotalGrantBudgetFtePdf() {
  if (!totalGrantBudgetFte.organization || !totalGrantBudgetFte.payPeriod) return
  totalGrantBudgetFte.loadingPdf = true
  try {
    const period = totalGrantBudgetFte.payPeriod.format('YYYY-MM')
    const res = await reportApi.exportTotalGrantBudgetFtePdf({
      organization: totalGrantBudgetFte.organization,
      pay_period_date: period,
    })
    reportApi.downloadBlob(res, `total_grant_budget_fte_${totalGrantBudgetFte.organization}_${period}.pdf`)
  } catch (err) {
    if (err.response?.status === 404) {
      message.error('No payroll records found for the selected period.')
    } else {
      message.error(await parseBlobError(err) || 'Failed to export Total Grant Budget FTE PDF')
    }
  } finally {
    totalGrantBudgetFte.loadingPdf = false
  }
}

async function downloadTotalGrantBudgetFteExcel() {
  if (!totalGrantBudgetFte.organization || !totalGrantBudgetFte.payPeriod) return
  totalGrantBudgetFte.loadingExcel = true
  try {
    const period = totalGrantBudgetFte.payPeriod.format('YYYY-MM')
    const res = await reportApi.exportTotalGrantBudgetFteExcel({
      organization: totalGrantBudgetFte.organization,
      pay_period_date: period,
    })
    reportApi.downloadBlob(res, `total_grant_budget_fte_${totalGrantBudgetFte.organization}_${period}.xlsx`)
  } catch (err) {
    if (err.response?.status === 404) {
      message.error('No payroll records found for the selected period.')
    } else {
      message.error(await parseBlobError(err) || 'Failed to export Total Grant Budget FTE Excel')
    }
  } finally {
    totalGrantBudgetFte.loadingExcel = false
  }
}

async function downloadBudgetRequestDocx() {
  if (!budgetRequest.organization || !budgetRequest.payPeriod) return
  budgetRequest.loadingDocx = true
  try {
    const period = budgetRequest.payPeriod.format('YYYY-MM')
    const res = await reportApi.exportBudgetRequestDocx({
      organization: budgetRequest.organization,
      pay_period_date: period,
    })
    reportApi.downloadBlob(res, `budget_request_${budgetRequest.organization}_${period}.docx`)
  } catch (err) {
    if (err.response?.status === 404) {
      message.error('No payroll records found for the selected period.')
    } else {
      message.error(await parseBlobError(err) || 'Failed to export budget request report')
    }
  } finally {
    budgetRequest.loadingDocx = false
  }
}

async function downloadPND91() {
  if (!pnd91.organization || !pnd91.year) return
  pnd91.loadingFile = true
  try {
    const year = pnd91.year.format('YYYY')
    const res = await reportApi.exportPND91({
      organization: pnd91.organization,
      year,
    })
    reportApi.downloadBlob(res, `PND91_${pnd91.organization}_${year}.txt`)
  } catch (err) {
    if (err.response?.status === 404) {
      message.error('No payroll records found for the selected year.')
    } else {
      message.error(await parseBlobError(err) || 'Failed to export PND91 report')
    }
  } finally {
    pnd91.loadingFile = false
  }
}

onMounted(() => {
  appStore.setPageMeta('Reports')
  loadOptions()
})
</script>

<style scoped>
/* ── Group headers ── */
.group-header {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  padding: 16px 20px 8px;
  border-top: 1px solid var(--color-border-light);
  user-select: none;
}
.group-header--first {
  border-top: none;
}

/* ── Report rows ── */
.report-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  cursor: pointer;
  border-left: 3px solid transparent;
  position: relative;
}
.report-row:not(:last-child)::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 56px;
  right: 20px;
  height: 1px;
  background: var(--color-border-light);
}
.report-row:hover {
  background: var(--color-bg-hover);
  border-left-color: var(--color-accent);
}
.report-row--active {
  background: var(--color-accent-light);
  border-left-color: var(--color-accent);
}
.report-row:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}

/* Icon */
.report-row__icon {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 17px;
}
.report-row:hover .report-row__icon {
  transform: scale(1.06);
}
.report-icon--recruitment {
  background: var(--color-info-bg);
  color: var(--color-info);
}
.report-icon--leave {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}
.report-icon--payroll {
  background: var(--color-success-bg);
  color: var(--color-success);
}

/* Body */
.report-row__body {
  flex: 1;
  min-width: 0;
}
.report-row__title {
  font-weight: 600;
  font-size: 14px;
  color: var(--color-text);
  line-height: 1.35;
}
.report-row__desc {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Format badges */
.report-row__formats {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
}
.format-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 4px;
  line-height: 1.5;
}
.format-badge--pdf {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}
.format-badge--excel {
  background: var(--color-success-bg);
  color: var(--color-success);
}
.format-badge--file {
  background: var(--color-info-bg);
  color: var(--color-info);
}
.format-badge--docx {
  background: var(--color-info-bg);
  color: var(--color-info);
}

/* Arrow */
.report-row__arrow {
  font-size: 12px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}
.report-row:hover .report-row__arrow {
  transform: translateX(3px);
  color: var(--color-accent);
}

/* Empty state */
.reports-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px 24px;
  color: var(--color-text-muted);
  font-size: 13px;
}
.reports-empty__icon {
  font-size: 32px;
  color: var(--color-text-muted);
}
.reports-empty p {
  margin: 0;
}

/* ── Drawer hero ── */
.drawer-hero {
  padding: 24px 24px 20px;
  border-bottom: 1px solid var(--color-border-light);
  position: relative;
}
.drawer-hero--recruitment {
  background: linear-gradient(145deg, var(--color-info-bg) 0%, var(--color-bg-surface) 100%);
}
.drawer-hero--leave {
  background: linear-gradient(145deg, var(--color-warning-bg) 0%, var(--color-bg-surface) 100%);
}
.drawer-hero--payroll {
  background: linear-gradient(145deg, var(--color-success-bg) 0%, var(--color-bg-surface) 100%);
}

.drawer-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}
.drawer-close:hover {
  background: var(--color-bg-hover);
  color: var(--color-text);
}
.drawer-close:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.drawer-hero__icon {
  width: 46px;
  height: 46px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin-bottom: 14px;
}
.drawer-hero--recruitment .drawer-hero__icon {
  background: var(--color-info-bg);
  color: var(--color-info);
}
.drawer-hero--leave .drawer-hero__icon {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}
.drawer-hero--payroll .drawer-hero__icon {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.drawer-hero__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 6px;
  line-height: 1.3;
}
.drawer-hero__desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.55;
}

/* Drawer form */
.drawer-form {
  padding: 24px;
}

/* Drawer footer */
.drawer-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.drawer-footer__actions {
  display: flex;
  gap: 8px;
}

/* ── Motion ── */
@media (prefers-reduced-motion: no-preference) {
  @keyframes reportRowIn {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .report-row {
    animation: reportRowIn 0.3s ease both;
    transition: background var(--transition-fast), border-color var(--transition-fast);
  }
  .report-row__icon {
    transition: transform var(--transition-fast);
  }
  .report-row__arrow {
    transition: transform var(--transition-fast), color var(--transition-fast);
  }
  .drawer-close {
    transition: background var(--transition-fast), color var(--transition-fast);
  }
}
</style>
