## HRMS Frontend Architecture

### Overview
The HRMS frontend is a Vue 3 single-page application designed as the **Data Entry and Display UI** for the HRMS digitization system. It provides the forms, tables, search, and export controls that HR staff use to transcribe paper-based HR processes into the backend database and to retrieve, view, and report on that data. The system uses modular per-resource API wrappers, a thin cross-cutting state layer (Pinia), lazy-loaded routed views, and a 3-layer permission model that mirrors the backend's Spatie roles/permissions.

### System Purpose & Approach
This frontend is the user-facing surface of a **digital repository** for HR data that originates from paper forms and manual processes:

- **Data Entry Focus**: Forms and modals that accept completed paper forms as structured input
- **Display & Search**: Tables with filtering, pagination, and search to locate stored records
- **Report Export**: Export buttons that trigger Excel/PDF downloads from the backend
- **No Workflow Automation**: The UI records final states; it does not drive approvals or orchestrate multi-party decisions
- **Simple CRUD Screens**: List, Create, Read, Update, Delete — no client-side state machines or approval pipelines

### Tech Stack & Key Packages
- Vue 3.5 (Composition API + `<script setup>`), Vite 6 (ES2020 target)
- UI: Ant Design Vue 4.2 (auto-imported via `unplugin-vue-components`)
- State: Pinia 2.3 (3 cross-cutting stores only)
- Routing: Vue Router 4.5 (lazy-loaded views)
- HTTP: Axios 1.13 with cookie-based Sanctum auth (`withCredentials: true`)
- Real-time: Laravel Echo 1.17 + Pusher.js 8.4 (Reverb WebSocket)
- Dates: Day.js 1.11 (all formatting centralized in `utils/formatters.js`)
- Styling: LESS with CSS variables, DM Sans + JetBrains Mono (self-hosted)

### App Bootstrap
- `src/main.js` mounts the app, installs Pinia, Router, Ant Design Vue, and the `v-permission` directive
- `src/App.vue` wraps the app in `<a-config-provider :theme="themeConfig">` — the authoritative source for Ant Design token overrides (primary `#002147`, radius 8, DM Sans)
- Global styles loaded via `src/styles/global.less`
- Echo plugin (`src/plugins/echo.js`) initialized after login for WebSocket subscriptions

### Routing & Versioning
- Route definitions live in `src/router/routes.js` (50+ routes, all views lazy-loaded via dynamic `import()`).
- Two layouts wrap all routes:
  - `AuthLayout` — guest-only (login, forgot-password)
  - `DefaultLayout` — authenticated, with sidebar + header
- Auth & RBAC enforced in `src/router/guards.js`:
  - `beforeEach` initializes auth on first load, redirects guests to `/login`, and checks `meta.permission` against `authStore.canRead()`
  - NProgress bar shows on auth transitions and initial load only (not in-app nav)

### Domain Modules (Data Entry & Display)
Each module follows the same view/API/permission triad. The module inventory mirrors the backend route files:

- **Employees** (`src/views/employees/`): Employee personal data, identifications, children, beneficiaries, education, language skills, training records, activity timeline
- **Employment** (`src/views/employees/tabs/AssignmentTab.vue`): Employment contracts, departments, positions, work locations, funding allocations
- **Leave Management** (`src/views/leave/`): Leave requests, leave balances, leave types (status fields recorded as data, not workflow state)
- **Attendance** (`src/views/attendance/`): Daily attendance records, holidays
- **Grants & Funding** (`src/views/grants/`): Grant information, budget items, grant position slots
- **Recruitment** (`src/views/recruitment/`): Interview records, job offers (PDF download)
- **Training** (`src/views/training/`): Training programs, training types, employee training assignments
- **Payroll & Tax** (`src/views/payroll/`, `src/views/settings/`): Payroll records (nested grant-level view), tax brackets, tax calculator, payroll policies
- **Personnel Actions** (`src/views/personnel-actions/`, `src/views/transfers/`, `src/views/resignations/`): Personnel action forms, transfers, resignations (with recommendation letter export)
- **Organization** (`src/views/organization/`): Sites, departments, positions, section departments
- **Reports** (`src/views/reports/`): Export-only module (9 report types → PDF/Excel)
- **Data Import** (`src/views/uploads/`): Bulk Excel import with template download
- **Administration** (`src/views/admin/`): User and role management, fine-grained permission editor
- **System** (`src/views/recycle-bin/`, activity logs): Soft-deleted record restore, audit trail

