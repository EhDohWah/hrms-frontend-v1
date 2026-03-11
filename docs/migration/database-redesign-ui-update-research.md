# Database Redesign — Frontend UI Update Research

**Date:** 2026-03-09
**Backend Reference:** `hrms-backend-api-v1/docs/migrations/database-redesign-research.md`
**Status:** Research complete — ready for implementation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Backend Changes That Impact Frontend](#2-backend-changes-that-impact-frontend)
3. [API Response Shape Changes](#3-api-response-shape-changes)
4. [Complete File Impact Inventory](#4-complete-file-impact-inventory)
5. [Category A: Organization Data Access Path Changes](#5-category-a-organization-data-access-path-changes)
6. [Category B: Employee Form — Remove Organization Field](#6-category-b-employee-form--remove-organization-field)
7. [Category C: Employment Form — Add Organization Field](#7-category-c-employment-form--add-organization-field)
8. [Category D: TransferModal — New API Endpoint](#8-category-d-transfermodal--new-api-endpoint)
9. [Category E: Personnel Action — Form Redesign](#9-category-e-personnel-action--form-redesign)
10. [Category F: New Transfer API Client](#10-category-f-new-transfer-api-client)
11. [Category G: Broken Organization Filters (Pre-existing)](#11-category-g-broken-organization-filters-pre-existing)
12. [Category H: No Changes Needed](#12-category-h-no-changes-needed)
13. [Implementation Order](#13-implementation-order)
14. [Golden Rules for Frontend](#14-golden-rules-for-frontend)

---

## 1. Executive Summary

The backend redesign made 4 structural changes:

| Change | Impact on Frontend |
|--------|-------------------|
| **`organization` moved from `employees` → `employments`** | Every place reading `employee.organization` or `record.organization` from employee API responses must change to `employee.employment?.organization` or `record.employment?.organization` |
| **New `transfers` table + API** | `TransferModal.vue` must switch from `employeeApi.transfer()` to the new `transferApi.store()`. New `transferApi.js` needed. |
| **`personnel_actions` redesigned** | Remove `is_transfer`/`transfer_type` from form. Add `acknowledged_by` + 4 approval date fields. Update action type/subtype options. |
| **`payrolls.organization` snapshot added** | Payroll views may already work if backend resources return `organization` at the payroll level. Verify response shape. |

**Total files to modify: ~18 files**
**New files to create: 1 (transferApi.js)**

---

## 2. Backend Changes That Impact Frontend

### 2.1 Organization Column Moved

```
BEFORE:  employee.organization       (direct column on employees table)
AFTER:   employment.organization     (column on employments table)
```

The backend added a **convenience accessor** on the Employee model:
```php
// Employee.php — getOrganizationAttribute()
public function getOrganizationAttribute(): ?string
{
    return $this->employment?->organization;
}
```

This means **API Resources** that return `$this->organization` on an Employee will still work IF the `employment` relationship is eager-loaded. However, responses that return `employee` as a nested object (e.g., inside payroll, leave request, attendance) may NOT have the accessor available depending on how the resource transforms the data.

**The backend API Resources were already updated** to use `$this->employment?->organization` or `$this->employee->employment?->organization` for all resources. So the JSON response key `organization` should still exist at the same level as before, BUT the data now comes from the employment relationship.

### 2.2 Payroll Organization Snapshot

Payrolls now have their own `organization` column stamped at generation time. The `PayrollResource` returns `$this->organization` (direct from payrolls table). This is a transparent change — frontend payroll views should work without modification IF they read `record.organization` from the payroll response.

### 2.3 New Transfer System

```
OLD:  POST /api/v1/employees/{id}/transfer  (on EmployeeController)
NEW:  POST /api/v1/transfers                (on TransferController)
```

New transfer API:
```
GET    /api/v1/transfers           → list transfers (paginated, filterable)
POST   /api/v1/transfers           → create transfer + update employment.organization
GET    /api/v1/transfers/{id}      → show single transfer
DELETE /api/v1/transfers/{id}      → soft delete
```

New payload shape:
```json
{
  "employee_id": 1,
  "to_organization": "BHF",
  "to_start_date": "2026-04-01",
  "reason": "Organizational restructuring"
}
```

Note: `from_organization` and `from_start_date` are auto-populated by the backend.

### 2.4 Personnel Action Changes

**Removed fields:** `is_transfer`, `transfer_type`
**Added fields:** `acknowledged_by`, `dept_head_approved_date`, `coo_approved_date`, `hr_approved_date`, `accountant_approved_date`

**Action types expanded** (from 6 to 11):
```
OLD: appointment, fiscal_increment, title_change, voluntary_separation, position_change, transfer
NEW: appointment, fiscal_increment, title_change, voluntary_separation, re_evaluated_pay,
     promotion, demotion, end_of_contract, work_allocation, transfer, position_change
```

**Subtypes simplified** (now only for transfers):
```
OLD: re_evaluated_pay_adjustment, promotion, demotion, end_of_contract, work_allocation
NEW: internal_department, site_to_site
```

**Behavior change:** Actions now apply to employment IMMEDIATELY on save (no waiting for approvals). Approvals are just recording paper form signatures — they no longer trigger implementation.

---

## 3. API Response Shape Changes

### 3.1 Employee List/Show Response

The backend `EmployeeResource` and `EmployeeDetailResource` were updated to return:
```json
{
  "id": 1,
  "organization": "SMRU",          // ← still present (from accessor or resource)
  "staff_id": "0096",
  "first_name_en": "John",
  "employment": {
    "id": 5,
    "organization": "SMRU",        // ← NEW: now also on employment
    "department": { "name": "Lab" },
    ...
  }
}
```

**Key insight:** `record.organization` on employee list responses should still work because the backend resource derives it from employment. BUT this depends on the `employment` relationship being eager-loaded. If any endpoint doesn't eager-load employment, `organization` will be `null`.

### 3.2 Payroll Response

```json
{
  "id": 1,
  "organization": "SMRU",          // ← NEW: direct from payrolls.organization snapshot
  "employment": {
    "id": 5,
    "organization": "SMRU",        // ← also available here
    "employee": {
      "staff_id": "0096",
      ...                          // ← employee.organization removed from fillable
    }
  }
}
```

### 3.3 Personnel Action Response

```json
{
  "id": 1,
  "action_type": "promotion",
  "action_subtype": null,           // ← only for 'transfer' type now
  // REMOVED: "is_transfer", "transfer_type"
  // ADDED:
  "acknowledged_by": "Dr. Smith",
  "dept_head_approved_date": "2026-03-01",
  "coo_approved_date": "2026-03-02",
  "hr_approved_date": null,
  "accountant_approved_date": null,
  ...
}
```

### 3.4 Personnel Action Constants Response

```json
{
  "action_types": {
    "appointment": "Appointment",
    "fiscal_increment": "Fiscal Increment",
    "title_change": "Title Change",
    "voluntary_separation": "Voluntary Separation",
    "re_evaluated_pay": "Re-Evaluated Pay Adjustment",
    "promotion": "Promotion",
    "demotion": "Demotion",
    "end_of_contract": "End of Contract",
    "work_allocation": "Work Allocation",
    "transfer": "Transfer",
    "position_change": "Position Change"
  },
  "action_subtypes": {
    "internal_department": "Internal Department",
    "site_to_site": "From Site to Site"
  },
  "statuses": { ... }
  // REMOVED: "transfer_types"
}
```

---

## 4. Complete File Impact Inventory

### Files to Modify

| # | File | Category | Changes Required |
|---|------|----------|-----------------|
| 1 | `src/api/index.js` | F | Add `transferApi` export |
| 2 | `src/views/employees/EmployeeListView.vue` | A | `record.organization` data access path |
| 3 | `src/views/employees/EmployeeFormView.vue` | B | Remove `organization` from form defaults + validation |
| 4 | `src/views/employees/tabs/BasicInfoTab.vue` | B | Remove Organization form field |
| 5 | `src/views/employees/tabs/EmploymentTab.vue` | C | Add `organization` field to empForm + modal |
| 6 | `src/views/employees/components/EmployeeSidebar.vue` | A | `form.organization` → `employee?.employment?.organization` |
| 7 | `src/views/employees/components/TransferModal.vue` | D | Switch to `transferApi`, update data paths |
| 8 | `src/views/payroll/PayrollListView.vue` | A | `emp?.organization` → `pr.employment?.organization` |
| 9 | `src/views/payroll/PayrollDetailDrawer.vue` | A | `employment.employee?.organization` → `employment?.organization` or payroll-level |
| 10 | `src/views/payroll/BulkPayrollModal.vue` | A | Verify `record.organization` still works |
| 11 | `src/views/payroll/PayrollBudgetView.vue` | A | Verify `record.organization` still works |
| 12 | `src/views/personnel-actions/PersonnelActionListView.vue` | E | Remove `is_transfer`/`transfer_type`, add new fields |
| 13 | `src/views/leave/LeaveRequestListView.vue` | G | Fix broken organization filter |
| 14 | `src/views/leave/LeaveBalanceListView.vue` | G | Fix broken organization filter |

### Files to Create

| # | File | Category | Purpose |
|---|------|----------|---------|
| 1 | `src/api/transferApi.js` | F | Transfer API client |

### Files NOT Needing Changes

| File | Reason |
|------|--------|
| `src/views/grants/GrantListView.vue` | Uses `grant.organization` (grant's own field, unaffected) |
| `src/views/grants/GrantDetailView.vue` | Same — grant's own organization |
| `src/views/employees/tabs/FundingTab.vue` | Displays `grant.organization`, not employee org |
| `src/views/payroll/BulkPayslipModal.vue` | User-input selection (SMRU/BHF radio), not reading from data |
| `src/views/resignations/*` | No organization references |
| `src/views/attendance/*` | No organization column in table |
| `src/views/training/*` | No organization references |
| `src/views/holidays/*` | No organization references |
| Form tabs (BasicInfoTab except org, Identification, Contact, Financial) | No org references |
| `src/api/employeeApi.js` | Keep `transfer()` method temporarily for backwards compat, or remove if switching fully |

---

## 5. Category A: Organization Data Access Path Changes

These files read `organization` from API responses and need their data access paths updated.

### 5.1 `src/views/employees/EmployeeListView.vue`

**Current (lines 82–85, 133–134):**
```html
<a-tag :color="record.organization === 'SMRU' ? 'blue' : 'green'">
  {{ record.organization }}
</a-tag>
```

**Analysis:** `record` is from `employeeApi.list()`. The backend `EmployeeResource` was updated to derive `organization` from `$this->employment?->organization`. So `record.organization` should still work IF the employee list endpoint eager-loads the employment relationship.

**Action:** Verify API response. If `record.organization` is populated, NO change needed. If `null`, change to:
```html
<a-tag :color="(record.employment?.organization || record.organization) === 'SMRU' ? 'blue' : 'green'">
  {{ record.employment?.organization || record.organization || '—' }}
</a-tag>
```

**Sort field (line 188–190):**
```js
organization: 'organization',
```
The backend Payroll model's `scopeOrderByField` was updated. For the Employee list, verify the backend `EmployeeController` sort still works with `'organization'` key. If sorting now happens via `employments.organization`, the backend should handle the join — frontend just passes the sort key.

**Action:** Likely no change needed — backend handles the sort join.

---

### 5.2 `src/views/employees/components/EmployeeSidebar.vue`

**Current (lines 30–35):**
```html
<div v-if="form.organization" class="sidebar-meta-item">
  <span class="meta-label">Organization</span>
  <a-tag :color="form.organization === 'SMRU' ? 'blue' : 'green'" size="small">
    {{ form.organization }}
  </a-tag>
</div>
```

**Problem:** `form.organization` comes from the employee form's `defaultFormValues`. Since `organization` is being removed from the employee model, `form.organization` will be `undefined`.

**Fix:** Read from the `employee` prop (the raw API response) instead of `form`:
```html
<div v-if="employee?.employment?.organization" class="sidebar-meta-item">
  <span class="meta-label">Organization</span>
  <a-tag :color="employee.employment.organization === 'SMRU' ? 'blue' : 'green'" size="small">
    {{ employee.employment.organization }}
  </a-tag>
</div>
```

**Note:** The sidebar already receives both `form` and `employee` as props. The `employee` object has the full API response including the `employment` relationship.

---

### 5.3 `src/views/payroll/PayrollListView.vue`

**Current (line 321–322, inside `groupedData` computed):**
```js
const emp = pr.employment?.employee
// ...
organization: emp?.organization || '—',
```

**Problem:** This reads `organization` from `employment.employee` (the nested employee object within the payroll response). After the change, `employee` no longer has `organization` as a direct column. However, the `EmployeeResource` was updated to derive it from employment.

**BUT:** The payroll list response may not go through `EmployeeResource` — it might just eager-load `employee:id,staff_id,first_name_en,...` (a select subset). If `organization` isn't in the select list, it won't be available.

**Fix:** Since payrolls now have their own `organization` snapshot:
```js
organization: pr.organization || pr.employment?.organization || '—',
```

This reads from the payroll's own `organization` column (preferred), falling back to employment.

---

### 5.4 `src/views/payroll/PayrollDetailDrawer.vue`

**Current (line 21–22):**
```html
<a-descriptions-item label="Organization">
  {{ employment.employee?.organization }}
</a-descriptions-item>
```

Where `employment = payrolls.value[0]?.employment`.

**Fix:** Read from the payroll's own organization, or from employment:
```html
<a-descriptions-item label="Organization">
  {{ payrolls[0]?.organization || employment?.organization || '—' }}
</a-descriptions-item>
```

---

### 5.5 `src/views/payroll/BulkPayrollModal.vue`

**Current (line 97–98):**
```html
<a-tag :color="record.organization === 'SMRU' ? 'blue' : 'green'" size="small">
  {{ record.organization }}
</a-tag>
```

**Analysis:** `record` comes from the `bulkPreview` API response. The backend `BulkPayrollService` was updated to derive org from `employment->organization`. If the preview response still includes `organization` at the top-level of each employee record, no change is needed.

**Action:** Verify preview API response shape. Likely no change needed.

---

### 5.6 `src/views/payroll/PayrollBudgetView.vue`

**Current (line 37–39):**
```html
<a-tag :color="record.organization === 'SMRU' ? 'blue' : 'green'" size="small">
  {{ record.organization }}
</a-tag>
```

**Analysis:** `record` comes from the budget history API. The backend shapes this data server-side. If the response still includes `organization` on each row, no change needed.

**Action:** Verify API response. Likely no change needed.

---

## 6. Category B: Employee Form — Remove Organization Field

Organization is no longer a property of the employee — it belongs to the employment record. The employee create/edit form must be updated.

### 6.1 `src/views/employees/EmployeeFormView.vue`

**Current:**
```js
// Line 176
const defaultFormValues = {
  organization: undefined,    // ← REMOVE THIS
  staff_id: '',
  // ...
}

// Line 300
if (!form.organization) {
  activeTab.value = 'basic_info'
  message.warning('Organization is required')
  return false
}
```

**Changes:**
1. Remove `organization: undefined` from `defaultFormValues` (line 176)
2. Remove the `organization` validation block (lines 300–301)
3. In `populateFormFromEmployee()`, `organization` will no longer be populated (it's not in `defaultFormValues` keys, so the loop skips it automatically)

---

### 6.2 `src/views/employees/tabs/BasicInfoTab.vue`

**Current (lines 3–15):**
```html
<div class="form-section-title">Organization</div>
<a-row :gutter="16">
  <a-col :span="8">
    <a-form-item label="Organization" required>
      <a-select
        v-model:value="form.organization"
        placeholder="Select organization"
        :options="lookups.organization"
        :loading="loadingLookups"
      />
    </a-form-item>
  </a-col>
  <!-- staff_id and status fields continue... -->
```

**And readonly mode (lines 158–161):**
```html
<InfoField label="Organization" :value="form.organization" />
```

**Changes:**
1. Remove the Organization `<a-form-item>` (lines 7–14)
2. Remove the Organization `<InfoField>` from readonly section
3. Adjust the `<a-col :span>` for remaining fields (staff_id and status can now be `:span="12"` each)
4. Remove `organization: []` from `lookups` ref (line ~204)
5. Remove the section title "Organization" if it only contained the org field; or rename to something else if staff_id and status remain in this section
6. Remove the `organization` entry from `lookupApi.lists()` call if it's no longer needed

---

## 7. Category C: Employment Form — Add Organization Field

Since `organization` now lives on `employments`, the Employment tab needs a new field.

### 7.1 `src/views/employees/tabs/EmploymentTab.vue`

**Current `empForm` (lines 381–398):**
```js
const empForm = reactive({
  department_id: undefined,
  section_department_id: undefined,
  position_id: undefined,
  site_id: undefined,
  start_date: null,
  // ... salary, benefits, etc.
})
```

**Changes needed:**

#### A. Add `organization` to `empForm`
```js
const empForm = reactive({
  organization: undefined,        // ← ADD
  department_id: undefined,
  // ...rest unchanged
})
```

#### B. Add Organization field to the modal form template

In the "Assignment" section (after line 72, before the Department row):
```html
<div class="form-section-title">Assignment</div>
<a-row :gutter="16">
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
    <!-- existing Department field -->
```

#### C. Add Organization to readonly display

In the "Employment Details" info-grid (after line 11):
```html
<InfoField label="Organization" :value="employee.employment.organization" />
```

#### D. Add Organization to form validation

In `handleSaveEmployment()` (before line 574):
```js
if (!empForm.organization) return message.warning('Organization is required')
```

#### E. Add Organization to payload

In `handleSaveEmployment()` payload (line 585):
```js
const payload = {
  employee_id: props.employee.id,
  organization: empForm.organization,    // ← ADD
  department_id: empForm.department_id,
  // ...
}
```

#### F. Populate Organization when editing

In `openEditEmployment()` (line 547):
```js
Object.assign(empForm, {
  organization: emp.organization || undefined,    // ← ADD
  department_id: deptId != null ? Number(deptId) : undefined,
  // ...
})
```

#### G. Reset Organization in `resetEmpForm()`

```js
function resetEmpForm() {
  Object.assign(empForm, {
    organization: undefined,    // ← ADD
    department_id: undefined,
    // ...
  })
}
```

---

## 8. Category D: TransferModal — New API Endpoint

### 8.1 `src/views/employees/components/TransferModal.vue`

**Current behavior:**
- Reads `employee?.organization` (line 12–13, 66)
- Sends `POST /api/v1/employees/{id}/transfer` via `employeeApi.transfer()` (line 75)
- Payload: `{ new_organization, effective_date, reason }`

**New behavior:**
- Reads `employee?.employment?.organization`
- Sends `POST /api/v1/transfers` via `transferApi.store()`
- Payload: `{ employee_id, to_organization, to_start_date, reason }`

**Full changes:**

#### Template changes:
```html
<!-- Line 12-13: Current org display -->
<a-tag :color="currentOrg === 'BHF' ? 'green' : 'blue'">
  {{ currentOrg || '—' }}
</a-tag>

<!-- Line 18: field name change -->
<a-select v-model:value="form.to_organization" placeholder="Select new organization">

<!-- Line 23-29: field name change -->
<a-form-item label="Transfer Start Date" required>
  <a-date-picker
    v-model:value="form.to_start_date"
    ...
  />
</a-form-item>
```

#### Script changes:
```js
import { transferApi } from '@/api'                    // ← change import

const form = reactive({
  to_organization: undefined,                           // ← was new_organization
  to_start_date: null,                                  // ← was effective_date
  reason: '',
})

const currentOrg = computed(() =>
  props.employee?.employment?.organization              // ← was employee?.organization
)

const availableOrgs = computed(() => {
  return ['SMRU', 'BHF'].filter((o) => o !== currentOrg.value)
})

async function handleTransfer() {
  if (!form.to_organization) return message.warning('Please select the new organization')
  if (!form.to_start_date) return message.warning('Transfer start date is required')

  saving.value = true
  try {
    await transferApi.store({                           // ← was employeeApi.transfer()
      employee_id: props.employee.id,                   // ← new field
      ...form,
    })
    message.success(`Employee transferred to ${form.to_organization}`)
    emit('update:open', false)
    emit('transferred')
  } catch (err) { /* existing error handling */ }
  saving.value = false
}
```

---

## 9. Category E: Personnel Action — Form Redesign

### 9.1 `src/views/personnel-actions/PersonnelActionListView.vue`

**Current issues to fix:**

#### A. Remove `is_transfer` and `transfer_type` from form

**Current (line 381–395):**
```js
const form = reactive({
  // ...
  is_transfer: false,            // ← REMOVE
  transfer_type: undefined,      // ← REMOVE
  // ...
})
```

**Current (line 584–598 — resetForm):**
```js
is_transfer: false,              // ← REMOVE
transfer_type: undefined,        // ← REMOVE
```

**Current (line 610–628 — openEdit):**
```js
is_transfer: record.is_transfer || false,      // ← REMOVE
transfer_type: record.transfer_type || undefined, // ← REMOVE
```

#### B. Remove Transfer Type UI from modal

**Current (lines 157–165):**
```html
<a-form-item label="Transfer Type" v-if="form.action_type === 'transfer'">
  <a-select v-model:value="form.transfer_type" ...>
    <a-select-option v-for="(label, key) in constants.transfer_types" ...>
```

**Replace with:** Subtype select that only shows for `transfer` action type:
```html
<a-form-item label="Transfer Subtype" v-if="form.action_type === 'transfer'" required>
  <a-select v-model:value="form.action_subtype" placeholder="Select subtype">
    <a-select-option v-for="(label, key) in constants.action_subtypes" :key="key" :value="key">
      {{ label }}
    </a-select-option>
  </a-select>
</a-form-item>
```

#### C. Remove `transfer_types` from constants state

**Current (line 362–367):**
```js
const constants = reactive({
  action_types: {},
  action_subtypes: {},
  transfer_types: {},        // ← REMOVE
  statuses: {},
})
```

#### D. Remove `onActionTypeChange` auto-setting `is_transfer`

**Current (lines 653–656):**
```js
function onActionTypeChange(val) {
  form.is_transfer = val === 'transfer'           // ← REMOVE
  if (val !== 'transfer') form.transfer_type = undefined   // ← REMOVE
}
```

**Replace with:**
```js
function onActionTypeChange(val) {
  if (val !== 'transfer') form.action_subtype = undefined
}
```

#### E. Update validation in `handleSave`

**Current (line 666):**
```js
if (form.action_type === 'transfer' && !form.transfer_type) return message.warning('Transfer type is required')
```

**Replace with:**
```js
if (form.action_type === 'transfer' && !form.action_subtype) return message.warning('Transfer subtype is required')
```

#### F. Add `acknowledged_by` field to form

Add to form reactive:
```js
acknowledged_by: '',
```

Add to modal template (in Section 4 area, near comments):
```html
<a-form-item label="Acknowledged By">
  <a-input v-model:value="form.acknowledged_by" placeholder="Name from paper form" />
</a-form-item>
```

#### G. Add approval dates to detail modal

**Current approval grid (lines 320–332):** Shows switches for `dept_head_approved`, `coo_approved`, etc.

**Enhancement:** Show approval dates alongside each switch:
```html
<div v-for="a in approvalFields" :key="a.key" class="approval-item">
  <span class="approval-label">{{ a.label }}</span>
  <a-switch ... />
  <span v-if="detailItem[a.dateKey]" class="approval-date">
    {{ formatDate(detailItem[a.dateKey]) }}
  </span>
</div>
```

Update `approvalFields` to include date keys:
```js
const approvalFields = [
  { key: 'dept_head_approved', dateKey: 'dept_head_approved_date', label: 'Department Head', type: 'dept_head' },
  { key: 'coo_approved', dateKey: 'coo_approved_date', label: 'COO', type: 'coo' },
  { key: 'hr_approved', dateKey: 'hr_approved_date', label: 'HR', type: 'hr' },
  { key: 'accountant_approved', dateKey: 'accountant_approved_date', label: 'Accountant', type: 'accountant' },
]
```

#### H. Update detail modal to remove Transfer Type display

**Current (lines 288–290):**
```html
<a-descriptions-item label="Transfer Type" v-if="detailItem.action_type === 'transfer'">
  {{ constants.transfer_types?.[detailItem.transfer_type] || '—' }}
</a-descriptions-item>
```

**Replace with:**
```html
<a-descriptions-item label="Transfer Subtype" v-if="detailItem.action_type === 'transfer'">
  {{ constants.action_subtypes?.[detailItem.action_subtype] || '—' }}
</a-descriptions-item>
```

#### I. Add `acknowledged_by` to detail modal
```html
<a-descriptions-item label="Acknowledged By">
  {{ detailItem.acknowledged_by || '—' }}
</a-descriptions-item>
```

#### J. Remove "Implemented on" banner behavior change

**Current (line 334–336):** Shows "Implemented on {date}" banner.

Since actions now apply immediately on save, `implemented_at` should be set on creation. The banner logic stays the same, but the UX meaning changes — it always shows for saved actions. Consider whether to keep or remove this banner since all actions are now "implemented" immediately.

**Recommendation:** Keep the banner but change text to:
```html
<div v-if="detailItem.implemented_at" class="implemented-banner">
  Applied on {{ formatDate(detailItem.implemented_at) }}
</div>
```

---

## 10. Category F: New Transfer API Client

### 10.1 Create `src/api/transferApi.js`

```js
import client from './axios'

export const transferApi = {
  list:    (params)      => client.get('/transfers', { params }),
  show:    (id)          => client.get(`/transfers/${id}`),
  store:   (payload)     => client.post('/transfers', payload),
  destroy: (id)          => client.delete(`/transfers/${id}`),
}
```

### 10.2 Update `src/api/index.js`

Add export:
```js
export { transferApi } from './transferApi'
```

### 10.3 Decide on `employeeApi.transfer()` — Deprecate or Remove?

**Current:**
```js
// src/api/employeeApi.js
transfer: (id, payload) => client.post(`/employees/${id}/transfer`, payload),
```

The backend may have removed or updated this endpoint. Options:
- **Remove** if the backend endpoint was deleted (check backend routes)
- **Keep temporarily** and mark as deprecated if both endpoints exist

**Recommendation:** Remove `transfer()` from `employeeApi.js` since `TransferModal` will use `transferApi.store()`.

---

## 11. Category G: Broken Organization Filters (Pre-existing)

These are bugs that existed BEFORE the redesign but should be fixed as part of this update.

### 11.1 `src/views/leave/LeaveRequestListView.vue`

**Bug:** Organization filter dropdown exists in the UI (lines 19–22) bound to `filters.organization`, but `fetchRequests()` (lines 337–342) never sends it to the API.

**Current `fetchRequests` params:**
```js
const params = {
  ...(search.value && { search: search.value }),
  ...(filters.status && { status: filters.status }),
  // filters.organization is NEVER sent!
}
```

**Fix options:**
1. Wire up the filter: add `...(filters.organization && { organization: filters.organization })` to params
2. Or remove the filter dropdown from the UI

**Note:** The backend `LeaveRequestController` filter parameter name needs verification — it might not support an `organization` filter at all (the leave request doesn't have an organization column; it would need to filter through `employee.employment.organization`).

**Recommendation:** Remove the organization filter from LeaveRequestListView for now. It would require backend changes to support filtering through nested relationships. Add it back when the backend adds support.

### 11.2 `src/views/leave/LeaveBalanceListView.vue`

**Bug:** Same issue — organization filter exists in UI (lines 8–11) but never sent in `fetchBalances()` (lines 97–102).

**Recommendation:** Same as above — remove the filter from UI or wire it up once backend supports it.

---

## 12. Category H: No Changes Needed

These files reference `organization` but are NOT affected by the redesign:

| File | Why No Change |
|------|--------------|
| `src/views/grants/GrantListView.vue` | Uses `grant.organization` — grants have their own org field, unchanged |
| `src/views/grants/GrantDetailView.vue` | Same — grant's own organization |
| `src/views/employees/tabs/FundingTab.vue` | Displays `grant.organization` from grant structure, not employee org |
| `src/views/payroll/BulkPayslipModal.vue` | User selects org via radio button, sends as API param — not reading from data |
| `src/views/payroll/BulkPayrollModal.vue` (step 1) | Same — org selection radio is user input, not data display |
| `src/api/personnelActionApi.js` | No changes needed — endpoints stay the same |
| `src/api/employmentApi.js` | No changes needed — already sends employment data |
| `src/views/resignations/*` | No organization references in these views |
| `src/views/attendance/*` | No organization column displayed |
| `src/views/training/*` | No organization references |
| `src/views/holidays/*` | No organization references |

---

## 13. Implementation Order

### Phase 1: API Layer (2 files) — Non-breaking

| Step | File | Action |
|------|------|--------|
| 1.1 | `src/api/transferApi.js` | CREATE — new transfer API client |
| 1.2 | `src/api/index.js` | ADD `transferApi` export |

### Phase 2: Employee Form — Organization Field Migration (4 files)

| Step | File | Action |
|------|------|--------|
| 2.1 | `src/views/employees/EmployeeFormView.vue` | Remove `organization` from `defaultFormValues` + `validateForm()` |
| 2.2 | `src/views/employees/tabs/BasicInfoTab.vue` | Remove Organization form field + lookup |
| 2.3 | `src/views/employees/tabs/EmploymentTab.vue` | Add `organization` to empForm, modal, validation, payload |
| 2.4 | `src/views/employees/components/EmployeeSidebar.vue` | Change `form.organization` → `employee?.employment?.organization` |

### Phase 3: Transfer Modal (1 file)

| Step | File | Action |
|------|------|--------|
| 3.1 | `src/views/employees/components/TransferModal.vue` | Switch to `transferApi`, update field names + data paths |

### Phase 4: Personnel Actions (1 file)

| Step | File | Action |
|------|------|--------|
| 4.1 | `src/views/personnel-actions/PersonnelActionListView.vue` | Remove `is_transfer`/`transfer_type`, add `acknowledged_by` + approval dates, update action type handling |

### Phase 5: Payroll Views — Organization Path Fix (4 files)

| Step | File | Action |
|------|------|--------|
| 5.1 | `src/views/payroll/PayrollListView.vue` | Fix `groupedData` computed org path |
| 5.2 | `src/views/payroll/PayrollDetailDrawer.vue` | Fix org display path |
| 5.3 | `src/views/payroll/BulkPayrollModal.vue` | Verify `record.organization` still works |
| 5.4 | `src/views/payroll/PayrollBudgetView.vue` | Verify `record.organization` still works |

### Phase 6: Leave View Filter Fixes (2 files)

| Step | File | Action |
|------|------|--------|
| 6.1 | `src/views/leave/LeaveRequestListView.vue` | Remove broken org filter (or wire up) |
| 6.2 | `src/views/leave/LeaveBalanceListView.vue` | Remove broken org filter (or wire up) |

### Phase 7: Verify Employee List (1 file)

| Step | File | Action |
|------|------|--------|
| 7.1 | `src/views/employees/EmployeeListView.vue` | Verify `record.organization` still works (backend accessor) |

---

## 14. Golden Rules for Frontend

| # | Rule |
|---|------|
| 1 | **Never read `employee.organization` directly** — always read from `employee.employment?.organization` or the API resource's computed `organization` field |
| 2 | **Never send `organization` in employee create/update payloads** — it's now an employment field |
| 3 | **Payroll organization = payroll's own snapshot** — prefer `payroll.organization` over `payroll.employment.organization` |
| 4 | **Transfer uses `transferApi`** — not `employeeApi.transfer()` |
| 5 | **Personnel Actions never reference `is_transfer` or `transfer_type`** — use `action_type === 'transfer'` + `action_subtype` |
| 6 | **Grant's `organization` is independent** — grant.organization is the funding source org, completely separate from employee/employment org |
| 7 | **Organization filters should target employment** — filter params that filter by org should be documented to filter through the employment relationship |

---

## Appendix A: Full Reactive State Declarations Referencing Organization

| File | Line | Declaration | Change |
|------|------|-------------|--------|
| `EmployeeListView.vue` | 173 | `filters = reactive({ organization: undefined, ... })` | Keep (filter still works) |
| `EmployeeFormView.vue` | 176 | `organization: undefined` in `defaultFormValues` | REMOVE |
| `BasicInfoTab.vue` | ~204 | `organization: []` in `lookups` ref | REMOVE |
| `TransferModal.vue` | 59 | `new_organization: undefined` in `form` | Change to `to_organization` |
| `PayrollListView.vue` | 269 | `filters = reactive({ organization: undefined, ... })` | Keep |
| `BulkPayrollModal.vue` | 271 | `organization: null` in `wizardForm` | Keep (user selection) |
| `BulkPayslipModal.vue` | 67 | `organization: null` in `form` | Keep (user selection) |
| `LeaveRequestListView.vue` | 254 | `organization: undefined` in `filters` | REMOVE (filter is broken) |
| `LeaveBalanceListView.vue` | 73 | `organization: undefined` in `filters` | REMOVE (filter is broken) |
| `PersonnelActionListView.vue` | 386 | `is_transfer: false` in `form` | REMOVE |
| `PersonnelActionListView.vue` | 387 | `transfer_type: undefined` in `form` | REMOVE |
| `PersonnelActionListView.vue` | 365 | `transfer_types: {}` in `constants` | REMOVE |
| `GrantListView.vue` | 221 | `organization: undefined` in `form` | Keep (grant's own org) |
| `GrantDetailView.vue` | 197 | `organization: undefined` in `grantForm` | Keep (grant's own org) |

---

## Appendix B: API Parameter Name Reference

| View | API Call | Param Name | Notes |
|------|---------|------------|-------|
| Employee List | `employeeApi.list()` | `filter_organization` | Backend filters on `employments.organization` now |
| Payroll List | `payrollApi.list()` | `filter_organization` | Backend filters on `payrolls.organization` (snapshot) |
| Budget History | `payrollApi.budgetHistory()` | `organization` | Note: no `filter_` prefix |
| Bulk Preview | `payrollApi.bulkPreview()` | `subsidiaries: [org]` | Inside `filters` object in POST body |
| Bulk Create | `payrollApi.bulkStore()` | `subsidiaries: [org]` | Same |
| Bulk Payslips | `payrollApi.bulkPayslips()` | `organization` | Top-level POST body field |
| Transfer | `transferApi.store()` | `to_organization` | NEW endpoint |

---

## Appendix C: Backend Endpoint Changes Summary

| Endpoint | Status | Frontend Impact |
|----------|--------|----------------|
| `POST /employees/{id}/transfer` | **REPLACED** by new Transfer system | Switch `TransferModal` to `POST /transfers` |
| `GET /transfers` | **NEW** | Add `transferApi.list()` |
| `POST /transfers` | **NEW** | Add `transferApi.store()` |
| `GET /transfers/{id}` | **NEW** | Add `transferApi.show()` |
| `DELETE /transfers/{id}` | **NEW** | Add `transferApi.destroy()` |
| `GET /personnel-actions/constants` | **UPDATED** | `transfer_types` removed from response, `action_subtypes` changed |
| `POST /personnel-actions` | **UPDATED** | `is_transfer`/`transfer_type` no longer accepted; new action types accepted |
| `PATCH /personnel-actions/{id}/approve` | **UPDATED** | Now also stores approval date |
| `POST /employees` | **UPDATED** | `organization` no longer accepted |
| `PUT /employees/{id}` | **UPDATED** | `organization` no longer accepted |
| `POST /employments` | **UPDATED** | `organization` now required |
| `PUT /employments/{id}` | **UPDATED** | `organization` now accepted |
