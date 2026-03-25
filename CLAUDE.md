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

### Formatting — Use Utility Functions Only
**Always** use the formatters from `src/utils/formatters.js`. Never inline formatting logic.
- Currency: `formatCurrency(amount)` — returns `THB 1,234.00`. Never use `฿${num.toLocaleString()}` or inline `Intl.NumberFormat`.
- Dates: `formatDate(date)` → `'DD MMM YYYY'`, `formatDateTime(date)` → `'DD MMM YYYY HH:mm'`. Never call `dayjs().format()` directly.
- Numbers: `formatNumber(num)` — returns comma-separated number.
- Null handling: All formatters return `'—'` for null/undefined. Never write `value || '—'` inline.
- Use `cleanParams()` from `src/utils/helpers.js` to strip null/empty values before API calls.

### Pagination
Default 20 per page, options `[10, 20, 50, 100]` — configured in `src/constants/config.js`.

---

## Design System

### Theme — Single Source of Truth
The theme is configured in `src/App.vue` via Ant Design's `<a-config-provider :theme="themeConfig">`. This is the **authoritative** source for all Ant Design token overrides:

```js
token: {
  colorPrimary: '#002147',
  borderRadius: 8,
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  colorBgContainer: '#ffffff',
  colorBgLayout: '#f4f5f6',
  fontSize: 14,
}
```

**Rules:**
- To change Ant Design appearance, modify `themeConfig` in `App.vue` — use token overrides and component-level tokens.
- The LESS vars in `vite.config.js` (`modifyVars`) are legacy from Ant Design v3 migration. Do NOT add new overrides there.
- Do NOT use `!important` to override Ant Design styles. Use the Ant Design v4 token API or increase CSS specificity naturally. When touching existing `!important` overrides in `global.less`, migrate them to `themeConfig` component tokens.

### CSS Variables (`src/styles/global.less`)
All custom styling must use the CSS variables defined in `:root`. Never hardcode hex colors, shadows, radii, or transition values.

**Available variable groups:**
| Group | Variables | Example |
|---|---|---|
| Backgrounds | `--color-bg`, `--color-bg-surface`, `--color-bg-subtle`, `--color-bg-muted`, `--color-bg-hover` | `background: var(--color-bg-surface)` |
| Text | `--color-text`, `--color-text-secondary`, `--color-text-muted`, `--color-text-inverse` | `color: var(--color-text-secondary)` |
| Brand | `--color-primary`, `--color-primary-hover`, `--color-accent`, `--color-accent-light`, `--color-accent-hover` | `background: var(--color-primary)` |
| Status | `--color-success`, `--color-warning`, `--color-danger`, `--color-info` + matching `-bg` variants | `color: var(--color-danger)` |
| Borders | `--color-border`, `--color-border-light` | `border: 1px solid var(--color-border)` |
| Radius | `--radius-sm` (6px), `--radius-md` (8px), `--radius-lg` (12px), `--radius-xl` (16px) | `border-radius: var(--radius-md)` |
| Shadows | `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-card` | `box-shadow: var(--shadow-card)` |
| Transitions | `--transition-fast` (150ms), `--transition-base` (200ms), `--transition-slow` (300ms) | `transition: all var(--transition-base)` |
| Layout | `--sidebar-width`, `--sidebar-collapsed-width`, `--header-height` | `margin-left: var(--sidebar-width)` |

### Typography
- **Primary font**: DM Sans (400, 700) — self-hosted from `src/assets/fonts/`
- **Monospace**: JetBrains Mono (400) — for IDs, codes, numeric data
- **Font sizes in use**: 11px (micro labels), 12px (table headers, captions), 13px (body small), 14px (body default), 16px (subheadings), 24px (page titles)
- **Font weights**: 400 (normal), 500 (medium — labels, buttons), 600 (semibold — headings, table headers), 700 (bold — emphasis)
- Keep font sizes within this established scale. Do not invent arbitrary sizes like 11.5px or 13.5px.

### Color Palette

