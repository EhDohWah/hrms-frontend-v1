# Employee Identification UI — Frontend Implementation Plan

## Context

The backend has been updated to normalize identification data from flat columns on the `employees` table into a new `employee_identifications` table with a one-to-many relationship. Each employee can now have multiple identification documents, with one marked as **primary**.

The backend API is **backward-compatible** — the employee detail response still includes the flat `identification_type`, `identification_number`, `identification_issue_date`, `identification_expiry_date` fields (sourced from the primary identification). It also exposes new structured fields: `primary_identification` and `identifications`.

### New Backend API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/employee-identifications?employee_id=X` | GET | List all identifications for an employee |
| `/employee-identifications` | POST | Create a new identification |
| `/employee-identifications/{id}` | PUT | Update an identification |
| `/employee-identifications/{id}` | DELETE | Delete an identification |
| `/employee-identifications/{id}/set-primary` | PATCH | Set as primary (syncs names to employee) |

### API Response Shape (each identification)

```json
{
  "id": 1,
  "employee_id": 5,
  "identification_type": "Passport",
  "identification_number": "P123456789",
  "identification_issue_date": "2020-01-15",
  "identification_expiry_date": "2030-01-15",
  "first_name_en": "John",
  "last_name_en": "Doe",
  "first_name_th": null,
  "last_name_th": null,
  "initial_en": null,
  "initial_th": null,
  "is_primary": true,
  "created_by": "admin",
  "updated_by": "admin",
  "created_at": "2026-03-10T10:30:00Z",
  "updated_at": "2026-03-10T10:30:00Z"
}
```

### Validation Rules

| Field | Store (POST) | Update (PUT) |
|-------|-------------|--------------|
| `employee_id` | required, exists | — |
| `identification_type` | required, enum | sometimes |
| `identification_number` | required, max 50 | sometimes, max 50 |
| `identification_issue_date` | nullable, date, before_or_equal:today | nullable, date |
| `identification_expiry_date` | nullable, date, after:issue_date | nullable, date |
| `first_name_en` | nullable, max 255 | nullable, max 255 |
| `last_name_en` | nullable, max 255 | nullable, max 255 |
| `first_name_th` | nullable, max 255 | nullable, max 255 |
| `last_name_th` | nullable, max 255 | nullable, max 255 |
| `initial_en` | nullable, max 10 | nullable, max 10 |
| `initial_th` | nullable, max 10 | nullable, max 10 |
| `is_primary` | nullable, boolean | **not accepted** (use set-primary endpoint) |

### Key Business Rules

1. **Auto-primary**: First identification for an employee is automatically marked primary
2. **Name sync**: When a primary identification is set/updated, its name fields sync to the `employees` table
3. **Delete protection**: Cannot delete the only identification — returns 422
4. **Auto-promote**: Deleting the primary auto-promotes the next identification
5. **Identification types**: `ThaiID`, `Passport`, `BurmeseID`, `10YearsID`, `CI`, `Borderpass`, `Other`

---

## Current State (Frontend)

### File: `src/views/employees/tabs/IdentificationTab.vue`

Currently a **form tab** (Group 1) — part of the main employee form that saves via the top "Save" button. It renders 4 flat identification fields (`identification_type`, `identification_number`, `identification_issue_date`, `identification_expiry_date`) plus 3 tax/license fields (`social_security_number`, `tax_number`, `driver_license_number`) directly bound to the parent `form` object.

### File: `src/views/employees/EmployeeFormView.vue`

The `IdentificationTab` is a Group 1 form tab — its data saves alongside all other form tabs (BasicInfo, Contact, Financial) via `employeeApi.update()`. The identification fields are part of `defaultFormValues` and the reactive `form` object.

### File: `src/api/employeeApi.js`

No identification-specific API calls exist. All identification data flows through `employeeApi.store()` and `employeeApi.update()`.

---

## Design Decision: Convert to a Hybrid Tab

The Identification tab will become a **hybrid tab** — split into two distinct sections:

### Section 1: Identification Documents (Live — modal-based CRUD)
- Table listing all identification records for the employee
- Add/Edit/Delete via modals, each action saves immediately via dedicated API
- "Set as Primary" button per row
- Primary identification highlighted with a tag
- Follows the `RecordsTab.vue` pattern (table + modals + per-action save)

### Section 2: Tax & License (Form — top Save button)
- `social_security_number`, `tax_number`, `driver_license_number`
- These fields remain on the `employees` table — they are NOT part of the identification normalization
- Continue binding to the parent `form` object, saved via the top "Save" button

### Why Hybrid?

- Tax/license fields stay on the employee model — no reason to change their save behavior
- Identification documents now have their own CRUD lifecycle — they need modal-based immediate saves
- The "Not Saved" indicator and dirty tracking should only apply to the Tax & License section
- This matches the UX philosophy already established: form tabs for flat employee fields, live behavior for sub-resources

