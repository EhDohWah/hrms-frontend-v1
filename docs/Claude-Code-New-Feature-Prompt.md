# Claude Code CLI — New Feature Implementation Prompt (Reusable Template)

> **How to use:** Replace everything inside `{{ }}` with your actual values, then paste into Claude Code CLI.
> Run from your HRMS frontend project root directory.
>
> **Note:** This template covers the standard **modal-based CRUD** pattern (list view + detail view + modals).
> For other patterns, see:
> - [frappe-employee-ui-design.md](./frappe-employee-ui-design.md) — Original Frappe HRMS design analysis
> - [employee-form-architecture.md](./employee-form-architecture.md) — Frappe-style inline tabbed form (Employee module)
> - [profile-page-architecture.md](./profile-page-architecture.md) — Self-service profile page (sidebar + cards pattern)
> - [backend-route-structure.md](./backend-route-structure.md) — Backend route file organization

---

## THE PROMPT (copy everything below this line)

---

I need you to implement a new feature module in my Vue.js 3 HRMS frontend following our established architecture patterns.

## PROJECT CONTEXT

This is an HRMS (Human Resource Management System) for healthcare organizations. The frontend uses:
- **Vue 3.5** with `<script setup>` and Composition API (JavaScript, NOT TypeScript)
- **Ant Design Vue 4** for all UI components
- **Pinia** for state management
- **Vue Router 4** with auth + permission guards
- **Axios** for API calls (instance in `src/api/axios.js`)

## ARCHITECTURE RULES — Follow these strictly

1. **One API file per resource** in `src/api/` — import `apiClient` from `./axios`
2. **Use existing composables** — `useApi`, `usePagination`, `useDebounce`, `usePermission`, `useNotification` from `src/composables/`
3. **Views are pages, Components are reusable** — views go in `src/views/`, shared components in `src/components/`
4. **Lazy-load all views** in routes — `() => import('@/views/...')`
5. **Route meta must include:** `title`, `requiresAuth: true`, `permission`, `layout: 'default'`
6. **Use Ant Design Vue components** for everything (a-table, a-form, a-modal, a-button, a-input, a-select, etc.)
7. **Use `<script setup>`** for all new components — no Options API
8. **No TypeScript** — plain JavaScript only
9. **Use `useNotification()`** for success/error toasts, not raw `message` import
10. **Use `usePagination()`** for any list view with tables
11. **Use `useApi()`** when you need loading/error state for a single API call
12. **Export named exports** from API files, not default exports

## EXISTING PATTERNS TO REFERENCE

Before writing any code, **read these existing files** to match their patterns exactly:

- `src/api/employeeApi.js` — how API modules are structured
- `src/api/axios.js` — the Axios instance (import as `apiClient`)
- `src/api/index.js` — how APIs are re-exported
- `src/views/employees/EmployeeListView.vue` — the LIST view pattern (table + search + filters + pagination)
- `src/views/employees/EmployeeFormView.vue` — the FORM view pattern (Frappe-style inline tabbed form, see `docs/employee-form-architecture.md`)
- `src/views/leave/LeaveRequestListView.vue` — another list view example
- `src/composables/usePagination.js` — pagination composable
- `src/composables/useNotification.js` — toast notifications
- `src/router/routes.js` — how routes are defined
- `src/components/layout/AppSidebar.vue` — how sidebar menu items are structured

**Match the coding style, spacing, naming conventions, and patterns from these files exactly.**

## FEATURE TO IMPLEMENT

### Module Name: {{ MODULE_NAME }}
<!-- Example: Payroll Runs, Training, Travel Requests, Recruitment, etc. -->

### Description:
{{ BRIEF_DESCRIPTION }}
<!-- Example: Manage payroll processing cycles. HR can create payroll runs for a specific month, 
     process them (calculate salaries for all employees), review individual payslips, 
     and approve/reject the final payroll. -->

### Laravel API Endpoints (already built):
<!-- List your actual Laravel API endpoints. Example: -->
```
{{ LIST YOUR API ENDPOINTS HERE }}

Example format:
GET    /api/v1/payroll-runs                    — List with pagination, filters (status, month, year)
POST   /api/v1/payroll-runs                    — Create new payroll run
GET    /api/v1/payroll-runs/{id}               — Get single payroll run with details
PUT    /api/v1/payroll-runs/{id}               — Update payroll run
DELETE /api/v1/payroll-runs/{id}               — Delete (only if draft status)
POST   /api/v1/payroll-runs/{id}/process       — Process payroll (calculate all salaries)
POST   /api/v1/payroll-runs/{id}/approve       — Approve payroll run
GET    /api/v1/payroll-runs/{id}/payslips      — List payslips for this run
GET    /api/v1/payroll-runs/{id}/payslips/{eid} — Get individual payslip detail
```

