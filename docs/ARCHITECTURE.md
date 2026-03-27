# HRMS Frontend — Architecture Reference

> Vue 3 + Ant Design Vue 4 + Pinia + Vue Router 4
> Last updated: 2026-03-27

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Vue 3 (Composition API + `<script setup>`) | 3.5.13 |
| UI Library | Ant Design Vue | 4.2.6 |
| State | Pinia | 2.3.0 |
| Router | Vue Router | 4.5.0 |
| HTTP | Axios (cookie-based, Sanctum) | 1.7.9 |
| Dates | Day.js | 1.11.13 |
| WebSocket | Laravel Echo + Pusher.js (Reverb) | 1.17.1 / 8.4.0 |
| Build | Vite (ES2020 target) | — |
| Fonts | DM Sans (body), JetBrains Mono (monospace) | — |

---

## Directory Structure

```
src/
├── api/                    # Thin axios wrappers per resource
│   ├── axios.js            # Shared instance (interceptors, CSRF, retry)
│   ├── index.js            # Barrel export
│   └── *.js                # Per-resource API files (32 files)
├── assets/
│   └── fonts/              # DM Sans, JetBrains Mono (self-hosted)
├── components/
│   ├── common/             # AppPageHeader, AppLoading, AppEmpty, InfoField
│   ├── forms/              # FormErrors
│   ├── layout/             # AppSidebar, AppHeader, NotificationDropdown
│   └── ActivityTimeline.vue
├── composables/            # Stateless reactive utilities (7 files)
├── constants/              # Static lookups: config, statuses, organizations
├── layouts/
│   ├── DefaultLayout.vue   # Sidebar + Header + Content
│   └── AuthLayout.vue      # Login / forgot-password
├── plugins/
│   └── echo.js             # Laravel Echo + Reverb WebSocket
├── router/
│   ├── routes.js           # 50+ route definitions (lazy-loaded)
│   ├── guards.js           # Auth check, permission gate, NProgress
│   └── index.js            # Router instance
├── stores/                 # Pinia (cross-cutting only — 3 stores)
│   ├── auth.js             # User, permissions, token refresh
│   ├── notifications.js    # Polling + real-time notifications
│   └── uiStore.js          # Sidebar state, page meta
├── styles/
│   └── global.less         # CSS variables, utility classes
├── utils/                  # Pure functions (formatters, helpers, storage)
├── views/                  # Page-level components (organized by module)
│   ├── admin/
│   ├── attendance/
│   ├── auth/
│   ├── dashboard/
│   ├── employees/
│   ├── grants/
│   ├── holidays/
│   ├── leave/
│   ├── notifications/
│   ├── organization/
│   ├── payroll/
│   ├── personnel-actions/
│   ├── profile/
│   ├── recruitment/
│   ├── recycle-bin/
│   ├── reports/
│   ├── resignations/
│   ├── settings/
│   ├── training/
│   ├── transfers/
│   └── uploads/
└── App.vue                 # Theme config (Ant Design token overrides)
```

---

## Authentication & Authorization

### Auth Flow (Laravel Sanctum — Cookie-Based)

```
Login → POST /login (sets HttpOnly cookie)
     → CSRF via GET /sanctum/csrf-cookie
     → 401 interceptor: auto refresh token + replay queued requests
     → 419 interceptor: re-fetch CSRF cookie + retry
     → Cross-tab sync via BroadcastChannel
     → Proactive refresh 5 min before token expiry
```

### 3-Layer Permission Model

| Layer | Mechanism | Where |
|-------|-----------|-------|
| **Route guard** | `meta: { permission: 'module' }` | `router/guards.js` |
| **Directive** | `v-permission="'module'"` or `v-permission="['module','edit']"` | Templates |
| **Composable** | `authStore.canRead()`, `canCreate()`, `canUpdate()`, `canDelete()` | Script logic |

Permission data structure (from API):
```js
{
  employees: { read: true, create: true, update: true, delete: false },
  payroll:   { read: true, create: false, update: false, delete: false },
  // ...
}
```

---

## API Layer

### Architecture

```
Component → API wrapper (src/api/fooApi.js) → Shared axios instance (src/api/axios.js) → Backend
```

- **32 API files**, all barrel-exported from `src/api/index.js`
- Every resource follows the pattern: `{ list, show, store, update, destroy }`
- Axios instance: `withCredentials: true`, base URL from `VITE_API_BASE_URL`
- Response interceptors: 401 (token refresh + queue), 419 (CSRF retry), 403 (event dispatch)

### API Inventory (by Module)