---

## Implementation Plan

### Phase 1 — API Layer (1 file)

#### Step 1.1: Create `src/api/employeeIdentificationApi.js`

```js
import client from './axios'

export const employeeIdentificationApi = {
  list: (params) => client.get('/employee-identifications', { params }),
  show: (id) => client.get(`/employee-identifications/${id}`),
  store: (payload) => client.post('/employee-identifications', payload),
  update: (id, payload) => client.put(`/employee-identifications/${id}`, payload),
  destroy: (id) => client.delete(`/employee-identifications/${id}`),
  setPrimary: (id) => client.patch(`/employee-identifications/${id}/set-primary`),
}
```

#### Step 1.2: Register in `src/api/index.js`

Add to barrel export:

```js
export { employeeIdentificationApi } from './employeeIdentificationApi'
```

---

### Phase 2 — Rewrite IdentificationTab (1 file)

#### Step 2.1: Rewrite `src/views/employees/tabs/IdentificationTab.vue`

The tab currently accepts `form` and `readonly` props. After the rewrite:

**Props:**
- `form` — still used for Tax & License fields (bound to parent form object)
- `readonly` — still used for Tax & License read-only display
- `employee` — **new prop**, the full employee object (needed for `employee.id` and `employee.identifications`)
- `isEditMode` — **new prop**, boolean to control whether identification CRUD is available

**Template structure:**

```vue
<template>
  <div>
    <!-- ============ Section 1: Identification Documents (Live) ============ -->
    <template v-if="isEditMode">
      <div class="section-header">
        <div class="section-title" style="margin: 0; border: none; padding: 0;">
          Identification Documents
        </div>
        <a-button v-if="canCreate" size="small" @click="openModal()">
          <PlusOutlined /> Add
        </a-button>
      </div>

      <a-table
        v-if="identifications.length"
        :columns="columns"
        :data-source="identifications"
        :row-key="(r) => r.id"
        :pagination="false"
        size="small"
        :row-class-name="(record) => record.is_primary ? 'primary-row' : ''"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'identification_type'">
            {{ idTypeLabel(record.identification_type) }}
            <a-tag v-if="record.is_primary" color="blue" size="small" style="margin-left: 6px;">
              Primary
            </a-tag>
          </template>
          <template v-else-if="column.key === 'name'">
            {{ [record.first_name_en, record.last_name_en].filter(Boolean).join(' ') || '—' }}
          </template>
          <template v-else-if="column.key === 'identification_issue_date'">
            {{ formatDate(record.identification_issue_date) }}
          </template>
          <template v-else-if="column.key === 'identification_expiry_date'">
            {{ formatDate(record.identification_expiry_date) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-tooltip v-if="canUpdate && !record.is_primary" title="Set as primary">
                <a-button type="link" size="small" @click="handleSetPrimary(record)">
                  <StarOutlined />
                </a-button>
              </a-tooltip>
              <a-button v-if="canUpdate" type="link" size="small" @click="openModal(record)">
                <EditOutlined />
              </a-button>
              <a-button v-if="canDelete" type="link" size="small" danger @click="confirmDelete(record)">
                <DeleteOutlined />
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
      <a-empty v-else description="No identification documents" />
    </template>

    <!-- Readonly: show primary identification only (for users without edit permission) -->
    <template v-else-if="readonly">
      <div class="section-title">Identification</div>
      <div class="info-grid">
        <InfoField label="ID Type" :value="idTypeLabel(form.identification_type)" />
        <InfoField label="ID Number" :value="form.identification_number" mono />
        <InfoField label="Issue Date" :value="formatDate(form.identification_issue_date)" />
        <InfoField label="Expiry Date" :value="formatDate(form.identification_expiry_date)" />
      </div>
    </template>

    <!-- Create mode (new employee) — inline form fields like before -->
    <template v-else>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Identification Type">
            <a-select v-model:value="form.identification_type" placeholder="Select ID type" allow-clear>
              <a-select-option v-for="opt in idTypeOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Identification Number" :required="!!form.identification_type">
            <a-input v-model:value="form.identification_number" placeholder="ID number" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Issue Date">
            <a-date-picker
              v-model:value="form.identification_issue_date"
              style="width: 100%"
              format="DD/MM/YYYY"
              value-format="YYYY-MM-DD"
              placeholder="DD/MM/YYYY"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Expiry Date">
            <a-date-picker
              v-model:value="form.identification_expiry_date"
              style="width: 100%"
              format="DD/MM/YYYY"
              value-format="YYYY-MM-DD"
              placeholder="DD/MM/YYYY"
            />
          </a-form-item>
        </a-col>
      </a-row>
    </template>

    <!-- Divider between sections -->
    <a-divider v-if="isEditMode" style="margin: 24px 0 16px;" />

    <!-- ============ Section 2: Tax & License (Form Save) ============ -->
    <template v-if="!readonly">
      <div class="section-title" :style="isEditMode ? '' : 'margin-top: 24px;'">
        Tax & License
      </div>
      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="Social Security No.">
            <a-input v-model:value="form.social_security_number" placeholder="SSN" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Tax Number">
            <a-input v-model:value="form.tax_number" placeholder="Tax ID" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Driver License No.">
            <a-input v-model:value="form.driver_license_number" placeholder="License number" />
          </a-form-item>
        </a-col>
      </a-row>
    </template>
    <template v-else>
      <div class="section-title">Tax & License</div>
      <div class="info-grid">
        <InfoField label="Social Security No." :value="form.social_security_number" mono />
        <InfoField label="Tax Number" :value="form.tax_number" mono />
        <InfoField label="Driver License" :value="form.driver_license_number" mono />
      </div>
    </template>

    <!-- ============ Add/Edit Identification Modal ============ -->
    <a-modal
      v-model:open="modal.visible"
      :title="modal.editing ? 'Edit Identification' : 'Add Identification'"
      @ok="handleSave"
      :confirm-loading="modal.saving"
      :width="'min(95vw, 640px)'"
      :bodyStyle="{ maxHeight: '70vh', overflowY: 'auto' }"
    >
      <a-form layout="vertical" class="modal-form">
        <div class="form-section-title">Document Details</div>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Identification Type" required>
              <a-select v-model:value="modal.form.identification_type" placeholder="Select ID type">
                <a-select-option v-for="opt in idTypeOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Identification Number" required>
              <a-input v-model:value="modal.form.identification_number" placeholder="ID number" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Issue Date">
              <a-date-picker
                v-model:value="modal.form.identification_issue_date"
                style="width: 100%"
                format="DD/MM/YYYY"
                value-format="YYYY-MM-DD"
                placeholder="DD/MM/YYYY"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Expiry Date">
              <a-date-picker
                v-model:value="modal.form.identification_expiry_date"
                style="width: 100%"
                format="DD/MM/YYYY"
                value-format="YYYY-MM-DD"
                placeholder="DD/MM/YYYY"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <div class="form-section-title">Name on Document</div>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="Initial (EN)">
              <a-input v-model:value="modal.form.initial_en" placeholder="e.g. Mr" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="First Name (EN)">
              <a-input v-model:value="modal.form.first_name_en" placeholder="First name" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Last Name (EN)">
              <a-input v-model:value="modal.form.last_name_en" placeholder="Last name" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="Initial (TH)">
              <a-input v-model:value="modal.form.initial_th" placeholder="e.g. นาย" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="First Name (TH)">
              <a-input v-model:value="modal.form.first_name_th" placeholder="ชื่อ" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Last Name (TH)">
              <a-input v-model:value="modal.form.last_name_th" placeholder="นามสกุล" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>
```

