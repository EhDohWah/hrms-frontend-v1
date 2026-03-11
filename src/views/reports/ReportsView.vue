<template>
  <div class="page-container">
    <div class="reports-grid">

      <!-- ── Card 1: Interview Report ── -->
      <a-card class="report-card">
        <template #title>
          <div class="card-title">
            <UsergroupAddOutlined class="card-icon" />
            <span>Interview Report</span>
          </div>
        </template>
        <p class="card-description">
          Export a summary of all interviews within a date range, including candidate details,
          interview status, position applied, and interviewers.
        </p>
        <a-form layout="vertical" @finish="downloadInterviewPdf">
          <a-row :gutter="12">
            <a-col :span="24">
              <a-form-item label="Date Range" required>
                <a-range-picker
                  v-model:value="interview.dateRange"
                  format="DD MMM YYYY"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                  :allow-clear="true"
                />
              </a-form-item>
            </a-col>
          </a-row>
          <div class="action-row">
            <a-button
              type="primary"
              html-type="submit"
              :loading="interview.loadingPdf"
              :disabled="!interview.dateRange"
            >
              <FilePdfOutlined /> Export PDF
            </a-button>
            <a-button
              :loading="interview.loadingExcel"
              :disabled="!interview.dateRange"
              @click="downloadInterviewExcel"
            >
              <FileExcelOutlined /> Export Excel
            </a-button>
          </div>
        </a-form>
      </a-card>

      <!-- ── Card 2: Job Offer Report ── -->
      <a-card class="report-card">
        <template #title>
          <div class="card-title">
            <SolutionOutlined class="card-icon" />
            <span>Job Offer Report</span>
          </div>
        </template>
        <p class="card-description">
          Export a summary of all job offers within a date range, including candidate name,
          position, probation salary, post-probation salary, and acceptance status.
        </p>
        <a-form layout="vertical" @finish="downloadJobOfferPdf">
          <a-row :gutter="12">
            <a-col :span="24">
              <a-form-item label="Date Range" required>
                <a-range-picker
                  v-model:value="jobOffer.dateRange"
                  format="DD MMM YYYY"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                  :allow-clear="true"
                />
              </a-form-item>
            </a-col>
          </a-row>
          <div class="action-row">
            <a-button
              type="primary"
              html-type="submit"
              :loading="jobOffer.loadingPdf"
              :disabled="!jobOffer.dateRange"
            >
              <FilePdfOutlined /> Export PDF
            </a-button>
          </div>
        </a-form>
      </a-card>

      <!-- ── Card 3: Department Leave Report ── -->
      <a-card class="report-card">
        <template #title>
          <div class="card-title">
            <CalendarOutlined class="card-icon" />
            <span>Department Leave Report</span>
          </div>
        </template>
        <p class="card-description">
          Export a department-level leave report showing used and remaining leave balances per
          employee, filtered by site and department.
        </p>
        <a-form layout="vertical" @finish="downloadDeptLeavePdf">
          <a-row :gutter="12">
            <a-col :span="24">
              <a-form-item label="Date Range" required>
                <a-range-picker
                  v-model:value="deptLeave.dateRange"
                  format="DD MMM YYYY"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                  :allow-clear="true"
                />
              </a-form-item>
            </a-col>
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
          <div class="action-row">
            <a-button
              type="primary"
              html-type="submit"
              :loading="deptLeave.loadingPdf"
              :disabled="!deptLeave.dateRange || !deptLeave.site || !deptLeave.department"
            >
              <FilePdfOutlined /> Export PDF
            </a-button>
          </div>
        </a-form>
      </a-card>

      <!-- ── Card 4: Individual Leave Report ── -->
      <a-card class="report-card">
        <template #title>
          <div class="card-title">
            <UserOutlined class="card-icon" />
            <span>Individual Leave Report</span>
          </div>
        </template>
        <p class="card-description">
          Export a per-employee leave report showing their leave requests and remaining balances
          across all leave types within a date range.
        </p>
        <a-form layout="vertical" @finish="downloadIndividualLeavePdf">
          <a-row :gutter="12">
            <a-col :span="24">
              <a-form-item label="Date Range" required>
                <a-range-picker
                  v-model:value="individualLeave.dateRange"
                  format="DD MMM YYYY"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                  :allow-clear="true"
                />
              </a-form-item>
            </a-col>
            <a-col :span="24">
              <a-form-item label="Staff ID" required>
                <a-input
                  v-model:value="individualLeave.staffId"
                  placeholder="Enter staff ID (e.g. EMP001)"
                  allow-clear
                />
              </a-form-item>
            </a-col>
          </a-row>
          <div class="action-row">
            <a-button
              type="primary"
              html-type="submit"
              :loading="individualLeave.loadingPdf"
              :disabled="!individualLeave.dateRange || !individualLeave.staffId"
            >
              <FilePdfOutlined /> Export PDF
            </a-button>
          </div>
        </a-form>
      </a-card>

    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  UsergroupAddOutlined,
  SolutionOutlined,
  CalendarOutlined,
  UserOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
} from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { reportApi } from '@/api/reportApi'
import { optionsApi } from '@/api/optionsApi'

const appStore = useAppStore()

onMounted(() => {
  appStore.setPageMeta('Reports')
  loadOptions()
})

// ── Filter state per report card ──────────────────────────────────────────────

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

// ── Dropdown options ──────────────────────────────────────────────────────────

const siteOptions = ref([])
const departmentOptions = ref([])
const optionsLoading = ref(false)

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
    message.error('Failed to load site and department options')
  } finally {
    optionsLoading.value = false
  }
}

// ── Download helpers ──────────────────────────────────────────────────────────

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
    message.error(err.response?.data?.message || 'Failed to export interview PDF')
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
    message.error(err.response?.data?.message || 'Failed to export interview Excel')
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
    message.error(err.response?.data?.message || 'Failed to export job offer PDF')
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
    message.error(err.response?.data?.message || 'Failed to export department leave PDF')
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
      const errors = err.response?.data?.errors
      const firstError = errors ? Object.values(errors)[0]?.[0] : null
      message.error(firstError || 'Invalid input. Please check the form.')
    } else {
      message.error(err.response?.data?.message || 'Failed to export individual leave PDF')
    }
  } finally {
    individualLeave.loadingPdf = false
  }
}
</script>

<style scoped>
.reports-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}
@media (min-width: 1024px) {
  .reports-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.report-card :deep(.ant-card-head) {
  border-bottom: 1px solid var(--color-border-light);
}

.card-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 14px;
}

.card-icon {
  font-size: 16px;
  color: var(--color-text-secondary);
}

.card-description {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.55;
  margin-bottom: 20px;
}

.action-row {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
</style>