Each view provides:
- **CRUD surfaces** for data entry and updates (modals, drawers, or detail routes)
- **List/Search surfaces** with filters, pagination, and search inputs
- **Export buttons** that hit backend export endpoints
- **Import surfaces** for Excel bulk entry (Data Import module, per-module templates)

### Authentication & Authorization
- Cookie-based Sanctum session — `axios` instance sends `withCredentials: true` on every request
- Login flow: `GET /sanctum/csrf-cookie` → `POST /login` → Pinia `authStore` caches user + permissions
- Response interceptors in `src/api/axios.js`:
  - **401** → attempt token refresh, queue and replay failed requests, redirect to `/login` on final failure
  - **419** → re-fetch CSRF cookie and retry original request
  - **403** → dispatch custom event (`permission-denied`) for UI handling
- Cross-tab sync via `BroadcastChannel('hrms-auth-channel')` — logout in one tab propagates to all tabs
- Proactive token refresh scheduled 5 minutes before expiry

**3-Layer Permission Model** (matches backend's Spatie roles/permissions):

| Layer | Mechanism | Enforcement |
|-------|-----------|-------------|
| Route guard | `meta: { permission: 'employees' }` | Navigation blocked in `guards.js` |
| Directive | `v-permission="'employees'"` / `v-permission="['employees','edit']"` | DOM element hidden |
| Composable | `authStore.canRead()`, `canCreate()`, `canUpdate()`, `canDelete()`, `canEdit()` | Script logic branching |

Permissions are shaped as nested objects keyed by module:
```js
{ employees: { read: true, create: true, update: true, delete: false }, ... }
```

Permission keys match backend permission names (e.g., `employee.read`, `payroll.create`).

### Error Handling
- Axios interceptor normalizes backend error envelopes (`{ success, message, error }`) and surfaces user-facing messages via `useNotification()` (Ant Design `message` API)
- Global 403 event dispatched for UI-level redirect/notification handling
- Form errors from Laravel validation (422) rendered inline via `components/forms/FormErrors.vue`

### API Layer (Thin Per-Resource Wrappers)
- **32 API files** under `src/api/`, all barrel-exported from `src/api/index.js`
- Every resource follows the convention: `{ list, show, store, update, destroy }` plus resource-specific methods
- Single shared axios instance in `src/api/axios.js` — no per-module clients
- Base URL from `VITE_API_BASE_URL` (default `http://localhost:8000/api/v1`)

**API inventory by module:**

| Module | API File | Notable Methods |
|--------|----------|-----------------|
| Auth | `authApi.js` | login, logout, refreshToken, forgotPassword |
| Employees | `employeeApi.js` | list, show, store, update, destroy, destroyBatch, export |
| Employment | `employmentApi.js` | list, show, store, update, completeProbation |
| Funding | `fundingAllocationApi.js` | list, batchUpdate, calculatePreview |
| Leave | `leaveApi.js` | requests/types/balances CRUD + calculateDays, checkOverlap |
| Payroll | `payrollApi.js` | list, update, bulkCreate, bulkPayslips, budgetHistory |
| Grants | `grantApi.js` | grants + grantItems + grantPositions CRUD |
| Resignations | `resignationApi.js` | list, store, update, destroy, acknowledge, recommendationLetter |
| Reports | `reportApi.js` | 9 export endpoints (PDF/Excel) |
| Dashboard | `dashboardApi.js` | widget data endpoints (13 widgets) |
| Activity Logs | `activityLogApi.js` | list, recent, forSubject |
| Uploads | `uploadApi.js` | upload, downloadTemplate |

(Full inventory in `docs/ARCHITECTURE.md` table.)

### Services (Client-Side)
The frontend deliberately contains **no client-side business services**. All business logic (payroll calculation, tax computation, funding allocation, restore helpers) lives in the backend Laravel services. The frontend's role is to:
1. Collect data via forms with minimal client-side validation
2. Send it to the backend
3. Display the results the backend returns

**Composables** (`src/composables/`) provide stateless reactive utilities only — not business logic:

| Composable | Purpose |
|-----------|---------|
| `useApi(fn)` | Generic async call wrapper → `{ data, error, isLoading, execute, reset }` |
| `usePagination(fn)` | Ant table pagination state |
| `usePermission()` | Template-level `can()`, `hasRole()`, `isAdmin()` |
| `useNotification()` | Ant Design `message` wrapper |
| `useDebounce(ref, ms)` | Debounced reactive ref for search inputs |
| `useAbortController()` | Cancel in-flight requests on navigation/re-query |
| `useTour(key)` | Ant Design `<a-tour>` with backend persistence |

### State Management (Pinia)
Only **3 stores** — all cross-cutting. Views manage their own domain state locally via `ref()` / `reactive()`.

| Store | Responsibility |
|-------|---------------|
| `auth.js` | User object, permissions map, token refresh lifecycle, cross-tab sync |
| `notifications.js` | Notification list, unread count, 30s polling (auto-pauses on hidden tab) |
| `uiStore.js` | Sidebar collapse state (persisted), page title/breadcrumbs, viewport width, mobile detection |

**Design principle:** No domain stores. Each list view fetches its own data, owns its own filters, and discards state on unmount.

### Caching Strategy (Client-Side)
- The frontend does not implement app-level data caching — every list view fetches fresh on mount
- Browser HTTP caching is used for static assets (fonts, JS chunks)
- Local storage (`utils/storage.js`) persists only UI preferences: sidebar collapsed state, dismissed tours
- Rationale: backend cache (Redis, tag-based) is authoritative; duplicating it client-side risks stale reads across the 3-layer permission model

### Events, Real-Time, Notifications
- **Laravel Echo + Reverb** (`src/plugins/echo.js`) subscribes to the authenticated user's private channel `App.Models.User.{id}`:
  - `PermissionsUpdated` → refresh `authStore.permissions`
  - `NotificationReceived` → push to `notifications` store
  - `ProfileUpdated` → refresh user object
- Custom authorizer uses `fetch()` with cookies (not Bearer token) to match the Sanctum auth model
- Fallback: if WebSocket unavailable, `notifications.js` polls every 30 seconds

### Request Lifecycle (Frontend)
1) User action triggers a call to an API wrapper (e.g., `employeeApi.list(params)`)
2) Wrapper delegates to the shared axios instance with `withCredentials: true`
3) Axios attaches the Sanctum session cookie; backend authenticates and checks permission middleware
4) Response interceptor normalizes errors (401/419 auto-retry, 403 event dispatch)
5) Component updates reactive state; template re-renders; `useNotification()` surfaces success/error toast

