import { ref, computed, onScopeDispose } from 'vue'
import { uploadApi } from '@/api'
import { useNotification } from './useNotification'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
]

/**
 * Default error parser for import error responses.
 * Handles both array and object error formats from the backend.
 */
function defaultParseImportError(errData) {
  let errorList = []
  if (errData?.errors) {
    const raw = errData.errors?.errors ?? errData.errors
    errorList = Array.isArray(raw) ? raw.slice(0, 10) : Object.values(raw).flat().slice(0, 10)
  }
  return {
    type: 'error',
    message: 'Import Failed',
    description: errData?.message || 'An error occurred during import.',
    errors: errorList,
  }
}

/**
 * Composable for import card state management.
 * Handles: file selection, validation preview, commit cycle, template download.
 *
 * @param {string} module - 'grant', 'employee', 'data-onboarding'
 * @param {object} options
 * @param {Function} options.parseValidateResponse - (responseData) => preview data object
 * @param {Function} options.parseImportResponse - (responseData) => ImportResultAlert-compatible result
 * @param {Function} [options.parseImportError] - (errResponseData) => ImportResultAlert-compatible result
 * @param {string} [options.templateSlug] - Template download slug (e.g. 'grant-template')
 * @param {string} [options.templateLabel] - Label for download notification (e.g. 'Grant Template')
 */
export function useImportCard(module, { parseValidateResponse, parseImportResponse, parseImportError, templateSlug, templateLabel }) {
  const notify = useNotification()

  const state = ref('idle') // 'idle' | 'validating' | 'preview' | 'importing' | 'done'
  const fileList = ref([])
  const previewData = ref(null)
  const importResult = ref(null)
  const elapsed = ref(0)
  const downloading = ref(false)
  let timer = null
  let validatedFile = null // cached File reference from validate step

  const fileName = ref('')
  const fileSize = ref(0)

  const isIdle = computed(() => state.value === 'idle')
  const isValidating = computed(() => state.value === 'validating')
  const isPreview = computed(() => state.value === 'preview')
  const isImporting = computed(() => state.value === 'importing')
  const isDone = computed(() => state.value === 'done')

  const errorParser = parseImportError || defaultParseImportError

  function extractFile() {
    const list = Array.isArray(fileList.value) ? fileList.value : []
    if (!list.length) {
      notify.warning('Please select a file first')
      return null
    }
    const file = list[0]?.originFileObj || list[0]
    if (!ACCEPTED_MIMES.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      notify.error('Only .xlsx, .xls, or .csv files are allowed')
      return null
    }
    if (file.size > MAX_FILE_SIZE) {
      notify.error('File size must not exceed 10 MB')
      return null
    }
    return file
  }

  function startTimer() {
    elapsed.value = 0
    timer = setInterval(() => elapsed.value++, 1000)
  }

  function stopTimer() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  // Auto-cleanup timer when the composable's scope is disposed
  onScopeDispose(() => stopTimer())

  async function validate() {
    const file = extractFile()
    if (!file) return

    validatedFile = file
    fileName.value = file.name
    fileSize.value = file.size
    state.value = 'validating'
    startTimer()

    try {
      const response = await uploadApi.validate(module, file)
      previewData.value = parseValidateResponse(response.data)
      state.value = 'preview'
    } catch (err) {
      const errData = err.response?.data
      notify.error(errData?.message || 'Validation failed')
      validatedFile = null
      state.value = 'idle'
    } finally {
      stopTimer()
    }
  }

  async function commit() {
    const file = validatedFile || extractFile()
    if (!file) return

    state.value = 'importing'
    startTimer()

    try {
      const response = await uploadApi.upload(module, file)
      importResult.value = parseImportResponse(response.data)
      fileList.value = []
      validatedFile = null
      state.value = 'done'
      notify.success('Import completed successfully')
    } catch (err) {
      const errData = err.response?.data
      importResult.value = errorParser(errData)
      state.value = 'done'
    } finally {
      stopTimer()
    }
  }

  async function handleDownload() {
    if (!templateSlug) return
    downloading.value = true
    try {
      const response = await uploadApi.downloadTemplate(templateSlug)
      const disposition = response.headers['content-disposition']
      let filename = `${templateSlug}.xlsx`
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
      notify.success(`${templateLabel || 'Template'} downloaded`)
    } catch {
      notify.error('Failed to download template')
    } finally {
      downloading.value = false
    }
  }

  function resetToIdle() {
    state.value = 'idle'
    previewData.value = null
    importResult.value = null
    fileList.value = []
    validatedFile = null
    stopTimer()
  }

  function clearResult() {
    importResult.value = null
    state.value = 'idle'
  }

  return {
    state,
    fileList,
    previewData,
    importResult,
    fileName,
    fileSize,
    elapsed,
    downloading,
    isIdle,
    isValidating,
    isPreview,
    isImporting,
    isDone,
    validate,
    commit,
    handleDownload,
    resetToIdle,
    clearResult,
  }
}