**Script section:**

```vue
<script setup>
import { ref, reactive, computed, inject, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useAuthStore } from '@/stores/auth'
import { employeeIdentificationApi } from '@/api'
import { PlusOutlined, EditOutlined, DeleteOutlined, StarOutlined } from '@ant-design/icons-vue'
import InfoField from '@/components/common/InfoField.vue'

const dayjs = inject('$dayjs')
const authStore = useAuthStore()

const props = defineProps({
  form: { type: Object, required: true },
  readonly: { type: Boolean, default: false },
  employee: { type: Object, default: null },
  isEditMode: { type: Boolean, default: false },
})

const emit = defineEmits(['refresh'])

const canCreate = computed(() => authStore.canCreate('employees'))
const canUpdate = computed(() => authStore.canUpdate('employees'))
const canDelete = computed(() => authStore.canDelete('employees'))

// ======================== Identification Data ========================
const identifications = ref([])
const loadingIdentifications = ref(false)

async function loadIdentifications() {
  if (!props.employee?.id) return
  loadingIdentifications.value = true
  try {
    const { data } = await employeeIdentificationApi.list({ employee_id: props.employee.id })
    identifications.value = data.data || []
  } catch { /* silent */ }
  loadingIdentifications.value = false
}

// Load when employee changes (e.g., after a refresh)
watch(() => props.employee?.id, (id) => {
  if (id) loadIdentifications()
}, { immediate: true })

// ======================== Constants ========================
const idTypeOptions = [
  { value: 'ThaiID', label: 'Thai ID' },
  { value: 'Passport', label: 'Passport' },
  { value: 'BurmeseID', label: 'Burmese ID' },
  { value: '10YearsID', label: '10 Years ID' },
  { value: 'CI', label: 'CI' },
  { value: 'Borderpass', label: 'Border Pass' },
  { value: 'Other', label: 'Other' },
]

const idTypeLabelMap = Object.fromEntries(idTypeOptions.map(o => [o.value, o.label]))

// ======================== Table Columns ========================
const showActions = computed(() => canUpdate.value || canDelete.value)

const columns = computed(() => {
  const cols = [
    { title: 'Type', key: 'identification_type', width: 180 },
    { title: 'Number', dataIndex: 'identification_number', width: 160 },
    { title: 'Name (EN)', key: 'name' },
    { title: 'Issue Date', key: 'identification_issue_date', width: 120 },
    { title: 'Expiry Date', key: 'identification_expiry_date', width: 120 },
  ]
  if (showActions.value) cols.push({ title: '', key: 'actions', width: 120, align: 'right' })
  return cols
})

// ======================== Helpers ========================
function idTypeLabel(val) {
  return val ? (idTypeLabelMap[val] || val) : null
}

function formatDate(date) {
  return date ? dayjs(date).format('DD MMM YYYY') : null
}

function showApiError(err, fallback) {
  const resp = err.response?.data
  if (resp?.errors) {
    const firstErr = Object.values(resp.errors)[0]
    message.error(Array.isArray(firstErr) ? firstErr[0] : firstErr)
  } else {
    message.error(resp?.message || fallback)
  }
}

// ======================== Modal ========================
const defaultModalForm = {
  identification_type: undefined,
  identification_number: '',
  identification_issue_date: null,
  identification_expiry_date: null,
  first_name_en: '',
  last_name_en: '',
  first_name_th: '',
  last_name_th: '',
  initial_en: '',
  initial_th: '',
}

const modal = reactive({
  visible: false,
  saving: false,
  editing: null,
  form: { ...defaultModalForm },
})

function openModal(record) {
  if (record) {
    modal.editing = record
    Object.keys(defaultModalForm).forEach(key => {
      modal.form[key] = record[key] || defaultModalForm[key]
    })
  } else {
    modal.editing = null
    Object.assign(modal.form, { ...defaultModalForm })
  }
  modal.visible = true
}

async function handleSave() {
  if (!modal.form.identification_type) return message.warning('Identification Type is required')
  if (!modal.form.identification_number) return message.warning('Identification Number is required')

  modal.saving = true
  try {
    if (modal.editing) {
      await employeeIdentificationApi.update(modal.editing.id, { ...modal.form })
      message.success('Identification updated')
    } else {
      await employeeIdentificationApi.store({
        ...modal.form,
        employee_id: props.employee.id,
      })
      message.success('Identification added')
    }
    modal.visible = false
    loadIdentifications()
    emit('refresh')
  } catch (err) {
    showApiError(err, 'Failed to save identification')
  }
  modal.saving = false
}

// ======================== Set Primary ========================
async function handleSetPrimary(record) {
  try {
    await employeeIdentificationApi.setPrimary(record.id)
    message.success('Primary identification updated')
    loadIdentifications()
    emit('refresh')
  } catch (err) {
    showApiError(err, 'Failed to set primary')
  }
}

// ======================== Delete ========================
function confirmDelete(record) {
  Modal.confirm({
    title: 'Delete Identification',
    content: record.is_primary
      ? 'This is the primary identification. Deleting it will promote another record as primary. Continue?'
      : 'Are you sure you want to delete this identification?',
    okText: 'Delete',
    okType: 'danger',
    onOk: async () => {
      try {
        await employeeIdentificationApi.destroy(record.id)
        message.success('Identification deleted')
        loadIdentifications()
        emit('refresh')
      } catch (err) {
        showApiError(err, 'Failed to delete identification')
      }
    },
  })
}
</script>
```

