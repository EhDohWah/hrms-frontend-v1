# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Universal Standards
- Write clean, maintainable code
- Follow SOLID principles
- Use meaningful names
- Add error handling
- Never commit commented code or console.logs
- Write JSDoc/PHPDoc for complex logic
- Use early returns to reduce nesting

## Development Philosophy

**Write for maintainability, not complexity.** You are a senior frontend developer, but you're writing code for future junior developers to maintain and debug. Follow these principles:

- **Simplicity over cleverness** - Prefer straightforward solutions that junior developers can understand at a glance
- **Explicit over implicit** - Make your intentions clear through descriptive variable names, component names, and comments when necessary
- **Consistency over innovation** - Follow established patterns in the codebase rather than introducing new approaches
- **Readable over compact** - Choose clarity over brevity; a few extra lines that improve understanding are worth it
- **Future-proof architecture** - Structure code so bugs can be isolated and fixed without cascading changes

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server on http://localhost:8080
npm run build        # Production build (Vite)
npm run preview      # Preview production build
```

No test runner or linter is configured.

## Environment

Copy `.env.example` to `.env`. Key variables:
- `VITE_API_BASE_URL` — Backend API (default `http://localhost:8000/api/v1`)
- `VITE_PUBLIC_URL` — Backend public URL for CSRF cookie
- `VITE_REVERB_*` — WebSocket (Laravel Reverb) config for real-time features

## Architecture

Vue 3 (Composition API + `<script setup>`) + Ant Design Vue 4 + Pinia + Vue Router 4.

### API Layer (`src/api/`)
- **`axios.js`** — Single axios instance with `withCredentials: true` (HttpOnly cookie auth via Laravel Sanctum). Interceptors handle 401 (token refresh + request queue retry), 419 (CSRF re-fetch + retry), and 403 (custom event dispatch).
- **Per-resource API files** (e.g., `employeeApi.js`) — Export objects with `list`, `show`, `store`, `update`, `destroy` and resource-specific methods. All barrel-exported from `index.js`.
- CSRF is initialized via `/sanctum/csrf-cookie` before login.

### State (`src/stores/`)
- **`auth.js`** — User, permissions (nested `{ module: { read, edit } }`), login/logout, proactive token refresh (5 min before expiry), cross-tab sync via BroadcastChannel.
- **`notifications.js`** — Notification list, unread count, 30s polling.
- **`uiStore.js`** — Sidebar collapse state (persisted to localStorage), page title/breadcrumbs.

### Routing (`src/router/`)
- **`routes.js`** — Route definitions. All views are lazy-loaded. Auth routes are guest-only; app routes require authentication.
- **`guards.js`** — `beforeEach`: initializes auth on first load, redirects guests, checks `meta.permission` via `authStore.canRead()`. NProgress bar on transitions.

### Permissions
Three layers, all using the same `authStore.hasPermission(module, action)`:
1. **Route guard** — `meta: { permission: 'employees' }` blocks navigation
2. **`v-permission` directive** — `v-permission="'employees'"` or `v-permission="['employees', 'edit']"` hides DOM elements
3. **`usePermission()` composable** — `can(module, action)`, `hasRole(role)`, `isAdmin()` for template logic

### Composables (`src/composables/`)
- **`useApi(apiFn)`** — Wraps async calls; returns `{ data, error, isLoading, execute, reset }`
- **`usePagination(fetchFn)`** — Pagination state for Ant Design tables; returns `paginationConfig` and `handleTableChange`
- **`useDebounce(ref, delay)`** — Debounced reactive ref
- **`useNotification()`** — Wraps Ant Design `message` API (success/error/warning/info)

### Layouts (`src/layouts/`)
- **`DefaultLayout.vue`** — Sidebar + Header + Content. Starts notification polling and Echo channel subscriptions on mount.
- **`AuthLayout.vue`** — Login/forgot-password pages.

### Real-time (`src/plugins/echo.js`)
Laravel Echo + Reverb (WebSocket). Custom authorizer uses `fetch` with cookies (not Bearer token). Subscribes to user private channel for permission updates, notifications, and profile changes.

## Critical Conventions

### Laravel snake_case serialization
The Laravel backend serializes Eloquent relationship names as **snake_case** in JSON (e.g., `employeeFundingAllocations` → `employee_funding_allocations`). Always use snake_case when accessing nested relationships from API responses.

### API filter parameter naming is inconsistent
Each backend controller uses different filter parameter names. Always verify the controller before adding filters. Common patterns:
- Most use `filter_status`, but LeaveRequest uses `status`, Resignation uses `acknowledgement_status`
- All controllers accept `search` for text search
- See the memory table in project notes for the full mapping

### Formatting
- Currency: `฿${num.toLocaleString()}` or `formatCurrency()` from `src/utils/formatters.js`
- Dates: `dayjs(date).format('DD MMM YYYY')` or `formatDate()` from `src/utils/formatters.js`
- Use `cleanParams()` from `src/utils/helpers.js` to strip null/empty values before API calls

### Styling
- Theme: primary `#002147`, border-radius 8px, font DM Sans
- CSS variables defined in `src/styles/global.less` (sidebar width, header height, shadows, transitions)
- LESS preprocessor with Ant Design theme variable overrides in `vite.config.js`
- Ant Design components are globally registered

### Pagination
Default 20 per page, options `[10, 20, 50, 100]` — configured in `src/constants/config.js`.
