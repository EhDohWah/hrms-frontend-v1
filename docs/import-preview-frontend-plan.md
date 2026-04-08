# Import Preview Frontend — Implementation Plan

> Pre-implementation analysis and component design  
> Date: 2026-04-08  
> Scope: Grant Import, Employee Import, Data Onboarding — preview tables, progress, history

---

## 1. Existing Patterns to Follow

Everything below is derived from reading the actual codebase — not invented.

### Design System (from `src/styles/global.less` + `src/App.vue`)
- **Colors**: Navy primary `#002147`, blue accent `#2563eb`, warm grays
- **Status**: Success `#16a34a` / bg `#f0fdf4`, Danger `#dc2626` / bg `#fef2f2`, Warning `#d97706` / bg `#fffbeb`
- **Font**: DM Sans body, Source Serif 4 display, JetBrains Mono mono
- **Radius**: 6-8px standard, 12-16px modals
- **Shadows**: `--shadow-card` for cards, `--shadow-md` for elevation
- **Spacing**: 4px baseline scale (xs=4, sm=8, md=12, lg=16, xl=20, 2xl=24)

### Component Conventions
- **Scoped CSS** with CSS variables from `global.less`
- **BEM-ish naming**: `.import-card`, `.card-title`, `.card-icon`
- **Tables**: Ant Design `a-table` inside `a-card :body-style="{ padding: 0 }"`, `size="middle"`, `:scroll="{ x: 'max-content' }"`
- **Status badges**: `<a-tag :color="color">Label</a-tag>`
- **Modals**: `width="min(95vw, 520px)"`, `destroy-on-close`, vertical form layout
- **Responsive grids**: CSS Grid, 1 col mobile → 2 col at 768px
- **Loading**: Ant Design `:loading` prop on buttons/tables
- **Notifications**: `useNotification()` composable → `notify.success()` / `notify.error()`
- **Permissions**: `authStore.canRead()` / `authStore.canCreate()` for visibility gating

### File Organization
- **Views** in `src/views/{feature}/` — page-level components
- **Sub-components** colocated: `src/views/{feature}/components/`
- **Shared components** in `src/components/common/`
- **API modules** in `src/api/` — one per backend resource
- **Composables** in `src/composables/` — reusable logic hooks

---

## 2. New File Plan

```
src/
├── api/
│   └── uploadApi.js                          ← MODIFY (add validate method)
│
├── components/
│   └── imports/                              ← NEW DIRECTORY
│       ├── ImportPreviewTable.vue            ← Shared preview table (all 3 cards)
│       ├── ImportProgressBar.vue             ← Indeterminate progress + elapsed time
│       ├── ImportResultAlert.vue             ← Extracted from DataImportView inline def
│       └── ImportHistoryList.vue             ← Recent imports per module
│
├── views/
│   └── uploads/
│       ├── DataImportView.vue               ← MODIFY (use extracted card components)
│       └── components/                       ← NEW DIRECTORY
│           ├── GrantImportCard.vue           ← Grant card with preview state
│           ├── EmployeeImportCard.vue        ← Employee card with preview state
│           └── OnboardingImportCard.vue      ← Onboarding card with preview state
```

**Why this structure?**
- `components/imports/` for **shared** components reused across all 3 cards (follows `components/common/` pattern)
- `views/uploads/components/` for **page-specific** sub-components (follows `views/employees/components/` pattern)
- Keeps `DataImportView.vue` as the layout shell (grid, permissions), delegates card logic to children

---

## 3. Component Designs

### 3.1 `ImportPreviewTable.vue` — Shared Preview Table

**Purpose**: Reusable table showing row-by-row validation results with error highlighting. Used by all 3 import cards.

**Props:**
```js
const props = defineProps({
  previewRows: { type: Array, required: true },
  // Each row: { row, status, key_fields: {}, errors: [], warnings: [] }
  
  columns: { type: Array, required: true },
  // Each: { key: 'staff_id', title: 'Staff ID', width: 120 }
  // Maps into key_fields keys
  
  validCount: { type: Number, default: 0 },
  errorCount: { type: Number, default: 0 },
  warningCount: { type: Number, default: 0 },
})
```