| Module | API File | Key Methods |
|--------|---------|-------------|
| Auth | `authApi.js` | login, logout, refreshToken, forgotPassword, resetPassword |
| Users | `userApi.js` | me, myPermissions, updatePassword, updateProfilePicture |
| Employees | `employeeApi.js` | list, show, store, update, destroy, destroyBatch, export |
| Employment | `employmentApi.js` | list, show, store, update, completeProbation |
| Funding | `fundingAllocationApi.js` | list, store, batchUpdate, calculatePreview |
| Leave | `leaveApi.js` | types CRUD, requests CRUD, balances R, calculateDays, checkOverlap |
| Attendance | `attendanceApi.js` | list, show, store, update, destroy, destroyBatch |
| Holidays | `holidayApi.js` | list, store, update, destroy, destroyBatch, bulk, inRange |
| Payroll | `payrollApi.js` | list, show, update, destroy, bulkCreate, bulkPayslips, budgetHistory |
| Grants | `grantApi.js` | grants CRUD + grantItems CRUD + grantPositions |
| Interviews | `interviewApi.js` | list, show, store, update, destroy, destroyBatch |
| Job Offers | `jobOfferApi.js` | list, show, store, update, destroy, pdf |
| Training | `trainingApi.js`, `trainingTypeApi.js`, `employeeTrainingApi.js` | Full CRUD for all 3 |
| Resignations | `resignationApi.js` | list, store, update, destroy, acknowledge, recommendationLetter |
| Organization | `organizationApi.js` | sites, departments, positions, sectionDepartments — all CRUD + options |
| Settings | `settingsApi.js` | benefitSettings, taxSettings, taxBrackets, taxCalculation, payrollPolicy |
| Admin | `adminApi.js` | users CRUD, roles CRUD, permissions management |
| Recycle Bin | `recycleBinApi.js` | list, stats, restore, bulkRestore, permanentDelete, bulkPermanentDelete |
| Reports | `reportApi.js` | 7 export endpoints (PDF/Excel) |
| Dashboard | `dashboardApi.js` | 13 widget data endpoints + widget management |
| Transfers | `transferApi.js` | list, show, store, destroy |
| Personnel Actions | `personnelActionApi.js` | list, show, store, update, destroy, approve |
| Activity Logs | `activityLogApi.js` | list, recent, forSubject |
| Uploads | `uploadApi.js` | upload, downloadTemplate |
| Options | `optionsApi.js` | departments, positions, sites, sectionDepartments |
| Lookups | `lookupApi.js` | list, lists, byType, types |
| Notifications | `notificationApi.js` | list, unreadCount, markAsRead, markAllAsRead |
| Emp Records | `employeeRecordApi.js` | education, child, language, beneficiary — all CRUD |
| Emp IDs | `employeeIdentificationApi.js` | list, store, update, destroy, setPrimary |

---

## State Management (Pinia)

Only **3 stores** — cross-cutting concerns only. Views manage their own local state.

| Store | Purpose | Key State |
|-------|---------|-----------|
| `auth.js` | User, permissions, token lifecycle | `user`, `permissions`, `loading` |
| `notifications.js` | Notification list, polling (30s), real-time | `notifications`, `unreadCount`, `stats` |
| `uiStore.js` | Layout state, page metadata | `sidebarCollapsed`, `pageTitle`, `breadcrumbs` |

**Design principle:** No domain stores. Each view owns its data via `ref()` / `reactive()`.

---

## Composables

| Composable | Returns | Usage |
|-----------|---------|-------|
| `useApi(fn)` | `{ data, error, isLoading, execute, reset }` | Wrap any async API call |
| `usePagination(fn)` | `{ paginationConfig, handleTableChange }` | Ant table pagination |
| `usePermission()` | `{ can(), hasRole(), isAdmin() }` | Template permission checks |
| `useNotification()` | `{ success(), error(), warning(), info() }` | Ant message wrapper |
| `useDebounce(ref, ms)` | Debounced ref | Search inputs |
| `useAbortController()` | `getSignal()` | Cancel in-flight requests on nav |
| `useTour(key)` | `{ isTourOpen, checkAndOpen(), markComplete() }` | Guided tours |

---

## Routing

### Layout Strategy

| Layout | Purpose | Routes |
|--------|---------|--------|
| `AuthLayout` | Guest-only (login, forgot-password) | 2 routes |
| `DefaultLayout` | Authenticated (sidebar + header) | 48+ routes |
| None | Blank page | 404 |

### Route Guards (`guards.js`)

```
beforeEach:
  1. Initialize auth on first load
  2. Redirect guests to /login
  3. Redirect authenticated users away from /login
  4. Check meta.permission via authStore.canRead()
  5. NProgress bar start/stop
```

### Module Routes (50+ total)

| Module | Routes | Permission Keys |
|--------|--------|----------------|
| Dashboard | 1 | — |
| Employees | 3 | `employees` |
| Leave | 3 | `leave_types`, `leaves_admin`, `leave_balances` |
| Attendance | 2 | `attendance_admin`, `holidays` |
| Grants | 3 | `grants_list`, `grant_position` |
| Recruitment | 2 | `interviews`, `job_offers` |
| Training | 4 | `training_list`, `training_types`, `employee_training` |
| Payroll | 1 | `employee_salary` |
| HRM | 4 | `personnel_actions`, `transfer`, `resignation` |
| Organization | 4 | `sites`, `departments`, `positions`, `section_departments` |
| Settings | 5 | `benefit_settings`, `tax_settings`, `payroll_items` |
| Admin | 3 | `users`, `roles` |
| Reports | 1 | `report_list` |
| Data Management | 1 | `employees` |
| System | 2 | —, `recycle_bin_list` |
| Profile / Notifs | 2 | — |