### View Patterns
The frontend consistently uses one of four patterns per module:

| Pattern | Shape | Modules |
|---------|-------|---------|
| **Single-page CRUD** | List view + inline create/edit modal + bulk delete | Sites, Departments, Leave Types, Interviews, Holidays, Attendance |
| **Tab-based detail** | List → detail route with tab strip | Employees (7 tabs), Grants |
| **Drawer detail** | List → right-side drawer on row click | Payroll |
| **List + detail page** | Separate `/module` and `/module/:id` routes | Resignations, Training |

### Data Access & Relationships
- Frontend consumes backend responses verbatim; **Laravel serializes Eloquent relationships as snake_case** (e.g., `employeeFundingAllocations` → `employee_funding_allocations`). All nested-relationship access in templates uses snake_case.
- No client-side ORM or query builder; API wrappers pass parameters through cleanly via `cleanParams()` (strips null/empty values)
- Backend filter parameter names are intentionally inconsistent (`filter_status` vs `status` vs `acknowledgement_status`) — each API wrapper documents its own filter surface

### Testing & Quality
- No test runner or linter currently configured (`package.json` scripts: `dev`, `build`, `preview` only)
- Production build strips `console.*` and `debugger` via esbuild
- Bundle analysis available via `ANALYZE=true npm run build` → `dist/stats.html`