### Laravel API Response Shapes:
<!-- Paste the actual JSON response from your API, or describe the shape. Example: -->
```json
{{ PASTE YOUR API RESPONSE SHAPE HERE }}

Example:
// GET /api/v1/payroll-runs (list)
{
  "success": true,
  "data": [
    {
      "id": 1,
      "month": 6,
      "year": 2025,
      "status": "draft",
      "total_employees": 150,
      "total_amount": 4500000.00,
      "created_by": { "id": 1, "name": "Admin" },
      "created_at": "2025-06-01T10:00:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total": 45,
    "last_page": 3
  }
}

// GET /api/v1/payroll-runs/{id} (single)
{
  "success": true,
  "data": {
    "id": 1,
    "month": 6,
    "year": 2025,
    "status": "processed",
    "total_employees": 150,
    "total_amount": 4500000.00,
    "payslips": [ ... ]
  }
}
```

### Pages Needed:
<!-- Check the ones you need, remove the rest. Adjust names. -->

- [ ] **List View** — `{{ ModuleName }}ListView.vue` — Table with search, filters, pagination
- [ ] **Detail View** — `{{ ModuleName }}DetailView.vue` — Show single record with tabs/sections
- [ ] **Create View** — `{{ ModuleName }}CreateView.vue` — Form to create new record
- [ ] **Edit View** — `{{ ModuleName }}EditView.vue` — Form to edit existing record
<!-- Or if Create/Edit are modals instead of pages: -->
- [ ] **Create/Edit Modal** — Inline modal in the List View (no separate page)

### Filters for List View:
<!-- Example: -->
```
{{ LIST YOUR FILTERS }}

Example:
- Search: by keyword (name, ID)
- Status: dropdown (draft, processing, processed, approved, rejected)
- Month: month picker
- Year: year picker
- Subsidiary: dropdown (SMRU, BHF)
```

### Permission Key: `{{ permission_key }}`
<!-- Example: payroll, training, travel_requests — this maps to your Laravel permission system -->

### Sidebar Menu:
<!-- Where should this appear in the sidebar? -->
```
{{ DESCRIBE SIDEBAR PLACEMENT }}

Example:
Under "Payroll" section:
- Payroll Runs (icon: DollarOutlined)
- Tax Settings (icon: SettingOutlined)

Or: Add to existing "Leave" section as a new item
```

## FILES TO CREATE

Based on the above, create the following files in this exact order:

### 1. API Module — `src/api/{{ moduleName }}Api.js`
- Import `apiClient` from `./axios`
- Create and export a named object with methods matching the API endpoints
- Follow the exact pattern from `src/api/employeeApi.js`
- Include query parameter handling for filters and pagination

### 2. Update API barrel — `src/api/index.js`
- Add the new re-export line

### 3. Views — `src/views/{{ moduleName }}/`
- Create the directory
- Create each view file as specified in "Pages Needed" above
- **List View pattern:** Use `usePagination()` for table pagination, `useNotification()` for toasts, `ref()` for filters, `watch()` or manual trigger for fetching, Ant Design `<a-table>` with `:columns`, `:data-source`, `:pagination`, `@change`
- **Detail View pattern:** Use `useRoute()` to get ID param, fetch on mount, display with `<a-descriptions>` or `<a-tabs>` for tabbed content
- **Create/Edit View pattern:** Use `<a-form>` with `:model`, `:rules`, `ref` for form state, handle submit with try/catch showing 422 validation errors via `FormErrors` component, redirect on success
- **Modal pattern (if applicable):** Use `<a-modal>` with `v-model:open`, emit events to parent

### 4. Routes — Update `src/router/routes.js`
- Add new route(s) nested under the authenticated routes
- Use lazy imports: `component: () => import('@/views/{{ moduleName }}/...')`
- Include proper `meta`: `{ title, requiresAuth: true, permission: '{{ permission_key }}', layout: 'default' }`

### 5. Sidebar — Update `src/components/layout/AppSidebar.vue`
- Add the new menu item(s) in the correct position
- Use appropriate Ant Design icons
- Wrap with permission check if needed (using `v-permission` directive or `v-if="authStore.hasPermission('{{ permission_key }}')"`)

### 6. Verify — Run `npm run build`
- Confirm zero errors
- List all files created/modified

## QUALITY CHECKLIST

Before finishing, ensure:
- [ ] All `<script setup>` — no Options API
- [ ] All API calls go through the API module, not raw axios
- [ ] `usePagination()` used in list views
- [ ] `useNotification()` used for success/error messages
- [ ] Loading states shown during API calls (`a-spin` or `:loading` prop)
- [ ] Empty states handled (when table has no data)
- [ ] 422 validation errors displayed properly
- [ ] Permission check on route meta AND sidebar visibility
- [ ] Consistent naming: `{{ ModuleName }}ListView.vue`, `{{ moduleName }}Api.js`
- [ ] No hardcoded strings for pagination (use `PAGINATION_DEFAULTS` from constants)
- [ ] All new views lazy-loaded in routes
- [ ] API barrel file (`api/index.js`) updated with new re-export
- [ ] `npm run build` passes with zero errors