---

## Sidebar Navigation

13 sections, each permission-gated:

```
Dashboard
Notifications (badge: unread count)
─────────────────────────────────────
Grants          → Grants, Grant Positions
Recruitment     → Interviews, Job Offers
Management      → Employees, Payroll
Leave           → Leave Requests, Leave Balances, Leave Types
Attendance      → Attendance, Holidays
Training        → Training, Training Types, Employee Training
HRM             → Personnel Actions, Transfers, Resignations
Reports         → Reports
Data Management → Data Import
Organization    → Sites, Departments, Positions, Sections
Settings        → Benefits, Tax, Tax Brackets, Tax Calculator, Payroll Policies
Administration  → Users, Roles
System          → Activity Log, Recycle Bin
```

---

## View Patterns

### Pattern 1: Single-Page CRUD (most modules)

```
List View + inline Modal
├── Table (a-table) with pagination, sorting, filters
├── Row selection + bulk actions
├── Create/Edit modal (a-modal) with form
└── Single & bulk delete with confirmation
```

**Examples:** Sites, Departments, Leave Types, Interviews, Attendance, Holidays

### Pattern 2: Tab-Based Detail (complex modules)

```
List View → Detail View with tabs
├── Sidebar (employee photo, key info)
├── Multiple tab components
└── Per-tab sub-modals
```

**Examples:** Employees (7 tabs), Grants (items + positions)

### Pattern 3: Drawer Detail (inline expansion)

```
List View → Detail Drawer
├── Table row click opens drawer
└── Drawer shows full record detail
```

**Examples:** Payroll (PayrollDetailDrawer)

### Pattern 4: List + Detail Page (separate routes)

```
/module → List View (table)
/module/:id → Detail View (full page)
```

**Examples:** Resignations, Training

---

## Formatting & Utilities

All formatting is centralized in `src/utils/formatters.js`:

| Function | Output | Null Handling |
|----------|--------|--------------|
| `formatDate(d)` | `DD MMM YYYY` | Returns `'—'` |
| `formatDateTime(d)` | `DD MMM YYYY HH:mm` | Returns `'—'` |
| `formatCurrency(n)` | `THB 1,234.00` | Returns `'—'` |
| `formatNumber(n)` | `1,234` | Returns `'—'` |
| `timeAgo(d)` | `3 hours ago` | Returns `'—'` |

**Rule:** Never call `dayjs().format()` directly. Never inline `toLocaleString()`.

---

## Theming

### Ant Design Token Overrides (`App.vue`)

```js
token: {
  colorPrimary: '#002147',    // Navy
  borderRadius: 8,
  fontFamily: "'DM Sans', -apple-system, sans-serif",
  colorBgContainer: '#ffffff',
  colorBgLayout: '#f4f5f6',
  fontSize: 14,
}
```

### CSS Variables (`global.less`)

| Group | Key Variables |
|-------|-------------|
| Backgrounds | `--color-bg`, `--color-bg-surface`, `--color-bg-subtle`, `--color-bg-muted` |
| Text | `--color-text`, `--color-text-secondary`, `--color-text-muted` |
| Brand | `--color-primary` (#002147), `--color-accent` (#2563eb) |
| Status | `--color-success`, `--color-warning`, `--color-danger`, `--color-info` |
| Borders | `--color-border`, `--color-border-light` |
| Radius | `--radius-sm` (6px), `--radius-md` (8px), `--radius-lg` (12px) |
| Shadows | `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-card` |
| Layout | `--sidebar-width`, `--header-height` |

---

## Real-Time (WebSocket)

```
Laravel Echo + Reverb (via Pusher protocol)
├── Private user channel: App.Models.User.{id}
│   ├── PermissionsUpdated → refresh authStore permissions
│   ├── NotificationReceived → update notification store
│   └── ProfileUpdated → refresh user profile
└── Custom authorizer: fetch() with cookies (no Bearer token)
```

---

## Build & Deployment

```bash
npm run dev       # Vite dev server on :8080
npm run build     # Production build (ES2020, code-split)
npm run preview   # Preview production build
```

**Code Splitting (vite.config.js):**
- `vue-vendor` — Vue, Vue Router, Pinia
- `antd` — Ant Design Vue + icons
- `utils` — Day.js, Axios, NProgress

**Optimizations:**
- All views lazy-loaded via `() => import()`
- Console/debugger stripped in production
- Brotli + Gzip compression
- Bundle visualizer available

---

## Statistics

| Metric | Count |
|--------|-------|
| API modules | 32 |
| Routes | 50+ |
| Vue components | 57 |
| Pinia stores | 3 |
| Composables | 7 |
| Dashboard widgets | 24 |
| Sidebar sections | 13 |
| Permission keys | 35+ |
