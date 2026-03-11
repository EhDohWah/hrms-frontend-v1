# Employee Form Architecture — Frappe-Style Inline Tabbed Form

> **Design Reference:** [frappe-employee-ui-design.md](./frappe-employee-ui-design.md)
> **Implementation Date:** February 2026

---

## Overview

The Employee module uses a **single full-page form** pattern inspired by Frappe HRMS. Both creating and editing employees happen on the same page component (`EmployeeFormView.vue`), with inline editable tabs, a "Not Saved" dirty indicator, URL hash per tab, and a right sidebar with employee metadata.

This replaces the previous modal-based pattern where creating/editing was done via modals in the list view and detail view.

---

## File Structure

```
src/views/employees/
  EmployeeListView.vue              # List page — table with search, filters, "Add Employee" navigates to /new
  EmployeeFormView.vue              # Main form page — orchestrates tabs, form state, save, dirty detection
  components/
    EmployeeSidebar.vue             # Right sidebar — avatar, name, staff ID, org, status, timestamps
  tabs/
    BasicInfoTab.vue                # Tab 1 — Organization, Staff ID, Status, Names, Gender, DOB, Demographics
    IdentificationTab.vue           # Tab 2 — ID Type/Number, Issue/Expiry, SSN, Tax, Driver License
    ContactFamilyTab.vue            # Tab 3 — Phone, Addresses, Spouse, Parents, Emergency Contact
    FinancialTab.vue                # Tab 4 — Bank details, Remark
    LeaveTab.vue                    # Tab 5 — Leave balances read-only table
    RecordsTab.vue                  # Tab 6 — Education, Children, Languages, Beneficiaries (modal CRUD)
    EmploymentTab.vue               # Tab 7 — Employment records + Probation (modal CRUD)
    FundingTab.vue                  # Tab 8 — Funding allocations (modal CRUD)
```

---

## Routes

```js
// src/router/routes.js
{
  path: 'employees/new',
  name: 'employee-new',
  component: () => import('@/views/employees/EmployeeFormView.vue'),
  meta: { title: 'New Employee', permission: 'employees' },
},
{
  path: 'employees/:id',
  name: 'employee-detail',
  component: () => import('@/views/employees/EmployeeFormView.vue'),
  meta: { title: 'Employee Detail', permission: 'employees' },
},
```

Both routes point to the same component. `isEditMode` is derived from `!!route.params.id`.

---

## Page Layout

```
+-------------------------------------------------------------+
| <- All Employees    Employee Name   [Not Saved]     [Save]  |
+-------------------------------------------------------------+
| Basic Info | ID | Contact | Financial | Leave | Records | .. |
+------------------------------------------+------------------+
|                                          | [Avatar / Upload] |
|  Inline form fields for the active tab   | John Doe          |
|  (editable if canEdit, InfoField if not) | Staff ID: 0101    |
|                                          | Org: SMRU         |
|                                          | Status: Local ID  |
|                                          |                   |
|                                          | Created: 01 Jan   |
|                                          | Updated: 23 Feb   |
+------------------------------------------+------------------+
```

---

## Tab Structure

| # | Tab | Hash Key | Mode | Content |
|---|-----|----------|------|---------|
| 1 | Basic Info | `#basic_info` | Inline form | Org, Staff ID, Status, Names EN/TH, Gender, DOB, Marital, Nationality, Religion, Military |
| 2 | Identification | `#identification` | Inline form | ID Type/Number, Issue/Expiry, SSN, Tax Number, Driver License |
| 3 | Contact & Family | `#contact_family` | Inline form | Mobile, Addresses, Spouse, Parents, Emergency Contact |
| 4 | Financial | `#financial` | Inline form | Bank Name/Branch/Account, Remark |
| 5 | Leave Balances | `#leave` | Read-only | Leave balances table (edit-mode only) |
| 6 | Records | `#records` | Modal CRUD | Education, Children, Languages, Beneficiaries (edit-mode only) |
| 7 | Employment | `#employment` | Modal CRUD | Employment records + Probation (edit-mode only) |
| 8 | Funding | `#funding` | Modal CRUD | Funding allocations (edit-mode only) |

- **Tabs 1-4**: Saved together via single Save button (employee API `store`/`update`)
- **Tabs 5-8**: Separate sub-resources with own APIs and modal-based editing
- **New employees** (`/employees/new`): Only tabs 1-4 visible

---

## Core Patterns

### Dirty State Detection

```js
const form = reactive({ ...defaultFormValues })
const savedSnapshot = ref(JSON.stringify(defaultFormValues))
const isDirty = computed(() => JSON.stringify(form) !== savedSnapshot.value)
```

- `savedSnapshot` is updated after every successful load/save via `takeSnapshot()`
- An orange "Not Saved" `<a-tag>` appears in the header when `isDirty` is true
- Any field change on any tab (1-4) triggers the indicator

### Unsaved Changes Guard

Two layers of protection:

1. **Vue Router guard** — `onBeforeRouteLeave` shows a `window.confirm()` dialog if dirty
2. **Browser guard** — `beforeunload` event prevents accidental tab/browser close

### URL Hash Sync

```js
function syncTabFromHash() {
  const hash = route.hash?.replace('#', '')
  if (hash && allTabs.includes(hash)) activeTab.value = hash
}

function onTabChange(key) {
  router.replace({ hash: `#${key}` })
}

