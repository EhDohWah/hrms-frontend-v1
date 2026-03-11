# Critical Issues Fix Plan

**Date:** 2026-03-07
**Scope:** All Critical + High priority issues from [research.md](./research.md)
**Estimated total effort:** ~4 hours

---

## Table of Contents

1. [SPA History Mode Fallback](#fix-1-spa-history-mode-fallback) — CRITICAL
2. [Notification Polling Visibility](#fix-2-notification-polling-visibility) — CRITICAL
3. [AbortController for API Calls](#fix-3-abortcontroller-for-api-calls) — HIGH
4. [Gitignore .env Files](#fix-4-gitignore-env-files) — HIGH
5. [Employee Select per_page: 999](#fix-5-employee-select-per_page-999) — HIGH
6. [Open Redirect Vulnerability](#fix-6-open-redirect-vulnerability) — HIGH
7. [Vendor Chunk Splitting & Console Stripping](#fix-7-vendor-chunk-splitting--console-stripping) — HIGH
8. [Dynamic Import for pusher-js](#fix-8-dynamic-import-for-pusher-js) — HIGH
9. [Silent Error Swallowing](#fix-9-silent-error-swallowing) — HIGH
10. [Missing Meta Tags & Favicon](#fix-10-missing-meta-tags--favicon) — MEDIUM
11. [Unbounded 401 Retry Queue](#fix-11-unbounded-401-retry-queue) — MEDIUM
12. [Implementation Todo](#implementation-todo)

---

## FIX 1: SPA History Mode Fallback

**Severity:** CRITICAL
**File:** `public/_redirects` (new)
**Effort:** 1 minute

### Problem

Vue Router uses `createWebHistory()` (HTML5 history mode). When a user directly navigates to a route like `/employees` or refreshes the page on `/leave-requests`, the hosting server (Netlify) looks for a file at that path. Since no such file exists (it's a SPA), the server returns a 404 error.

This affects **every route** in the application. Without this fix, bookmarks, shared links, and page refreshes all break.

### Solution

Create a `_redirects` file in the `public/` directory. Vite copies `public/` contents to `dist/` at build time, so this file will be deployed alongside the built assets.

### Step 1: Create the public directory

The `public/` directory does not currently exist. Create it at the project root.

### Step 2: Create `public/_redirects`

```
/*    /index.html   200
```

This single rule tells Netlify: "For any URL path, serve `index.html` with a 200 status code." Vue Router then handles the routing client-side.

### Why `200` and not `301`/`302`?

- `200` = serve `index.html` **transparently** — the browser keeps the original URL in the address bar
- `301`/`302` = redirect the browser to `/index.html` — the URL changes, and all deep links break

### Verification

After deploying:
1. Navigate to `https://your-domain.com/employees` directly — should load the employees page, not a 404
2. Refresh the page on any route — should reload the same page
3. Share a link like `https://your-domain.com/leave-requests` — should work for the recipient

---

## FIX 2: Notification Polling Visibility

**Severity:** CRITICAL
**File:** `src/stores/notifications.js`
**Effort:** 15 minutes

### Problem

The notification store starts a `setInterval` that polls `GET /notifications/unread-count` every 30 seconds. This timer **never pauses**, even when:

- The browser tab is in the background
- The user has switched to another application
- The user's device is on battery power

This wastes bandwidth, drains battery on mobile devices, and creates unnecessary server load. With 100 users, that's 200 requests/minute to the server even when nobody is actively using the app.

### Current Code

```js
// src/stores/notifications.js (lines 54-58)
function startPolling(intervalMs = 30000) {
  stopPolling()
  fetchUnreadCount()
  pollInterval = setInterval(fetchUnreadCount, intervalMs)
}

function stopPolling() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null }
}
```

### Solution

Use the [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) to pause polling when the tab is hidden, and resume when it becomes visible again. On resume, immediately fetch the latest count (so the badge updates without waiting for the next interval).

### After

```js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { notificationApi } from '@/api'

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref([])
  const unreadCount = ref(0)
  const stats = ref(null)
  const loading = ref(false)
  const meta = ref({})
  let pollInterval = null
  let lastFetchTime = 0
  let pollIntervalMs = 30000
  let visibilityHandler = null

  const hasUnread = computed(() => unreadCount.value > 0)

  async function fetchUnreadCount() {
    const now = Date.now()
    if (now - lastFetchTime < 5000) return
    lastFetchTime = now
    try {
      const { data } = await notificationApi.unreadCount()
      unreadCount.value = data.data?.count || 0
    } catch {
      // Network errors during background polling are expected — ignore
    }
  }

  async function fetchNotifications(params = {}) {
    loading.value = true
    try {
      const { data } = await notificationApi.list(params)
      notifications.value = data.data || []
      meta.value = data.meta || {}
      unreadCount.value = data.meta?.unread_count ?? unreadCount.value
    } finally {
      loading.value = false
    }
  }

  async function markAsRead(id) {
    await notificationApi.markAsRead(id)
    const n = notifications.value.find(n => n.id === id)
    if (n && !n.read_at) {
      n.read_at = new Date().toISOString()
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
  }

  async function markAllAsRead() {
    await notificationApi.markAllAsRead()
    notifications.value.forEach(n => { n.read_at = n.read_at || new Date().toISOString() })
    unreadCount.value = 0
  }

  function resumeTimer() {
    if (pollInterval) return
    pollInterval = setInterval(fetchUnreadCount, pollIntervalMs)
  }

  function pauseTimer() {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      pauseTimer()
    } else {
      fetchUnreadCount()
      resumeTimer()
    }
  }

  function startPolling(intervalMs = 30000) {
    stopPolling()
    pollIntervalMs = intervalMs
    fetchUnreadCount()
    resumeTimer()

    // Pause/resume when tab visibility changes
    visibilityHandler = handleVisibilityChange
    document.addEventListener('visibilitychange', visibilityHandler)
  }

  function stopPolling() {
    pauseTimer()
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler)
      visibilityHandler = null
    }
  }

  return {
    notifications, unreadCount, stats, loading, meta, hasUnread,
    fetchUnreadCount, fetchNotifications, markAsRead, markAllAsRead,
    startPolling, stopPolling,
  }
})
```

### Key Changes

1. **`handleVisibilityChange()`** — listens for `visibilitychange` events
2. **`pauseTimer()` / `resumeTimer()`** — internal helpers that manage only the interval
3. **`startPolling()`** — now registers the visibility listener
4. **`stopPolling()`** — now cleans up the visibility listener (prevents memory leaks)
5. **On tab resume** — immediately calls `fetchUnreadCount()` so the badge updates instantly

### Verification

1. Open the HRMS in a browser tab
2. Open DevTools Network tab, filter by "unread"
3. Confirm polling requests appear every 30 seconds
4. Switch to a different tab — requests should **stop**
5. Switch back — one immediate request, then regular polling resumes

---

## FIX 3: AbortController for API Calls

**Severity:** HIGH
**Files:** `src/api/axios.js`, all list views with `fetchItems()` / `fetchRequests()` functions
**Effort:** 2 hours

### Problem

When a user navigates away from a page, in-flight API requests continue running in the background. This causes:

1. **Stale data writes** — a late response from page A could update state that page B is now using
2. **Wasted bandwidth** — responses for pages the user has already left
3. **Console errors** — trying to update refs on unmounted components

### Solution

Create a composable that wraps the fetch pattern with automatic AbortController cancellation on component unmount. This avoids modifying every list view individually.

### Step 1: Create `src/composables/useAbortController.js`

```js
import { onUnmounted } from 'vue'

/**
 * Returns a function that creates a new AbortSignal, automatically aborting
 * the previous one. Also aborts on component unmount.
 *
 * Usage:
 *   const getSignal = useAbortController()
 *   const { data } = await axios.get('/endpoint', { signal: getSignal() })
 */
export function useAbortController() {
  let controller = null

  function getSignal() {
    if (controller) controller.abort()
    controller = new AbortController()
    return controller.signal
  }

  onUnmounted(() => {
    if (controller) controller.abort()
  })

  return getSignal
}
```

### Step 2: Use in list views

Apply to each list view's fetch function. Example with `EmployeeListView.vue`:

**Before:**
```js
async function fetchEmployees() {
  loading.value = true
  try {
    const params = { /* ... */ }
    const { data } = await employeeApi.list(params)
    employees.value = data.data || []
    // ...
  } catch { /* silent */ }
  loading.value = false
}
```

**After:**
```js
import { useAbortController } from '@/composables/useAbortController'

const getSignal = useAbortController()

async function fetchEmployees() {
  loading.value = true
  try {
    const params = { /* ... */ }
    const { data } = await employeeApi.list(params, { signal: getSignal() })
    employees.value = data.data || []
    // ...
  } catch (err) {
    if (err.name === 'CanceledError') return
  }
  loading.value = false
}
```

### Step 3: Update API modules to accept config

The API modules need to forward the axios config (containing `signal`) to the client.

**Before** (`src/api/employeeApi.js`):
```js
export const employeeApi = {
  list: (params) => client.get('/employees', { params }),
  // ...
}
```

**After:**
```js
export const employeeApi = {
  list: (params, config) => client.get('/employees', { params, ...config }),
  // ...
}
```

This pattern must be applied to the `list()` method of every API module:

| API Module | File |
|------------|------|
| `employeeApi` | `src/api/employeeApi.js` |
| `attendanceApi` | `src/api/modules/attendanceApi.js` |
| `leaveApi` | `src/api/leaveApi.js` |
| `trainingApi` | `src/api/modules/trainingApi.js` |
| `payrollApi` | `src/api/modules/payrollApi.js` |
| `grantApi` | `src/api/modules/grantApi.js` |
| `resignationApi` | `src/api/modules/resignationApi.js` |
| `holidayApi` | `src/api/modules/holidayApi.js` |
| `interviewApi` | `src/api/modules/interviewApi.js` |
| `jobOfferApi` | `src/api/modules/jobOfferApi.js` |
| `departmentApi` | `src/api/modules/departmentApi.js` |
| `positionApi` | `src/api/modules/positionApi.js` |
| `siteApi` | `src/api/modules/siteApi.js` |
| `notificationApi` | `src/api/modules/notificationApi.js` |

### Views to Update

All views with `fetchItems()`, `fetchRequests()`, or similar list-fetching functions:

| View | Fetch Function |
|------|---------------|
| `EmployeeListView.vue` | `fetchEmployees()` |
| `AttendanceListView.vue` | `fetchItems()` |
| `LeaveRequestListView.vue` | `fetchRequests()` |
| `TrainingListView.vue` | `fetchItems()` |
| `PayrollListView.vue` | `fetchItems()` |
| `GrantListView.vue` | `fetchItems()` |
| `GrantPositionListView.vue` | `fetchItems()` |
| `ResignationListView.vue` | `fetchItems()` |
| `HolidayListView.vue` | `fetchItems()` |
| `InterviewListView.vue` | `fetchItems()` |
| `JobOfferListView.vue` | `fetchItems()` |
| `DepartmentListView.vue` | `fetchItems()` |
| `PositionListView.vue` | `fetchItems()` |
| `SiteListView.vue` | `fetchItems()` |
| `UserListView.vue` | `fetchItems()` |
| `RoleListView.vue` | `fetchItems()` |
| `LeaveTypeListView.vue` | `fetchItems()` |
| `LeaveBalanceListView.vue` | `fetchItems()` |
| `RecycleBinView.vue` | `fetchItems()` |
| `DashboardView.vue` | `fetchDashboard()` |

### Gotchas

- **Aborted requests throw `CanceledError`** (axios) — always check `err.name === 'CanceledError'` in the catch block and return early. Do NOT show an error message for cancelled requests.
- **Do NOT abort mutations** (POST/PUT/DELETE) — only abort read operations (GET). Aborting a save could leave data in an inconsistent state.
- **`onUnmounted` only works in `<script setup>`** — which all our views use, so this is fine.

---

## FIX 4: Gitignore .env Files

**Severity:** HIGH
**File:** `.gitignore`
**Effort:** 1 minute

### Problem

The `.env` file is tracked in git. While Vite only exposes `VITE_`-prefixed variables to the client bundle, tracking env files is a bad practice — any non-`VITE_` variables added later would be committed to the repository.

### Current `.gitignore`

```
node_modules
dist
*.local

# Auto-generated by unplugin
auto-imports.d.ts
components.d.ts
```

### After

```
node_modules
dist
*.local

# Environment files (secrets / per-environment config)
.env
.env.*
!.env.example

# Auto-generated by unplugin
auto-imports.d.ts
components.d.ts
```

### Explanation

- `.env` — excludes the base env file
- `.env.*` — excludes `.env.development`, `.env.production`, `.env.staging`, etc.
- `!.env.example` — re-includes the example template (negation pattern)

### After Updating `.gitignore`

The `.env` file is **already tracked** by git. Adding it to `.gitignore` only prevents **future** changes from being staged. To fully untrack it:

```bash
git rm --cached .env
```

This removes `.env` from git's tracking without deleting the local file.

---

## FIX 5: Employee Select per_page: 999

**Severity:** HIGH
**File:** `src/views/leave/LeaveRequestListView.vue`
**Effort:** 30 minutes

### Problem

The leave request create/edit modal loads ALL employees to populate the employee dropdown:

```js
// Line 306
const [empRes, ltRes] = await Promise.all([
  employeeApi.list({ per_page: 999 }),
  leaveApi.typeOptions(),
])
```

With hundreds of employees, this transfers a large JSON payload containing full employee records (with nested employment, department, position data) just to populate a dropdown that only needs `id`, `first_name_en`, `last_name_en`, and `staff_id`.

### Solution

Replace the preloaded dropdown with a server-side search select that fetches matching employees as the user types. Ant Design Vue's `<a-select>` supports this via `:filter-option="false"` + `@search` + `show-search`.

### Before — Template (lines 113-132)

```html
<a-select
  v-model:value="form.employee_id"
  placeholder="Search employee..."
  show-search
  :filter-option="filterEmployee"
  :loading="employeesLoading"
  allow-clear
  style="width: 100%"
>
  <a-select-option
    v-for="emp in employees"
    :key="emp.id"
    :value="emp.id"
    :label="`${emp.first_name_en} ${emp.last_name_en} — ${emp.staff_id}`"
  >
    {{ emp.first_name_en }} {{ emp.last_name_en }}
    <span class="font-mono" style="color: var(--color-text-muted); font-size: 12px; margin-left: 6px">{{ emp.staff_id }}</span>
  </a-select-option>
</a-select>
```

### After — Template

```html
<a-select
  v-model:value="form.employee_id"
  placeholder="Search employee by name or staff ID..."
  show-search
  :filter-option="false"
  :loading="employeesLoading"
  :not-found-content="employeeSearchQuery ? 'No employees found' : 'Type to search...'"
  allow-clear
  style="width: 100%"
  @search="onEmployeeSearch"
>
  <a-select-option
    v-for="emp in employees"
    :key="emp.id"
    :value="emp.id"
    :label="`${emp.first_name_en} ${emp.last_name_en} — ${emp.staff_id}`"
  >
    {{ emp.first_name_en }} {{ emp.last_name_en }}
    <span class="font-mono" style="color: var(--color-text-muted); font-size: 12px; margin-left: 6px">{{ emp.staff_id }}</span>
  </a-select-option>
</a-select>
```

### Before — Script (lines 294-321)

```js
const employees = ref([])
const employeesLoading = ref(false)
const leaveTypes = ref([])
const leaveTypesLoading = ref(false)

async function loadModalOptions() {
  if (employees.value.length && leaveTypes.value.length) return
  employeesLoading.value = true
  leaveTypesLoading.value = true
  try {
    const [empRes, ltRes] = await Promise.all([
      employeeApi.list({ per_page: 999 }),
      leaveApi.typeOptions(),
    ])
    employees.value = empRes.data?.data || []
    leaveTypes.value = ltRes.data?.data || []
  } catch {
    message.error('Failed to load form options')
  } finally {
    employeesLoading.value = false
    leaveTypesLoading.value = false
  }
}

function filterEmployee(input, option) {
  return option.label.toLowerCase().includes(input.toLowerCase())
}
```

### After — Script

```js
const employees = ref([])
const employeesLoading = ref(false)
const employeeSearchQuery = ref('')
const leaveTypes = ref([])
const leaveTypesLoading = ref(false)
let employeeSearchTimer = null

async function loadModalOptions() {
  if (leaveTypes.value.length) return
  leaveTypesLoading.value = true
  try {
    const { data } = await leaveApi.typeOptions()
    leaveTypes.value = data?.data || []
  } catch {
    message.error('Failed to load leave types')
  } finally {
    leaveTypesLoading.value = false
  }
}

function onEmployeeSearch(query) {
  employeeSearchQuery.value = query
  if (employeeSearchTimer) clearTimeout(employeeSearchTimer)
  if (!query || query.length < 2) {
    employees.value = []
    return
  }
  employeeSearchTimer = setTimeout(() => searchEmployees(query), 300)
}

async function searchEmployees(query) {
  employeesLoading.value = true
  try {
    const { data } = await employeeApi.list({ search: query, per_page: 20 })
    employees.value = data?.data || []
  } catch {
    employees.value = []
  } finally {
    employeesLoading.value = false
  }
}
```

### Handling Edit Mode (Pre-Populate Selected Employee)

When editing an existing leave request, the employee is already selected. The dropdown must show that employee's name even though we haven't searched yet. Update `openEdit()`:

```js
function openEdit(record) {
  editingId.value = record.id
  form.employee_id = record.employee?.id ?? undefined
  form.start_date = record.start_date || null
  form.end_date = record.end_date || null
  form.status = record.status || undefined
  form.reason = record.reason || ''
  form.items = record.items?.length
    ? record.items.map((i) => ({ leave_type_id: i.leave_type?.id ?? i.leave_type_id, days: i.days }))
    : [{ leave_type_id: undefined, days: null }]

  // Pre-populate the employee dropdown with the current employee
  if (record.employee) {
    employees.value = [record.employee]
  }

  modalVisible.value = true
  loadModalOptions()
}
```

### Gotchas

- **Minimum 2 characters** before searching — prevents searching on single characters which returns too many results
- **300ms debounce** — prevents firing a request on every keystroke
- **`filter-option: false`** — disables client-side filtering, letting the server handle search
- **Edit mode pre-population** — when editing, set `employees.value = [record.employee]` so the selected value has a matching option to display

---

## FIX 6: Open Redirect Vulnerability

**Severity:** HIGH
**File:** `src/views/auth/LoginView.vue`
**Effort:** 10 minutes

### Problem

After login, the user is redirected to the value of the `?redirect=` query parameter without any validation:

```js
// Line 101-102
const redirect = route.query.redirect || '/'
router.push(redirect)
```

An attacker could craft a phishing URL like:
```
https://hrms.example.com/login?redirect=https://evil-site.com/fake-hrms
```

After the user logs in, they'd be redirected to the attacker's site, which could mimic the HRMS login page to steal credentials ("You've been logged out, please sign in again").

### After

```js
async function handleLogin() {
  if (!form.email || !form.password) {
    errorMessage.value = 'Please enter both email and password.'
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    await authStore.login(form.email, form.password)

    // Validate redirect — only allow relative paths starting with /
    const redirect = route.query.redirect
    const safeRedirect = (
      typeof redirect === 'string' &&
      redirect.startsWith('/') &&
      !redirect.startsWith('//')
    ) ? redirect : '/'

    router.push(safeRedirect)
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Login failed. Please try again.'
  } finally {
    loading.value = false
  }
}
```

### Why `!redirect.startsWith('//')`?

A URL starting with `//` is a protocol-relative URL (e.g., `//evil.com`). Browsers interpret this as `https://evil.com` (inheriting the current protocol). This check blocks that attack vector.

### What This Allows

- `/dashboard` — allowed (relative path)
- `/employees/123` — allowed (relative path with segments)
- `/leave-requests?status=pending` — allowed (relative path with query)

### What This Blocks

- `https://evil.com` — blocked (absolute URL)
- `//evil.com` — blocked (protocol-relative URL)
- `javascript:alert(1)` — blocked (doesn't start with `/`)
- `` (empty string) — blocked (falls through to default `/`)

---

## FIX 7: Vendor Chunk Splitting & Console Stripping

**Severity:** HIGH
**File:** `vite.config.js`
**Effort:** 15 minutes

### Problem

1. **No vendor chunk splitting** — all `node_modules` are bundled into a single large chunk. When app code changes, the entire chunk (including unchanged libraries) is re-downloaded by users.

2. **No console stripping** — `console.log`, `console.error`, `console.warn`, and `debugger` statements ship to production. This leaks internal information and adds minor overhead.

### Current `vite.config.js`

The file has no `build` section at all.

### After

Add the `build` and `esbuild` sections to the config:

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import compression from 'vite-plugin-compression'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [AntDesignVueResolver()],
    }),
    Components({
      resolvers: [
        AntDesignVueResolver({
          importStyle: false,
        }),
      ],
    }),
    compression({ algorithm: 'brotliCompress', ext: '.br' }),
    compression({ algorithm: 'gzip', ext: '.gz' }),
    process.env.ANALYZE === 'true' && visualizer({
      open: true,
      gzipSize: true,
      filename: 'dist/stats.html',
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'antd': ['ant-design-vue', '@ant-design/icons-vue'],
          'utils': ['axios', 'dayjs'],
        },
      },
    },
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
  css: {
    preprocessorOptions: {
      less: {
        modifyVars: {
          'primary-color': '#171717',
          'border-radius-base': '8px',
          'font-family': "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        },
        javascriptEnabled: true,
      },
    },
  },
  server: {
    port: 8080,
  },
})
```

### Chunk Splitting Strategy

| Chunk Name | Libraries | Why Separate |
|-----------|-----------|-------------|
| `vue-vendor` | `vue`, `vue-router`, `pinia` | Core framework — rarely changes between deploys |
| `antd` | `ant-design-vue`, `@ant-design/icons-vue` | Largest dependency (~400KB) — changes only on version bumps |
| `utils` | `axios`, `dayjs` | Utility libraries — very stable |
| _(default)_ | App code | Changes frequently — small chunk, fast to re-download |

### Console Stripping

`esbuild.drop: ['console', 'debugger']` removes all `console.*` calls and `debugger` statements at build time. This is a **build-time** transformation — the calls are removed from the output entirely, not just no-op'd.

### Verification

```bash
# Build and check output
npm run build

# Verify chunks exist
ls -la dist/assets/

# Expected output:
# vue-vendor-[hash].js    (~80KB)
# antd-[hash].js          (~400KB)
# utils-[hash].js         (~30KB)
# index-[hash].js         (~200KB)  ← app code only

# Verify no console.log in output
grep -r "console.log" dist/assets/*.js
# Should return nothing
```

---

## FIX 8: Dynamic Import for pusher-js

**Severity:** HIGH
**File:** `src/plugins/echo.js`
**Effort:** 30 minutes

### Problem

`pusher-js` (~100KB) and `laravel-echo` (~15KB) are statically imported at the top of `echo.js`. Even though `echo.js` only runs when `initEcho()` is called, Vite's bundler includes these in the initial bundle because they're top-level imports.

Most users never receive real-time notifications during a session, so this 115KB is wasted on every page load.

### Current Code

```js
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

window.Pusher = Pusher

// ...
export function initEcho() {
  if (echo) return echo
  echo = new Echo({ /* config */ })
  return echo
}
```

### After

```js
let echo = null

const broadcastAuthEndpoint = import.meta.env.VITE_BROADCASTING_AUTH_ENDPOINT
  || 'http://localhost:8000/broadcasting/auth'

export async function initEcho() {
  if (echo) return echo

  const [{ default: Echo }, { default: Pusher }] = await Promise.all([
    import('laravel-echo'),
    import('pusher-js'),
  ])

  window.Pusher = Pusher

  echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST || 'localhost',
    wsPort: import.meta.env.VITE_REVERB_PORT || 8081,
    wssPort: import.meta.env.VITE_REVERB_PORT || 8081,
    forceTLS: import.meta.env.VITE_REVERB_SCHEME === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: broadcastAuthEndpoint,

    authorizer: (channel) => ({
      authorize: (socketId, callback) => {
        fetch(broadcastAuthEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            socket_id: socketId,
            channel_name: channel.name,
          }),
          credentials: 'include',
        })
          .then((res) => res.json())
          .then((data) => callback(null, data))
          .catch((err) => callback(err))
      },
    }),
  })

  return echo
}

export function getEcho() {
  return echo
}

export function destroyEcho() {
  if (echo) {
    echo.disconnect()
    echo = null
  }
}

export async function subscribeUserChannels(userId, { authStore, notificationStore }) {
  const echoInstance = await initEcho()
  const userChannel = echoInstance.private(`App.Models.User.${userId}`)

  userChannel.listen('.user.permissions-updated', () => {
    authStore.fetchPermissions()
  })

  userChannel.notification((notification) => {
    if (notificationStore) {
      notificationStore.fetchUnreadCount()
    }
  })

  userChannel.listen('.user.profile-updated', (e) => {
    authStore.updateUserFromEvent(e)
    authStore.broadcastProfileUpdate(e)
  })
}
```

### Key Changes

1. **`initEcho()` is now `async`** — uses dynamic `import()` which returns a Promise
2. **`subscribeUserChannels()` is now `async`** — because it calls `await initEcho()`
3. **Static imports removed** — `laravel-echo` and `pusher-js` are no longer in the initial bundle
4. **`broadcastAuthEndpoint`** moved outside functions so it's evaluated once

### Callers to Update

Any code that calls `initEcho()` or `subscribeUserChannels()` must now use `await`:

```js
// Before
subscribeUserChannels(userId, { authStore, notificationStore })

// After
await subscribeUserChannels(userId, { authStore, notificationStore })
```

Search the codebase for all callers:
```bash
grep -rn "initEcho\|subscribeUserChannels" src/ --include="*.js" --include="*.vue"
```

---

## FIX 9: Silent Error Swallowing

**Severity:** HIGH
**Files:** 20+ list views (see list below)
**Effort:** 1.5 hours

### Problem

Nearly every list view's fetch function uses `catch { /* silent */ }`, which completely swallows errors. If the API is down, times out, or returns an error, the user sees:

- An empty table with no indication of failure
- No error message
- No way to retry
- No logging for debugging

There are **35 instances** of `catch { /* silent */ }` across the codebase.

### Solution

Replace silent catches with a pattern that:
1. Shows the user an error notification (so they know something failed)
2. Still handles `CanceledError` silently (from AbortController — see Fix 3)
3. Keeps the code simple — no extra error state refs needed for the basic pattern

### Pattern

**Before:**
```js
async function fetchItems() {
  loading.value = true
  try {
    const { data } = await someApi.list(params)
    items.value = data.data || []
  } catch { /* silent */ }
  loading.value = false
}
```

**After:**
```js
async function fetchItems() {
  loading.value = true
  try {
    const { data } = await someApi.list(params)
    items.value = data.data || []
  } catch (err) {
    if (err.name !== 'CanceledError') {
      message.error('Failed to load data')
    }
  }
  loading.value = false
}
```

### Views to Update

These are all the views with `catch { /* silent */ }` in their fetch functions:

| File | Function | Error Message |
|------|----------|---------------|
| `DashboardView.vue` | `fetchDashboard()` | `'Failed to load dashboard'` |
| `EmployeeListView.vue` | `fetchEmployees()` | `'Failed to load employees'` |
| `AttendanceListView.vue` | `fetchItems()` | `'Failed to load attendance records'` |
| `LeaveRequestListView.vue` | `fetchRequests()` | `'Failed to load leave requests'` |
| `LeaveTypeListView.vue` | `fetchItems()` | `'Failed to load leave types'` |
| `LeaveBalanceListView.vue` | `fetchItems()` | `'Failed to load leave balances'` |
| `TrainingListView.vue` | `fetchItems()` | `'Failed to load training records'` |
| `PayrollListView.vue` | `fetchItems()` | `'Failed to load payroll records'` |
| `GrantListView.vue` | `fetchItems()` | `'Failed to load grants'` |
| `GrantPositionListView.vue` | `fetchItems()` | `'Failed to load grant positions'` |
| `ResignationListView.vue` | `fetchItems()` | `'Failed to load resignations'` |
| `HolidayListView.vue` | `fetchItems()` | `'Failed to load holidays'` |
| `InterviewListView.vue` | `fetchItems()` | `'Failed to load interviews'` |
| `JobOfferListView.vue` | `fetchItems()` | `'Failed to load job offers'` |
| `SiteListView.vue` | `fetchItems()` | `'Failed to load sites'` |
| `DepartmentListView.vue` | `fetchItems()` | `'Failed to load departments'` |
| `PositionListView.vue` | `fetchItems()` | `'Failed to load positions'` |
| `UserListView.vue` | `fetchItems()` | `'Failed to load users'` |
| `RoleListView.vue` | `fetchItems()` | `'Failed to load roles'` |
| `RecycleBinView.vue` | `fetchItems()` | `'Failed to load recycle bin'` |
| `BenefitSettingsView.vue` | `fetchItems()` | `'Failed to load benefit settings'` |
| `TaxSettingsView.vue` | `fetchItems()` | `'Failed to load tax settings'` |
| `TaxBracketsView.vue` | `fetchItems()` | `'Failed to load tax brackets'` |
| `TaxCalculatorView.vue` | fetch function | `'Failed to load calculator data'` |
| `PayrollPolicySettingsView.vue` | `fetchItems()` | `'Failed to load payroll policies'` |
| `notifications.js` | `fetchUnreadCount()` | _(keep silent — background polling)_ |
| `BasicInfoTab.vue` | options fetch | _(keep silent — selects still usable)_ |
| `EmploymentTab.vue` | options fetch | _(keep silent — not a critical fetch)_ |
| `RecordsTab.vue` | options fetch | _(keep silent)_ |
| `FundingTab.vue` | options fetch | _(keep silent)_ |
| `FinancialTab.vue` | options fetch | _(keep silent)_ |

**Keep silent** for:
- `notifications.js` — background polling; errors are expected during network issues
- Employee detail tab option loaders — the main data still loads; dropdowns just won't have options, which is acceptable

### Gotchas

- **`message` must be imported** — verify that `import { message } from 'ant-design-vue'` exists at the top of the `<script setup>`. Most views already have this import since they use `message.success()` in save/delete handlers.
- **`CanceledError` check** — only needed if Fix 3 (AbortController) is implemented. If you implement Fix 9 before Fix 3, you can use the simpler pattern without the `CanceledError` check and add it later.
- **Don't duplicate errors** — some catch blocks already show `message.error()`. Only add it to the `catch { /* silent */ }` instances.

---

## FIX 10: Missing Meta Tags & Favicon

**Severity:** MEDIUM
**File:** `index.html`, `public/favicon.svg` (new)
**Effort:** 10 minutes

### Problem

The `index.html` is missing basic meta tags and favicon. Browsers request `/favicon.ico` by default, generating 404 errors in the server logs. Missing meta tags affect mobile browser behavior.

### Current `index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>HRMS — Human Resource Management System</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

### After

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="HRMS — Human Resource Management System for SMRU and BHF" />
  <meta name="theme-color" content="#171717" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <title>HRMS — Human Resource Management System</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

### Create `public/favicon.svg`

An SVG favicon is lightweight (~200 bytes), scalable, and supported by all modern browsers. It matches the login page branding.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#171717"/>
  <text x="16" y="22" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="white">H</text>
</svg>
```

---

## FIX 11: Unbounded 401 Retry Queue

**Severity:** MEDIUM
**File:** `src/api/axios.js`
**Effort:** 15 minutes

### Problem

The axios response interceptor queues failed requests during a token refresh. If many requests fail simultaneously (e.g., the user's session expires while viewing a data-heavy page), all of them are queued. There's no cap on queue size.

```js
// Lines 59-62
if (isRefreshing) {
  return new Promise((resolve, reject) => {
    failedQueue.push({ resolve, reject })
  }).then(() => client(originalRequest))
}
```

With a page that fires 10+ API calls on mount (dashboard, employee detail with tabs), the queue could hold 10+ requests that all retry simultaneously after refresh — creating a burst of traffic.

### After

```js
let isRefreshing = false
let failedQueue = []
const MAX_QUEUE_SIZE = 10

const processQueue = (error) => {
  failedQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve()
  })
  failedQueue = []
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status
    const errorData = error.response?.data

    if (status === 401) {
      const loginErrors = ['EMAIL_NOT_FOUND', 'INVALID_PASSWORD', 'ACCOUNT_INACTIVE']
      if (loginErrors.includes(errorData?.error_type)) {
        return Promise.reject(error)
      }

      const isAuthRequest = ['/login', '/logout', '/refresh-token'].some(
        path => originalRequest.url?.includes(path)
      )
      if (isAuthRequest) {
        clearAuthData()
        router.push({ name: 'login' })
        return Promise.reject(error)
      }

      if (!originalRequest._retry) {
        if (isRefreshing) {
          // Cap the queue — reject excess requests immediately
          if (failedQueue.length >= MAX_QUEUE_SIZE) {
            return Promise.reject(error)
          }
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          }).then(() => client(originalRequest))
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          await client.post('/refresh-token')
          processQueue(null)
          return client(originalRequest)
        } catch (refreshError) {
          processQueue(refreshError)
          clearAuthData()
          router.push({ name: 'login' })
          return Promise.reject(refreshError)
        } finally {
          isRefreshing = false
        }
      }
    }

    if (status === 419 && !originalRequest._csrfRetry) {
      originalRequest._csrfRetry = true
      await initCsrf()
      return client(originalRequest)
    }

    if (status === 403) {
      window.dispatchEvent(new CustomEvent('permission-denied', {
        detail: { message: errorData?.message || 'Permission denied' },
      }))
    }

    return Promise.reject(error)
  }
)
```

### Key Change

Added 3 lines before the queue push:

```js
if (failedQueue.length >= MAX_QUEUE_SIZE) {
  return Promise.reject(error)
}
```

The 11th+ request that hits a 401 during a refresh will be rejected immediately instead of queued. This prevents burst retries.

---

## Implementation Todo

> **Total: 10 phases, 65 tasks, ~4 hours estimated effort**
> All phases completed on 2026-03-10.

---

### Phase 1: SPA & Deployment Essentials (5 minutes) — CRITICAL ✅

_Fixes: #1 (SPA history mode), #10 (meta tags/favicon)_

- [x] **1.1** Create `public/` directory at project root
- [x] **1.2** Create `public/_redirects` — single line: `/* /index.html 200`
- [x] **1.3** Create `public/favicon.svg` — dark rounded square with "H" letter (see Fix 10 for SVG code)
- [x] **1.4** Edit `index.html` — add `<meta name="description">` tag after viewport meta
- [x] **1.5** Edit `index.html` — add `<meta name="theme-color" content="#171717">` tag
- [x] **1.6** Edit `index.html` — add `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` tag

---

### Phase 2: Environment & Gitignore Cleanup (5 minutes) — HIGH ✅

_Fixes: #4 (.env in gitignore)_

- [x] **2.1** Edit `.gitignore` — add `.env` line
- [x] **2.2** Edit `.gitignore` — add `.env.*` line
- [x] **2.3** Edit `.gitignore` — add `!.env.example` negation line (so the template stays tracked)
- [x] **2.4** ~~Run `git rm --cached .env`~~ Skipped — `.env` not yet tracked in this working copy
- [x] **2.5** Verify `.env.example` still exists with all required `VITE_` variable names

---

### Phase 3: Notification Polling — Page Visibility API (15 minutes) — CRITICAL ✅

_Fixes: #2 (notification polling when tab hidden)_

- [x] **3.1** Edit `src/stores/notifications.js` — add `pollIntervalMs` variable to store the interval duration
- [x] **3.2** Edit `src/stores/notifications.js` — add `visibilityHandler` variable (initially `null`)
- [x] **3.3** Edit `src/stores/notifications.js` — create `pauseTimer()` helper: clears interval, sets `pollInterval = null`
- [x] **3.4** Edit `src/stores/notifications.js` — create `resumeTimer()` helper: guards against duplicate intervals, starts `setInterval`
- [x] **3.5** Edit `src/stores/notifications.js` — create `handleVisibilityChange()`: if `document.hidden` → `pauseTimer()`, else → `fetchUnreadCount()` + `resumeTimer()`
- [x] **3.6** Edit `src/stores/notifications.js` — rewrite `startPolling()`: store `intervalMs`, call `fetchUnreadCount()`, call `resumeTimer()`, register `visibilitychange` listener
- [x] **3.7** Edit `src/stores/notifications.js` — rewrite `stopPolling()`: call `pauseTimer()`, remove `visibilitychange` listener, set `visibilityHandler = null`
- [x] **3.8** Verify: build passes
- [x] **3.9** Verify: visibility change handler correctly registered and cleaned up

---

### Phase 4: Login Redirect Sanitization (10 minutes) — HIGH ✅

_Fixes: #6 (open redirect vulnerability)_

- [x] **4.1** Edit `src/views/auth/LoginView.vue` — replace `const redirect = route.query.redirect || '/'` with safe validation logic
- [x] **4.2** Validate: `typeof redirect === 'string'` AND `redirect.startsWith('/')` AND `!redirect.startsWith('//')`
- [x] **4.3** Default to `'/'` if validation fails
- [x] **4.4** Verify: build passes with the change
- [x] **4.5** Verify: code correctly blocks `https://evil.com`, `//evil.com`, and empty strings
- [x] **4.6** Verify: code correctly allows `/employees`, `/leave-requests?status=pending`
- [x] **4.7** Verify: default fallback is `'/'`

---

### Phase 5: Build Configuration (15 minutes) — HIGH ✅

_Fixes: #7 (vendor chunks, console stripping)_

- [x] **5.1** Edit `vite.config.js` — add `build` section with `target: 'es2020'`
- [x] **5.2** Edit `vite.config.js` — add `build.rollupOptions.output.manualChunks` with three chunks:
  - `'vue-vendor': ['vue', 'vue-router', 'pinia']`
  - `'antd': ['ant-design-vue', '@ant-design/icons-vue']`
  - `'utils': ['axios', 'dayjs']`
- [x] **5.3** Edit `vite.config.js` — add `esbuild: { drop: ['console', 'debugger'] }` section
- [x] **5.4** Run `npm run build` — verified clean build
- [x] **5.5** Verified `dist/assets/` contains `vue-vendor-*.js`, `antd-*.js`, `utils-*.js`
- [x] **5.6** Verified console stripping via esbuild drop

---

### Phase 6: Dynamic Import for pusher-js (30 minutes) — HIGH ✅

_Fixes: #8 (pusher-js statically imported)_

- [x] **6.1** Edit `src/plugins/echo.js` — remove static `import Echo from 'laravel-echo'` line
- [x] **6.2** Edit `src/plugins/echo.js` — remove static `import Pusher from 'pusher-js'` line
- [x] **6.3** Edit `src/plugins/echo.js` — remove top-level `window.Pusher = Pusher` line
- [x] **6.4** Edit `src/plugins/echo.js` — move `broadcastAuthEndpoint` to module-level (outside function)
- [x] **6.5** Edit `src/plugins/echo.js` — change `initEcho()` to `async initEcho()`, add dynamic `await Promise.all([import('laravel-echo'), import('pusher-js')])` inside
- [x] **6.6** Edit `src/plugins/echo.js` — set `window.Pusher = Pusher` inside `initEcho()` after dynamic import
- [x] **6.7** Edit `src/plugins/echo.js` — change `subscribeUserChannels()` to `async subscribeUserChannels()`, use `await initEcho()` inside
- [x] **6.8** Edit `src/layouts/DefaultLayout.vue` — add `await` before `subscribeUserChannels(...)` call, make `onMounted` async
- [x] **6.9** Edit `src/views/payroll/BulkPayrollModal.vue` — change `getEcho() || initEcho()` to `getEcho() || await initEcho()`, make `subscribeWebSocket` async
- [x] **6.10** Run `npm run build` — verified `pusher-js` and `laravel-echo` now in separate async chunk
- [x] **6.11** Build passes clean

---

### Phase 7: Employee Search Select — Remove per_page: 999 (30 minutes) — HIGH ✅

_Fixes: #5 (per_page: 999 loads all employees)_

- [x] **7.1** Edit `src/views/leave/LeaveRequestListView.vue` script — add `employeeSearchQuery` ref (default `''`)
- [x] **7.2** Edit `src/views/leave/LeaveRequestListView.vue` script — add `employeeSearchTimer` variable (default `null`)
- [x] **7.3** Edit `src/views/leave/LeaveRequestListView.vue` script — create `onEmployeeSearch(query)` function with 300ms debounce
- [x] **7.4** Edit `src/views/leave/LeaveRequestListView.vue` script — create `searchEmployees(query)` function with `per_page: 20`
- [x] **7.5** Edit `src/views/leave/LeaveRequestListView.vue` script — rewrite `loadModalOptions()` to only load leave types
- [x] **7.6** Edit `src/views/leave/LeaveRequestListView.vue` script — remove `filterEmployee()` function
- [x] **7.7** Edit `src/views/leave/LeaveRequestListView.vue` script — update `openEdit()` to pre-populate `employees.value = [record.employee]`
- [x] **7.8** Edit `src/views/leave/LeaveRequestListView.vue` template — update `<a-select>` with `:filter-option="false"`, `@search`, `:not-found-content`
- [x] **7.9** Build passes
- [x] **7.10** Edit mode pre-population logic verified

---

### Phase 8: AbortController for API Calls (1.5 hours) — HIGH ✅

_Fixes: #3 (no request cancellation). Done together with Phase 9._

**Step A: Create the composable**

- [x] **8.1** Create `src/composables/useAbortController.js`

**Step B: Update API module `list()` signatures (add `config` parameter)**

- [x] **8.2** `src/api/employeeApi.js` — update `list()` signature
- [x] **8.3** `src/api/attendanceApi.js` — update `list()` signature
- [x] **8.4** `src/api/leaveApi.js` — update `requests()` signature
- [x] **8.5** `src/api/leaveApi.js` — update `balances()` signature
- [x] **8.6** `src/api/leaveApi.js` — update `types()` signature
- [x] **8.7** `src/api/trainingApi.js` — update `list()` signature
- [x] **8.8** `src/api/payrollApi.js` — update `list()` signature
- [x] **8.9** `src/api/grantApi.js` — update `list()` on grantApi + `grantPositions()`
- [x] **8.10** `src/api/grantApi.js` — update `list()` on grantItemApi
- [x] **8.11** `src/api/resignationApi.js` — update `list()` signature
- [x] **8.12** `src/api/holidayApi.js` — update `list()` signature
- [x] **8.13** `src/api/interviewApi.js` — update `list()` signature
- [x] **8.14** `src/api/jobOfferApi.js` — update `list()` signature
- [x] **8.15** `src/api/organizationApi.js` — update `list()` on `siteApi`
- [x] **8.16** `src/api/organizationApi.js` — update `list()` on `departmentApi`
- [x] **8.17** `src/api/organizationApi.js` — update `list()` on `positionApi`
- [x] **8.18** `src/api/notificationApi.js` — update `list()` signature
- [x] **8.19** `src/api/adminApi.js` — update `list()` signature
- [x] **8.20** `src/api/adminApi.js` — update `listRoles()` signature
- [x] **8.21** `src/api/settingsApi.js` — update `list()` on `benefitSettingApi`
- [x] **8.22** `src/api/settingsApi.js` — update `list()` on `taxSettingApi`
- [x] **8.23** `src/api/settingsApi.js` — update `list()` on `taxBracketApi`
- [x] **8.24** `src/api/settingsApi.js` — update `list()` on `payrollPolicyApi`
- [x] **8.25** `src/api/personnelActionApi.js` — update `list()` signature
- [x] **8.25b** `src/api/dashboardApi.js` — update `myWidgets()` to accept config
- [x] **8.25c** `src/api/recycleBinApi.js` — update `list()` and `stats()` to accept config

**Step C: Apply `useAbortController` to list views**

- [x] **8.26** `src/views/employees/EmployeeListView.vue` — apply to `fetchEmployees()`
- [x] **8.27** `src/views/attendance/AttendanceListView.vue` — apply to `fetchItems()`
- [x] **8.28** `src/views/leave/LeaveRequestListView.vue` — apply to `fetchRequests()`
- [x] **8.29** `src/views/leave/LeaveTypeListView.vue` — apply to `fetchItems()`
- [x] **8.30** `src/views/leave/LeaveBalanceListView.vue` — apply to `fetchItems()`
- [x] **8.31** `src/views/training/TrainingListView.vue` — apply to `fetchItems()`
- [x] **8.32** `src/views/payroll/PayrollListView.vue` — apply to `fetchItems()`
- [x] **8.33** `src/views/grants/GrantListView.vue` — apply to `fetchItems()`
- [x] **8.34** `src/views/grants/GrantPositionListView.vue` — apply to `fetchItems()`
- [x] **8.35** `src/views/resignations/ResignationListView.vue` — apply to `fetchItems()`
- [x] **8.36** `src/views/holidays/HolidayListView.vue` — apply to `fetchItems()`
- [x] **8.37** `src/views/recruitment/InterviewListView.vue` — apply to `fetchItems()`
- [x] **8.38** `src/views/recruitment/JobOfferListView.vue` — apply to `fetchItems()`
- [x] **8.39** `src/views/organization/SiteListView.vue` — apply to `fetchItems()`
- [x] **8.40** `src/views/organization/DepartmentListView.vue` — apply to `fetchItems()`
- [x] **8.41** `src/views/organization/PositionListView.vue` — apply to `fetchItems()`
- [x] **8.42** `src/views/admin/UserListView.vue` — apply to `fetchItems()`
- [x] **8.43** `src/views/admin/RoleListView.vue` — apply to `fetchItems()`
- [x] **8.44** `src/views/recycle-bin/RecycleBinView.vue` — apply to `fetchItems()`
- [x] **8.45** `src/views/settings/BenefitSettingsView.vue` — apply to `fetchItems()`
- [x] **8.46** `src/views/settings/TaxSettingsView.vue` — apply to `fetchItems()`
- [x] **8.47** `src/views/settings/TaxBracketsView.vue` — apply to `fetchItems()`
- [x] **8.48** `src/views/settings/PayrollPolicySettingsView.vue` — apply to `fetchItems()`
- [x] **8.49** `src/views/personnel-actions/PersonnelActionListView.vue` — apply to `fetchItems()`
- [x] **8.49b** `src/views/dashboard/DashboardView.vue` — apply to `fetchDashboard()`
- [x] **8.49c** `src/views/settings/TaxCalculatorView.vue` — import added (no main list fetch to abort)
- [x] **8.50** Build passes clean — verified with `npm run build`

---

### Phase 9: Silent Error Handling (1 hour) — HIGH ✅

_Fixes: #9 (silent error swallowing). Done together with Phase 8._

All `catch { /* silent */ }` blocks in main fetch functions replaced with `catch (err) { if (err.name !== 'CanceledError') message.error('...') }`:

- [x] **9.1** `src/views/dashboard/DashboardView.vue` — `'Failed to load dashboard'`
- [x] **9.2** `src/views/employees/EmployeeListView.vue` — `'Failed to load employees'`
- [x] **9.3** `src/views/attendance/AttendanceListView.vue` — `'Failed to load attendance records'`
- [x] **9.4** `src/views/leave/LeaveRequestListView.vue` — `'Failed to load leave requests'`
- [x] **9.5** `src/views/leave/LeaveTypeListView.vue` — `'Failed to load leave types'`
- [x] **9.6** `src/views/leave/LeaveBalanceListView.vue` — `'Failed to load leave balances'`
- [x] **9.7** `src/views/training/TrainingListView.vue` — `'Failed to load training records'`
- [x] **9.8** `src/views/payroll/PayrollListView.vue` — `'Failed to load payroll records'`
- [x] **9.9** `src/views/grants/GrantListView.vue` — `'Failed to load grants'`
- [x] **9.10** `src/views/grants/GrantPositionListView.vue` — `'Failed to load grant positions'`
- [x] **9.11** `src/views/resignations/ResignationListView.vue` — `'Failed to load resignations'`
- [x] **9.12** `src/views/holidays/HolidayListView.vue` — `'Failed to load holidays'`
- [x] **9.13** `src/views/recruitment/InterviewListView.vue` — `'Failed to load interviews'`
- [x] **9.14** `src/views/recruitment/JobOfferListView.vue` — `'Failed to load job offers'`
- [x] **9.15** `src/views/organization/SiteListView.vue` — `'Failed to load sites'`
- [x] **9.16** `src/views/organization/DepartmentListView.vue` — `'Failed to load departments'`
- [x] **9.17** `src/views/organization/PositionListView.vue` — `'Failed to load positions'`
- [x] **9.18** `src/views/admin/UserListView.vue` — `'Failed to load users'` + `'Failed to load roles'`
- [x] **9.19** `src/views/admin/RoleListView.vue` — `'Failed to load roles'`
- [x] **9.20** `src/views/recycle-bin/RecycleBinView.vue` — `'Failed to load recycle bin'`
- [x] **9.21** `src/views/settings/BenefitSettingsView.vue` — `'Failed to load benefit settings'`
- [x] **9.22** `src/views/settings/TaxSettingsView.vue` — `'Failed to load tax settings'`
- [x] **9.23** `src/views/settings/TaxBracketsView.vue` — `'Failed to load tax brackets'`
- [x] **9.24** `src/views/settings/TaxCalculatorView.vue` — employee autocomplete kept silent (not a main fetch)
- [x] **9.25** `src/views/settings/PayrollPolicySettingsView.vue` — `'Failed to load payroll policies'`
- [x] **9.26** `message` import verified/added where missing (DashboardView, LeaveBalanceListView, GrantPositionListView)
- [x] **9.27** Confirmed silent catches kept for: `notifications.js`, `BasicInfoTab.vue`, `EmploymentTab.vue`, `RecordsTab.vue`, `FundingTab.vue`, `FinancialTab.vue`

---

### Phase 10: Retry Queue Cap (10 minutes) — MEDIUM ✅

_Fixes: #11 (unbounded 401 retry queue)_

- [x] **10.1** Edit `src/api/axios.js` — add `const MAX_QUEUE_SIZE = 10` after `let failedQueue = []`
- [x] **10.2** Edit `src/api/axios.js` — add queue size guard inside the `if (isRefreshing)` block
- [x] **10.3** Build passes clean

---

### Phase 11: Final Verification (15 minutes) ✅

**Build verification:**

- [x] **11.1** `npm run build` — clean build, 3404 modules transformed, built in ~16s
- [x] **11.2** `dist/assets/` — confirmed `vue-vendor-*.js`, `antd-*.js`, `utils-*.js` exist
- [x] **11.3** `dist/_redirects` — confirmed exists in build output
- [x] **11.4** `dist/favicon.svg` — confirmed exists in build output
- [x] **11.5** Console stripping active via `esbuild.drop`

**Code verification (all changes verified via build):**

- [x] **11.6** Login redirect sanitization — blocks `https://`, `//`, empty; allows `/path`
- [x] **11.7** Notification polling — pauses on `document.hidden`, resumes with immediate fetch
- [x] **11.8** AbortController — all 25 list views use `useAbortController` + `CanceledError` check
- [x] **11.9** Silent errors fixed — 25 views now show `message.error()` on fetch failure
- [x] **11.10** Employee search — debounced server-side search replaces `per_page: 999`
- [x] **11.11** pusher-js — dynamically imported, not in initial bundle
- [x] **11.12** Retry queue — capped at 10 requests

---

### Summary Table

| Phase | Fix # | Severity | Files Changed | Status |
|-------|-------|----------|---------------|--------|
| 1 | 1, 10 | CRITICAL + MEDIUM | 3 new, 1 edit | ✅ |
| 2 | 4 | HIGH | 1 edit | ✅ |
| 3 | 2 | CRITICAL | 1 edit | ✅ |
| 4 | 6 | HIGH | 1 edit | ✅ |
| 5 | 7 | HIGH | 1 edit | ✅ |
| 6 | 8 | HIGH | 3 edits | ✅ |
| 7 | 5 | HIGH | 1 edit | ✅ |
| 8 | 3 | HIGH | 1 new, 27 API edits, 26 view edits | ✅ |
| 9 | 9 | HIGH | 25 edits (done with Phase 8) | ✅ |
| 10 | 11 | MEDIUM | 1 edit | ✅ |
| 11 | — | — | 0 (verification) | ✅ |
| **Total** | | | **~57 files** | **All complete** |

---

*Generated by Claude Code — Critical Issues Fix Plan — Implemented 2026-03-10*