**Key design choices:**
- The tab loads identifications independently via `employeeIdentificationApi.list()` when `isEditMode` is true
- On create mode (`!isEditMode`), the original inline form fields remain — identification is sent as part of the main employee payload, and the backend auto-creates the first identification record
- The `emit('refresh')` call triggers `loadEmployee()` in the parent, which reloads the employee data (including updated names if primary was changed)
- Tax & License fields remain bound to the parent `form` object — no change to their save behavior

---

### Phase 3 — Update EmployeeFormView (1 file)

#### Step 3.1: Pass new props to IdentificationTab

In `src/views/employees/EmployeeFormView.vue`, update the `IdentificationTab` usage:

**Before:**
```vue
<a-tab-pane key="identification" tab="Identification">
  <IdentificationTab :form="form" :readonly="!canSave" />
</a-tab-pane>
```

**After:**
```vue
<a-tab-pane key="identification" tab="Identification">
  <IdentificationTab
    :form="form"
    :readonly="!canSave"
    :employee="employee"
    :is-edit-mode="isEditMode"
    @refresh="loadEmployee"
  />
</a-tab-pane>
```

#### Step 3.2: Remove identification fields from defaultFormValues

Remove from `defaultFormValues` (line ~188):
```js
// REMOVE these lines:
// identification_type: undefined, identification_number: '',
// identification_issue_date: null, identification_expiry_date: null,
```

**Wait — these are still needed for the create flow.**