watch(() => route.hash, syncTabFromHash)
```

- Tab click updates the URL hash via `router.replace()`
- Page load/refresh reads the hash and activates the matching tab
- Browser back/forward navigation switches tabs via the `watch`

### Keyboard Shortcut

`Ctrl+S` / `Cmd+S` triggers save when the form is dirty and the user has edit permission.

### Save Flow

1. **Validate** required fields (Organization, Staff ID, First Name EN, Gender, DOB, Status)
2. If validation fails, switch to the tab with the error and show a warning
3. **Build payload** — strip empty/null/undefined values from the form
4. **Create**: `employeeApi.store(payload)` then `router.replace({ name: 'employee-detail', params: { id: newId } })`
5. **Update**: `employeeApi.update(id, payload)` then reload employee and take new snapshot

---

## Data Flow

```
EmployeeFormView.vue
  |
  |-- form (reactive) ---------> Tabs 1-4 bind via :form prop
  |                    ---------> Sidebar reads for live preview
  |
  |-- employee (ref) ----------> Tabs 5-8 read for display
  |                   ----------> Sidebar reads for timestamps
  |
  |-- Save button ------------> employeeApi.store/update with form data
  |
  |-- Tabs 5-8 modals --------> emit('refresh') -> parent calls loadEmployee()
```

### Tab Props

| Tab Type | Props Received | Emits |
|----------|---------------|-------|
| Tabs 1-4 (editable) | `:form` (reactive object), `:readonly` (boolean) | None (mutates form directly) |
| Tabs 5-8 (display) | `:employee` (ref value) | `@refresh` (triggers parent reload) |

---

## Permission Logic

| Context | Check | Result |
|---------|-------|--------|
| Save button visibility | `authStore.canEdit('employees')` | Show/hide Save button |
| Form vs InfoField | `:readonly="!canEdit"` prop | Tabs render form inputs or read-only InfoFields |
| Employment tab actions | `authStore.canEdit('employment_records')` | Show/hide Add/Edit/Delete buttons |
| Funding tab manage | `authStore.canEdit('employees')` | Show/hide Manage button |
| Profile picture upload | `isEditMode && canEdit` | Show/hide upload overlay |

---

## Sub-Resource APIs

| Resource | API Module | Endpoints |
|----------|-----------|-----------|
| Education | `employeeEducationApi` | `/employee-education` |
| Children | `employeeChildApi` | `/employee-children` |
| Languages | `employeeLanguageApi` | `/employee-language` |
| Beneficiaries | `employeeBeneficiaryApi` | `/employee-beneficiaries` |
| Employment | `employmentApi` | `/employment-records` |
| Funding | `fundingAllocationApi` | `/employee-funding-allocations` |
| Leave Balances | `leaveApi.balances` | `/leave-balances` |

All defined in `src/api/employeeRecordApi.js` (Education, Children, Languages, Beneficiaries) and their respective API files.

---

## Records Tab (Education, Children, Languages, Beneficiaries)

Each record type follows the same pattern:

1. **Display**: Simple `<a-table>` showing records filtered by `employee_id`
2. **Add**: Button opens a modal with form fields, calls `api.store()`
3. **Edit**: Row action opens modal pre-filled with record data, calls `api.update()`
4. **Delete**: Row action with confirmation dialog, calls `api.destroy()`
5. **Refresh**: After any CRUD operation, emits `refresh` to parent which reloads the employee

### Known Backend Quirks

- **Children**: API stores name as `name` field (not `child_name`). Table column uses `dataIndex: 'name'`.
- **Languages**: API requires `created_by` and `updated_by` fields in the payload. These are set from `authStore.user?.name`.

---

## Sidebar Component

`EmployeeSidebar.vue` shows:

- **Avatar**: Displays profile picture if available, initials if not. Upload overlay in edit mode.
- **Name**: Live preview from `form.first_name_en` / `form.last_name_en` (updates as user types)
- **Thai Name**: `form.first_name_th` / `form.last_name_th`
- **Staff ID**: From `form.staff_id`
- **Organization**: Colored `<a-tag>` (blue for SMRU, green for BHF)
- **Status**: Colored `<a-tag>` based on status value
- **Timestamps**: Created/Updated dates from `employee` prop (edit mode only)

---

## Auth Store: API Response Unwrapping

The `GET /user` endpoint returns `{ success: true, data: { id, name, email, ... } }`. The auth store's `fetchUser()` must unwrap this:

```js
const userData = data.data || data  // unwrap, with fallback
user.value = userData
```

This pattern (`data.data || data`) safely handles both wrapped and unwrapped responses. See [profile-page-architecture.md](./profile-page-architecture.md) for full details on how the auth store manages user data.

---

## Related Docs

- [profile-page-architecture.md](./profile-page-architecture.md) — Profile page reuses the sidebar pattern from `EmployeeSidebar.vue`
- [backend-route-structure.md](./backend-route-structure.md) — Backend route file organization
- [frappe-employee-ui-design.md](./frappe-employee-ui-design.md) — Original Frappe design reference

---

## Comparison: Previous vs Current Pattern

| Aspect | Previous (Modal-Based) | Current (Frappe-Style) |
|--------|----------------------|----------------------|
| Create Employee | Modal in list view | Full page at `/employees/new` |
| Edit Employee | Modal in detail view | Inline form at `/employees/:id` |
| Tab navigation | Separate detail page with tabs | Same page, URL hash sync |
| Dirty detection | Per-modal | Global across tabs 1-4 |
| Save scope | Per-modal (one tab at a time) | All tabs 1-4 in one save |
| URL persistence | None | Hash-based tab state |
| Unsaved guard | None | Route guard + beforeunload |
| Keyboard save | None | Ctrl+S / Cmd+S |
| Sub-resource CRUD | Mixed into main modals | Separate modals per resource |
