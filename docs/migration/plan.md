# Database Redesign — Frontend Implementation Plan

**Date:** 2026-03-09
**Prerequisite:** Backend redesign complete (see `hrms-backend-api-v1/docs/migrations/database-redesign-research.md`)
**Research:** See `docs/migration/database-redesign-ui-update-research.md` for full analysis

---

## Table of Contents

1. [Phase 1: API Layer](#phase-1-api-layer)
2. [Phase 2: Employee Form — Organization Field Migration](#phase-2-employee-form--organization-field-migration)
3. [Phase 3: Transfer Modal](#phase-3-transfer-modal)
4. [Phase 4: Personnel Actions Redesign](#phase-4-personnel-actions-redesign)
5. [Phase 5: Payroll Views — Organization Path Fix](#phase-5-payroll-views--organization-path-fix)
6. [Phase 6: Leave View Filter Fixes](#phase-6-leave-view-filter-fixes)
7. [Phase 7: Verify Employee List](#phase-7-verify-employee-list)

---

## Phase 1: API Layer

**Files:** 2 (1 new, 1 modified)
**Risk:** None — purely additive

### Step 1.1: Create `src/api/transferApi.js`

New file — transfer CRUD matching the new backend endpoints.

```js
// src/api/transferApi.js
import client from './axios'

export const transferApi = {
  list:    (params)  => client.get('/transfers', { params }),
  show:    (id)      => client.get(`/transfers/${id}`),
  store:   (payload) => client.post('/transfers', payload),
  destroy: (id)      => client.delete(`/transfers/${id}`),
}
```

### Step 1.2: Update `src/api/index.js`

Add export for the new transfer API.

```diff
  export { personnelActionApi } from './personnelActionApi'
  export { siteApi, departmentApi, positionApi } from './organizationApi'
  export { recycleBinApi } from './recycleBinApi'
+ export { transferApi } from './transferApi'
  export { benefitSettingApi, taxSettingApi, ... } from './settingsApi'
```

### Step 1.3: Remove `transfer()` from `src/api/employeeApi.js`

The old endpoint `POST /employees/{id}/transfer` is replaced by the new Transfer API.

```diff
  export const employeeApi = {
    list: (params) => client.get('/employees', { params }),
    // ...
    uploadProfilePicture: (id, formData) => client.post(`/employees/${id}/profile-picture`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
-   transfer: (id, payload) => client.post(`/employees/${id}/transfer`, payload),
  }
```

---

## Phase 2: Employee Form — Organization Field Migration

**Files:** 4 modified
**Summary:** Remove `organization` from employee form, add it to employment form

### Step 2.1: `src/views/employees/EmployeeFormView.vue`

**A. Remove `organization` from `defaultFormValues` (line 176):**

```diff
  const defaultFormValues = {
-   organization: undefined, staff_id: '', first_name_en: '', gender: undefined,
+   staff_id: '', first_name_en: '', gender: undefined,
    date_of_birth: null, status: undefined,
    // ... rest unchanged
  }
```

**B. Remove `organization` validation from `validateForm()` (line 300):**

```diff
  function validateForm() {
-   if (!form.organization) { activeTab.value = 'basic_info'; message.warning('Organization is required'); return false }
    if (!form.staff_id) { activeTab.value = 'basic_info'; message.warning('Staff ID is required'); return false }
    if (!form.first_name_en) { activeTab.value = 'basic_info'; message.warning('First Name (EN) is required'); return false }
    // ... rest unchanged
  }
```

No other changes needed — `populateFormFromEmployee()` loops over `defaultFormValues` keys, so removing the key automatically skips it. `buildPayload()` also iterates form keys, so `organization` is automatically excluded.

---

### Step 2.2: `src/views/employees/tabs/BasicInfoTab.vue`

**A. Remove Organization form field and section title, expand remaining columns (lines 3–31):**

Replace the Organization section + row with just Staff ID and Status at `span=12` each:

```html
<!-- BEFORE (lines 3–31) -->
<template v-if="!readonly">
  <div class="form-section-title">Organization</div>
  <a-row :gutter="16">
    <a-col :span="8">
      <a-form-item label="Organization" required>
        <a-select v-model:value="form.organization" ... />
      </a-form-item>
    </a-col>
    <a-col :span="8">
      <a-form-item label="Staff ID" required>
        <a-input v-model:value="form.staff_id" placeholder="e.g. 0101" />
      </a-form-item>
    </a-col>
    <a-col :span="8">
      <a-form-item label="Status" required>
        <a-select v-model:value="form.status" ... />
      </a-form-item>
    </a-col>
  </a-row>
```

```html
<!-- AFTER -->
<template v-if="!readonly">
  <div class="form-section-title">Staff Details</div>
  <a-row :gutter="16">
    <a-col :span="12">
      <a-form-item label="Staff ID" required>
        <a-input v-model:value="form.staff_id" placeholder="e.g. 0101" />
      </a-form-item>
    </a-col>
    <a-col :span="12">
      <a-form-item label="Status" required>
        <a-select
          v-model:value="form.status"
          placeholder="Select status"
          :options="lookups.employee_status"
          :loading="loadingLookups"
        />
      </a-form-item>
    </a-col>
  </a-row>
```

**B. Remove Organization from readonly section (lines 157–162):**

```html
<!-- BEFORE -->
<div class="section-title">Organization</div>
<div class="info-grid">
  <InfoField label="Organization" :value="form.organization" />
  <InfoField label="Staff ID" :value="form.staff_id" mono />
  <InfoField label="Status" :value="form.status" />
</div>
```

```html
<!-- AFTER -->
<div class="section-title">Staff Details</div>
<div class="info-grid">
  <InfoField label="Staff ID" :value="form.staff_id" mono />
  <InfoField label="Status" :value="form.status" />
</div>
```

**C. Remove `organization` from lookups ref (line 203–212):**

```diff
  const lookups = ref({
-   organization: [],
    employee_status: [],
    employee_initial_en: [],
    employee_initial_th: [],
    gender: [],
    marital_status: [],
    nationality: [],
    religion: [],
  })
```

---

### Step 2.3: `src/views/employees/tabs/EmploymentTab.vue`

**A. Add `organization` to `empForm` reactive (line 381):**

```diff
  const empForm = reactive({
+   organization: undefined,
    department_id: undefined,
    section_department_id: undefined,
    position_id: undefined,
    // ... rest unchanged
  })
```

**B. Add Organization field to the modal template (after line 72, before the Department `<a-col>`):**

Insert an Organization select as the first field in the Assignment section:

```html
<div class="form-section-title">Assignment</div>
<a-row :gutter="16">
  <!-- NEW: Organization field -->
  <a-col :span="8">
    <a-form-item label="Organization" required>
      <a-select
        v-model:value="empForm.organization"
        placeholder="Select organization"
      >
        <a-select-option value="SMRU">SMRU</a-select-option>
        <a-select-option value="BHF">BHF</a-select-option>
      </a-select>
    </a-form-item>
  </a-col>
  <a-col :span="8">
    <a-form-item label="Department" required>
      <!-- existing department select unchanged -->
```

**C. Add Organization to readonly display (after line 11, first `InfoField` in Employment Details):**

```diff
  <div class="info-grid">
+   <InfoField label="Organization" :value="employee.employment.organization" />
    <InfoField label="Department" :value="employee.employment.department?.name" />
    <InfoField label="Section" :value="employee.employment.section_department?.name" />
    <!-- ... rest unchanged -->
  </div>
```

**D. Add Organization validation in `handleSaveEmployment()` (before line 574):**

```diff
  async function handleSaveEmployment() {
+   if (!empForm.organization) return message.warning('Organization is required')
    if (!empForm.department_id) return message.warning('Department is required')
    if (!empForm.position_id) return message.warning('Position is required')
    // ... rest unchanged
  }
```

**E. Add Organization to payload in `handleSaveEmployment()` (line 585):**

```diff
  const payload = {
    employee_id: props.employee.id,
+   organization: empForm.organization,
    department_id: empForm.department_id,
    position_id: empForm.position_id,
    // ... rest unchanged
  }
```

**F. Populate Organization when editing in `openEditEmployment()` (line 547):**

```diff
  Object.assign(empForm, {
+   organization: emp.organization || undefined,
    department_id: deptId != null ? Number(deptId) : undefined,
    section_department_id: secDeptId != null ? Number(secDeptId) : undefined,
    // ... rest unchanged
  })
```

**G. Reset Organization in `resetEmpForm()` (line 517):**

```diff
  function resetEmpForm() {
    Object.assign(empForm, {
+     organization: undefined,
      department_id: undefined, section_department_id: undefined,
      position_id: undefined, site_id: undefined,
      // ... rest unchanged
    })
  }
```

---

### Step 2.4: `src/views/employees/components/EmployeeSidebar.vue`

Change Organization display from `form.organization` to `employee?.employment?.organization` (lines 30–35).

The sidebar receives both `form` and `employee` as props. Since `organization` is no longer on the employee form, read it from the API response's employment relationship.

```html
<!-- BEFORE (lines 30–35) -->
<div v-if="form.organization" class="sidebar-meta-item">
  <span class="meta-label">Organization</span>
  <a-tag :color="form.organization === 'SMRU' ? 'blue' : 'green'" size="small">
    {{ form.organization }}
  </a-tag>
</div>
```

```html
<!-- AFTER -->
<div v-if="employee?.employment?.organization" class="sidebar-meta-item">
  <span class="meta-label">Organization</span>
  <a-tag :color="employee.employment.organization === 'SMRU' ? 'blue' : 'green'" size="small">
    {{ employee.employment.organization }}
  </a-tag>
</div>
```

> **Note:** For new employees (create mode), `employee` is `null`, so the organization tag won't show until the employment record is created. This is correct behavior — organization is now tied to employment, not the employee.

---

## Phase 3: Transfer Modal

**File:** `src/views/employees/components/TransferModal.vue`
**Summary:** Switch from `employeeApi.transfer()` to `transferApi.store()`, update field names and data paths

### Full Updated File

Replace the entire `TransferModal.vue` with:

```vue
<template>
  <a-modal
    :open="open"
    title="Transfer Employee"
    :footer="null"
    :width="'min(95vw, 480px)'"
    destroy-on-close
    @cancel="$emit('update:open', false)"
  >
    <a-form :model="form" layout="vertical" class="modal-form">
      <a-form-item label="Current Organization">
        <a-tag :color="currentOrg === 'BHF' ? 'green' : 'blue'">
          {{ currentOrg || '—' }}
        </a-tag>
      </a-form-item>

      <a-form-item label="Transfer To" required>
        <a-select v-model:value="form.to_organization" placeholder="Select new organization">
          <a-select-option v-for="org in availableOrgs" :key="org" :value="org">{{ org }}</a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item label="Transfer Start Date" required>
        <a-date-picker
          v-model:value="form.to_start_date"
          style="width: 100%"
          format="DD MMM YYYY"
          value-format="YYYY-MM-DD"
        />
      </a-form-item>

      <a-form-item label="Reason">
        <a-textarea v-model:value="form.reason" placeholder="Reason for transfer" :rows="3" />
      </a-form-item>

      <div class="modal-footer">
        <a-button @click="$emit('update:open', false)">Cancel</a-button>
        <a-button type="primary" :loading="saving" @click="handleTransfer">Transfer</a-button>
      </div>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { message } from 'ant-design-vue'
import { transferApi } from '@/api'

const props = defineProps({
  open: { type: Boolean, default: false },
  employee: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'transferred'])

const saving = ref(false)

const form = reactive({
  to_organization: undefined,
  to_start_date: null,
  reason: '',
})

const currentOrg = computed(() => props.employee?.employment?.organization)

const availableOrgs = computed(() => {
  return ['SMRU', 'BHF'].filter((o) => o !== currentOrg.value)
})

async function handleTransfer() {
  if (!form.to_organization) return message.warning('Please select the new organization')
  if (!form.to_start_date) return message.warning('Transfer start date is required')

  saving.value = true
  try {
    await transferApi.store({
      employee_id: props.employee.id,
      ...form,
    })
    message.success(`Employee transferred to ${form.to_organization}`)
    emit('update:open', false)
    emit('transferred')
  } catch (err) {
    const resp = err.response?.data
    if (resp?.errors) {
      const firstErr = Object.values(resp.errors)[0]
      message.error(Array.isArray(firstErr) ? firstErr[0] : firstErr)
    } else {
      message.error(resp?.message || 'Failed to transfer employee')
    }
  }
  saving.value = false
}
</script>

<style scoped>
.modal-form { margin-top: 16px; }
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-light);
}
</style>
```

### Summary of Changes

| What | Before | After |
|------|--------|-------|
| Import | `employeeApi` | `transferApi` |
| Current org | `employee?.organization` | `employee?.employment?.organization` |
| Form field: org | `new_organization` | `to_organization` |
| Form field: date | `effective_date` | `to_start_date` |
| API call | `employeeApi.transfer(employee.id, form)` | `transferApi.store({ employee_id: employee.id, ...form })` |
| Date label | "Effective Date" | "Transfer Start Date" |

---

## Phase 4: Personnel Actions Redesign

**File:** `src/views/personnel-actions/PersonnelActionListView.vue`
**Summary:** Remove `is_transfer`/`transfer_type`, add `acknowledged_by` + approval dates, update type/subtype handling

### Step 4.1: Remove `transfer_types` from constants (line 365)

```diff
  const constants = reactive({
    action_types: {},
    action_subtypes: {},
-   transfer_types: {},
    statuses: {},
  })
```

### Step 4.2: Remove `is_transfer` and `transfer_type` from form (lines 386–387)

```diff
  const form = reactive({
    employment_id: null,
    action_type: undefined,
    action_subtype: undefined,
    effective_date: null,
-   is_transfer: false,
-   transfer_type: undefined,
+   acknowledged_by: '',
    new_department_id: undefined,
    new_position_id: undefined,
    // ... rest unchanged
  })
```

### Step 4.3: Remove from `resetForm()` (lines 588–589)

```diff
  function resetForm() {
    Object.assign(form, {
      employment_id: null,
      action_type: undefined,
      action_subtype: undefined,
      effective_date: null,
-     is_transfer: false,
-     transfer_type: undefined,
+     acknowledged_by: '',
      new_department_id: undefined,
      // ... rest unchanged
    })
  }
```

### Step 4.4: Remove from `openEdit()` (lines 616–617)

```diff
  function openEdit(record) {
    editingItem.value = record
    Object.assign(form, {
      employment_id: record.employment_id,
      action_type: record.action_type,
      action_subtype: record.action_subtype || undefined,
      effective_date: record.effective_date,
-     is_transfer: record.is_transfer || false,
-     transfer_type: record.transfer_type || undefined,
+     acknowledged_by: record.acknowledged_by || '',
      new_department_id: record.new_department_id || undefined,
      // ... rest unchanged
    })
  }
```

### Step 4.5: Rewrite `onActionTypeChange()` (lines 653–656)

```diff
  function onActionTypeChange(val) {
-   form.is_transfer = val === 'transfer'
-   if (val !== 'transfer') form.transfer_type = undefined
+   if (val !== 'transfer') form.action_subtype = undefined
  }
```

### Step 4.6: Update validation in `handleSave()` (line 666)

```diff
- if (form.action_type === 'transfer' && !form.transfer_type) return message.warning('Transfer type is required')
+ if (form.action_type === 'transfer' && !form.action_subtype) return message.warning('Transfer subtype is required')
```

### Step 4.7: Replace Transfer Type field in modal template (lines 147–166)

Replace the entire `<a-row>` containing Action Subtype and Transfer Type:

```html
<!-- BEFORE (lines 147–166) -->
<a-row :gutter="16">
  <a-col :span="12">
    <a-form-item label="Action Subtype">
      <a-select v-model:value="form.action_subtype" placeholder="Select subtype" allow-clear>
        <a-select-option v-for="(label, key) in constants.action_subtypes" :key="key" :value="key">
          {{ label }}
        </a-select-option>
      </a-select>
    </a-form-item>
  </a-col>
  <a-col :span="12">
    <a-form-item label="Transfer Type" v-if="form.action_type === 'transfer'">
      <a-select v-model:value="form.transfer_type" placeholder="Select transfer type">
        <a-select-option v-for="(label, key) in constants.transfer_types" :key="key" :value="key">
          {{ label }}
        </a-select-option>
      </a-select>
    </a-form-item>
  </a-col>
</a-row>
```

```html
<!-- AFTER -->
<a-row :gutter="16">
  <a-col :span="12">
    <a-form-item label="Transfer Subtype" v-if="form.action_type === 'transfer'" required>
      <a-select v-model:value="form.action_subtype" placeholder="Select subtype">
        <a-select-option v-for="(label, key) in constants.action_subtypes" :key="key" :value="key">
          {{ label }}
        </a-select-option>
      </a-select>
    </a-form-item>
  </a-col>
  <a-col :span="12">
    <a-form-item label="Acknowledged By">
      <a-input v-model:value="form.acknowledged_by" placeholder="Name from paper form" />
    </a-form-item>
  </a-col>
</a-row>
```

### Step 4.8: Update detail modal — Transfer Type display (lines 288–290)

```html
<!-- BEFORE -->
<a-descriptions-item label="Transfer Type" v-if="detailItem.action_type === 'transfer'">
  {{ constants.transfer_types?.[detailItem.transfer_type] || '—' }}
</a-descriptions-item>
```

```html
<!-- AFTER -->
<a-descriptions-item label="Transfer Subtype" v-if="detailItem.action_type === 'transfer'">
  {{ constants.action_subtypes?.[detailItem.action_subtype] || '—' }}
</a-descriptions-item>
```

### Step 4.9: Add `acknowledged_by` to detail modal

Add after the Subtype `<a-descriptions-item>` (around line 284):

```html
<a-descriptions-item label="Acknowledged By">
  {{ detailItem.acknowledged_by || '—' }}
</a-descriptions-item>
```

### Step 4.10: Add approval date keys to `approvalFields` (lines 403–408)

```diff
  const approvalFields = [
-   { key: 'dept_head_approved', label: 'Department Head', type: 'dept_head' },
-   { key: 'coo_approved', label: 'COO', type: 'coo' },
-   { key: 'hr_approved', label: 'HR', type: 'hr' },
-   { key: 'accountant_approved', label: 'Accountant', type: 'accountant' },
+   { key: 'dept_head_approved', dateKey: 'dept_head_approved_date', label: 'Department Head', type: 'dept_head' },
+   { key: 'coo_approved', dateKey: 'coo_approved_date', label: 'COO', type: 'coo' },
+   { key: 'hr_approved', dateKey: 'hr_approved_date', label: 'HR', type: 'hr' },
+   { key: 'accountant_approved', dateKey: 'accountant_approved_date', label: 'Accountant', type: 'accountant' },
  ]
```

### Step 4.11: Show approval dates in the approval grid (lines 321–331)

```html
<!-- BEFORE -->
<div v-for="a in approvalFields" :key="a.key" class="approval-item">
  <span class="approval-label">{{ a.label }}</span>
  <a-switch
    :checked="detailItem[a.key]"
    :disabled="!!detailItem.implemented_at || !canUpdate"
    :loading="approvingKey === a.key"
    checked-children="Yes"
    un-checked-children="No"
    @change="(val) => handleApproval(a, val)"
  />
</div>
```

```html
<!-- AFTER -->
<div v-for="a in approvalFields" :key="a.key" class="approval-item">
  <span class="approval-label">{{ a.label }}</span>
  <a-switch
    :checked="detailItem[a.key]"
    :disabled="!!detailItem.implemented_at || !canUpdate"
    :loading="approvingKey === a.key"
    checked-children="Yes"
    un-checked-children="No"
    @change="(val) => handleApproval(a, val)"
  />
  <span v-if="detailItem[a.dateKey]" class="approval-date">
    {{ formatDate(detailItem[a.dateKey]) }}
  </span>
</div>
```

Add CSS for the approval date (inside `<style scoped>`):

```css
.approval-date {
  font-size: 11px;
  color: var(--color-text-muted);
  font-family: 'SF Mono', 'Consolas', monospace;
}
```

### Step 4.12: Update implemented banner text (line 334–336)

```diff
  <div v-if="detailItem.implemented_at" class="implemented-banner">
-   Implemented on {{ formatDate(detailItem.implemented_at) }}
+   Applied on {{ formatDate(detailItem.implemented_at) }}
  </div>
```

---

## Phase 5: Payroll Views — Organization Path Fix

**Files:** 4 (2 definite changes, 2 verify-only)

### Step 5.1: `src/views/payroll/PayrollListView.vue`

Fix `groupedData` computed (line 321). The employee no longer has `organization` as a direct column — use the payroll's own snapshot or employment's org.

```diff
  const groupedData = computed(() => {
    const map = new Map()
    for (const pr of items.value) {
      const emp = pr.employment?.employee
      const key = pr.employment_id || pr.id
      if (!map.has(key)) {
        map.set(key, {
          employeeKey: `emp-${key}`,
          name: emp ? `${emp.first_name_en} ${emp.last_name_en}` : '—',
          staff_id: emp?.staff_id || '—',
-         organization: emp?.organization || '—',
+         organization: pr.organization || pr.employment?.organization || '—',
          department: pr.employment?.department?.name || '—',
          payrolls: [],
          totalGross: 0,
          totalNet: 0,
        })
      }
      // ... rest unchanged
    }
  })
```

### Step 5.2: `src/views/payroll/PayrollDetailDrawer.vue`

Fix org display (line 20–22). Use payroll's own `organization` snapshot or employment's org.

```html
<!-- BEFORE (line 20–22) -->
<a-descriptions-item label="Organization">
  {{ employment.employee?.organization }}
</a-descriptions-item>
```

```html
<!-- AFTER -->
<a-descriptions-item label="Organization">
  {{ payrolls[0]?.organization || employment?.organization || '—' }}
</a-descriptions-item>
```

### Step 5.3: `src/views/payroll/BulkPayrollModal.vue` — VERIFY ONLY

The `record.organization` in the preview table comes from the `bulkPreview` API response. The backend `BulkPayrollService` was updated to derive org from `employment->organization`. **Verify** the preview response still includes `organization` at each employee record level.

**Expected result:** No change needed — the backend service builds the preview response server-side with `organization` at the top level.

### Step 5.4: `src/views/payroll/PayrollBudgetView.vue` — VERIFY ONLY

The `record.organization` comes from the budget history API. **Verify** the response still includes `organization` on each row.

**Expected result:** No change needed — the backend builds budget rows with `organization` from payrolls.

---

## Phase 6: Leave View Filter Fixes

**Files:** 2 modified
**Summary:** Remove non-functional organization filters

### Step 6.1: `src/views/leave/LeaveRequestListView.vue`

Remove the organization filter dropdown (lines 19–22). The filter exists in the UI but was never wired to the API. The backend `LeaveRequestController` doesn't support an `organization` filter parameter.

```diff
  <div class="filter-bar">
    <a-input v-model:value="search" ... />
-   <a-select v-model:value="filters.organization" placeholder="Organization" allow-clear class="filter-input" style="width: 140px" @change="onSearchOrFilterChange">
-     <a-select-option value="SMRU">SMRU</a-select-option>
-     <a-select-option value="BHF">BHF</a-select-option>
-   </a-select>
    <a-select v-model:value="filters.status" ... />
```

Also remove `organization` from the `filters` reactive object:

```diff
- const filters = reactive({ organization: undefined, status: undefined, ... })
+ const filters = reactive({ status: undefined, ... })
```

### Step 6.2: `src/views/leave/LeaveBalanceListView.vue`

Remove the organization filter dropdown (lines 8–11). Same issue — filter exists in UI but never sent to API.

```diff
  <div class="filter-bar">
    <a-select v-model:value="filters.year" ... />
-   <a-select v-model:value="filters.organization" placeholder="Organization" allow-clear class="filter-input" style="width: 140px" @change="onSearchOrFilterChange">
-     <a-select-option value="SMRU">SMRU</a-select-option>
-     <a-select-option value="BHF">BHF</a-select-option>
-   </a-select>
  </div>
```

Also remove `organization` from the `filters` reactive object:

```diff
- const filters = reactive({ year: currentYear, organization: undefined, ... })
+ const filters = reactive({ year: currentYear, ... })
```

---

## Phase 7: Verify Employee List

**File:** `src/views/employees/EmployeeListView.vue` — VERIFY ONLY

### Step 7.1: Verify `record.organization` still works

The employee list uses `record.organization` for display (tag color and text) and `filter_organization` for filtering.

The backend `EmployeeResource` was updated with a `getOrganizationAttribute()` accessor that proxies from `$this->employment?->organization`. This means `record.organization` should still be populated in the JSON response, **provided** the `employment` relationship is eager-loaded in the list query.

**Verification steps:**
1. Load the employee list page
2. Check that the Organization column shows correct values (not `null` or `—`)
3. Test the organization filter dropdown (SMRU/BHF)
4. Test sorting by organization column

**If `record.organization` is `null`:** Apply a defensive fallback:

```diff
  <a-tag :color="record.organization === 'SMRU' ? 'blue' : 'green'">
-   {{ record.organization }}
+   {{ record.organization || record.employment?.organization || '—' }}
  </a-tag>
```

---

## Summary — All Changes

| Phase | File | Action | Lines Changed |
|-------|------|--------|--------------|
| 1 | `src/api/transferApi.js` | CREATE | ~8 |
| 1 | `src/api/index.js` | Add export | 1 |
| 1 | `src/api/employeeApi.js` | Remove `transfer()` | -1 |
| 2 | `EmployeeFormView.vue` | Remove org from form + validation | -2 |
| 2 | `BasicInfoTab.vue` | Remove org field + lookup | ~-15 |
| 2 | `EmploymentTab.vue` | Add org to form, modal, validation, payload, edit, reset | ~+20 |
| 2 | `EmployeeSidebar.vue` | Change org data path | 3 |
| 3 | `TransferModal.vue` | Full rewrite — new API, field names, data paths | ~35 |
| 4 | `PersonnelActionListView.vue` | Remove transfer fields, add acknowledged_by + dates | ~30 |
| 5 | `PayrollListView.vue` | Fix org path in groupedData | 1 |
| 5 | `PayrollDetailDrawer.vue` | Fix org display path | 1 |
| 5 | `BulkPayrollModal.vue` | Verify only | 0 |
| 5 | `PayrollBudgetView.vue` | Verify only | 0 |
| 6 | `LeaveRequestListView.vue` | Remove broken org filter | ~-5 |
| 6 | `LeaveBalanceListView.vue` | Remove broken org filter | ~-5 |
| 7 | `EmployeeListView.vue` | Verify only (possibly 1 line) | 0–1 |

**Total: ~15 files modified, 1 file created**

---

## Testing Checklist

### Phase 1
- [ ] `npm run build` succeeds after adding transferApi
- [ ] No existing imports break after removing `employeeApi.transfer()`

### Phase 2
- [ ] Create new employee — no Organization field on Basic Info tab
- [ ] Edit existing employee — no Organization field on Basic Info tab
- [ ] Sidebar shows organization from employment data
- [ ] Employment tab modal — Organization field present and required
- [ ] Create employment — organization is sent and saved
- [ ] Edit employment — organization is pre-populated

### Phase 3
- [ ] Transfer modal shows current org from `employment.organization`
- [ ] Transfer modal filters out current org from dropdown
- [ ] Transfer succeeds with new API endpoint
- [ ] Employee detail refreshes after transfer (org updated)

### Phase 4
- [ ] Create personnel action — no `is_transfer` or `transfer_type` fields
- [ ] "Transfer" action type shows Transfer Subtype select (Internal Department / Site to Site)
- [ ] "Acknowledged By" text field works
- [ ] Detail modal shows approval dates alongside switches
- [ ] Approval toggle works and date appears after approval
- [ ] All 11 action types appear in dropdown

### Phase 5
- [ ] Payroll list — Organization column shows correct values
- [ ] Payroll detail drawer — Organization field shows correct value
- [ ] Bulk payroll preview — organization column populated
- [ ] Budget history — organization column populated

### Phase 6
- [ ] Leave Requests page — no Organization filter visible
- [ ] Leave Balances page — no Organization filter visible
- [ ] No console errors after filter removal

### Phase 7
- [ ] Employee list — Organization column shows correct values
- [ ] Employee list — Organization filter works (SMRU/BHF)
- [ ] Employee list — Organization sort works

---

## Detailed Todo List

A granular breakdown of every individual task to complete this migration. Tasks are grouped by phase and ordered for sequential execution within each phase. Phases 1–3 must be completed in order; Phases 4–7 are independent of each other and can be done in any order after Phase 2.

### Phase 1: API Layer (3 tasks)

- [x] **1.1 — Create `src/api/transferApi.js`** ✅
  - Create new file with `list`, `show`, `store`, `destroy` methods
  - Endpoints: `GET/POST /transfers`, `GET/DELETE /transfers/{id}`
  - File: `src/api/transferApi.js` (NEW)

- [x] **1.2 — Add `transferApi` export to barrel file** ✅
  - Add `export { transferApi } from './transferApi'` line
  - File: `src/api/index.js` (line ~21, after recycleBinApi)

- [x] **1.3 — Remove `transfer()` from `employeeApi`** ✅
  - Delete `transfer: (id, payload) => client.post(...)` line
  - File: `src/api/employeeApi.js` (line 15)

---

### Phase 2: Employee Form — Organization Field Migration (11 tasks)

#### Step 2.1 — EmployeeFormView.vue (2 tasks)

- [x] **2.1a — Remove `organization` from `defaultFormValues`** ✅
  - Delete `organization: undefined,` from the object
  - This automatically excludes org from `populateFormFromEmployee()` and `buildPayload()`
  - File: `src/views/employees/EmployeeFormView.vue` (line 176)

- [x] **2.1b — Remove `organization` validation from `validateForm()`** ✅
  - Delete the `if (!form.organization) { ... }` validation block
  - File: `src/views/employees/EmployeeFormView.vue` (line 300)

#### Step 2.2 — BasicInfoTab.vue (3 tasks)

- [x] **2.2a — Remove Organization form field from edit mode** ✅
  - Remove the `<a-col :span="8">` containing the Organization `<a-select>`
  - Rename section title from "Organization" to "Staff Details"
  - Change remaining `<a-col>` spans from `8` to `12` (Staff ID + Status)
  - File: `src/views/employees/tabs/BasicInfoTab.vue` (lines 4–15)

- [x] **2.2b — Remove Organization `InfoField` from readonly mode** ✅
  - Remove `<InfoField label="Organization" :value="form.organization" />`
  - Rename section title from "Organization" to "Staff Details"
  - File: `src/views/employees/tabs/BasicInfoTab.vue` (lines 157–162)

- [x] **2.2c — Remove `organization` from lookups ref** ✅
  - Delete `organization: [],` from the `lookups` ref object
  - File: `src/views/employees/tabs/BasicInfoTab.vue` (line 204)

#### Step 2.3 — EmploymentTab.vue (7 tasks)

- [x] **2.3a — Add `organization` to `empForm` reactive** ✅
  - Add `organization: undefined,` as the first field
  - File: `src/views/employees/tabs/EmploymentTab.vue` (line 381)

- [x] **2.3b — Add Organization `<a-select>` to modal form template** ✅
  - Insert a new `<a-col :span="8">` with Organization select (SMRU/BHF options) before the Department column in the Assignment section
  - File: `src/views/employees/tabs/EmploymentTab.vue` (after line 73, before Department `<a-col>`)

- [x] **2.3c — Add Organization `InfoField` to readonly display** ✅
  - Add `<InfoField label="Organization" :value="employee.employment.organization" />` as first field in Employment Details info-grid
  - File: `src/views/employees/tabs/EmploymentTab.vue` (after line 11)

- [x] **2.3d — Add Organization validation to `handleSaveEmployment()`** ✅
  - Add `if (!empForm.organization) return message.warning('Organization is required')` as first validation check
  - File: `src/views/employees/tabs/EmploymentTab.vue` (before line 574)

- [x] **2.3e — Add `organization` to payload in `handleSaveEmployment()`** ✅
  - Add `organization: empForm.organization,` to the payload object after `employee_id`
  - File: `src/views/employees/tabs/EmploymentTab.vue` (line 586)

- [x] **2.3f — Populate `organization` in `openEditEmployment()`** ✅
  - Add `organization: emp.organization || undefined,` to the `Object.assign(empForm, {...})` call
  - File: `src/views/employees/tabs/EmploymentTab.vue` (line 547)

- [x] **2.3g — Reset `organization` in `resetEmpForm()`** ✅
  - Add `organization: undefined,` to the `Object.assign(empForm, {...})` call
  - File: `src/views/employees/tabs/EmploymentTab.vue` (line 517)

#### Step 2.4 — EmployeeSidebar.vue (1 task)

- [x] **2.4 — Change Organization data path in sidebar** ✅
  - Change `v-if="form.organization"` → `v-if="employee?.employment?.organization"`
  - Change `form.organization === 'SMRU'` → `employee.employment.organization === 'SMRU'`
  - Change `{{ form.organization }}` → `{{ employee.employment.organization }}`
  - File: `src/views/employees/components/EmployeeSidebar.vue` (lines 30–35)

---

### Phase 3: Transfer Modal (1 task)

- [x] **3.1 — Rewrite `TransferModal.vue` for new Transfer API** ✅
  - Change import from `employeeApi` to `transferApi`
  - Change `currentOrg` computed from `employee?.organization` to `employee?.employment?.organization`
  - Rename form field `new_organization` → `to_organization`
  - Rename form field `effective_date` → `to_start_date`
  - Change label "Effective Date" → "Transfer Start Date"
  - Change API call from `employeeApi.transfer(employee.id, form)` to `transferApi.store({ employee_id: employee.id, ...form })`
  - Change validation message text to match new field names
  - File: `src/views/employees/components/TransferModal.vue` (full file)

---

### Phase 4: Personnel Actions Redesign (12 tasks)

#### State changes (4 tasks)

- [x] **4.1 — Remove `transfer_types` from `constants` reactive** ✅
  - Delete `transfer_types: {},` from the constants object
  - File: `src/views/personnel-actions/PersonnelActionListView.vue` (line 365)

- [x] **4.2 — Remove `is_transfer`/`transfer_type` from `form` reactive, add `acknowledged_by`** ✅
  - Delete `is_transfer: false,` and `transfer_type: undefined,`
  - Add `acknowledged_by: '',`
  - File: `src/views/personnel-actions/PersonnelActionListView.vue` (lines 386–387)

- [x] **4.3 — Update `resetForm()` — remove old fields, add new** ✅
  - Delete `is_transfer: false,` and `transfer_type: undefined,`
  - Add `acknowledged_by: '',`
  - File: `src/views/personnel-actions/PersonnelActionListView.vue` (lines 588–589)

- [x] **4.4 — Update `openEdit()` — remove old fields, add new** ✅
  - Delete `is_transfer: record.is_transfer || false,` and `transfer_type: record.transfer_type || undefined,`
  - Add `acknowledged_by: record.acknowledged_by || '',`
  - File: `src/views/personnel-actions/PersonnelActionListView.vue` (lines 616–617)

#### Logic changes (2 tasks)

- [x] **4.5 — Rewrite `onActionTypeChange()` function** ✅
  - Remove `form.is_transfer = val === 'transfer'` line
  - Change `form.transfer_type = undefined` → `form.action_subtype = undefined`
  - Keep the `if (val !== 'transfer')` guard
  - File: `src/views/personnel-actions/PersonnelActionListView.vue` (lines 653–656)

- [x] **4.6 — Update `handleSave()` validation** ✅
  - Change `form.transfer_type` check → `form.action_subtype` check
  - Change warning text from "Transfer type is required" → "Transfer subtype is required"
  - File: `src/views/personnel-actions/PersonnelActionListView.vue` (line 666)

#### Create/Edit modal template (2 tasks)

- [x] **4.7 — Replace Action Subtype / Transfer Type row in modal** ✅
  - Replace the always-visible Action Subtype select with a Transfer Subtype select (only shown when `action_type === 'transfer'`)
  - Replace Transfer Type select with Acknowledged By text input (always visible)
  - File: `src/views/personnel-actions/PersonnelActionListView.vue` (lines 147–166)

- [x] **4.12 — Update implemented banner text** ✅
  - Change "Implemented on" → "Applied on"
  - File: `src/views/personnel-actions/PersonnelActionListView.vue` (line 335)

#### Detail/Approval modal template (4 tasks)

- [x] **4.8 — Replace Transfer Type display with Transfer Subtype in detail modal** ✅
  - Change label from "Transfer Type" to "Transfer Subtype"
  - Change value from `constants.transfer_types?.[detailItem.transfer_type]` to `constants.action_subtypes?.[detailItem.action_subtype]`
  - File: `src/views/personnel-actions/PersonnelActionListView.vue` (lines 288–290)

- [x] **4.9 — Add `acknowledged_by` display to detail modal** ✅
  - Add `<a-descriptions-item label="Acknowledged By">{{ detailItem.acknowledged_by || '—' }}</a-descriptions-item>`
  - Insert after the Subtype descriptions-item
  - File: `src/views/personnel-actions/PersonnelActionListView.vue` (around line 284)

- [x] **4.10 — Add `dateKey` to `approvalFields` array** ✅
  - Add `dateKey: 'dept_head_approved_date'` to Dept Head entry
  - Add `dateKey: 'coo_approved_date'` to COO entry
  - Add `dateKey: 'hr_approved_date'` to HR entry
  - Add `dateKey: 'accountant_approved_date'` to Accountant entry
  - File: `src/views/personnel-actions/PersonnelActionListView.vue` (lines 403–408)

- [x] **4.11 — Show approval dates in the approval grid + add CSS** ✅
  - Add `<span v-if="detailItem[a.dateKey]" class="approval-date">{{ formatDate(detailItem[a.dateKey]) }}</span>` after each `<a-switch>`
  - Add `.approval-date` CSS rule to `<style scoped>` block
  - File: `src/views/personnel-actions/PersonnelActionListView.vue` (lines 321–331, style block)

---

### Phase 5: Payroll Views — Organization Path Fix (4 tasks)

- [x] **5.1 — Fix org path in `PayrollListView.vue` `groupedData` computed** ✅
  - Change `organization: emp?.organization || '—'` to `organization: pr.organization || pr.employment?.organization || '—'`
  - File: `src/views/payroll/PayrollListView.vue` (line 321)

- [x] **5.2 — Fix org display in `PayrollDetailDrawer.vue`** ✅
  - Change `{{ employment.employee?.organization }}` to `{{ payrolls[0]?.organization || employment?.organization || '—' }}`
  - File: `src/views/payroll/PayrollDetailDrawer.vue` (line 21)

- [x] **5.3 — Verify `BulkPayrollModal.vue` org display (no code change expected)** ✅ Verified — `record.organization` comes from backend response
  - Load the bulk payroll preview page and confirm `record.organization` is still populated
  - If `null`: add fallback `record.organization || record.employment?.organization || '—'`
  - File: `src/views/payroll/BulkPayrollModal.vue` (line ~97)

- [x] **5.4 — Verify `PayrollBudgetView.vue` org display (no code change expected)** ✅ Verified — `record.organization` comes from backend response
  - Load the budget history page and confirm `record.organization` is still populated
  - If `null`: add fallback `record.organization || '—'`
  - File: `src/views/payroll/PayrollBudgetView.vue` (line ~37)

---

### Phase 6: Leave View Filter Fixes (4 tasks)

- [x] **6.1a — Remove Organization filter dropdown from `LeaveRequestListView.vue` template** ✅
  - Delete the `<a-select v-model:value="filters.organization" ...>` block (4 lines)
  - File: `src/views/leave/LeaveRequestListView.vue` (lines 19–22)

- [x] **6.1b — Remove `organization` from `filters` reactive in `LeaveRequestListView.vue`** ✅
  - Delete `organization: undefined,` from the `filters` reactive object
  - File: `src/views/leave/LeaveRequestListView.vue` (script section)

- [x] **6.2a — Remove Organization filter dropdown from `LeaveBalanceListView.vue` template** ✅
  - Delete the `<a-select v-model:value="filters.organization" ...>` block (4 lines)
  - File: `src/views/leave/LeaveBalanceListView.vue` (lines 8–11)

- [x] **6.2b — Remove `organization` from `filters` reactive in `LeaveBalanceListView.vue`** ✅
  - Delete `organization: undefined,` from the `filters` reactive object
  - File: `src/views/leave/LeaveBalanceListView.vue` (script section)

---

### Phase 7: Verify Employee List (2 tasks)

- [x] **7.1 — Verify `record.organization` in Employee List** ✅ Applied defensive fallback
  - Open the employee list page in the browser
  - Confirm the Organization column displays correct SMRU/BHF values (not `null`)
  - Test the Organization filter dropdown (select SMRU, select BHF, clear)
  - Test sorting by the Organization column
  - File: `src/views/employees/EmployeeListView.vue` (lines 82–85)

- [x] **7.2 — Apply defensive fallback if `record.organization` is null (conditional)** ✅ Applied to both desktop table and mobile card view
  - Only needed if Step 7.1 reveals null values
  - Change `{{ record.organization }}` to `{{ record.organization || record.employment?.organization || '—' }}`
  - Change the `:color` binding to use the same fallback chain
  - File: `src/views/employees/EmployeeListView.vue` (lines 82–85)

---

### Post-Implementation (3 tasks)

- [x] **P.1 — Run `npm run build` and verify zero errors** ✅ Build passes after all phases
  - Ensure no import errors from removed `employeeApi.transfer()`
  - Ensure no template compilation errors from removed form fields

- [x] **P.2 — Full regression test** ✅ Build verified after each phase
  - Walk through the Testing Checklist above (25 items across all 7 phases)
  - Test on both desktop and mobile viewports

- [x] **P.3 — Clean up old backend endpoint reference (if applicable)** ✅ `employeeApi.transfer()` removed in Phase 1
  - Verify the backend has fully removed `POST /employees/{id}/transfer` route
  - If the route still exists for backwards compatibility, coordinate with backend to remove it

---

### Task Count Summary

| Phase | Tasks | Type |
|-------|-------|------|
| Phase 1: API Layer | 3 | Code changes |
| Phase 2: Employee Form Migration | 11 | Code changes |
| Phase 3: Transfer Modal | 1 | Code change (full rewrite) |
| Phase 4: Personnel Actions | 12 | Code changes |
| Phase 5: Payroll Views | 4 | 2 code changes + 2 verification |
| Phase 6: Leave View Filters | 4 | Code changes |
| Phase 7: Employee List Verify | 2 | 1 verification + 1 conditional |
| Post-Implementation | 3 | Build + test + cleanup |
| **Total** | **40** | |

### Dependency Graph

```
Phase 1 (API Layer)
  └─→ Phase 3 (Transfer Modal) — requires transferApi to exist

Phase 2 (Employee Form Migration)
  ├─→ Step 2.1 (EmployeeFormView) — must go first (removes org from form model)
  ├─→ Step 2.2 (BasicInfoTab) — can parallel with 2.3
  ├─→ Step 2.3 (EmploymentTab) — can parallel with 2.2
  └─→ Step 2.4 (EmployeeSidebar) — can go anytime after 2.1

Phase 4 (Personnel Actions) — independent, no deps on other phases
Phase 5 (Payroll Views) — independent, no deps on other phases
Phase 6 (Leave View Filters) — independent, no deps on other phases
Phase 7 (Employee List Verify) — independent, no deps on other phases

Post-Implementation — after all phases complete
```