On second thought, keep these fields in `defaultFormValues`. During create mode, they're sent as part of the employee payload. The backend `EmployeeDataService::store()` extracts them and creates the first identification record. Removing them would break employee creation.

So `defaultFormValues` stays **unchanged**. The identification fields flow:
- **Create**: form → `employeeApi.store()` → backend extracts and creates identification
- **Edit**: identification data managed via dedicated API (IdentificationTab handles it)

#### Step 3.3: Update validation in `validateForm()`

The existing validation (line ~314) still applies during create:

```js
if (form.identification_type && !form.identification_number) {
  activeTab.value = 'identification'
  message.warning('ID Number is required when ID Type is selected')
  return false
}
```

This only fires during create (the form-save path). In edit mode, identification is saved via the modal which has its own validation. No change needed.

#### Step 3.4: Handle the "Not Saved" indicator for identification tab

The `isDirty` computed checks the entire `form` object. Since identification fields remain in `defaultFormValues`, editing them during create mode will correctly trigger the "Not Saved" indicator. In edit mode, identification CRUD doesn't touch the form object (it uses its own API), so it won't false-trigger the indicator.

No change needed here.

---

### Phase 4 — Update EmployeeFormView dirty detection for identification tab hybrid behavior

When the identification tab is active in edit mode, the tab has BOTH live behavior (identification table) and form behavior (tax & license). The header should show "Not Saved" only when tax/license fields are dirty.

Since tax/license fields are part of the `form` object, the existing `isDirty` logic already handles this correctly. However, the `isLiveTab` computed needs to be aware that the identification tab is NOT a live tab — the Save button should still appear because the tax/license section uses it.

Current code:
```js
const LIVE_TABS = new Set(['leave', 'records', 'employment', 'funding'])
```

The identification tab is **not** in `LIVE_TABS`, so the Save button will appear. This is correct — tax/license fields need the Save button.

No change needed.

---

### Phase 5 — Remove identification fields from employee update payload

#### Step 5.1: Update `buildPayload()` in EmployeeFormView

In edit mode, identification fields should NOT be sent in the employee update payload — they're now managed via the dedicated API. Only during create should they be included.

**Before:**
```js
function buildPayload() {
  const payload = {}
  for (const [key, val] of Object.entries(form)) {
    if (val !== '' && val !== undefined && val !== null) {
      payload[key] = val
    }
  }
  return payload
}
```

**After:**
```js
const IDENTIFICATION_FIELDS = new Set([
  'identification_type', 'identification_number',
  'identification_issue_date', 'identification_expiry_date',
])

function buildPayload() {
  const payload = {}
  for (const [key, val] of Object.entries(form)) {
    // In edit mode, skip identification fields (managed via dedicated API)
    if (isEditMode.value && IDENTIFICATION_FIELDS.has(key)) continue
    if (val !== '' && val !== undefined && val !== null) {
      payload[key] = val
    }
  }
  return payload
}
```

This ensures identification fields are:
- **Included** in `employeeApi.store()` during create (backend extracts them)
- **Excluded** from `employeeApi.update()` during edit (managed via dedicated API)

---

## Summary

### Files to Create (2)

| # | File | Purpose |
|---|------|---------|
| 1 | `src/api/employeeIdentificationApi.js` | API client for identification CRUD + setPrimary |
| 2 | — | (No new component files — IdentificationTab is rewritten in-place) |

### Files to Modify (3)

| # | File | Change |
|---|------|--------|
| 1 | `src/api/index.js` | Add barrel export for `employeeIdentificationApi` |
| 2 | `src/views/employees/tabs/IdentificationTab.vue` | Full rewrite — hybrid tab with table+modal CRUD for identifications, form inputs for tax/license |
| 3 | `src/views/employees/EmployeeFormView.vue` | Pass `employee` and `isEditMode` props to IdentificationTab, exclude identification fields from edit payload |

### No Changes Needed

| File | Why |
|------|-----|
| `defaultFormValues` | Identification fields still needed for create flow |
| `validateForm()` | Create-mode validation still applies |
| `LIVE_TABS` | Identification tab is not fully live — Save button still needed for tax/license |
| `isDirty` | Works correctly — identification CRUD doesn't touch `form` object |
| `populateFormFromEmployee()` | Flat fields still returned by backend (backward-compatible) |

---

## Detailed Todo Checklist

### Phase 1 — API Layer (2 tasks)

Create the API client and register it.

- [x] **1.1** Create `src/api/employeeIdentificationApi.js`
  - Import `client` from `./axios`
  - Export `employeeIdentificationApi` object with 6 methods:
    - `list(params)` — `GET /employee-identifications` (expects `{ employee_id }` in params)
    - `show(id)` — `GET /employee-identifications/{id}`
    - `store(payload)` — `POST /employee-identifications`
    - `update(id, payload)` — `PUT /employee-identifications/{id}`
    - `destroy(id)` — `DELETE /employee-identifications/{id}`
    - `setPrimary(id)` — `PATCH /employee-identifications/{id}/set-primary` (no request body)