### Build & Deployment
- `vite.config.js` produces a code-split production bundle:
  - `vue-vendor` — Vue, Vue Router, Pinia
  - `antd` — Ant Design Vue + icons
  - `utils` — Day.js, Axios, NProgress
- Brotli + Gzip compression via `vite-plugin-compression`
- `@` alias → `src/` directory (enforce in all imports, never relative `../../`)
- `.env` configures `VITE_API_BASE_URL`, `VITE_PUBLIC_URL`, `VITE_REVERB_*`, `VITE_BROADCASTING_AUTH_ENDPOINT`

### Extensibility Guidelines for Data Entry UI
- **New Data Entities**: add an API wrapper in `src/api/`, a list view and create/edit modal under `src/views/<module>/`, a route entry with `meta.permission`, and a sidebar item in `AppSidebar.vue`
- **CRUD Screens**: follow the single-page CRUD pattern unless the entity has tabs/sub-resources
- **Export Buttons**: add a button on the list view that calls the API wrapper's export method and triggers file download
- **Import Screens**: route through `src/views/uploads/DataImportView.vue` — reuse the shared upload/preview/confirm flow
- **Status Fields**: render as editable form inputs (dropdowns, tags), not as workflow stage-gates. The system records status; it does not drive transitions.
- **Permissions**: wire route guard, `v-permission` directive on action buttons, and `authStore` checks in script logic — all three layers
- **No Client-Side Workflows**: do not build approval queues, state machines, or orchestrated multi-step wizards beyond single-form data entry. Business decisions happen offline.

### Notable Files
- Routing: `src/router/routes.js`, `src/router/guards.js`, `src/router/index.js`
- Bootstrap: `src/main.js`, `src/App.vue` (theme config)
- Auth: `src/stores/auth.js`, `src/api/authApi.js`, `src/api/axios.js`
- Permissions: `src/directives/permission.js`, `src/composables/usePermission.js`
- API: `src/api/*.js` (32 files), `src/api/index.js` (barrel)
- State: `src/stores/*.js` (3 files)
- Layouts: `src/layouts/DefaultLayout.vue`, `src/layouts/AuthLayout.vue`
- Navigation: `src/components/layout/AppSidebar.vue`, `AppHeader.vue`, `NotificationDropdown.vue`
- Real-time: `src/plugins/echo.js`
- Formatting: `src/utils/formatters.js`, `src/utils/helpers.js`, `src/utils/storage.js`
- Styling: `src/styles/global.less`, `src/assets/fonts/`

---

### Key Architectural Principle

**This HRMS frontend is fundamentally a data digitization UI**, not a workflow management app. It assumes:

1. **Paper-based processes** are the source of truth for HR decisions
2. **Manual approvals** happen offline; the UI records final states
3. **Tables and forms** are the primary surfaces — not dashboards, queues, or pipelines
4. **Export buttons** serve compliance and analysis needs
5. **Simple CRUD screens** without client-side state machines or workflow orchestration

This architectural decision keeps the UI simple, reliable, and focused on its core purpose: **fast, accurate transcription of HR paperwork into searchable, exportable digital records.**

---
This document reflects the current codebase (Vue 3 + Ant Design Vue 4 + Pinia + Vue Router 4) and mirrors the structure of `HRMS_BACKEND_ARCHITECTURE.md` to keep frontend and backend intent aligned.
