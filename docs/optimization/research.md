# Frontend Production Readiness Audit

**Date:** 2026-03-07
**Scope:** HRMS Vue 3 Frontend (`hrms-frontend`)
**Stack:** Vue 3.5 + Vite 6 + Ant Design Vue 4.2.6 + Pinia + Vue Router 4

---

## Table of Contents

1. [Environment Variables & Configuration](#1-environment-variables--configuration)
2. [API URLs & Network Configuration](#2-api-urls--network-configuration)
3. [Authentication & Security](#3-authentication--security)
4. [Browser Compatibility](#4-browser-compatibility)
5. [Build Optimization](#5-build-optimization)
6. [Code Quality](#6-code-quality)
7. [Performance](#7-performance)
8. [Error Handling](#8-error-handling)
9. [Routing & Deployment](#9-routing--deployment)
10. [Additional Checks](#10-additional-checks)
11. [Summary & Priority Matrix](#11-summary--priority-matrix)

---

## 1. Environment Variables & Configuration

### Current State

Three env files exist:

| File | Purpose | Status |
|------|---------|--------|
| `.env` | Base defaults | Has `VITE_API_BASE_URL=http://localhost:8000/api/v1` |
| `.env.development` | Dev overrides | Has `VITE_API_BASE_URL=http://localhost:8000/api/v1` |
| `.env.production` | Production | **Has placeholder values** that need real domains |

### Findings

- **`.env.production` has placeholder values.** The file contains `VITE_API_BASE_URL=https://your-api-domain.com/api/v1` — this must be replaced with the actual production API URL before deploying.
- **`.env` is NOT in `.gitignore`.** All three env files are tracked in git. While Vite env files typically don't hold secrets (only `VITE_`-prefixed vars are exposed), this is still a bad practice. Any non-`VITE_` env vars added in the future would be exposed.
- **No `.env.example` or `.env.production.template`.** There's no documentation of required env vars for new developers or CI/CD pipelines.
- **`VITE_PUSHER_*` vars** are defined in `.env` for WebSocket (Reverb) connections. These include `VITE_PUSHER_APP_KEY`, `VITE_PUSHER_HOST`, `VITE_PUSHER_PORT`. Production values are not configured.

### Issues

| Severity | Issue | Recommendation |
|----------|-------|----------------|
| HIGH | `.env` not in `.gitignore` | Add `.env` and `.env.*.local` to `.gitignore` |
| MEDIUM | `.env.production` has placeholders | Set real production API URL and Pusher config before deploy |
| LOW | No `.env.example` template | Create `.env.example` documenting all required `VITE_` vars |

### Fix: `.gitignore` Update

Add to `.gitignore`:
```
.env
.env.*.local
```

---

## 2. API URLs & Network Configuration

### Current State

- **Axios instance** (`src/api/axios.js`): Base URL from `import.meta.env.VITE_API_BASE_URL`
- **Credentials**: `withCredentials: true` is set globally (required for cross-site cookies)
- **Timeout**: 30 seconds default
- **Content-Type**: `application/json` default with `multipart/form-data` override for file uploads

### Findings

- **No AbortController usage anywhere.** When users navigate away from a page, in-flight API requests continue running. This wastes bandwidth and can cause stale state updates (e.g., a response from page A updating page B's data).
- **Unbounded 401 retry queue.** The axios response interceptor queues failed requests during token refresh. If the refresh itself fails, queued requests are rejected — but there's no limit on queue size. A burst of parallel requests during a session expiry could queue hundreds of retries.
- **No request deduplication.** Multiple components can fire identical requests simultaneously (e.g., two components both calling `employeeApi.options()`).
- **CORS configuration assumed correct.** The frontend sets `withCredentials: true`; the backend must respond with `Access-Control-Allow-Credentials: true` and the exact origin (not `*`).

### Issues

| Severity | Issue | Recommendation |
|----------|-------|----------------|
| HIGH | No AbortController / request cancellation | Add AbortController to list/fetch calls; cancel on component unmount |
| MEDIUM | Unbounded 401 retry queue | Cap queue at 10-20 requests; reject excess with "session expired" |
| LOW | No request deduplication | Consider for high-frequency option endpoints |

### Fix: AbortController Pattern

```js
// In any list view composable or component
const controller = new AbortController()

async function fetchItems() {
  controller.abort() // cancel previous
  const newController = new AbortController()
  const { data } = await axios.get('/endpoint', { signal: newController.signal })
}

onUnmounted(() => controller.abort())
```

---

## 3. Authentication & Security

### Current State

- **Auth tokens** stored in HttpOnly cookies (set by backend) — secure, not accessible via JS
- **User data & permissions** stored in `localStorage` via Pinia (`src/stores/auth.js`)
- **Cross-tab session sync** via `BroadcastChannel` API — logout in one tab logs out all tabs
- **Route guards** (`src/router/guards.js`) check `authStore.isAuthenticated` before every navigation
- **Permission system** has 3 layers: route-level guards, `v-permission` directive, `authStore.canEdit()`/`authStore.canView()` methods

### Findings

- **Unsanitized `?redirect=` parameter in LoginView.vue** (line 101-102). After login, the user is redirected to `route.query.redirect` without validation. An attacker could craft a URL like `/login?redirect=https://evil.com` to redirect users after login (open redirect vulnerability).

  ```js
  // Current code (LoginView.vue, line 101-102)
  const redirect = route.query.redirect || '/dashboard'
  router.push(redirect)
  ```

- **Permissions cached in localStorage.** While the HttpOnly cookie approach for tokens is secure, permissions stored in localStorage can be tampered with via browser DevTools. This is mitigated by server-side permission checks on every API call, but the frontend UI could be manipulated to show unauthorized options.
- **No CSRF protection on the frontend.** Laravel Sanctum's SPA authentication typically requires CSRF token cookies. Since this app uses personal access tokens in cookies (not Sanctum SPA mode), CSRF is less of a concern — but the `SameSite=none` cookie policy means cross-site requests are possible.
- **Session refresh logic is solid.** The 401 interceptor attempts a silent token refresh before logging out, and queues concurrent requests during refresh.

### Issues

| Severity | Issue | Recommendation |
|----------|-------|----------------|
| MEDIUM | Unsanitized `?redirect=` parameter (open redirect) | Validate redirect is a relative path starting with `/` |
| LOW | Permissions in localStorage (UI tampering) | Accept risk — server enforces all permissions |
| LOW | No CSRF with SameSite=none | Accept risk — token-based auth doesn't need CSRF |

### Fix: Sanitize Redirect

```js
// LoginView.vue — after successful login
const redirect = route.query.redirect
const safeRedirect = (typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//'))
  ? redirect
  : '/dashboard'
router.push(safeRedirect)
```

---

## 4. Browser Compatibility

### Current State

- **Vite default target**: `modules` (ES2020+) — no explicit `build.target` in `vite.config.js`
- **CSS**: Uses CSS custom properties (`var(--color-*)`) extensively in `global.less` and scoped styles
- **JavaScript**: Uses `?.` (optional chaining), `??` (nullish coalescing), `BroadcastChannel`, `structuredClone`
- **No polyfills** loaded
- **No `browserslist`** config in `package.json`

### Findings

- **Default Vite target is fine for modern browsers.** ES2020 modules are supported in Chrome 80+, Firefox 80+, Safari 14+, Edge 80+. This covers 95%+ of users.
- **`BroadcastChannel`** used for cross-tab session sync — supported in all modern browsers. Safari added support in 15.4 (April 2022). Older Safari users won't get cross-tab sync but won't crash (the code checks `typeof BroadcastChannel`).
- **`structuredClone`** used in a few places — supported since Chrome 98, Firefox 94, Safari 15.4. If older browser support is needed, replace with `JSON.parse(JSON.stringify())`.
- **No explicit `build.target`** means Vite defaults to `['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14']` which is reasonable.
- **CSS custom properties** not supported in IE11 — but IE11 is dead, so this is acceptable.

### Issues

| Severity | Issue | Recommendation |
|----------|-------|----------------|
| LOW | No explicit `build.target` | Add `build.target: 'es2020'` for clarity |
| LOW | `structuredClone` needs Safari 15.4+ | Replace with `JSON.parse(JSON.stringify())` if older Safari needed |
| INFO | No IE11 support | Acceptable — IE11 is EOL |

---

## 5. Build Optimization

### Current State (Post-Optimization)

- **Tree-shaking**: Ant Design Vue auto-import via `unplugin-vue-components` + `unplugin-auto-import`
- **Compression**: Brotli + Gzip pre-compression via `vite-plugin-compression`
- **Bundle size**: Main chunk reduced from 1,720KB to 687KB (-60%), gzip from 532KB to 217KB (-59%)
- **Visualizer**: Conditional via `ANALYZE=true` env var

### Findings

- **No vendor chunk splitting.** All node_modules are bundled into a single chunk. Splitting `ant-design-vue`, `vue`, `vue-router`, `pinia`, `dayjs`, `axios`, and `pusher-js` into separate vendor chunks would improve caching — library versions change less frequently than app code.
- **No `esbuild.drop` for console stripping.** `console.log` and `console.error` statements ship to production. The global error handler uses `console.error`, which is fine, but development `console.log` calls should be stripped.
- **`pusher-js` is statically imported** in `src/plugins/echo.js`. This library (~100KB) is loaded on every page load even for users who never use real-time features. It should be dynamically imported.
- **`ant-design-vue/dist/reset.css`** is still imported in `main.js` — this is a full CSS reset file. With tree-shaking, component styles are auto-imported, but this reset is still needed. Verified: this import is necessary and correct.
- **No `build.cssCodeSplit`** — defaults to `true` (good), CSS is split per async chunk.

### Issues

| Severity | Issue | Recommendation |
|----------|-------|----------------|
| MEDIUM | No vendor chunk splitting | Add `rollupOptions.manualChunks` to split vendor libraries |
| MEDIUM | No console stripping in production | Add `esbuild: { drop: ['console', 'debugger'] }` |
| MEDIUM | `pusher-js` statically imported (~100KB) | Dynamic import in `echo.js` |
| INFO | Reset CSS still imported | Correct — needed alongside tree-shaken components |

### Fix: Vendor Chunk Splitting

```js
// vite.config.js — add to export
build: {
  target: 'es2020',
  rollupOptions: {
    output: {
      manualChunks: {
        'vue-vendor': ['vue', 'vue-router', 'pinia'],
        'antd': ['ant-design-vue'],
        'utils': ['axios', 'dayjs'],
      },
    },
  },
},
esbuild: {
  drop: ['console', 'debugger'],
},
```

### Fix: Dynamic Import for pusher-js

```js
// src/plugins/echo.js
export async function initEcho() {
  const { default: Echo } = await import('laravel-echo')
  const { default: Pusher } = await import('pusher-js')
  window.Pusher = Pusher
  window.Echo = new Echo({ /* config */ })
}
```

---

## 6. Code Quality

### Current State

- **No ESLint** configured — no `.eslintrc`, no `eslint.config.js`, no ESLint in `devDependencies`
- **No Prettier** configured — no `.prettierrc`
- **No TypeScript** — pure JavaScript with `<script setup>` (Composition API exclusively)
- **Consistent patterns** across views: reactive state, computed pagination, async fetch functions
- **12 API modules** in `src/api/modules/` following a uniform CRUD pattern

### Findings

- **No linter = no guardrails.** Without ESLint, common issues like unused variables, undefined refs, unreachable code, and accessibility violations go undetected. This is the single biggest code quality gap.
- **No formatter = inconsistent style.** Some files use 2-space indentation, others use mixed. No automated formatting on save or pre-commit.
- **No pre-commit hooks.** No `husky` or `lint-staged` — nothing prevents committing broken or unformatted code.
- **`global.less` has 40+ `!important` overrides.** This makes styles difficult to maintain and debug. Many of these override Ant Design defaults — a better approach would be using Ant Design's theme configuration or `:deep()` selectors in scoped styles.
- **Aggressive global CSS reset**: `* { margin: 0; padding: 0; box-sizing: border-box; }` in `global.less` — this conflicts with Ant Design's `reset.css` and can cause unexpected layout issues.

### Issues

| Severity | Issue | Recommendation |
|----------|-------|----------------|
| MEDIUM | No ESLint configured | Install `eslint` + `eslint-plugin-vue` + `@antfu/eslint-config` |
| MEDIUM | No Prettier configured | Install `prettier` with `.prettierrc` |
| LOW | No pre-commit hooks | Add `husky` + `lint-staged` |
| LOW | 40+ `!important` in global.less | Gradually replace with theme config / `:deep()` |
| LOW | Aggressive `*` reset | Remove — Ant Design's `reset.css` handles this |

---

## 7. Performance

### Current State

- **Virtual scrolling** enabled on 3 table views (Employee, Attendance, Leave Request)
- **Server-side pagination** on all list views (20 per page default)
- **No lazy loading** of route components — all routes statically imported in `src/router/routes.js`
- **No image optimization** pipeline
- **Notification polling** via `setInterval` in `src/stores/notifications.js`

### Findings

- **CRITICAL: Notification polling continues when tab is hidden.** `src/stores/notifications.js` starts a `setInterval` that polls `/notifications` every 60 seconds. This continues even when the browser tab is not visible, wasting bandwidth and battery. The Page Visibility API should be used to pause polling when the tab is hidden.

- **`per_page: 999` in LeaveRequestListView.vue** (line 306). The employee search select loads ALL employees with `per_page: 999` instead of using a proper search/autocomplete endpoint. With hundreds of employees, this transfers unnecessary data.

- **All routes are statically imported.** Every route component is loaded upfront in the initial bundle. Using `() => import('./views/...')` for non-critical routes would reduce the initial load time.

- **No `<KeepAlive>` on frequently visited views.** Switching between list views (Employees, Leave, etc.) re-fetches data every time. `<KeepAlive>` on the `<RouterView>` would preserve component state during navigation.

- **`pusher-js` loaded on every page.** Even users who never receive real-time notifications load the ~100KB Pusher library.

### Issues

| Severity | Issue | Recommendation |
|----------|-------|----------------|
| CRITICAL | Notification polling when tab hidden | Use Page Visibility API to pause/resume polling |
| HIGH | `per_page: 999` loads all employees | Use server-side search with debounced input |
| MEDIUM | No route-level code splitting | Use dynamic `() => import()` for route components |
| MEDIUM | `pusher-js` statically imported | Dynamic import (see Build Optimization section) |
| LOW | No `<KeepAlive>` on list views | Add `<KeepAlive>` with `include` list for key views |

### Fix: Page Visibility API for Notifications

```js
// src/stores/notifications.js
let pollTimer = null

function startPolling() {
  stopPolling()
  pollTimer = setInterval(fetchNotifications, 60000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

// In setup or init
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopPolling()
  } else {
    fetchNotifications() // immediate fetch on return
    startPolling()
  }
})
```

### Fix: Replace `per_page: 999` with Search

```js
// LeaveRequestListView.vue — employee select
const searchEmployees = useDebounceFn(async (query) => {
  if (!query || query.length < 2) return
  const { data } = await employeeApi.options({ search: query, per_page: 20 })
  employeeOptions.value = data.data
}, 300)
```

---

## 8. Error Handling

### Current State

- **Global Vue error handler** added in `main.js` — logs to console
- **Axios interceptors** handle 401 (token refresh + retry) and generic errors
- **`message.error()`** used in catch blocks across all views for user-facing errors
- **Most fetch functions** use `catch { /* silent */ }` pattern — swallow errors silently

### Findings

- **Silent error swallowing is widespread.** At least 13 list view `fetchItems()` functions use `catch { /* silent */ }` — errors are completely swallowed with no logging, no user feedback, and no error state. If an API is down, the user sees an empty table with no indication of failure.

- **No error boundary component.** A Vue error in any component crashes the entire app. An `<ErrorBoundary>` component wrapping the main `<RouterView>` would catch render errors and show a fallback UI.

- **No network error detection.** The axios interceptor doesn't distinguish between network errors (offline), timeout errors, and server errors. Users get the same generic "Failed to..." message for all cases.

- **Global error handler only logs.** In production, `console.error` is invisible to users and developers (unless there's a monitoring service). Consider integrating with an error tracking service (Sentry, Bugsnag) in production.

### Issues

| Severity | Issue | Recommendation |
|----------|-------|----------------|
| MEDIUM | Silent `catch {}` in fetch functions | Add error state (`error.value = true`) + user-visible feedback |
| MEDIUM | No error boundary component | Create `<ErrorBoundary>` wrapping `<RouterView>` |
| LOW | No network vs. server error distinction | Check `err.code === 'ERR_NETWORK'` in axios interceptor |
| LOW | Error handler only logs to console | Integrate Sentry or similar for production monitoring |

### Fix: Error State in Fetch Functions

```js
const error = ref(false)

async function fetchItems() {
  loading.value = true
  error.value = false
  try {
    const { data } = await api.list(params)
    items.value = data.data || []
  } catch (err) {
    error.value = true
    console.error('Failed to fetch:', err)
  }
  loading.value = false
}
```

---

## 9. Routing & Deployment

### Current State

- **Vue Router** uses `createWebHistory()` (HTML5 history mode)
- **38 unique routes** organized in a flat structure
- **Route guards** check authentication and permissions
- **No server-side fallback configuration** for history mode

### Findings

- **CRITICAL: No `_redirects` or `netlify.toml` for history mode.** Vue Router's history mode requires the server to serve `index.html` for all routes. Without a `_redirects` file (for Netlify) or equivalent server config, direct URL access or page refresh on any route other than `/` will return a 404.

- **No 404 catch-all route.** If a user navigates to a non-existent URL, Vue Router doesn't show a "not found" page — it either shows a blank page or the last matched route.

- **No loading indicator during route transitions.** When navigating between routes, there's no visual feedback while the new component loads (especially relevant if code splitting is added).

- **Lazy-loaded routes would need preloading strategy.** If `() => import()` is added for routes, frequently visited routes should be prefetched on hover or after initial load.

### Issues

| Severity | Issue | Recommendation |
|----------|-------|----------------|
| CRITICAL | No `_redirects` for Netlify SPA | Create `public/_redirects` with `/* /index.html 200` |
| MEDIUM | No 404 catch-all route | Add `{ path: '/:pathMatch(.*)*', component: NotFoundView }` |
| LOW | No route transition indicator | Add `NProgress` or `<a-spin>` during navigation |

### Fix: Netlify SPA Redirect

Create `public/_redirects`:
```
/* /index.html 200
```

Or create `netlify.toml`:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Fix: 404 Catch-All Route

```js
// src/router/routes.js — add as last route
{
  path: '/:pathMatch(.*)*',
  name: 'not-found',
  component: () => import('@/views/errors/NotFoundView.vue'),
  meta: { requiresAuth: false },
}
```

---

## 10. Additional Checks

### Favicon & Meta Tags

- **No favicon** in `public/` directory or `index.html`. Browsers will request `/favicon.ico` and get a 404.
- **No `<meta name="description">`** — affects SEO (less relevant for internal HRMS, but good practice).
- **No `<meta name="theme-color">`** — affects mobile browser chrome color.

**Fix:** Add to `index.html`:
```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<meta name="description" content="HRMS — Human Resource Management System" />
<meta name="theme-color" content="#171717" />
```

### Public Assets

- **`public/` directory** contains only Vite's default — no favicon, no robots.txt, no manifest.json.
- **Images** are in `src/assets/fonts/img/` — should be in `src/assets/img/` or `public/img/`.

### TypeScript

- **Not used.** The project is pure JavaScript. Adding TypeScript now would be a large migration effort. For new features, `.ts` files could be gradually introduced since Vite supports mixed JS/TS.

### PWA / Service Worker

- **No service worker or PWA manifest.** Not required for an internal HRMS, but could improve offline resilience and add "install app" capability.

---

## 11. Summary & Priority Matrix

### Critical (Fix Before Deploy)

| # | Issue | File(s) | Effort |
|---|-------|---------|--------|
| 1 | No `_redirects` for SPA history mode | `public/_redirects` | 1 min |
| 2 | Notification polling when tab hidden | `src/stores/notifications.js` | 15 min |

### High Priority (Fix Soon After Deploy)

| # | Issue | File(s) | Effort |
|---|-------|---------|--------|
| 3 | No AbortController on API calls | `src/api/axios.js`, all list views | 2 hrs |
| 4 | `.env` not in `.gitignore` | `.gitignore` | 1 min |
| 5 | `per_page: 999` loads all employees | `src/views/leave/LeaveRequestListView.vue` | 30 min |
| 6 | `.env.production` has placeholder values | `.env.production` | 5 min |

### Medium Priority (Next Sprint)

| # | Issue | File(s) | Effort |
|---|-------|---------|--------|
| 7 | No vendor chunk splitting | `vite.config.js` | 15 min |
| 8 | No console stripping in production | `vite.config.js` | 5 min |
| 9 | `pusher-js` statically imported | `src/plugins/echo.js` | 30 min |
| 10 | No ESLint / Prettier | New config files | 1 hr |
| 11 | No 404 catch-all route | `src/router/routes.js` | 15 min |
| 12 | Unsanitized `?redirect=` parameter | `src/views/auth/LoginView.vue` | 10 min |
| 13 | Silent `catch {}` in fetch functions | All list views | 1 hr |
| 14 | No route-level code splitting | `src/router/routes.js` | 30 min |
| 15 | No error boundary component | New component | 30 min |
| 16 | No favicon or meta tags | `index.html`, `public/` | 10 min |

### Low Priority (Backlog)

| # | Issue | File(s) | Effort |
|---|-------|---------|--------|
| 17 | No pre-commit hooks | `package.json` | 15 min |
| 18 | 40+ `!important` in global.less | `src/styles/global.less` | 2 hrs |
| 19 | No `<KeepAlive>` on list views | `App.vue` or layout | 15 min |
| 20 | No `.env.example` template | New file | 5 min |
| 21 | No network vs. server error distinction | `src/api/axios.js` | 15 min |
| 22 | Error handler only logs to console | `src/main.js` | 30 min |

### What's Already Good

- HttpOnly cookie authentication (not localStorage tokens)
- Cross-tab session sync via BroadcastChannel
- Server-side pagination on all list views
- 3-layer permission system (route guards + directive + programmatic)
- Tree-shaken Ant Design Vue imports (-60% bundle size)
- Pre-compressed assets (Brotli + Gzip)
- Self-hosted fonts (no CDN dependency)
- Virtual scrolling on large tables
- Consistent code patterns across all views
- Global error handler in place

---

*Generated by Claude Code — Production Readiness Audit*