- [x] **1.2** Add barrel export to `src/api/index.js`
  - Add line: `export { employeeIdentificationApi } from './employeeIdentificationApi'`
  - Place it after the `employeeApi` export (line 5) to keep related APIs together

---

### Phase 2 — Rewrite IdentificationTab (12 tasks)

Full rewrite of `src/views/employees/tabs/IdentificationTab.vue`. The tab becomes a **hybrid**: Section 1 (Identification Documents) uses live modal-based CRUD; Section 2 (Tax & License) stays as form fields saved via the top Save button.

#### Props & Emits

- [x] **2.1** Update `defineProps` — add two new props alongside existing `form` and `readonly`
  - `employee` (Object, default: null) — the full employee object, used for `employee.id`
  - `isEditMode` (Boolean, default: false) — whether we're editing an existing employee
- [x] **2.2** Add `defineEmits(['refresh'])` — emitted after identification CRUD to trigger `loadEmployee()` in parent

#### Data Loading

- [x] **2.3** Add identification data loading logic
  - `identifications` ref (array, default `[]`)
  - `loadingIdentifications` ref (boolean)
  - `loadIdentifications()` async function — calls `employeeIdentificationApi.list({ employee_id: props.employee.id })`, populates `identifications.value` from `data.data`
  - `watch(() => props.employee?.id, ...)` with `{ immediate: true }` — calls `loadIdentifications()` when employee ID becomes available or changes

#### Constants & Helpers

- [x] **2.4** Extract identification type options into a reusable array
  - `idTypeOptions` array of `{ value, label }` objects: ThaiID, Passport, BurmeseID, 10YearsID, CI, Borderpass, Other
  - `idTypeLabelMap` derived from `idTypeOptions` via `Object.fromEntries()`
  - `idTypeLabel(val)` — returns human label or raw value as fallback
  - Replace the existing hardcoded `<a-select-option>` elements and `idTypeLabels` object with this centralized data
- [x] **2.5** Add permission computeds and standard helpers
  - `canCreate` — `authStore.canCreate('employees')`
  - `canUpdate` — `authStore.canUpdate('employees')`
  - `canDelete` — `authStore.canDelete('employees')`
  - `formatDate(date)` — `dayjs(date).format('DD MMM YYYY')` or null
  - `showApiError(err, fallback)` — extract first validation error from `err.response.data.errors`, fallback to `message` or `fallback` string (same pattern as `RecordsTab.vue`)

#### Table (Section 1 — Identification Documents)

- [x] **2.6** Build the identification table for edit mode
  - `columns` computed — 5 data columns + conditional actions column:
    - `Type` (key: `identification_type`, width: 180) — custom render: `idTypeLabel()` + blue `<a-tag>Primary</a-tag>` if `is_primary`
    - `Number` (dataIndex: `identification_number`, width: 160)
    - `Name (EN)` (key: `name`) — custom render: `[first_name_en, last_name_en].filter(Boolean).join(' ')` or `'—'`
    - `Issue Date` (key: `identification_issue_date`, width: 120) — custom render: `formatDate()`
    - `Expiry Date` (key: `identification_expiry_date`, width: 120) — custom render: `formatDate()`
    - Actions column (key: `actions`, width: 120, align: right) — only if `showActions` is true
  - `showActions` computed — `canUpdate || canDelete`
  - Section header with title "Identification Documents" and "Add" button (guarded by `canCreate`)
  - `<a-table>` with `:data-source="identifications"`, `:pagination="false"`, `size="small"`, `:row-key="(r) => r.id"`
  - Optional: `:row-class-name` to highlight primary row
  - `<a-empty>` fallback when `identifications.length === 0`
  - Action buttons per row:
    - Set Primary (`<StarOutlined />`) — shown when `canUpdate && !record.is_primary`, calls `handleSetPrimary(record)`
    - Edit (`<EditOutlined />`) — shown when `canUpdate`, calls `openModal(record)`
    - Delete (`<DeleteOutlined />`) — shown when `canDelete`, calls `confirmDelete(record)`

#### Template Branching (3 modes)

- [x] **2.7** Structure the template with three display modes
  - **Edit mode** (`isEditMode`): Section 1 identification table + Section 2 tax/license form fields, separated by `<a-divider>`
  - **Create mode** (`!isEditMode && !readonly`): inline form fields for identification (type, number, issue date, expiry date) bound to `form.*` + tax/license form fields — same layout as current IdentificationTab
  - **Readonly mode** (`readonly`): `InfoField` display of primary identification (from `form.*` flat fields) + tax/license InfoFields
  - Tax & License section appears in ALL three modes (form inputs or InfoFields depending on `readonly`)

#### Modal (Add/Edit Identification)