```
Navy primary:    #002147  (buttons, sidebar active, headings)
Navy hover:      #0a3060  (button hover)
Accent blue:     #2563eb  (links, accent indicators, NProgress bar)
Background:      #f4f5f6  (page canvas)
Surface:         #ffffff  (cards, modals, sidebar)
Text primary:    #1f272e
Text secondary:  #6b7280
Text muted:      #9ca3af
Border:          #e5e7eb
Border light:    #f0f0f0  (table rows, card dividers)
```

### Accessibility Requirements
- **Focus states**: Every interactive element (buttons, links, inputs, selects) must have a visible `:focus-visible` style. Use `outline: 2px solid var(--color-accent)` with `outline-offset: 2px` as the default pattern.
- **Motion**: Wrap all CSS animations in `@media (prefers-reduced-motion: no-preference) { }`. Users who prefer reduced motion should see no animations or transitions.
- **Color contrast**: Text on colored backgrounds must meet WCAG AA (4.5:1 for body text, 3:1 for large text). The navy `#002147` on white exceeds this — maintain similar contrast ratios.
- **Semantic HTML**: Use `<button>` for actions, `<a>` for navigation, `<dt>/<dd>` for label-value pairs (see `InfoField.vue`). Do not use `<div>` with click handlers as button replacements.

### Responsive Breakpoints
Use these consistent breakpoints (mobile-first):

```less
@media (min-width: 640px)  { /* sm — phone landscape */ }
@media (min-width: 768px)  { /* md — tablet portrait, hide mobile nav */ }
@media (min-width: 1024px) { /* lg — tablet landscape / small desktop */ }
@media (min-width: 1280px) { /* xl — desktop */ }
```

**Rules:**
- Grids must collapse to single column below `768px`. Never use `repeat(3, 1fr)` without a responsive fallback.
- Table views show `<a-table>` on `md+` and a card-based list on mobile. Use the global classes `hidden-mobile` / `visible-mobile` (breakpoint: 768px).
- Filter bars use the global `.filter-bar` (flex-wrap) and `.filter-input` (full-width mobile, auto on sm+) classes.

### Component Styling Conventions

**Scoped styles**: All component `<style>` blocks must use `scoped`. Only `global.less` writes unscoped CSS.

**Ant Design overrides**: Prefer `:deep()` selector within scoped styles over global overrides:
```vue
<style scoped>
.my-component :deep(.ant-table-thead > tr > th) {
  /* component-specific override */
}
</style>
```

**Common reusable components** (use these, don't reinvent):
| Component | Purpose |
|---|---|
| `AppPageHeader` | Page title + subtitle + action buttons slot |
| `AppLoading` | Centered spinner with tip text |
| `AppEmpty` | Empty state with description + action slot |
| `InfoField` | Label-value display pair (38% label / 62% value) |

**Status tags**: Use Ant Design `<a-tag>` with these color mappings:
- Active/Approved/Completed → `color="green"`
- Pending/Draft → `color="orange"`
- Rejected/Terminated → `color="red"`
- Inactive/Cancelled → `color="default"`

**Cell classes for list views**: Use these shared patterns for table cell content:
```vue
<div class="cell-employee">
  <span class="cell-name">{{ name }}</span>
  <span class="cell-sub">{{ subtitle }}</span>
</div>
```

### Sidebar Navigation (`src/components/layout/AppSidebar.vue`)
- Navigation items are permission-gated with `v-if="authStore.canRead('module')"`
- Sections: Grants, Recruitment, Management, Leave, Attendance, Training, HRM, Reports, Data Management, Organization, Settings, Administration, System
- To add a new nav item: add to the appropriate section's `items` array with `{ label, icon, route, permission }`
- Icons: import from `@ant-design/icons-vue`, wrap with `markRaw()` if stored in reactive data

### Hardcoded Values — What to Avoid
Do NOT hardcode organization names ("SMRU", "BHF"), department names, or position titles in templates or scripts. These should come from lookup API responses or be stored in `src/constants/` if truly static. Currently some components hardcode these — follow the pattern of fetching from the API instead.
