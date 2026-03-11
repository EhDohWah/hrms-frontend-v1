<template>
  <div class="page-container">
    <div class="import-grid">
      <template v-for="mod in visibleModules" :key="mod.key">
        <a-card class="import-card">
          <template #title>
            <div class="card-title">
              <component :is="mod.icon" class="card-icon" />
              <span>{{ mod.label }}</span>
            </div>
          </template>

          <p class="card-description">{{ mod.description }}</p>

          <!-- Download buttons -->
          <div class="download-section">
            <a-button @click="handleDownload(mod.template, mod.templateLabel)" :loading="downloading[mod.template]">
              <DownloadOutlined /> {{ mod.templateLabel || 'Download Template' }}
            </a-button>
            <a-button
              v-if="mod.referenceTemplate"
              @click="handleDownload(mod.referenceTemplate, mod.referenceLabel)"
              :loading="downloading[mod.referenceTemplate]"
            >
              <DownloadOutlined /> {{ mod.referenceLabel }}
            </a-button>
          </div>

          <!-- Upload area — only if user has edit permission -->
          <template v-if="authStore.canCreate(mod.editPermission)">
            <a-upload-dragger
              v-model:file-list="mod.fileList"
              :before-upload="() => false"
              :accept="ACCEPTED_TYPES"
              :max-count="1"
              class="upload-dragger"
            >
              <p class="ant-upload-drag-icon"><InboxOutlined /></p>
              <p class="ant-upload-text">Click or drag file to this area</p>
              <p class="ant-upload-hint">.xlsx, .xls, or .csv (max 10 MB)</p>
            </a-upload-dragger>

            <a-button
              type="primary"
              :loading="uploading[mod.key]"
              class="upload-btn"
              @click="handleUpload(mod)"
            >
              <UploadOutlined /> Upload
            </a-button>
          </template>

          <!-- Result summary -->
          <a-alert
            v-if="results[mod.key]"
            :type="results[mod.key].type"
            :message="results[mod.key].message"
            :description="results[mod.key].description"
            show-icon
            closable
            class="result-alert"
            @close="results[mod.key] = null"
          />
        </a-card>
      </template>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue'
import {
  DownloadOutlined,
  UploadOutlined,
  InboxOutlined,
  TrophyOutlined,
  TeamOutlined,
  FileTextOutlined,
  FundProjectionScreenOutlined,
  DollarOutlined,
} from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { uploadApi } from '@/api'
import { useNotification } from '@/composables/useNotification'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ACCEPTED_TYPES = '.xlsx,.xls,.csv'
const ACCEPTED_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
]

const authStore = useAuthStore()
const notify = useNotification()

const modules = reactive([
  {
    key: 'grant',
    label: 'Grants',
    icon: TrophyOutlined,
    description: 'Import grants data from a spreadsheet.',
    readPermission: 'grants_list',
    editPermission: 'grants_list',
    template: 'grant-template',
    referenceTemplate: null,
    referenceLabel: null,
    templateLabel: 'Download Template',
    async: false,
    fileList: [],
  },
  {
    key: 'employee',
    label: 'Employees',
    icon: TeamOutlined,
    description: 'Import employee records from a spreadsheet.',
    readPermission: 'employees',
    editPermission: 'employees',
    template: 'employee-template',
    referenceTemplate: null,
    referenceLabel: null,
    templateLabel: 'Download Template',
    async: false,
    fileList: [],
  },
  {
    key: 'employment',
    label: 'Employment Records',
    icon: FileTextOutlined,
    description: 'Import employment records from a spreadsheet.',
    readPermission: 'employment_records',
    editPermission: 'employment_records',
    template: 'employment-template',
    referenceTemplate: null,
    referenceLabel: null,
    templateLabel: 'Download Template',
    async: true,
    fileList: [],
  },
  {
    key: 'employee-funding-allocation',
    label: 'Funding Allocations',
    icon: FundProjectionScreenOutlined,
    description: 'Import employee funding allocations from a spreadsheet.',
    readPermission: 'employee_funding_allocations',
    editPermission: 'employee_funding_allocations',
    template: 'employee-funding-allocation-template',
    referenceTemplate: 'grant-items-reference',
    referenceLabel: 'Grant Items Reference',
    templateLabel: 'Download Template',
    async: true,
    fileList: [],
  },
  {
    key: 'payroll',
    label: 'Payroll',
    icon: DollarOutlined,
    description: 'Import payroll data from a spreadsheet.',
    readPermission: 'employee_salary',
    editPermission: 'employee_salary',
    template: 'payroll-template',
    referenceTemplate: 'employee-funding-allocations-reference',
    referenceLabel: 'Allocations Reference',
    templateLabel: 'Download Template',
    async: true,
    fileList: [],
  },
])

const visibleModules = computed(() =>
  modules.filter((mod) => authStore.canRead(mod.readPermission)),
)

const downloading = reactive({})
const uploading = reactive({})
const results = reactive({})

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

async function handleUpload(mod) {
  if (!mod.fileList.length) {
    notify.warning('Please select a file first')
    return
  }
  const fileEntry = mod.fileList[0]
  const file = fileEntry?.originFileObj || fileEntry

  if (!validateFile(file)) return

  uploading[mod.key] = true
  results[mod.key] = null

  try {
    const response = await uploadApi.upload(mod.key, file)
    const status = response.status

    if (status === 202 || mod.async) {
      results[mod.key] = {
        type: 'info',
        message: 'Import started',
        description: response.data?.message || 'Processing in the background. You will be notified when the import is complete.',
      }
    } else {
      const data = response.data
      const successCount = data?.success_count ?? data?.imported ?? null
      const errorCount = data?.error_count ?? data?.errors?.length ?? 0
      let description = data?.message || 'Import completed successfully.'
      if (successCount !== null) {
        description = `${successCount} record(s) imported successfully.`
        if (errorCount > 0) {
          description += ` ${errorCount} error(s) encountered.`
        }
      }
      results[mod.key] = {
        type: errorCount > 0 ? 'warning' : 'success',
        message: 'Import Complete',
        description,
      }
    }

    mod.fileList = []
    notify.success(`${mod.label} import submitted`)
  } catch (err) {
    const errData = err.response?.data
    let description = errData?.message || 'An error occurred during import.'
    if (errData?.errors) {
      const errorMessages = typeof errData.errors === 'object'
        ? Object.values(errData.errors).flat().slice(0, 5).join('; ')
        : String(errData.errors)
      if (errorMessages) description = errorMessages
    }
    results[mod.key] = {
      type: 'error',
      message: 'Import Failed',
      description,
    }
  } finally {
    uploading[mod.key] = false
  }
}
</script>

<style scoped>
.import-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
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

</style>
