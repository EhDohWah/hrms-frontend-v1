<template>
  <a-card class="import-card employee-card">
    <template #title>
      <div class="card-title">
        <UserAddOutlined class="card-icon" />
        <span>Employee Import</span>
      </div>
    </template>

    <p class="card-description">
      Import employee personal information, identification, bank details, contacts, and
      beneficiaries. New employees only — duplicates are rejected.
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
          :accept="'.xlsx,.xls,.csv'"
          :max-count="1"
          class="upload-dragger"
        >
          <p class="ant-upload-drag-icon"><InboxOutlined /></p>
          <p class="ant-upload-text">Click or drag file to upload</p>
          <p class="ant-upload-hint">.xlsx, .xls, or .csv (max 10 MB)</p>
        </a-upload-dragger>

        <a-button type="primary" class="upload-btn" @click="validate">
          <UploadOutlined /> Validate & Preview
        </a-button>
      </template>

      <ImportProgressBar v-if="isValidating" :active="true" step="validate" :file-name="fileName" :file-size="fileSize" :elapsed="elapsed" />

      <template v-if="isPreview">
        <ImportPreviewTable
          :preview-rows="previewData.preview_rows"
          :columns="employeeColumns"
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
          description="Fix the highlighted errors in your Excel file and upload again. Employee import requires all rows to be valid."
        />

        <div class="preview-actions">
          <a-button @click="resetToIdle">
            <UploadOutlined /> Upload Different File
          </a-button>
          <a-button type="primary" :disabled="previewData.error_count > 0" @click="commit">
            Import {{ previewData.valid_count }} Employee(s)
          </a-button>
        </div>
      </template>

      <ImportProgressBar v-if="isImporting" :active="true" step="import" :file-name="fileName" :file-size="fileSize" :elapsed="elapsed" />

      <ImportResultAlert v-if="isDone" :result="importResult" @close="clearResult" />
    </template>
  </a-card>
</template>

<script setup>
import { UserAddOutlined, DownloadOutlined, UploadOutlined, InboxOutlined } from '@ant-design/icons-vue'
import { useImportCard } from '@/composables/useImportCard'
import ImportProgressBar from '@/components/imports/ImportProgressBar.vue'
import ImportPreviewTable from '@/components/imports/ImportPreviewTable.vue'
import ImportResultAlert from '@/components/imports/ImportResultAlert.vue'

defineProps({
  canCreate: { type: Boolean, default: false },
})

const employeeColumns = [
  { key: 'organization', title: 'Org', width: 70 },
  { key: 'staff_id', title: 'Staff ID', width: 100 },
  { key: 'name', title: 'Name', width: 200 },
  { key: 'gender', title: 'Gender', width: 70 },
  { key: 'status', title: 'Emp. Status', width: 150 },
]

const {
  fileList, previewData, importResult, fileName, fileSize, elapsed, downloading,
  isIdle, isValidating, isPreview, isImporting, isDone,
  validate, commit, handleDownload, resetToIdle, clearResult,
} = useImportCard('employee', {
  templateSlug: 'employee-template',
  templateLabel: 'Employee Template',
  parseValidateResponse: (resp) => resp.data ?? resp,
  parseImportResponse(resp) {
    const d = resp.data ?? {}
    const created = d.processed_count ?? 0
    const errors = d.errors ?? []
    const warnings = d.warnings ?? []
    const hasErrors = errors.length > 0
    const hasWarnings = warnings.length > 0
    return {
      type: hasErrors ? 'error' : hasWarnings ? 'warning' : 'success',
      message: hasErrors ? 'Import Failed' : hasWarnings ? 'Import Complete with Warnings' : 'Import Complete',
      description: hasErrors
        ? `${errors.length} validation error(s). No employees were created.`
        : `${created} employee(s) created successfully.`,
      errors: hasErrors ? errors.slice(0, 10) : [],
      warnings: hasWarnings ? warnings.slice(0, 10) : [],
    }
  },
})
</script>

<style scoped>
.employee-card { border-top: 3px solid #52c41a; }
.all-or-nothing-alert { margin-top: 12px; }
</style>
