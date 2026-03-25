<template>
  <div class="page-container">
    <div class="import-grid">
      <!-- Grant Import -->
      <a-card v-if="authStore.canRead('grants_list')" class="import-card grant-card">
        <template #title>
          <div class="card-title">
            <TrophyOutlined class="card-icon" />
            <span>Grant Import</span>
          </div>
        </template>

        <p class="card-description">
          Import grants and grant positions. Upload one Excel file with one sheet per grant.
          This must be done <strong>before</strong> Data Onboarding.
        </p>

        <div class="download-section">
          <a-button @click="handleDownload('grant-template', 'Grant Template')" :loading="downloading['grant-template']">
            <DownloadOutlined /> Download Template
          </a-button>
        </div>

        <template v-if="authStore.canCreate('grants_list')">
          <a-upload-dragger
            v-model:file-list="grantFileList"
            :before-upload="() => false"
            :accept="ACCEPTED_TYPES"
            :max-count="1"
            class="upload-dragger"
          >
            <p class="ant-upload-drag-icon"><InboxOutlined /></p>
            <p class="ant-upload-text">Click or drag file to upload</p>
            <p class="ant-upload-hint">.xlsx, .xls, or .csv (max 10 MB)</p>
          </a-upload-dragger>

          <a-button
            type="primary"
            :loading="uploading['grant']"
            class="upload-btn"
            @click="handleGrantUpload"
          >
            <UploadOutlined /> Upload
          </a-button>
        </template>

        <ImportResultAlert :result="results['grant']" @close="results['grant'] = null" />
      </a-card>

      <!-- Data Onboarding -->
      <a-card v-if="authStore.canRead('employees')" class="import-card onboarding-card">
        <template #title>
          <div class="card-title">
            <CloudUploadOutlined class="card-icon" />
            <span>Data Onboarding</span>
            <a-tag color="blue" style="margin-left: auto; font-weight: 400; font-size: 11px">All-in-One</a-tag>
          </div>
        </template>

        <p class="card-description">
          Import employees, employment records, funding allocations, and payroll in a single
          spreadsheet. Each section is optional — fill only what you need.
        </p>

        <div class="download-section">
          <a-button
            @click="handleDownload('data-onboarding-template', 'Data Onboarding Template')"
            :loading="downloading['data-onboarding-template']"
          >
            <DownloadOutlined /> Download Template
          </a-button>
        </div>

        <template v-if="authStore.canCreate('employees')">
          <a-upload-dragger
            v-model:file-list="onboardingFileList"
            :before-upload="() => false"
            :accept="'.xlsx,.xls'"
            :max-count="1"
            class="upload-dragger"
          >
            <p class="ant-upload-drag-icon"><InboxOutlined /></p>
            <p class="ant-upload-text">Click or drag file to upload</p>
            <p class="ant-upload-hint">.xlsx or .xls (max 10 MB)</p>
          </a-upload-dragger>

          <a-button
            type="primary"
            :loading="uploading['data-onboarding']"
            class="upload-btn"
            @click="handleOnboardingUpload"
          >
            <UploadOutlined /> Upload
          </a-button>
        </template>

        <ImportResultAlert :result="results['data-onboarding']" @close="results['data-onboarding'] = null" />
      </a-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import {
  CloudUploadOutlined,
  DownloadOutlined,
  UploadOutlined,
  InboxOutlined,
  TrophyOutlined,
} from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { uploadApi } from '@/api'
import { useNotification } from '@/composables/useNotification'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_TYPES = '.xlsx,.xls,.csv'
const ACCEPTED_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
]

const authStore = useAuthStore()
const notify = useNotification()

const grantFileList = ref([])
const onboardingFileList = ref([])
const downloading = reactive({})
const uploading = reactive({})
const results = reactive({})

// ─── Shared Helpers ──────────────────────────────────────────────

