# HRMS Frontend -- Comprehensive Analysis Report

> **Generated**: March 2026
> **Source**: `C:\Users\Turtle\Downloads\hrms-screenshot\hrms-frontend`
> **Total Source Files**: ~65 `.vue`/`.js` files in `src/`
> **Estimated LOC**: ~12,500 lines of Vue/JS code

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Tech Stack & Configuration](#2-tech-stack--configuration)
3. [Entry Point & App Bootstrap](#3-entry-point--app-bootstrap)
4. [Routing](#4-routing)
5. [State Management (Pinia)](#5-state-management-pinia)
6. [API Layer](#6-api-layer)
7. [Views/Pages](#7-viewspages)
8. [Components](#8-components)
9. [Composables/Hooks](#9-composableshooks)
10. [Services/Utils](#10-servicesutils)
11. [Layouts](#11-layouts)
12. [Real-Time Features](#12-real-time-features)
13. [Styling & Theming](#13-styling--theming)
14. [Authentication Flow](#14-authentication-flow)
15. [Permissions & Authorization](#15-permissions--authorization)
16. [Complete Feature Matrix](#16-complete-feature-matrix)
17. [Error Handling](#17-error-handling)
18. [Patterns & Code Quality](#18-patterns--code-quality)

---

## 1. Project Structure

```
hrms-frontend/
|-- .env                          # Environment variables (development)
|-- .env.example                  # Environment template
|-- CLAUDE.md                     # AI development instructions
|-- index.html                    # Entry HTML (loads DM Sans + JetBrains Mono from Google Fonts)
|-- package.json                  # Dependencies & scripts
|-- vite.config.js                # Vite build config with Less + path aliases
|-- dist/                         # Production build output
|-- docs/                         # Documentation
|-- src/
    |-- main.js                   # App bootstrap
    |-- App.vue                   # Root component (Ant Design ConfigProvider)
    |-- api/                      # 26 API module files + axios client
    |   |-- axios.js              # Base HTTP client (interceptors, CSRF, 401 refresh queue)
    |   |-- index.js              # Barrel export
    |   |-- authApi.js            # Login, logout, refresh, forgot/reset password
    |   |-- userApi.js            # User profile (me, permissions, update profile)
    |   |-- dashboardApi.js       # Dashboard widgets CRUD
    |   |-- employeeApi.js        # Employee CRUD + filter, export, profile picture
    |   |-- employeeRecordApi.js  # Education, children, languages, beneficiaries CRUD
    |   |-- employmentApi.js      # Employment records + probation management
    |   |-- fundingAllocationApi.js  # Grant funding allocations + preview
    |   |-- leaveApi.js           # Leave types, requests, balances, calculate/overlap
    |   |-- attendanceApi.js      # Attendance CRUD
    |   |-- payrollApi.js         # Payroll list, payslip PDF, bulk operations
    |   |-- grantApi.js           # Grants + Grant Items CRUD
    |   |-- interviewApi.js       # Interview CRUD + candidate search
    |   |-- jobOfferApi.js        # Job offer CRUD + PDF generation
    |   |-- trainingApi.js        # Training CRUD
    |   |-- resignationApi.js     # Resignation CRUD + acknowledge + recommendation letter
    |   |-- organizationApi.js    # Sites, Departments, Positions CRUD
    |   |-- settingsApi.js        # Benefit, Tax settings, Tax brackets, Tax calc, Payroll policy
    |   |-- lookupApi.js          # Lookup lists by type
    |   |-- optionsApi.js         # Dropdown options (departments, positions, sites, sections)
    |   |-- holidayApi.js         # Holiday CRUD + bulk creation
    |   |-- notificationApi.js    # Notification management
    |   |-- recycleBinApi.js      # Recycle bin (restore, permanent delete, legacy records)
    |   |-- uploadApi.js          # File upload + template download
    |   |-- reportApi.js          # Report exports (interview PDF/Excel, job offer PDF, leave PDF)
    |-- assets/
    |   |-- img/                  # Logo images (bhf-logo.png, smru-logo.png)
    |-- components/
    |   |-- common/
    |   |   |-- AppEmpty.vue      # Empty state wrapper
    |   |   |-- AppLoading.vue    # Loading spinner wrapper
    |   |   |-- AppPageHeader.vue # Page header with title + action slot
    |   |   |-- InfoField.vue     # Label/value display field (read-only mode)
    |   |-- dashboard/
    |   |   |-- widgets/
    |   |       |-- PlaceholderWidget.vue   # "Coming soon" placeholder
    |   |       |-- WelcomeWidget.vue       # Quick action links grid
    |   |-- forms/
    |   |   |-- FormErrors.vue    # API validation error display
    |   |-- layout/
    |       |-- AppHeader.vue     # Fixed top header (breadcrumbs, search, notifications, profile)
    |       |-- AppSidebar.vue    # Collapsible sidebar navigation
    |-- composables/
    |   |-- useApi.js             # Generic async API wrapper
    |   |-- useDebounce.js        # Reactive debounced value
    |   |-- useNotification.js    # Ant Design message wrapper
    |   |-- usePagination.js      # Table pagination state manager
    |   |-- usePermission.js      # Permission check helpers
    |-- constants/
    |   |-- config.js             # Pagination defaults, app config
    |-- directives/
    |   |-- vPermission.js        # v-permission directive for DOM visibility
    |-- layouts/
    |   |-- AuthLayout.vue        # Centered card layout (login/forgot password)
    |   |-- BlankLayout.vue       # Full-page centered layout
    |   |-- DefaultLayout.vue     # Sidebar + Header + Content (main app layout)
    |-- plugins/
    |   |-- echo.js               # Laravel Echo + Reverb WebSocket setup
    |-- router/
    |   |-- index.js              # Router creation with NProgress
    |   |-- routes.js             # All route definitions
    |   |-- guards.js             # Auth guards, permission checks
    |-- stores/
    |   |-- auth.js               # Auth state, permissions, token refresh, cross-tab sync
    |   |-- notifications.js      # Notifications state + polling
    |   |-- uiStore.js            # UI state (sidebar, page title, responsive)
    |-- styles/
    |   |-- global.less           # CSS variables, reset, Ant Design overrides, utilities
    |-- utils/
    |   |-- formatters.js         # Date, currency, number formatters
    |   |-- helpers.js            # debounce, isEmpty, cleanParams
    |   |-- storage.js            # localStorage wrapper with JSON support
    |-- views/                    # 32 view files across 14 feature domains
        |-- auth/                 # LoginView, ForgotPasswordView
        |-- dashboard/            # DashboardView
        |-- employees/            # EmployeeListView, EmployeeFormView
        |   |-- components/       # EmployeeSidebar
        |   |-- tabs/             # 8 tabs: BasicInfo, Identification, ContactFamily, Financial,
        |                         #         Leave, Records, Employment, Funding
        |-- grants/               # GrantListView, GrantDetailView, GrantPositionListView
        |-- holidays/             # HolidayListView
        |-- leave/                # LeaveRequestListView, LeaveBalanceListView, LeaveTypeListView
        |-- attendance/           # AttendanceListView
        |-- notifications/        # NotificationsView
        |-- organization/         # SiteListView, DepartmentListView, PositionListView
        |-- payroll/              # PayrollListView, PayrollDetailDrawer, BulkPayrollModal,
        |                         # BulkPayslipModal, PayrollBudgetView
        |-- profile/              # ProfileView
        |-- recruitment/          # InterviewListView, JobOfferListView
        |-- recycle-bin/          # RecycleBinView
        |-- reports/              # ReportsView
        |-- resignations/         # ResignationListView, ResignationDetailView
        |-- settings/             # BenefitSettingsView, TaxSettingsView, TaxBracketsView,
        |                         # TaxCalculatorView, PayrollPolicySettingsView
        |-- training/             # TrainingListView
        |-- uploads/              # DataImportView
        |-- NotFoundView.vue      # 404 page
```

---

## 2. Tech Stack & Configuration

### Dependencies

| Category | Package | Version | Purpose |
|----------|---------|---------|---------|
| Core | `vue` | ^3.5.13 | UI framework (Composition API) |
| Routing | `vue-router` | ^4.5.0 | SPA routing (history mode) |
| State | `pinia` | ^2.3.0 | State management |
| UI | `ant-design-vue` | ^4.2.6 | Component library |
| UI Icons | `@ant-design/icons-vue` | ^7.0.1 | Icon components |
| HTTP | `axios` | ^1.7.9 | API client |
| Dates | `dayjs` | ^1.11.13 | Date formatting + relative time |
| Realtime | `laravel-echo` | ^1.17.1 | WebSocket client |
| Realtime | `pusher-js` | ^8.4.0 | Echo transport layer |
| Progress | `nprogress` | ^0.2.0 | Page load progress bar |
| Dev | `vite` | ^6.0.7 | Build tool |
| Dev | `@vitejs/plugin-vue` | ^5.2.1 | Vue SFC support |
| Dev | `less` | ^4.2.1 | CSS preprocessor |

### Vite Configuration

- **Path alias**: `@` maps to `src/`
- **Less variables**: Ant Design theme overrides injected globally
  - `primary-color`: `#171717` (near-black)
  - `border-radius-base`: `8px`
  - `font-family`: `'DM Sans'` with system fallbacks
- **Dev server port**: `8080`
- **No API proxy** -- frontend calls backend directly with `withCredentials: true`

### Environment Variables

| Variable | Default (Dev) | Purpose |
|----------|---------------|---------|
| `VITE_ENV` | `development` | Environment mode |
| `VITE_APP_NAME` | `HRMS` | App display name |
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | Backend API base URL |
| `VITE_PUBLIC_URL` | `http://localhost:8000` | Backend public URL (CSRF, profile pics) |
| `VITE_REVERB_APP_KEY` | (empty) | WebSocket app key |
| `VITE_REVERB_HOST` | `localhost` | WebSocket host |
| `VITE_REVERB_PORT` | `8081` | WebSocket port |
| `VITE_REVERB_SCHEME` | `http` | WebSocket protocol |
| `VITE_BROADCASTING_AUTH_ENDPOINT` | `http://localhost:8000/broadcasting/auth` | Echo auth endpoint |

**Important**: These are baked in at build time via Vite `import.meta.env`. Different environments require separate builds or a runtime config injection strategy.

### External Resources (index.html)

- **Google Fonts**: DM Sans (300-700, italic), JetBrains Mono (400, 500)
- No CDN libraries -- everything bundled via Vite

---

## 3. Entry Point & App Bootstrap

**File**: `src/main.js`

Bootstrap sequence:

1. Create Vue app with `App.vue` as root
2. Install Pinia (state management)
3. Install Vue Router
4. Install Ant Design Vue globally (all components available everywhere)
5. Extend dayjs with `relativeTime` plugin
6. Provide `dayjs` instance globally via `inject('$dayjs')`
7. Register `v-permission` custom directive
8. Mount to `#app`

**App.vue** wraps everything in `<a-config-provider>` with a theme config:

- Primary color: `#171717`
- Border radius: `8px`
- Font family: DM Sans
- Background: `#ffffff` (container), `#f4f5f6` (layout)
- Font size: `14px`
- Algorithm: `theme.defaultAlgorithm` (light mode only)

---

## 4. Routing

### Public (Guest) Routes

| Path | Name | Component | Notes |
|------|------|-----------|-------|
| `/login` | `login` | `LoginView.vue` | Redirects to dashboard if already authenticated |
| `/forgot-password` | `forgot-password` | `ForgotPasswordView.vue` | Email-based password reset |

### Protected Routes (under DefaultLayout, `meta: { requiresAuth: true }`)

| Path | Name | Component | Permission |
|------|------|-----------|------------|
| `/` | `dashboard` | `DashboardView` | None (all users) |
| `/profile` | `profile` | `ProfileView` | None |
| `/notifications` | `notifications` | `NotificationsView` | None |
| `/employees` | `employees` | `EmployeeListView` | `employees` |
| `/employees/new` | `employee-new` | `EmployeeFormView` | `employees` |
| `/employees/:id` | `employee-detail` | `EmployeeFormView` | `employees` |
| `/leave-types` | `leave-types` | `LeaveTypeListView` | `leave_types` |
| `/leave-requests` | `leave-requests` | `LeaveRequestListView` | `leaves_admin` |
| `/leave-balances` | `leave-balances` | `LeaveBalanceListView` | `leave_balances` |
| `/attendance` | `attendance` | `AttendanceListView` | `attendance_admin` |
| `/holidays` | `holidays` | `HolidayListView` | `holidays` |
| `/grants` | `grants` | `GrantListView` | `grants_list` |
| `/grants/:id` | `grant-detail` | `GrantDetailView` | `grants_list` |
| `/grant-positions` | `grant-positions` | `GrantPositionListView` | `grants_list` |
| `/interviews` | `interviews` | `InterviewListView` | `interviews` |
| `/job-offers` | `job-offers` | `JobOfferListView` | `job_offers` |
| `/training` | `training` | `TrainingListView` | `training_list` |
| `/payroll` | `payroll` | `PayrollListView` | `employee_salary` |
| `/resignations` | `resignations` | `ResignationListView` | `resignation` |
| `/resignations/:id` | `resignation-detail` | `ResignationDetailView` | `resignation` |
| `/reports` | `reports` | `ReportsView` | `report_list` |
| `/data-import` | `data-import` | `DataImportView` | `employees` |
| `/sites` | `sites` | `SiteListView` | `sites` |
| `/departments` | `departments` | `DepartmentListView` | `departments` |
| `/positions` | `positions` | `PositionListView` | `positions` |
| `/settings/benefit` | `benefit-settings` | `BenefitSettingsView` | `benefit_settings` |
| `/settings/tax` | `tax-settings` | `TaxSettingsView` | `tax_settings` |
| `/settings/tax-brackets` | `tax-brackets` | `TaxBracketsView` | `tax_settings` |
| `/settings/tax-calculator` | `tax-calculator` | `TaxCalculatorView` | `tax_settings` |
| `/settings/payroll-policy` | `payroll-policy-settings` | `PayrollPolicySettingsView` | `payroll_items` |
| `/recycle-bin` | `recycle-bin` | `RecycleBinView` | `recycle_bin_list` |
| `*` (catch-all) | `not-found` | `NotFoundView` | None |

### Navigation Guards

```
beforeEach flow:
1. NProgress.start() -- only for auth <-> app transitions
2. First load only: verify stored session with server (auth.initialize())
3. Guest routes: if authenticated, redirect to dashboard
4. Protected routes:
   a. If not authenticated: redirect to login (with ?redirect= query)
   b. If route has meta.permission and user cannot read: redirect to dashboard
5. Return true to proceed
```

The `hasVerifiedSession` flag ensures server-side session verification only runs once per page load, catching stale localStorage data after token revocation or database reset.

All route components are lazy-loaded with `() => import(...)` except `DefaultLayout` (eagerly imported since it wraps all authenticated pages).

---

## 5. State Management (Pinia)

### Auth Store (`stores/auth.js`)

**State**:
- `user` -- User object from API, persisted to `localStorage.user`
- `permissions` -- Nested object `{ module: { read: bool, edit: bool } }`, persisted to `localStorage.permissions`
- `loading`, `error` -- Operation state
- `refreshTimer` -- Proactive token refresh timeout (private)
- `authChannel` -- BroadcastChannel for cross-tab sync (private)

**Computed**:
- `isAuthenticated` -- `!!user`
- `userName`, `userEmail`, `userAvatar` -- derived from user object
- `userRoles` -- Array of role names from `user.roles`

**Permission Methods**:
- `hasPermission(module, type='read')` -- Checks `permissions[module][type] === true`
- `canRead(module)` -- `hasPermission(module, 'read')`
- `canEdit(module)` -- `hasPermission(module, 'edit')`
- `hasRole(role)` -- Checks if role name exists in `userRoles`

**Actions**:
- `login(email, password)` -- Full login flow (CSRF, login, fetch permissions, schedule refresh, init cross-tab)
- `logout()` -- API logout, broadcast to tabs, clear data, navigate to login
- `fetchUser()` / `fetchPermissions()` -- Server sync
- `initialize()` -- Verify stored session (runs `fetchUser` + `fetchPermissions` in parallel)
- `scheduleProactiveRefresh()` -- Refreshes token 5 minutes before expiry
- `checkAuth()` -- Light server-side verification

**Cross-Tab Sync** (via `BroadcastChannel('hrms-auth-channel')`):
- `LOGOUT` -- Other tabs clear data and redirect
- `PERMISSION_UPDATE` -- Other tabs sync permissions
- `PROFILE_UPDATE` -- Other tabs sync user data

### Notifications Store (`stores/notifications.js`)

- State: `notifications`, `unreadCount`, `stats`, `meta`, `pollInterval`, `lastFetchTime`
- Polls unread count every 30 seconds
- Debounced fetch (5s minimum between calls)
- Actions: `fetchNotifications`, `markAsRead`, `markAllAsRead`, `startPolling`, `stopPolling`

### UI Store (`stores/uiStore.js`)

- State: `sidebarCollapsed` (persisted), `mobileSidebarOpen`, `pageTitle`, `breadcrumbs`, `windowWidth`
- Computed: `isMobile` (`windowWidth < 768`), `sidebarWidth`
- Handles responsive layout state

---

## 6. API Layer

### Base Client (`api/axios.js`)

- **Base URL**: `VITE_API_BASE_URL`
- **Timeout**: 30 seconds
- **Credentials**: `withCredentials: true` (sends HttpOnly auth cookies)
- **Headers**: `Accept: application/json`, `Content-Type: application/json`
- No request interceptor -- cookies are sent automatically

### CSRF Initialization

```javascript
export async function initCsrf() {
  await axios.get(`${PUBLIC_URL}/sanctum/csrf-cookie`, { withCredentials: true })
}
```

Called before login to set the XSRF-TOKEN cookie.

### Response Interceptors

**401 (Unauthorized)**:
1. Login-specific errors (`EMAIL_NOT_FOUND`, `INVALID_PASSWORD`, `ACCOUNT_INACTIVE`) -- throw immediately
2. Auth requests (login/logout/refresh) -- clear data, redirect to login
3. Other requests -- attempt token refresh with request queue:
   - First 401 triggers refresh; concurrent 401s are queued
   - On refresh success, replay all queued requests
   - On refresh failure, clear auth data, redirect to login

**419 (CSRF Token Mismatch)**:
- Re-fetches CSRF cookie via `initCsrf()` and retries the original request once

**403 (Permission Denied)**:
- Dispatches `permission-denied` custom window event

### All API Modules

The frontend has **26 API modules**, each corresponding to a backend resource. Key modules:

| Module | File | Endpoints |
|--------|------|-----------|
| Auth | `authApi.js` | login, logout, refresh-token, forgot-password, reset-password |
| User | `userApi.js` | GET /user, GET /me/permissions, update password/email/username/profile-picture |
| Dashboard | `dashboardApi.js` | Widget CRUD, reorder, toggle, reset defaults |
| Employees | `employeeApi.js` | Full CRUD, batch delete, filter, export, profile picture |
| Employee Records | `employeeRecordApi.js` | CRUD for education, children, languages, beneficiaries |
| Employment | `employmentApi.js` | CRUD, search by staff ID, probation management |
| Funding Allocations | `fundingAllocationApi.js` | CRUD, grant structure, preview, batch update, bulk deactivate |
| Leave | `leaveApi.js` | Types, requests (CRUD), balances, calculate-days, check-overlap |
| Attendance | `attendanceApi.js` | Full CRUD + batch delete |
| Payroll | `payrollApi.js` | CRUD, payslip PDF, bulk preview/create/status/errors, bulk payslips, budget history |
| Grants | `grantApi.js` | Full CRUD + batch delete + grant-positions |
| Interviews | `interviewApi.js` | Full CRUD + candidate search |
| Job Offers | `jobOfferApi.js` | Full CRUD + PDF generation + candidate search |
| Training | `trainingApi.js` | Full CRUD + batch delete |
| Resignations | `resignationApi.js` | Full CRUD + acknowledge + search employees + recommendation letter |
| Organization | `organizationApi.js` | Sites, Departments, Positions CRUD + options |
| Settings | `settingsApi.js` | Benefit/Tax settings, Tax brackets, Tax calculations, Payroll policy |
| Lookups | `lookupApi.js` | Lists, by type, types |
| Holidays | `holidayApi.js` | Full CRUD + bulk creation + in-range |
| Notifications | `notificationApi.js` | Full CRUD + mark read + stats + filter options |
| Recycle Bin | `recycleBinApi.js` | Restore, permanent delete, bulk restore, legacy records |
| Uploads | `uploadApi.js` | File upload by module + template download |
| Reports | `reportApi.js` | Interview, job offer, leave (department + individual) PDF/Excel exports |
| Options | `optionsApi.js` | Department, position, site, section-department dropdowns |

---

## 7. Views/Pages

### Auth Views

**LoginView**: Split layout with dark branding panel (left) + login form (right). Organization branding "SMRU / BHF". Supports `?redirect=` query param. Responsive (branding hidden on mobile).

**ForgotPasswordView**: Email input form with success confirmation state.

### Dashboard

- Time-based greeting ("Good morning/afternoon/evening, {firstName}")
- Quick stats grid (4 cards): Total Employees, On Leave Today, Pending Requests, Payroll This Month (**currently placeholder values**)
- Widget system: loads from API, supports customization mode
- Widget components: `WelcomeWidget` (quick action links), `PlaceholderWidget` (coming soon)

### Employee Module

**EmployeeListView** (390 lines):
- Table: avatar + name + staff ID, organization tag, gender, department, position, status tag
- Filters: search (name/staff ID), organization (SMRU/BHF), status
- Server-side pagination, sorting, row selection for bulk delete
- Mobile: card-based layout with separate pagination
- Avatar color derived from staff ID hash

**EmployeeFormView** (467 lines):
- Dual mode: Create and Edit (via route parameter)
- **8 tabs** in two groups:
  - **Form tabs** (saved via top Save button): Basic Info, Identification, Contact & Family, Financial
  - **Live tabs** (save per action, independent): Leave Balances, Records, Employment, Funding
- URL hash sync (`#basic_info`, `#employment`, etc.)
- Dirty state tracking with `JSON.stringify` comparison
- Unsaved changes guard (warns before leaving)
- `Ctrl+S` keyboard shortcut
- Right sidebar: avatar upload, name, staff ID, org, status, timestamps

**Employee Tabs** (8 separate components):

| Tab | Lines | Key Features |
|-----|-------|-------------|
| BasicInfoTab | ~300 | Organization, Staff ID, Status, Name (EN/TH), Demographics. Lookup-driven dropdowns. Read/edit modes. |
| IdentificationTab | ~200 | ID type/number/dates, SSN, tax number, driver license |
| ContactFamilyTab | ~250 | Phone, addresses, spouse, father, mother, emergency contact |
| FinancialTab | ~150 | Bank details (name, branch, account), remark |
| LeaveTab | ~100 | Read-only leave balance table |
| RecordsTab | ~614 | CRUD for Education, Children, Languages (tags), Beneficiaries -- each with inline modal |
| EmploymentTab | ~728 | Employment display + add/edit/delete modal. Probation pass/fail. Benefits checkboxes. Cascading department/position/section dropdowns. Auto-calculates probation dates (3 months from start). |
| FundingTab | ~400 | Funding allocations table. "Manage Allocations" modal with grant structure browse, FTE% input, auto-calculated amounts. |

### Grant Module

- **GrantListView** (496 lines): Expandable rows showing grant positions. Grant + Grant Item CRUD via modals.
- **GrantDetailView** (386 lines): Full grant detail with grant items table.
- **GrantPositionListView** (282 lines): Flat list of all grant positions across grants.

### Leave Module

- **LeaveRequestListView** (524 lines): CRUD with modal, leave day calculation + overlap checking, status color coding
- **LeaveBalanceListView** (142 lines): Read-only table
- **LeaveTypeListView** (142 lines): CRUD list with batch delete

### Payroll Module

- **PayrollListView** (541 lines): Two view modes (Standard grouped + Budget History pivot). Payroll detail drawer. Bulk creation + bulk payslips modals. PDF payslip download.
- **PayrollDetailDrawer** (295 lines): Side drawer with full payroll breakdown
- **BulkPayrollModal** (535 lines): Multi-step bulk payroll with real-time progress tracking
- **BulkPayslipModal** (128 lines): Filter + download multiple payslips as merged PDF
- **PayrollBudgetView** (165 lines): Budget history pivot table (employees x months)

### Recruitment

- **InterviewListView** (357 lines): CRUD + candidate search + status tagging
- **JobOfferListView** (357 lines): CRUD + PDF generation + acceptance status

### Settings

- **TaxCalculatorView** (967 lines -- largest view): Two tabs -- Income Tax Calculator and Quick Payroll Calculator. Thai Baht formatting. Personal allowance inputs (marital status, children, parents, SSF, PVD). Bracket-by-bracket breakdown.
- **BenefitSettingsView**, **TaxSettingsView**, **TaxBracketsView**, **PayrollPolicySettingsView**: Standard CRUD lists with modals.

### Other Modules

- **AttendanceListView**: CRUD + date/status filtering + batch delete
- **HolidayListView**: CRUD + bulk creation + year filter
- **TrainingListView**: Standard CRUD + batch delete
- **ResignationListView/DetailView**: CRUD + acknowledge action + recommendation letter PDF
- **ReportsView**: Card-based report selection with 4 report types (Interview, Job Offer, Department Leave, Individual Leave). PDF/Excel exports with filters.
- **DataImportView**: Card-per-module import interface for 5 modules (Grant, Employee, Employment, Funding Allocation, Payroll). Template download + file upload.
- **RecycleBinView**: All soft-deleted records, restore + permanent delete, legacy record support
- **ProfileView**: Avatar upload, display name/email update, password change
- **NotificationsView**: List with filter (All/Unread), mark read, clear, delete

---

## 8. Components

### Layout Components

**AppSidebar**:
- Fixed left sidebar, collapsible on desktop, drawer on mobile
- Logo: "H" mark + "HRMS" text
- Navigation sections: Dashboard, Notifications (badge), Grants, Recruitment, Management, Leave, Attendance, Training, HRM, Reports, Data Management, Organization, Settings, System
- Permission-gated: items only show if `authStore.canRead(permission)`
- Active state: dark background for current route

**AppHeader**:
- Fixed top header, shifts with sidebar
- Left: hamburger (mobile) + breadcrumbs
- Right: search input + notification badge + profile dropdown
- Profile dropdown: avatar with initials fallback, name, "My Profile", "Sign Out"

### Common Components

| Component | Props | Purpose |
|-----------|-------|---------|
| `AppEmpty` | `description` | Wraps `<a-empty>` with padding |
| `AppLoading` | `tip`, `size` | Centered spinner |
| `AppPageHeader` | `title`, `subtitle` | Page title with action slot |
| `InfoField` | `label`, `value`, `mono` | Label/value pair for read-only display |
| `FormErrors` | `errors` (Object) | Laravel validation errors as alert with bullet list |

### Dashboard Widgets

| Component | Purpose |
|-----------|---------|
| `WelcomeWidget` | 4-column grid of quick action links |
| `PlaceholderWidget` | "Widget coming soon" placeholder |

---

## 9. Composables/Hooks

| Composable | Returns | Purpose |
|------------|---------|---------|
| `useApi(apiFunction)` | `{ data, error, isLoading, execute, reset }` | Generic async wrapper for API calls |
| `useDebounce(sourceRef, delay=300)` | `debouncedValue` (ref) | Debouncing reactive values |
| `useNotification()` | `{ success, error, warning, info, loading }` | Wraps Ant Design `message` API |
| `usePagination(fetchFunction)` | `{ currentPage, perPage, total, lastPage, paginationConfig, updateFromResponse, handleTableChange, resetPagination }` | Ant Design table pagination integration |
| `usePermission()` | `{ can, hasRole, isAdmin }` | Template-level permission checks |

---

## 10. Services/Utils

### Formatters (`utils/formatters.js`)

| Function | Output Example |
|----------|----------------|
| `formatDate(date, format='DD MMM YYYY')` | `"25 Feb 2026"` or `"--"` |
| `formatDateTime(date)` | `"25 Feb 2026 14:30"` or `"--"` |
| `formatCurrency(amount, currency='THB')` | `"THB 35,000.00"` or `"--"` |
| `formatNumber(num)` | `"35,000"` or `"--"` |

### Helpers (`utils/helpers.js`)

| Function | Purpose |
|----------|---------|
| `debounce(fn, delay=300)` | Standard debounce |
| `isEmpty(value)` | Checks null/undefined/empty string/array/object |
| `cleanParams(params)` | Strips null/empty keys from query params object |

### Storage (`utils/storage.js`)

Safe localStorage wrapper with automatic JSON serialization: `get(key, default)`, `set(key, value)`, `remove(key)`, `clear()`.

### Constants (`constants/config.js`)

```javascript
PAGINATION_DEFAULTS = { perPage: 20, pageSizeOptions: ['10', '20', '50', '100'] }
APP_CONFIG = { appName: 'HRMS', apiBaseUrl: '/api/v1', notificationPollInterval: 30000 }
```

---

## 11. Layouts

### DefaultLayout (`layouts/DefaultLayout.vue`)

Main app shell: `AppSidebar` + `AppHeader` + `<router-view>`. On mount: starts notification polling (30s) and subscribes to Echo user channels. Content area shifts with sidebar width via CSS `marginLeft`. Min height 100vh, background `#f4f5f6`.

### AuthLayout (`layouts/AuthLayout.vue`)

Centered card layout, max width 480px. Exists but is not directly referenced by routes -- login has its own built-in split layout.

### BlankLayout (`layouts/BlankLayout.vue`)

Full-page centered layout. Exists but not referenced by any route.

**Layout switching**: Not done by `<component :is>` or meta-based system. Auth routes are standalone; all app routes are children of the DefaultLayout route.

---

## 12. Real-Time Features

### Configuration (`plugins/echo.js`)

- **Broadcaster**: Laravel Reverb (WebSocket)
- **Transport**: `ws` / `wss`
- **Auth**: Custom authorizer using `fetch()` with `credentials: 'include'` (sends HttpOnly auth cookie)
- **Auth endpoint**: `VITE_BROADCASTING_AUTH_ENDPOINT`

### Channel Subscriptions

When `DefaultLayout` mounts and user is authenticated, subscribes to private channel `App.Models.User.{userId}`:

| Event | Handler |
|-------|---------|
| `.user.permissions-updated` | Triggers `authStore.fetchPermissions()` to refresh permissions |
| `.notification` | Triggers `notificationStore.fetchUnreadCount()` to update badge |
| `.user.profile-updated` | Updates user data in store + broadcasts to other tabs |

### Lifecycle

- `initEcho()` creates singleton Echo instance on DefaultLayout mount
- `destroyEcho()` disconnects WebSocket on DefaultLayout unmount

---

## 13. Styling & Theming

### CSS Approach

- **Preprocessor**: Less
- **Design System**: Ant Design Vue 4 with extensive overrides in `global.less`
- **Custom Properties**: CSS variables for consistent theming

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#171717` | Buttons, active sidebar, primary actions |
| Accent | `#2563eb` | Links, NProgress bar, info states |
| Layout BG | `#f4f5f6` | Page background |
| Surface | `#ffffff` | Cards, containers |
| Subtle BG | `#f8f9fa` | Alternating rows, subtle fills |
| Text Primary | `#1f272e` | Main text |
| Text Secondary | `#6b7280` | Labels, descriptions |
| Text Muted | `#9ca3af` | Timestamps, hints |
| Success | `#16a34a` | Active status, confirmations |
| Warning | `#d97706` | Pending status, cautions |
| Danger | `#dc2626` | Errors, destructive actions |
| Info | `#2563eb` | Information states |

### Typography

- **Primary font**: "DM Sans" (Google Fonts, 300-700 + italic)
- **Monospace**: "JetBrains Mono" (for staff IDs, budget codes, currency amounts)
- **Base size**: 14px
- **Header titles**: 600-700 weight, negative letter-spacing

### Layout Dimensions

| Element | Value |
|---------|-------|
| Sidebar (expanded) | 240px |
| Sidebar (collapsed) | 64px |
| Header height | 56px |
| Page padding (mobile) | 16px |
| Page padding (desktop) | 24px |
| Max content width | 1400px |

### Ant Design Overrides

- Cards: 12px radius, subtle shadow, lighter borders
- Tables: uppercase 12px column headers, subtle row borders, hover background
- Buttons: 8px radius, 500 weight, no box-shadow on primary
- Inputs: 8px radius, focus ring with primary color
- Tags: 6px radius, no border, 500 weight
- Modals: 16px radius
- Menu items: 8px radius with margin

### Utility Classes

- `.page-container` -- Standard page wrapper with responsive padding
- `.filter-bar` -- Flex wrap row for filter controls
- `.filter-input` -- Full-width on mobile, auto on 640px+
- `.grid-2-col` / `.grid-2-lg-col` -- Responsive 2-column grids
- `.stats-grid` -- 2-col (mobile) to 4-col (desktop) grid
- `.stat-card` -- Stats card with hover shadow
- `.text-muted`, `.text-secondary`, `.font-mono`, `.font-semibold`
- `.hidden-mobile`, `.visible-mobile`

---

## 14. Authentication Flow

### Login Flow

1. User enters email + password on `LoginView`
2. `authApi.login()` calls `initCsrf()` first (`GET /sanctum/csrf-cookie`)
3. `POST /login` with email + password (cookies sent via `withCredentials`)
4. Backend sets HttpOnly `auth_token` cookie + returns `{ success, user, expires_in }`
5. Store saves `user` to reactive state + localStorage
6. Store saves `userRole` and calculates `tokenExpiration` timestamp
7. Store fetches permissions via `GET /me/permissions`
8. Store schedules proactive token refresh (5 min before expiry)
9. Store initializes cross-tab BroadcastChannel sync
10. Router navigates to `?redirect=` path or dashboard

### Session Verification (Page Refresh)

1. Route guard checks `localStorage.user` exists
2. If yes, calls `auth.initialize()` which runs `fetchUser()` + `fetchPermissions()` in parallel
3. If server returns 401 (stale token), all data is cleared and user is redirected to login
4. `hasVerifiedSession` flag ensures this only runs once per page load

### Token Refresh

- **Proactive**: `scheduleProactiveRefresh()` sets a `setTimeout` to call `POST /refresh-token` 5 minutes before token expires
- **Reactive**: On 401, axios interceptor tries `POST /refresh-token` with request queue (all concurrent 401s wait for one refresh attempt, then replay)

### Logout Flow

1. `POST /logout` (errors ignored -- server state cleared even if request fails)
2. Broadcasts `LOGOUT` to other tabs via BroadcastChannel
3. Clears reactive state + localStorage
4. Navigates to login page

### Cross-Tab Sync

Via `BroadcastChannel('hrms-auth-channel')`:
- `LOGOUT` -- Other tabs clear data and redirect
- `PERMISSION_UPDATE` -- Other tabs sync permission object
- `PROFILE_UPDATE` -- Other tabs sync user data

### 401 Session Expiry Bridge

The axios interceptor cannot directly access Pinia (circular import). Solution:
1. Interceptor clears localStorage
2. Dispatches `window.dispatchEvent(new Event('auth:session-expired'))`
3. Auth store listens for this event and nullifies reactive state
4. Route guard detects `isAuthenticated === false` and redirects to login

---

## 15. Permissions & Authorization

### Three-Layer Permission System

**Layer 1 -- Route Guard** (`guards.js`):
Routes with `meta.permission` are checked against `authStore.canRead()`. Users without access are silently redirected to dashboard.

**Layer 2 -- `v-permission` Directive** (`directives/vPermission.js`):
```html
<a-button v-permission="'employees'">View Only</a-button>
<a-button v-permission="['employees', 'edit']">Edit Access</a-button>
```
Elements without permission get `display: none`. Updated reactively when permissions change.

**Layer 3 -- Programmatic Checks** (in views/components):
```javascript
const canEdit = computed(() => authStore.canEdit('employees'))
```
Used for conditionally rendering edit/delete buttons, row selection, and action columns.

### Permission Modules Used

| Module Key | Feature Area |
|------------|-------------|
| `employees` | Employee list, create, edit |
| `employment_records` | Employment tab within employee |
| `employee_salary` | Payroll list, bulk payroll |
| `grants_list` | Grant list, detail, positions |
| `interviews` | Interview management |
| `job_offers` | Job offer management |
| `training_list` | Training management |
| `leave_types` | Leave type management |
| `leaves_admin` | Leave request management |
| `leave_balances` | Leave balance view |
| `attendance_admin` | Attendance management |
| `holidays` | Holiday management |
| `resignation` | Resignation management |
| `report_list` | Reports page |
| `sites` | Site management |
| `departments` | Department management |
| `positions` | Position management |
| `benefit_settings` | Benefit settings |
| `tax_settings` | Tax settings + brackets + calculator |
| `payroll_items` | Payroll policy settings |
| `recycle_bin_list` | Recycle bin access |

### Permission Data Structure

Backend returns from `GET /me/permissions`:
```json
{
  "employees": { "read": true, "edit": true },
  "grants_list": { "read": true, "edit": false },
  ...
}
```

---

## 16. Complete Feature Matrix

| Module | List | Create | Edit | Delete | Batch Delete | Export | Import | Special Features |
|--------|------|--------|------|--------|-------------|--------|--------|------------------|
| **Employees** | Yes | Yes | Yes | Yes | Yes | Excel | Excel | Profile picture, 8-tab detail, search/filter/sort |
| **Employment** | Tab | Yes | Yes | Yes | No | No | Excel | Probation pass/fail, auto-calc dates, cascading dropdowns |
| **Funding Allocations** | Tab | Yes | Yes | Yes | No | No | Excel | FTE calculation, grant structure browse, preview amounts |
| **Education** | Tab | Yes | Yes | Yes | No | No | No | Inline modal CRUD |
| **Children** | Tab | Yes | Yes | Yes | No | No | No | Inline modal CRUD |
| **Languages** | Tab | Yes | -- | Delete | No | No | No | Tag-based display |
| **Beneficiaries** | Tab | Yes | Yes | Yes | No | No | No | Inline modal CRUD |
| **Leave Types** | Yes | -- | -- | -- | Yes | No | No | Read-only list |
| **Leave Requests** | Yes | Yes | Yes | Yes | Yes | No | No | Day calculation, overlap check |
| **Leave Balances** | Yes | -- | -- | -- | No | No | No | Read-only |
| **Attendance** | Yes | Yes | Yes | Yes | Yes | No | No | Date/status filtering |
| **Holidays** | Yes | Yes | Yes | Yes | Yes | No | No | Bulk creation |
| **Grants** | Yes | Yes | Yes | Yes | Yes | No | Excel | Expandable grant positions |
| **Grant Items** | Nested | Yes | Yes | Yes | No | No | No | Within grant view |
| **Interviews** | Yes | Yes | Yes | Yes | Yes | No | No | Candidate search |
| **Job Offers** | Yes | Yes | Yes | Yes | Yes | PDF | No | Per-offer PDF generation |
| **Training** | Yes | Yes | Yes | Yes | Yes | No | No | Standard CRUD |
| **Payroll** | Yes | -- | Yes | Yes | Yes | PDF | Excel | Bulk create, bulk payslips, budget history, grouped view |
| **Resignations** | Yes | Yes | Yes | Yes | Yes | PDF | No | Acknowledge, recommendation letter |
| **Sites** | Yes | Yes | Yes | Yes | Yes | No | No | Standard CRUD |
| **Departments** | Yes | Yes | Yes | Yes | Yes | No | No | Standard CRUD |
| **Positions** | Yes | Yes | Yes | Yes | Yes | No | No | Standard CRUD |
| **Benefit Settings** | Yes | Yes | Yes | Yes | No | No | No | Standard CRUD |
| **Tax Settings** | Yes | Yes | Yes | Yes | No | No | No | Year filter, toggle, bulk update |
| **Tax Brackets** | Yes | Yes | Yes | Yes | No | No | No | Year filter |
| **Tax Calculator** | N/A | N/A | N/A | N/A | No | No | No | 2-tab calculator (income tax + payroll) |
| **Payroll Policy** | Yes | Yes | Yes | Yes | No | No | No | Standard CRUD |
| **Reports** | N/A | N/A | N/A | N/A | No | PDF/Excel | No | 4 report types with filters |
| **Data Import** | N/A | N/A | N/A | N/A | No | Templates | 5 modules | Template download + file upload |
| **Recycle Bin** | Yes | N/A | N/A | Permanent | Bulk Restore | No | No | Restore, legacy record support |
| **Notifications** | Yes | N/A | N/A | Yes | No | No | No | Mark read, clear, real-time |
| **Dashboard** | N/A | N/A | N/A | N/A | No | No | No | Widgets, customization, quick stats |
| **Profile** | N/A | N/A | Yes | N/A | No | No | No | Name, email, password, avatar |

---

## 17. Error Handling

### API Error Display Patterns

**Pattern 1 -- Toast messages** (most common):
```javascript
catch (err) {
  message.error(err.response?.data?.message || 'Failed to [action]')
}
```

**Pattern 2 -- Validation errors** (first error displayed):
```javascript
catch (err) {
  const resp = err.response?.data
  if (resp?.errors) {
    const firstErr = Object.values(resp.errors)[0]
    message.error(Array.isArray(firstErr) ? firstErr[0] : firstErr)
  }
}
```

**Pattern 3 -- FormErrors component**: Displays all validation errors as a bullet list in an alert box. Used sparingly.

**Pattern 4 -- Modal error dialog**: Used for funding allocation errors with multi-line display.

### Form Validation

- **Client-side**: Manual validation in `handleSave()` functions with `message.warning()`
- **Ant Design form rules**: Used on login form for email format
- **Server-side**: Laravel `422` response with `{ errors: { field: ['message'] } }`

### Global Error Handling

- **401**: Axios interceptor handles token refresh or redirect
- **419**: Axios interceptor re-fetches CSRF and retries
- **403**: Dispatches `permission-denied` event (no global UI handler currently)
- **No global error boundary** -- errors handled per-component
- **Silent catch**: Many views silently catch errors on non-critical operations (lookups, stats, widgets)

---

## 18. Patterns & Code Quality

### Design Patterns Used

1. **Composition API + `<script setup>`** -- Used exclusively. No Options API.
2. **Per-resource API modules** -- Plain objects with methods (not classes). Barrel-exported.
3. **Store-driven auth** -- Single source of truth with localStorage persistence.
4. **Tab-based detail views** -- Employee detail uses dual tab groups (form + live).
5. **Inline modal CRUD** -- List views open modals for create/edit (no page navigation).
6. **Reactive dirty tracking** -- `JSON.stringify` comparison for unsaved changes.
7. **Debounced search** -- Search triggers on Enter/clear, not on every keystroke.
8. **Server-side pagination** -- All list views use server-side pagination via Ant Design table.
9. **Permission-gated UI** -- Consistent `v-if="authStore.canEdit('module')"` pattern.
10. **Lookup-driven dropdowns** -- Form selects populated from `/lookups/lists` API.

### Code Conventions

- **File naming**: `{Feature}{Type}View.vue`, `{feature}Api.js`, `use{Name}.js`
- **View structure**: Template first, then `<script setup>`, then `<style scoped>`
- **CSS**: Scoped styles per component + global overrides in `global.less`
- **Page metadata**: `appStore.setPageMeta(title)` called in `onMounted`
- **Currency**: Thai Baht throughout -- `formatCurrency()` defaults to THB

### Strengths

- Clean, readable code ("junior developer at 2 AM" philosophy)
- Extremely consistent patterns across all modules
- Good separation of concerns (API / stores / composables / views)
- Well-structured JavaScript (no TypeScript, but clear and organized)
- Responsive design with mobile-first approach
- Cross-tab session sync via BroadcastChannel
- Proactive token refresh before expiry
- Proper CSRF handling with auto-retry

### Gaps & Technical Debt

- **No tests** -- No test runner or test files configured
- **No linting** -- No ESLint/Prettier configuration
- **No TypeScript** -- Relies on runtime checks only
- **Large views**: TaxCalculatorView (967 lines), EmploymentTab (728 lines), RecordsTab (614 lines) could benefit from component extraction
- **Inconsistent composable usage**: `useApi` and `usePagination` exist but not universally adopted -- many views implement these patterns inline
- **Dashboard stats are placeholder** -- Quick stats show `"--"` (not wired to API)
- **Unused layouts**: `AuthLayout.vue` and `BlankLayout.vue` exist but are not referenced
- **No i18n** -- English-only UI with some Thai form placeholders
- **No dark mode** -- Light theme only (algorithm hardcoded to `defaultAlgorithm`)
- **Search UX**: Only triggers on Enter key, not live debounced search