- [x] **2.8** Build the identification modal form
  - `defaultModalForm` object — 10 fields: `identification_type`, `identification_number`, `identification_issue_date`, `identification_expiry_date`, `first_name_en`, `last_name_en`, `first_name_th`, `last_name_th`, `initial_en`, `initial_th`
  - `modal` reactive object — `{ visible, saving, editing, form: { ...defaultModalForm } }`
  - `<a-modal>` with `v-model:open="modal.visible"`, dynamic title ("Add" vs "Edit"), `@ok="handleSave"`, `:confirm-loading="modal.saving"`, `:width="'min(95vw, 640px)'"`, scrollable body
  - Two form sections inside the modal:
    - **"Document Details"** — identification_type (select, required), identification_number (input, required), issue date (date picker), expiry date (date picker)
    - **"Name on Document"** — initial_en, first_name_en, last_name_en (row 1), initial_th, first_name_th, last_name_th (row 2) — all optional
  - Use `<a-row :gutter="16">` + `<a-col :span="...">` grid layout matching existing modal patterns
  - Date pickers: `format="DD/MM/YYYY"`, `value-format="YYYY-MM-DD"`, `placeholder="DD/MM/YYYY"`

#### Modal Logic (Open / Save)

- [x] **2.9** Implement modal open and save logic
  - `openModal(record)`:
    - If `record` is provided (edit): set `modal.editing = record`, populate `modal.form` from record fields using `defaultModalForm` keys
    - If `record` is null (add): set `modal.editing = null`, reset `modal.form` to `defaultModalForm` defaults
    - Set `modal.visible = true`
  - `handleSave()`:
    - Validate: `identification_type` required, `identification_number` required — show `message.warning()` and return if missing
    - Set `modal.saving = true`
    - If editing: call `employeeIdentificationApi.update(modal.editing.id, { ...modal.form })`
    - If adding: call `employeeIdentificationApi.store({ ...modal.form, employee_id: props.employee.id })`
    - On success: show `message.success()`, close modal, call `loadIdentifications()`, `emit('refresh')`
    - On error: call `showApiError(err, 'Failed to save identification')`
    - Set `modal.saving = false` in finally

#### Set Primary

- [x] **2.10** Implement set primary logic
  - `handleSetPrimary(record)`:
    - Call `employeeIdentificationApi.setPrimary(record.id)`
    - On success: `message.success('Primary identification updated')`, `loadIdentifications()`, `emit('refresh')`
    - On error: `showApiError(err, 'Failed to set primary')`
  - The `emit('refresh')` is critical here — it triggers `loadEmployee()` in the parent, which updates the sidebar with the new primary identification's name fields

#### Delete

- [x] **2.11** Implement delete with confirmation
  - `confirmDelete(record)`:
    - Show `Modal.confirm()` with dynamic content:
      - If `record.is_primary`: "This is the primary identification. Deleting it will promote another record as primary. Continue?"
      - Otherwise: "Are you sure you want to delete this identification?"
    - `okText: 'Delete'`, `okType: 'danger'`
    - `onOk`: call `employeeIdentificationApi.destroy(record.id)`, show `message.success()`, call `loadIdentifications()`, `emit('refresh')`
    - On error: `showApiError(err, 'Failed to delete identification')`
  - Backend returns 422 if trying to delete the only identification — the error message will display automatically via `showApiError`

#### Styles

- [x] **2.12** Add/update scoped styles
  - Keep existing `.section-title` and `.info-grid` styles
  - Add `.section-header` (flex, space-between, align center, margin-bottom) — same pattern as `RecordsTab.vue`
  - Add `.modal-form` (margin-top: 8px)
  - Add `.form-section-title` (font-size: 13px, font-weight: 600, color: secondary, border-bottom, margin-bottom: 12px) — for modal section headings
  - Optional: `.primary-row` highlight style for the primary identification row in the table

---

### Phase 3 — Update EmployeeFormView (3 tasks)

Modify `src/views/employees/EmployeeFormView.vue` to pass new props to `IdentificationTab` and exclude identification fields from the edit payload.

- [x] **3.1** Update IdentificationTab usage in template
  - Change from: `<IdentificationTab :form="form" :readonly="!canSave" />`
  - Change to: `<IdentificationTab :form="form" :readonly="!canSave" :employee="employee" :is-edit-mode="isEditMode" @refresh="loadEmployee" />`
  - This provides the tab with the employee object (for `employee.id`), edit mode flag, and a callback to reload employee data after identification changes

- [x] **3.2** Add `IDENTIFICATION_FIELDS` constant and update `buildPayload()`
  - Add constant above `buildPayload()`:
    ```js
    const IDENTIFICATION_FIELDS = new Set([
      'identification_type', 'identification_number',
      'identification_issue_date', 'identification_expiry_date',
    ])
    ```
  - In `buildPayload()` loop, add skip condition:
    ```js
    if (isEditMode.value && IDENTIFICATION_FIELDS.has(key)) continue
    ```
  - This ensures identification fields are included during create (backend extracts them) but excluded during edit (managed via dedicated API)