async function handleDownload(template, label) {
  downloading[template] = true
  try {
    const response = await uploadApi.downloadTemplate(template)
    const disposition = response.headers['content-disposition']
    let filename = `${template}.xlsx`
    if (disposition) {
      const match = disposition.match(/filename[^;=\n]*=["']?([^"';\n]+)/)
      if (match) filename = match[1]
    }
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    notify.success(`${label || 'Template'} downloaded`)
  } catch {
    notify.error('Failed to download file')
  } finally {
    downloading[template] = false
  }
}

function validateFile(file) {
  if (!ACCEPTED_MIMES.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
    notify.error('Only .xlsx, .xls, or .csv files are allowed')
    return false
  }
  if (file.size > MAX_FILE_SIZE) {
    notify.error('File size must not exceed 10 MB')
    return false
  }
  return true
}

function extractFile(fileList) {
  const list = Array.isArray(fileList) ? fileList : fileList?.value ?? []
  if (!list.length) {
    notify.warning('Please select a file first')
    return null
  }
  const file = list[0]?.originFileObj || list[0]
  return validateFile(file) ? file : null
}

// ─── Grant Upload ────────────────────────────────────────────────

async function handleGrantUpload() {
  const KEY = 'grant'
  const file = extractFile(grantFileList)
  if (!file) return

  uploading[KEY] = true
  results[KEY] = null

  try {
    const response = await uploadApi.upload(KEY, file)
    const data = response.data
    const importData = data?.data ?? {}
    const errorCount = importData.errors?.length ?? 0
    const skippedCount = importData.skipped_grants?.length ?? 0

    const grants = importData.processed_grants ?? 0
    const items = importData.processed_items ?? 0
    const parts = []
    if (grants > 0) parts.push(`${grants} grant(s) and ${items} position(s) imported`)
    if (errorCount > 0) parts.push(`${errorCount} grant(s) failed`)
    if (skippedCount > 0) parts.push(`${skippedCount} grant(s) skipped`)
    const description = parts.length > 0 ? parts.join(', ') + '.' : (data?.message || 'Import completed.')

    const errorMessages = Array.isArray(importData.errors) ? importData.errors.slice(0, 10) : []
    if (errorCount > 10) errorMessages.push(`... and ${errorCount - 10} more error(s)`)

    const hasIssues = errorCount > 0 || skippedCount > 0
    results[KEY] = {
      type: hasIssues ? 'warning' : 'success',
      message: hasIssues ? 'Import Completed with Issues' : 'Import Complete',
      description,
      errors: errorMessages,
    }

    grantFileList.value = []
    notify.success('Grant imported successfully')
  } catch (err) {
    const errData = err.response?.data
    let errorList = []
    if (errData?.errors) {
      errorList = Array.isArray(errData.errors)
        ? errData.errors.slice(0, 10)
        : Object.values(errData.errors).flat().slice(0, 10)
    }
    results[KEY] = {
      type: 'error',
      message: 'Import Failed',
      description: errData?.message || 'An error occurred during import.',
      errors: errorList,
    }
  } finally {
    uploading[KEY] = false
  }
}

// ─── Data Onboarding Upload ──────────────────────────────────────

async function handleOnboardingUpload() {
  const KEY = 'data-onboarding'
  const file = extractFile(onboardingFileList)
  if (!file) return

  uploading[KEY] = true
  results[KEY] = null

  try {
    const response = await uploadApi.upload(KEY, file)
    const data = response.data
    const importData = data?.data ?? {}
    const summary = importData.summary ?? {}
    const warnings = importData.warnings ?? []

    const parts = []
    if (summary.employees_created > 0) parts.push(`${summary.employees_created} employee(s) created`)
    if (summary.employees_existing > 0) parts.push(`${summary.employees_existing} existing employee(s) skipped`)
    if (summary.employments_created > 0) parts.push(`${summary.employments_created} employment(s) created`)
    if (summary.allocations_created > 0) parts.push(`${summary.allocations_created} allocation(s) created`)
    if (summary.payrolls_created > 0) parts.push(`${summary.payrolls_created} payroll(s) created`)
    const description = parts.length > 0 ? parts.join(', ') + '.' : (data?.message || 'Import completed.')

    const warningMessages = warnings.slice(0, 10).map((w) =>
      typeof w === 'string' ? w : `Row ${w.row}: ${w.field} — ${w.message}`,
    )
    if (warnings.length > 10) warningMessages.push(`... and ${warnings.length - 10} more warning(s)`)

    results[KEY] = {
      type: warningMessages.length > 0 ? 'warning' : 'success',
      message: warningMessages.length > 0 ? 'Import Complete with Warnings' : 'Import Complete',
      description,
      warnings: warningMessages,
    }

    onboardingFileList.value = []
    notify.success('Data onboarding import completed')
  } catch (err) {
    const errData = err.response?.data
    const errPayload = errData?.errors ?? {}
    const rawErrors = errPayload?.errors ?? errPayload
    let errorList = []
    if (Array.isArray(rawErrors)) {
      errorList = rawErrors.slice(0, 10).map((e) =>
        typeof e === 'string' ? e : `Row ${e.row}, ${e.field}: ${e.message}`,
      )
      if (rawErrors.length > 10) errorList.push(`... and ${rawErrors.length - 10} more error(s)`)
    } else if (typeof rawErrors === 'object' && rawErrors !== null) {
      errorList = Object.values(rawErrors).flat().slice(0, 10)
    }

    const rawWarnings = errPayload?.warnings ?? []
    const warningMessages = Array.isArray(rawWarnings)
      ? rawWarnings.slice(0, 5).map((w) => (typeof w === 'string' ? w : `Row ${w.row}: ${w.field} — ${w.message}`))
      : []

    results[KEY] = {
      type: 'error',
      message: 'Import Failed',
      description: errData?.message || 'An error occurred during import.',
      errors: errorList,
      warnings: warningMessages,
    }
  } finally {
    uploading[KEY] = false
  }
}

// ─── Result Alert Component ──────────────────────────────────────

const ImportResultAlert = {
  props: {
    result: { type: Object, default: null },
  },
  emits: ['close'],
  template: `
    <a-alert
      v-if="result"
      :type="result.type"
      :message="result.message"
      show-icon
      closable
      class="result-alert"
      @close="$emit('close')"
    >
      <template #description>
        <div>{{ result.description }}</div>
        <ul v-if="result.errors?.length" class="import-error-list">
          <li v-for="(err, i) in result.errors" :key="i">{{ err }}</li>
        </ul>
        <ul v-if="result.warnings?.length" class="import-warning-list">
          <li v-for="(w, i) in result.warnings" :key="'w' + i">{{ w }}</li>
        </ul>
      </template>
    </a-alert>
  `,
}
</script>

<style scoped>
.import-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}
@media (min-width: 768px) {
  .import-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.import-card :deep(.ant-card-head) {
  min-height: auto;
  padding: 12px 16px;
}

.grant-card {
  border-top: 3px solid #faad14;
}
.onboarding-card {
  border-top: 3px solid #1677ff;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
}

.card-icon {
  font-size: 18px;
}

.card-description {
  color: var(--color-text-secondary, #6b7280);
  margin-bottom: 16px;
  font-size: 13px;
  line-height: 1.5;
}

.download-section {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.upload-dragger {
  margin-bottom: 12px;
}

.upload-btn {
  width: 100%;
}

.result-alert {
  margin-top: 12px;
}

.import-error-list {
  margin: 8px 0 0;
  padding-left: 18px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--color-text-secondary, #6b7280);
}

.import-warning-list {
  margin: 8px 0 0;
  padding-left: 18px;
  font-size: 12px;
  line-height: 1.6;
  color: #d48806;
}
</style>