**Template structure:**
```
┌─────────────────────────────────────────────────┐
│  ✓ 186 valid   ✗ 14 errors   ⚠ 3 warnings      │  ← Summary stats bar
│  [All] [Errors Only] [Valid Only]                │  ← Filter segmented control
├─────────────────────────────────────────────────┤
│ Row  │ Org  │ Staff ID │ Name       │ Status     │  ← a-table
│──────│──────│──────────│────────────│────────────│
│  3   │ SMRU │ 0062     │ John Doe   │ ✓ Valid    │  ← default row
│  4   │ SMRU │ 0063     │ Jane Smith │ ✗ Error    │  ← red bg #fef2f2
│  ▼ Expand: Staff ID — Already exists in SMRU     │  ← expandable error detail
│  5   │ BHF  │ 0001     │ Bob Lee    │ ✓ Valid    │
└─────────────────────────────────────────────────┘
  Showing 1-20 of 200                        < 1 2 3 >   ← client-side pagination
```

**Key implementation details:**

- **Summary bar**: Three `a-tag` badges — green for valid, red for errors, orange for warnings
- **Filter**: `a-segmented` (Ant Design segmented control) with options: All / Errors / Valid
- **Table**: `a-table` with client-side data (no API pagination — all rows in memory)
  - `size="small"` (compact for preview)
  - `:pagination="{ pageSize: 20, showSizeChanger: true, showTotal }"` (client-side)
  - `:row-class-name="(record) => record.status === 'error' ? 'preview-row-error' : ''"`
- **Status column**: `<a-tag color="green">Valid</a-tag>` or `<a-tag color="red">Error</a-tag>`
- **Expandable rows**: `expandedRowRender` slot showing error list:
  ```vue
  <template #expandedRowRender="{ record }">
    <div v-for="err in record.errors" class="preview-error-item">
      <a-tag color="red" size="small">{{ err.field }}</a-tag>
      <span>{{ err.message }}</span>
      <span v-if="err.column" class="preview-error-cell">Cell {{ err.column }}{{ record.row }}</span>
    </div>
  </template>
  ```
- **Auto-expand error rows**: `defaultExpandedRowKeys` includes all rows with status === 'error'

**Scoped CSS:**
```css
.preview-row-error { background: var(--color-danger-bg) !important; }
.preview-row-error:hover td { background: #fde8e8 !important; }

.preview-stats { display: flex; gap: 12px; margin-bottom: 12px; align-items: center; }
.preview-filter { margin-left: auto; }

.preview-error-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: var(--font-size-sm);
}
.preview-error-cell {
  color: var(--color-text-muted);
  font-family: 'JetBrains Mono', monospace;
  font-size: var(--font-size-xs);
}
```

---

### 3.2 `ImportProgressBar.vue` — Progress Indicator

**Purpose**: Indeterminate progress bar with step indicator and elapsed time. Replaces the button spinner during validation and import.

**Props:**
```js
const props = defineProps({
  active: { type: Boolean, default: false },
  step: { type: String, default: 'validate' },  // 'validate' | 'import'
  fileName: { type: String, default: '' },
  fileSize: { type: Number, default: 0 },        // bytes
})
```

**Template:**
```
┌──────────────────────────────────────────────────┐
│  ① Validate ─────────── ② Import                 │  ← a-steps size="small"
│  ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░     │  ← a-progress status="active"
│  Validating employees.xlsx (2.3 MB) — 5s          │  ← meta line
└──────────────────────────────────────────────────┘
```