- [x] **3.3** Verify no other changes needed in EmployeeFormView
  - `defaultFormValues` — keep identification fields (needed for create flow and `populateFormFromEmployee`)
  - `validateForm()` — keep the identification_type/number cross-validation (only fires during create since edit mode uses modal validation)
  - `LIVE_TABS` — do NOT add `'identification'` (the tab needs the Save button for tax/license fields)
  - `isDirty` — works correctly (identification CRUD doesn't mutate the `form` object)
  - `populateFormFromEmployee()` — works correctly (backend still returns flat fields via backward compatibility)

---

### Verification Checklist

After all phases are complete, verify each scenario:

#### Create Flow

- [ ] **V.1** Navigate to `/employees/new` — identification tab shows inline form fields (type, number, issue date, expiry date) + tax/license fields
- [ ] **V.2** Fill in identification type and number — save the employee — verify backend creates both the employee and an `employee_identifications` record with `is_primary = true`
- [ ] **V.3** Fill in identification type WITHOUT number — save — verify "ID Number is required when ID Type is selected" warning appears
- [ ] **V.4** Fill in tax/license fields — save — verify they persist on the employee record

#### Edit Flow — Identification Table

- [ ] **V.5** Navigate to an existing employee — identification tab shows the table with existing identification records loaded from the API
- [ ] **V.6** Click "Add" — modal opens with empty fields — fill in type + number — save — verify new row appears in table
- [ ] **V.7** Click "Edit" on a row — modal opens pre-populated with that record's data — modify a field — save — verify table updates
- [ ] **V.8** Verify the modal has two sections: "Document Details" (type, number, dates) and "Name on Document" (EN/TH name fields)

#### Edit Flow — Set Primary

- [ ] **V.9** Click star icon on a non-primary identification — verify it becomes primary (blue "Primary" tag moves)
- [ ] **V.10** After setting primary, verify the employee sidebar updates with the new primary identification's name fields (requires `emit('refresh')` → `loadEmployee()`)
- [ ] **V.11** Verify the star icon is hidden on the already-primary identification (no-op)

#### Edit Flow — Delete

- [ ] **V.12** Delete a non-primary identification — verify confirmation dialog — verify row removed from table
- [ ] **V.13** Delete the primary identification (when others exist) — verify warning about promotion — verify another identification is promoted to primary
- [ ] **V.14** Try to delete the only identification — verify 422 error message from backend ("Cannot delete the only identification record")

#### Tax & License (Form Save)

- [ ] **V.15** In edit mode, modify a tax/license field (e.g., tax_number) — verify "Not Saved" tag appears in header
- [ ] **V.16** Click Save — verify tax/license change persists — verify "Not Saved" tag disappears
- [ ] **V.17** Verify identification CRUD (add/edit/delete/set-primary) does NOT trigger the "Not Saved" indicator

#### Readonly Mode

- [ ] **V.18** Log in as a user without `employees.update` permission — navigate to an employee — verify identification tab shows InfoField display (primary ID type, number, dates) + tax/license InfoFields
- [ ] **V.19** Verify no Add/Edit/Delete/SetPrimary buttons are visible

#### Permissions

- [ ] **V.20** User with `employees.read` only — verify table loads but no action buttons
- [ ] **V.21** User with `employees.create` — verify "Add" button appears
- [ ] **V.22** User with `employees.update` — verify Edit and Set Primary buttons appear
- [ ] **V.23** User with `employees.delete` — verify Delete button appears

#### Edge Cases

- [ ] **V.24** Employee with no identifications — verify empty state ("No identification documents") with Add button
- [ ] **V.25** Employee with only 1 identification — verify delete shows 422 error
- [ ] **V.26** Rapid successive actions (add, then immediately set primary) — verify no race conditions
- [ ] **V.27** Navigate away from identification tab and back — verify table reloads correctly (watch on employee.id handles this)

---

### Summary Table

| Phase | Tasks | New Files | Modified Files | Complexity |
|-------|-------|-----------|----------------|------------|
| 1 — API Layer | 2 | 1 | 1 | Low |
| 2 — Rewrite IdentificationTab | 12 | 0 | 1 | Medium-High |
| 3 — Update EmployeeFormView | 3 | 0 | 1 | Low |
| **Total** | **17** | **1** | **3** | **Medium** |

### Verification

| Category | Checks |
|----------|--------|
| Create Flow | 4 |
| Edit — Table CRUD | 4 |
| Edit — Set Primary | 3 |
| Edit — Delete | 3 |
| Tax & License | 3 |
| Readonly Mode | 2 |
| Permissions | 4 |
| Edge Cases | 4 |
| **Total** | **27** |
