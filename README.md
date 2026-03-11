# HRMS Frontend — Vue 3 Admin Panel

A clean, modern admin panel for the SMRU/BHF Human Resource Management System, inspired by Frappe HRMS's design language. Built with Vue 3, Ant Design Vue 4, and Pinia.

## Stack

- **Vue 3.5** — Composition API + `<script setup>`
- **Ant Design Vue 4** — UI component library with custom theme
- **Pinia** — State management
- **Vue Router 4** — File-based-like routing with auth guards
- **Axios** — HTTP client with interceptor-based auth
- **Day.js** — Lightweight date formatting
- **NProgress** — Navigation loading bar
- **Laravel Echo + Pusher** — Real-time via Laravel Reverb (ready, not wired yet)
- **Vite 6** — Build tool with HMR

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment
cp .env.example .env

# Start dev server (proxies /api to Laravel backend)
npm run dev

# Build for production
npm run build
```

The dev server runs on `http://localhost:5173` and proxies all `/api` requests to `http://localhost:8000` (your Laravel backend).

## Project Structure

```
src/
├── api/                    # API layer
│   ├── client.js           # Axios instance + interceptors + token refresh
│   ├── auth.js             # Auth endpoints (login, logout, refresh)
│   └── index.js            # All resource APIs (employees, leave, payroll, etc.)
├── stores/                 # Pinia stores
│   ├── auth.js             # Authentication state, user, permissions
│   ├── notifications.js    # Notification state with polling
│   └── app.js              # UI state (sidebar, page title)
├── router/
│   └── index.js            # Route definitions + auth/permission guards
├── layouts/
│   └── MainLayout.vue      # Sidebar + Header + Content area
├── components/
│   ├── layout/
│   │   ├── AppSidebar.vue  # Collapsible navigation sidebar
│   │   └── AppHeader.vue   # Top bar with search, notifications, profile
│   ├── dashboard/widgets/
│   │   ├── WelcomeWidget.vue
│   │   └── PlaceholderWidget.vue
│   └── common/
│       └── InfoField.vue   # Label + value display component
├── views/
│   ├── auth/
│   │   ├── LoginView.vue
│   │   └── ForgotPasswordView.vue
│   ├── dashboard/
│   │   └── DashboardView.vue
│   ├── profile/
│   │   └── ProfileView.vue
│   ├── notifications/
│   │   └── NotificationsView.vue
│   ├── employees/
│   │   ├── EmployeeListView.vue
│   │   └── EmployeeDetailView.vue
│   ├── leave/
│   │   ├── LeaveTypeListView.vue
│   │   ├── LeaveRequestListView.vue
│   │   └── LeaveBalanceListView.vue
│   └── NotFoundView.vue
├── styles/
│   └── global.less         # CSS variables, resets, Ant Design overrides
├── App.vue                 # Root component with theme config
└── main.js                 # App entry point
```

## Architecture

### API Layer
All API calls go through `api/client.js` which handles:
- Bearer token attachment from localStorage
- Automatic 401 → token refresh → retry queue
- Redirect to login on auth failure

Each resource has a clean API object in `api/index.js`:
```js
import { employeeApi } from '@/api'
const { data } = await employeeApi.list({ page: 1, per_page: 20 })
```

### Auth Flow
1. Login → receive `access_token` → store in localStorage
2. Token attached to all requests via Axios interceptor
3. On 401 → attempt refresh via `/api/v1/refresh-token`
4. Failed refresh → clear token → redirect to login
5. Route guards check `isAuthenticated` + `hasPermission(module)`

### Permission System
Permissions are fetched from `GET /api/v1/me/permissions` and stored in the auth store:
```js
authStore.hasPermission('employees')      // check read
authStore.hasPermission('employees', 'edit') // check edit
```

Route meta tags connect to permissions:
```js
{ path: 'employees', meta: { permission: 'employees' } }
```

### Response Shape Matching
The API layer matches your Laravel backend's response shapes exactly:
- `{ success, data, pagination, statistics, filters }` for list endpoints
- `{ success, data, message }` for single resource endpoints
- Pagination: `{ current_page, per_page, total, last_page, has_more_pages }`

## Phases

### ✅ Phase 1 — Foundation (Current)
- Auth (login, logout, token refresh, forgot password)
- Dashboard with widget grid + quick stats
- Profile with password change + permissions overview
- Notifications with read/unread + polling
- Sidebar navigation with permission-based visibility

### ✅ Phase 2 — Employee Management
- Employee list with search, filters, pagination
- Employee detail with tabbed view (Basic Info, Employment, Funding Allocations, Leave Balances, Education, Beneficiaries)

### ✅ Phase 3 — Leave Management
- Leave types list
- Leave requests list with status filters
- Leave balances with year filter + color-coded remaining days

### 🔲 Phase 4 — Payroll (Next)
- Payroll list + detail
- Tax calculations
- Grant management
- Funding allocations

## Customization

### Theme
Edit the Ant Design theme in `App.vue`:
```js
const themeConfig = {
  token: {
    colorPrimary: '#171717',     // Change primary color
    borderRadius: 8,
    fontFamily: "'DM Sans', ...",
  },
}
```

### CSS Variables
All spacing, colors, and shadows are controlled via CSS variables in `styles/global.less`.

## Notes

- The frontend expects your Laravel backend running on `localhost:8000`
- All routes use lazy loading (`() => import(...)`) for code splitting
- Sidebar collapse state persists in localStorage
- Notification polling runs every 30 seconds when authenticated
- Build output is ~494KB gzipped (mainly Ant Design Vue)