**Implementation:**
- `a-steps :current="step === 'validate' ? 0 : 1" size="small"`
- `a-progress :percent="99.9" status="active" :show-info="false"` (indeterminate look — Ant's `active` status animates the stripe)
- Elapsed timer: `setInterval` every 1s, `clearInterval` on `watch(active)` going false
- File size formatted with `(size / 1024 / 1024).toFixed(1) + ' MB'`

---

### 3.3 `ImportResultAlert.vue` — Extracted Alert

**Purpose**: Extract the inline `ImportResultAlert` component definition from `DataImportView.vue` into a proper SFC. Same behavior, just a real file.

**Props:** Same as current inline definition:
```js
const props = defineProps({
  result: { type: Object, default: null },
})
const emit = defineEmits(['close'])
```

No functional changes — this is a pure extraction for maintainability.

---

### 3.4 `ImportHistoryList.vue` — Recent Import History

**Purpose**: Compact list of the last 5 imports for a given module, shown below each import card.

**Props:**
```js
const props = defineProps({
  module: { type: String, required: true },  // 'grant', 'employee', 'data-onboarding'
})
```

**Template:**
```
┌──────────────────────────────────────────────────┐
│  ▾ Recent Imports                                 │  ← collapsible header
│                                                   │
│  📄 employees.xlsx          2 hours ago           │
│     186 imported, 0 errors           — Admin      │
│                                                   │
│  📄 employees_batch2.xlsx   Yesterday             │
│     42 imported, 3 errors            — HR Staff   │
└──────────────────────────────────────────────────┘
```

**Implementation:**
- `a-collapse ghost` with single panel, default closed
- Fetches `GET /api/v1/import-history?module={module}` on mount
- Each item: filename, relative time (dayjs `fromNow()`), result summary, user name
- Status dot: green for success, red for failed, orange for partial
- Lightweight — no table, just a styled list

---

### 3.5 `GrantImportCard.vue` — Grant Card with Preview

**Purpose**: Encapsulates the grant import card with the full state machine: idle → validating → preview → importing → done.

**Props:**
```js
const props = defineProps({
  canCreate: { type: Boolean, default: false },
})
```

**State Machine:**
```
  idle ──(click Validate)──→ validating ──(response)──→ preview
    ↑                                                      │
    └──────────(Upload Different File)─────────────────────┘
                                                           │
                                              (click Import)
                                                           ↓
                                                      importing ──→ done
                                                                     │
                                                          (auto-reset after 3s or close)
                                                                     ↓
                                                                   idle
```

**Template by state:**

**`idle`**: Current upload UI (dragger + button) — unchanged from today
```vue
<a-upload-dragger v-model:file-list="fileList" ...>
<a-button type="primary" @click="handleValidate">
  <UploadOutlined /> Validate & Preview
</a-button>
```

Note: Button text changes from "Upload" to **"Validate & Preview"** — this is the key UX shift. The user understands they're previewing, not committing.

**`validating`**: Progress bar replaces dragger
```vue
<ImportProgressBar :active="true" step="validate" :file-name="fileName" :file-size="fileSize" />
```

**`preview`**: Sheet accordion + preview tables
```vue
<!-- Summary -->
<div class="preview-summary">
  <a-tag color="green">{{ validSheets }} valid sheet(s)</a-tag>
  <a-tag v-if="errorSheets" color="red">{{ errorSheets }} with errors</a-tag>
</div>

<!-- Per-sheet panels -->
<a-collapse v-model:activeKey="expandedSheets" :bordered="false">
  <a-collapse-panel v-for="sheet in sheets" :key="sheet.sheet_name">
    <template #header>
      <div class="sheet-header">
        <span>{{ sheet.sheet_name }}</span>
        <a-tag :color="sheet.status === 'valid' ? 'green' : 'red'" size="small">
          {{ sheet.status === 'valid' ? 'Valid' : `${sheet.error_count} error(s)` }}
        </a-tag>
      </div>
    </template>

    <!-- Grant header info -->
    <a-descriptions :column="2" size="small" :bordered="false">
      <a-descriptions-item label="Grant Name">{{ sheet.grant_header.name }}</a-descriptions-item>
      <a-descriptions-item label="Code">{{ sheet.grant_header.code }}</a-descriptions-item>
      <a-descriptions-item label="Organization">
        <a-tag :color="sheet.grant_header.organization === 'SMRU' ? '#2563eb' : '#16a34a'" size="small">
          {{ sheet.grant_header.organization }}
        </a-tag>
      </a-descriptions-item>
      <a-descriptions-item label="End Date">{{ sheet.grant_header.end_date || '—' }}</a-descriptions-item>
    </a-descriptions>

    <!-- Item preview table -->
    <ImportPreviewTable
      :preview-rows="sheet.preview_rows"
      :columns="grantColumns"
      :valid-count="sheet.valid_count"
      :error-count="sheet.error_count"
      :warning-count="0"
    />
  </a-collapse-panel>
</a-collapse>

<!-- Action buttons -->
<div class="preview-actions">
  <a-button @click="resetToIdle">
    <UploadOutlined /> Upload Different File
  </a-button>
  <a-button type="primary" :disabled="validSheets === 0" @click="handleImport">
    Import {{ validSheets }} Valid Sheet(s)
  </a-button>
</div>
```

**`importing`**: Progress bar with step="import"

**`done`**: `ImportResultAlert` with commit results (same as current)

**Grant-specific column config:**
```js
const grantColumns = [
  { key: 'budget_line_code', title: 'Budget Line Code', width: 140 },
  { key: 'position', title: 'Position', width: 200 },
  { key: 'salary', title: 'Salary', width: 120 },
  { key: 'benefit', title: 'Benefit', width: 120 },
  { key: 'loe', title: 'LOE', width: 80 },
  { key: 'position_number', title: 'Pos #', width: 70 },
]
```

---

### 3.6 `EmployeeImportCard.vue` — Employee Card with Preview

Same state machine as Grant, but simpler (no sheet accordion — single flat table).

**Preview state shows:**
```vue
<ImportPreviewTable
  :preview-rows="previewRows"
  :columns="employeeColumns"
  :valid-count="validCount"
  :error-count="errorCount"
  :warning-count="warningCount"
/>

<!-- Action buttons -->
<div class="preview-actions">
  <a-button @click="resetToIdle">
    <UploadOutlined /> Upload Different File
  </a-button>
  <a-button
    type="primary"
    :disabled="errorCount > 0"
    @click="handleImport"
  >
    Import {{ validCount }} Employee(s)
  </a-button>
</div>

<!-- All-or-nothing message when errors exist -->
<a-alert
  v-if="errorCount > 0"
  type="info"
  show-icon
  class="preview-info-alert"
  message="All rows must pass validation before importing"
  description="Fix the highlighted errors in your Excel file and upload again. Employee import requires all rows to be valid."
/>
```

**Employee-specific column config:**
```js
const employeeColumns = [
  { key: 'organization', title: 'Org', width: 70 },
  { key: 'staff_id', title: 'Staff ID', width: 100 },
  { key: 'name', title: 'Name', width: 200 },
  { key: 'gender', title: 'Gender', width: 70 },
  { key: 'status', title: 'Status', width: 150 },
]
```

---

### 3.7 `OnboardingImportCard.vue` — Data Onboarding Card with Preview

Same pattern as Employee. Key fields for preview:

```js
const onboardingColumns = [
  { key: 'organization', title: 'Org', width: 70 },
  { key: 'staff_id', title: 'Staff ID', width: 100 },
  { key: 'name', title: 'Name', width: 200 },
  { key: 'status', title: 'Status', width: 150 },
]
```

Same all-or-nothing behavior as Employee Import.

---

### 3.8 Updated `DataImportView.vue` — Simplified Shell

The page becomes a thin layout wrapper:

```vue
<template>
  <div class="page-container">
    <div class="import-grid">
      <GrantImportCard
        v-if="authStore.canRead('grants')"
        :can-create="authStore.canCreate('grants')"
      />
      <EmployeeImportCard
        v-if="authStore.canRead('employees')"
        :can-create="authStore.canCreate('employees')"
      />
      <OnboardingImportCard
        v-if="authStore.canRead('employees')"
        :can-create="authStore.canCreate('employees')"
      />
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
import GrantImportCard from './components/GrantImportCard.vue'
import EmployeeImportCard from './components/EmployeeImportCard.vue'
import OnboardingImportCard from './components/OnboardingImportCard.vue'

const authStore = useAuthStore()
</script>

<style scoped>
.import-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}
@media (min-width: 768px) {
  .import-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
```

All the upload logic, file validation, state management, and result handling moves into the individual card components.

---

## 4. API Layer Changes

### `src/api/uploadApi.js` — Add validate method

```js
export const uploadApi = {
  // Existing
  upload: (module, file) => { ... },
  downloadTemplate: (template) => { ... },

  // NEW: validate-only mode
  validate: (module, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return client.post(`/uploads/${module}?mode=validate`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    })
  },

  // NEW: import history
  importHistory: (module) =>
    client.get('/import-history', { params: { module } }),
}
```

---

## 5. Shared Logic: `useImportCard` Composable

To avoid duplicating the state machine in all 3 card components, extract common logic:

**File**: `src/composables/useImportCard.js`

```js
import { ref, reactive, computed } from 'vue'
import { uploadApi } from '@/api'
import { useNotification } from './useNotification'

/**
 * Composable for import card state management.
 * Handles: file selection, validation, preview, commit cycle.
 *
 * @param {string} module - 'grant', 'employee', 'data-onboarding'
 * @param {object} options
 * @param {Function} options.parseValidateResponse - Extract preview data from validate response
 * @param {Function} options.parseImportResponse - Extract result from import response
 */
export function useImportCard(module, { parseValidateResponse, parseImportResponse }) {
  const notify = useNotification()

  // State
  const state = ref('idle')  // 'idle' | 'validating' | 'preview' | 'importing' | 'done'
  const fileList = ref([])
  const previewData = ref(null)
  const importResult = ref(null)
  const elapsed = ref(0)
  let timer = null

  // File info (captured at validate time for display during progress)
  const fileName = ref('')
  const fileSize = ref(0)

  // Derived
  const isIdle = computed(() => state.value === 'idle')
  const isValidating = computed(() => state.value === 'validating')
  const isPreview = computed(() => state.value === 'preview')
  const isImporting = computed(() => state.value === 'importing')
  const isDone = computed(() => state.value === 'done')

  // File helpers (same as current DataImportView)
  const MAX_FILE_SIZE = 10 * 1024 * 1024
  const ACCEPTED_MIMES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
  ]

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
    if (timer) { clearInterval(timer); timer = null }
  }

  // Actions
  async function validate() {
    const file = extractFile()
    if (!file) return

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
      state.value = 'idle'
    } finally {
      stopTimer()
    }
  }

  async function commit() {
    const file = extractFile()
    if (!file) return

    state.value = 'importing'
    startTimer()

    try {
      const response = await uploadApi.upload(module, file)
      importResult.value = parseImportResponse(response.data)
      fileList.value = []
      state.value = 'done'
      notify.success('Import completed successfully')
    } catch (err) {
      const errData = err.response?.data
      importResult.value = {
        type: 'error',
        message: 'Import Failed',
        description: errData?.message || 'An error occurred during import.',
        errors: extractErrorList(errData),
      }
      state.value = 'done'
    } finally {
      stopTimer()
    }
  }

  function resetToIdle() {
    state.value = 'idle'
    previewData.value = null
    importResult.value = null
    fileList.value = []
    stopTimer()
  }

  function clearResult() {
    importResult.value = null
    state.value = 'idle'
  }

  return {
    // State
    state, fileList, previewData, importResult,
    fileName, fileSize, elapsed,
    // Computed
    isIdle, isValidating, isPreview, isImporting, isDone,
    // Actions
    validate, commit, resetToIdle, clearResult,
  }
}

function extractErrorList(errData) {
  if (!errData?.errors) return []
  return Array.isArray(errData.errors)
    ? errData.errors.slice(0, 10)
    : Object.values(errData.errors).flat().slice(0, 10)
}
```

Each card component then uses:
```js
const {
  state, fileList, previewData, importResult,
  fileName, fileSize, elapsed,
  isIdle, isValidating, isPreview, isImporting, isDone,
  validate, commit, resetToIdle, clearResult,
} = useImportCard('grant', {
  parseValidateResponse: (data) => { /* grant-specific parsing */ },
  parseImportResponse: (data) => { /* grant-specific result formatting */ },
})
```

---

## 6. Visual Design Details

### Color Coding for Row Status

| Status | Row Background | Tag Color | Tag Text |
|--------|---------------|-----------|----------|
| Valid | default (white) | `green` | Valid |
| Error | `#fef2f2` (danger-bg) | `red` | Error |
| Warning | `#fffbeb` (warning-bg) | `orange` | Warning |

### Preview Card Transition

When switching from `idle` → `preview`, the upload dragger smoothly collapses and the preview table expands. Use `a-collapse-transition` or CSS `max-height` transition for this.

### Button Label Changes

| State | Primary Button | Secondary Button |
|-------|---------------|-----------------|
| idle | "Validate & Preview" | — |
| preview (no errors) | "Import N Row(s)" | "Upload Different File" |
| preview (has errors) | "Import N Row(s)" (disabled) | "Upload Different File" |
| importing | "Importing..." (loading) | — |
| done | — | — (shows ImportResultAlert) |

### Grant Sheet Panel Styling

Each sheet panel has a left border color based on status:
```css
.sheet-panel-valid { border-left: 3px solid var(--color-success); }
.sheet-panel-error { border-left: 3px solid var(--color-danger); }
```

Grant header info uses `a-descriptions` (Ant Design description list) — compact, 2-column, matching the existing admin detail views.

### Organization Tag Colors (consistent with rest of app)
- SMRU: `#2563eb` (blue)
- BHF: `#16a34a` (green)

---

## 7. Responsive Behavior

### Mobile (< 768px)
- Import grid: single column
- Preview table: horizontal scroll (`x: 'max-content'`)
- Action buttons: stack vertically, full width
- Sheet accordion: full width panels
- Progress bar: full width

### Desktop (768px+)
- Import grid: 2 columns
- Preview table: fits within card width
- Action buttons: inline right-aligned (`display: flex; justify-content: flex-end; gap: 8px`)

---

## 8. Implementation Sequence

| Step | Files | What |
|------|-------|------|
| 1 | `ImportResultAlert.vue` | Extract from inline def (zero behavior change) |
| 2 | `ImportProgressBar.vue` | Build progress component |
| 3 | `ImportPreviewTable.vue` | Build shared preview table |
| 4 | `useImportCard.js` | Build shared composable |
| 5 | `uploadApi.js` | Add `validate()` and `importHistory()` methods |
| 6 | `GrantImportCard.vue` | Build grant card with sheet accordion |
| 7 | `DataImportView.vue` | Swap grant card inline → GrantImportCard component |
| 8 | `EmployeeImportCard.vue` | Build employee card |
| 9 | `DataImportView.vue` | Swap employee card inline → EmployeeImportCard |
| 10 | `OnboardingImportCard.vue` | Build onboarding card |
| 11 | `DataImportView.vue` | Swap onboarding inline → OnboardingImportCard, simplify to shell |
| 12 | `ImportHistoryList.vue` | Build history component, add to each card |

Each step is independently testable. Steps 1-5 build the shared foundation. Steps 6-11 wire each card one at a time (Grant first, then Employee, then Onboarding — matching backend implementation order). Step 12 is last because it depends on the backend `import_histories` table.

---

## 9. What NOT to Build

- **No dark mode** — app doesn't have it, don't add it
- **No cell-level editing** in preview table — users fix in Excel, not in browser
- **No drag-to-reorder** columns in preview — unnecessary complexity
- **No WebSocket progress** — imports are synchronous, indeterminate bar is sufficient
- **No virtual scrolling** — typical imports are <200 rows, `a-table` pagination handles this fine
- **No new Pinia store** — card state lives in composable + component local state
