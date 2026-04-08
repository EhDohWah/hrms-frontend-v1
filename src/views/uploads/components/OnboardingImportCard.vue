<template>
  <a-card class="import-card onboarding-card">
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
      <a-button @click="handleDownload" :loading="downloading">
        <DownloadOutlined /> Download Template
      </a-button>
    </div>

    <template v-if="canCreate">
      <template v-if="isIdle">
        <a-upload-dragger
          v-model:file-list="fileList"
          :before-upload="() => false"
          :accept="'.xlsx,.xls'"
          :max-count="1"
          class="upload-dragger"
        >
          <p class="ant-upload-drag-icon"><InboxOutlined /></p>
          <p class="ant-upload-text">Click or drag file to upload</p>
          <p class="ant-upload-hint">.xlsx or .xls (max 10 MB)</p>
        </a-upload-dragger>

        <a-button type="primary" class="upload-btn" @click="validate">
          <UploadOutlined /> Validate & Preview
        </a-button>
      </template>

      <ImportProgressBar v-if="isValidating" :active="true" step="validate" :file-name="fileName" :file-size="fileSize" :elapsed="elapsed" />

      <template v-if="isPreview">
        <ImportPreviewTable
          :preview-rows="previewData.preview_rows"
          :columns="onboardingColumns"
          :valid-count="previewData.valid_count"
          :error-count="previewData.error_count"
          :warning-count="previewData.warning_count"
        />

        <a-alert
          v-if="previewData.error_count > 0"
          type="info"
          show-icon
          class="all-or-nothing-alert"
          message="All rows must pass validation before importing"
          description="Fix the highlighted errors in your Excel file and upload again. Data onboarding requires all rows to be valid."
        />

        <a-alert
          v-else-if="previewData.warning_count > 0 && allRowsHaveWarnings"
          type="warning"
          show-icon
          class="all-or-nothing-alert"
          message="All data already exists — nothing new to import"
          description="Every row in this file matches existing records. Importing will skip all rows. Upload a file with new data instead."
        />

        <a-alert
          v-else-if="previewData.warning_count > 0"
          type="warning"
          show-icon
          class="all-or-nothing-alert"
          message="Some data already exists and will be skipped"
          description="Rows with warnings contain data that already exists in the system. Only new data will be imported."
        />

        <div class="preview-actions">
          <a-button @click="resetToIdle">
            <UploadOutlined /> Upload Different File
          </a-button>
          <a-button type="primary" :disabled="previewData.error_count > 0 || allRowsHaveWarnings" @click="commit">
            Import {{ previewData.valid_count }} Row(s)
          </a-button>
        </div>
      </template>

      <ImportProgressBar v-if="isImporting" :active="true" step="import" :file-name="fileName" :file-size="fileSize" :elapsed="elapsed" />

      <ImportResultAlert v-if="isDone" :result="importResult" @close="clearResult" />
    </template>
  </a-card>
</template>

<script setup>
import { computed } from 'vue'
import { CloudUploadOutlined, DownloadOutlined, UploadOutlined, InboxOutlined } from '@ant-design/icons-vue'
import { useImportCard } from '@/composables/useImportCard'
import ImportProgressBar from '@/components/imports/ImportProgressBar.vue'
import ImportPreviewTable from '@/components/imports/ImportPreviewTable.vue'
import ImportResultAlert from '@/components/imports/ImportResultAlert.vue'

defineProps({
  canCreate: { type: Boolean, default: false },
})

const onboardingColumns = [
  { key: 'organization', title: 'Org', width: 70 },
  { key: 'staff_id', title: 'Staff ID', width: 100 },
  { key: 'name', title: 'Name', width: 200 },
  { key: 'status', title: 'Status', width: 150 },
]

const {
  fileList, previewData, importResult, fileName, fileSize, elapsed, downloading,
  isIdle, isValidating, isPreview, isImporting, isDone,
  validate, commit, handleDownload, resetToIdle, clearResult,
} = useImportCard('data-onboarding', {
  templateSlug: 'data-onboarding-template',
  templateLabel: 'Data Onboarding Template',
  parseValidateResponse: (resp) => resp.data ?? resp,
  parseImportResponse(resp) {
    const d = resp.data ?? {}
    const summary = d.summary ?? {}
    const warnings = d.warnings ?? []
    const parts = []
    if (summary.employees_created > 0) parts.push(`${summary.employees_created} employee(s) created`)
    if (summary.employees_existing > 0) parts.push(`${summary.employees_existing} existing employee(s) skipped`)
    if (summary.employments_created > 0) parts.push(`${summary.employments_created} employment(s) created`)
    if (summary.allocations_created > 0) parts.push(`${summary.allocations_created} allocation(s) created`)
    if (summary.payrolls_created > 0) parts.push(`${summary.payrolls_created} payroll(s) created`)

    const warningMessages = warnings.slice(0, 10).map((w) =>
      typeof w === 'string' ? w : `Row ${w.row}: ${w.field} — ${w.message}`,
    )

    return {
      type: warningMessages.length > 0 ? 'warning' : 'success',
      message: warningMessages.length > 0 ? 'Import Complete with Warnings' : 'Import Complete',
      description: parts.join(', ') + '.' || resp.message,
      warnings: warningMessages,
    }
  },
  parseImportError(errData) {
    const errPayload = errData?.errors ?? {}
    const rawErrors = errPayload?.errors ?? errPayload
    let errorList = []
    if (Array.isArray(rawErrors)) {
      errorList = rawErrors.slice(0, 10).map((e) =>
        typeof e === 'string' ? e : `Row ${e.row}, ${e.field}: ${e.message}`,
      )
    } else if (typeof rawErrors === 'object' && rawErrors !== null) {
      errorList = Object.values(rawErrors).flat().slice(0, 10)
    }
    return {
      type: 'error',
      message: 'Import Failed',
      description: errData?.message || 'An error occurred during import.',
      errors: errorList,
    }
  },
})

const allRowsHaveWarnings = computed(() => {
  const rows = previewData.value?.preview_rows
  return rows?.length > 0 && rows.every((r) => r.warnings?.length > 0)
})
</script>

<style scoped>
.onboarding-card { border-top: 3px solid #1677ff; }
.all-or-nothing-alert { margin-top: 12px; }
</style>
