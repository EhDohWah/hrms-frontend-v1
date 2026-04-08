<template>
  <a-card class="import-card grant-card">
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
        <div class="preview-summary">
          <a-tag color="green">{{ previewData.summary.valid_sheets }} valid sheet(s)</a-tag>
          <a-tag v-if="previewData.summary.error_sheets > 0" color="red">
            {{ previewData.summary.error_sheets }} with errors
          </a-tag>
        </div>

        <a-collapse :bordered="false" class="sheet-collapse">
          <a-collapse-panel
            v-for="sheet in previewData.sheets"
            :key="sheet.sheet_name"
            :class="sheet.status === 'valid' ? 'sheet-panel-valid' : 'sheet-panel-error'"
          >
            <template #header>
              <div class="sheet-header">
                <span>{{ sheet.sheet_name }}</span>
                <a-tag :color="sheet.status === 'valid' ? 'green' : 'red'" size="small">
                  {{ sheet.status === 'valid' ? 'Valid' : `${sheet.error_count} error(s)` }}
                </a-tag>
              </div>
            </template>

            <a-descriptions v-if="sheet.grant_header" :column="2" size="small" :bordered="false" class="grant-header-info">
              <a-descriptions-item label="Grant Name">{{ sheet.grant_header.name || '—' }}</a-descriptions-item>
              <a-descriptions-item label="Code">{{ sheet.grant_header.code || '—' }}</a-descriptions-item>
              <a-descriptions-item label="Organization">
                <a-tag v-if="sheet.grant_header.organization" :color="sheet.grant_header.organization === 'SMRU' ? '#2563eb' : '#16a34a'" size="small">
                  {{ sheet.grant_header.organization }}
                </a-tag>
                <span v-else>—</span>
              </a-descriptions-item>
              <a-descriptions-item label="End Date">{{ sheet.grant_header.end_date || '—' }}</a-descriptions-item>
            </a-descriptions>

            <!-- Sheet-level errors (e.g., duplicate grant detection) -->
            <div v-if="sheetErrors(sheet.sheet_name).length" class="sheet-errors">
              <div v-for="(err, i) in sheetErrors(sheet.sheet_name)" :key="i" class="sheet-error-item">
                <a-tag color="red" size="small">{{ err.field || 'Error' }}</a-tag>
                <span>{{ err.message }}</span>
                <span v-if="err.column" class="sheet-error-cell">Cell {{ err.column }}</span>
              </div>
            </div>

            <!-- Row-level preview table -->
            <ImportPreviewTable
              v-if="sheet.preview_rows?.length"
              :preview-rows="sheet.preview_rows"
              :columns="grantColumns"
              :valid-count="sheet.valid_count"
              :error-count="sheet.error_count"
              :warning-count="0"
            />
            <a-empty v-else-if="!sheetErrors(sheet.sheet_name).length" description="No items to preview" :image-style="{ height: '40px' }" />
          </a-collapse-panel>
        </a-collapse>

        <div class="preview-actions">
          <a-button @click="resetToIdle">
            <UploadOutlined /> Upload Different File
          </a-button>
          <a-button type="primary" :disabled="previewData.summary.valid_sheets === 0" @click="commit">
            Import {{ previewData.summary.valid_sheets }} Valid Sheet(s)
          </a-button>
        </div>
      </template>

      <ImportProgressBar v-if="isImporting" :active="true" step="import" :file-name="fileName" :file-size="fileSize" :elapsed="elapsed" />

      <ImportResultAlert v-if="isDone" :result="importResult" @close="clearResult" />
    </template>
  </a-card>
</template>

<script setup>
import { TrophyOutlined, DownloadOutlined, UploadOutlined, InboxOutlined } from '@ant-design/icons-vue'
import { useImportCard } from '@/composables/useImportCard'
import ImportProgressBar from '@/components/imports/ImportProgressBar.vue'
import ImportPreviewTable from '@/components/imports/ImportPreviewTable.vue'
import ImportResultAlert from '@/components/imports/ImportResultAlert.vue'

defineProps({
  canCreate: { type: Boolean, default: false },
})

const grantColumns = [
  { key: 'budget_line_code', title: 'Budget Line Code', width: 140 },
  { key: 'position', title: 'Position', width: 200 },
  { key: 'salary', title: 'Salary', width: 100 },
  { key: 'benefit', title: 'Benefit', width: 100 },
  { key: 'loe', title: 'LOE', width: 70 },
  { key: 'position_number', title: 'Pos #', width: 60 },
]

const {
  fileList, previewData, importResult, fileName, fileSize, elapsed, downloading,
  isIdle, isValidating, isPreview, isImporting, isDone,
  validate, commit, handleDownload, resetToIdle, clearResult,
} = useImportCard('grant', {
  templateSlug: 'grant-template',
  templateLabel: 'Grant Template',
  parseValidateResponse: (resp) => resp.data ?? resp,
  parseImportResponse(resp) {
    const d = resp.data ?? {}
    const grants = d.processed_grants ?? 0
    const items = d.processed_items ?? 0
    const errors = d.errors ?? []
    const skipped = d.skipped_grants ?? []
    const parts = []
    if (grants > 0) parts.push(`${grants} grant(s) and ${items} position(s) imported`)
    if (errors.length > 0) parts.push(`${errors.length} error(s)`)
    if (skipped.length > 0) parts.push(`${skipped.length} grant(s) skipped`)
    const hasIssues = errors.length > 0 || skipped.length > 0
    return {
      type: hasIssues ? 'warning' : 'success',
      message: hasIssues ? 'Import Completed with Issues' : 'Import Complete',
      description: parts.join(', ') + '.' || resp.message,
      errors: errors.slice(0, 10),
    }
  },
})

function sheetErrors(sheetName) {
  return (previewData.value?.errors || []).filter(e => e.sheet === sheetName)
}
</script>

<style scoped>
.grant-card { border-top: 3px solid #faad14; }
.preview-summary { display: flex; gap: 8px; margin-bottom: 12px; }
.sheet-collapse { margin-bottom: 16px; }
.sheet-header { display: flex; align-items: center; gap: 8px; }
.sheet-panel-valid { border-left: 3px solid var(--color-success, #16a34a); }
.sheet-panel-error { border-left: 3px solid var(--color-danger, #dc2626); }
.grant-header-info { margin-bottom: 12px; }
.sheet-errors { padding: 8px 0; }
.sheet-error-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
  font-size: var(--font-size-sm, 12px);
}
.sheet-error-cell {
  color: var(--color-text-muted, #9ca3af);
  font-family: 'JetBrains Mono', monospace;
  font-size: var(--font-size-xs, 11px);
}
</style>
