# Guided Tour — Onboarding System

## Overview

The HRMS frontend includes a guided onboarding tour that walks new users through the interface. It uses Ant Design Vue's `<a-tour>` component with backend-tracked completion state so the tour only shows once per user.

## Architecture

### Files

| File | Role |
|------|------|
| `src/composables/useTour.js` | Core composable — manages tour state, backend sync, completion cache |
| `src/views/dashboard/DashboardView.vue` | Tour host — defines steps, renders `<a-tour>`, floating restart button |
| `src/components/layout/AppSidebar.vue` | Tour targets — `data-tour` attributes on nav items and section groups |
| `src/components/layout/AppHeader.vue` | Tour targets — `data-tour="notification-bell"` and `data-tour="profile-dropdown"` |
| `src/api/userApi.js` | API endpoints — `completedTours()` GET, `completeTour(key)` POST |
| `src/stores/auth.js` | Calls `resetTourCache()` on logout to prevent cross-user leakage |

### Data Flow

```
User logs in → Dashboard mounts → useTour('app_welcome').checkAndOpen()
  → GET /user/tours (fetches completed tour keys, cached module-level)
  → If 'app_welcome' not in list → 600ms delay → isTourOpen = true
  → User advances through steps or clicks Close/Skip
  → markComplete() → POST /user/tours/app_welcome/complete
  → Tour won't show again for this user
```

## Tour Step Sequence

The tour has 3 phases with dynamic step count based on user permissions.

### Phase 1 — Sidebar Navigation (top to bottom)

| Step | Target Key | Title | Permission Gate |
|------|-----------|-------|-----------------|
| 0 | `nav-dashboard` | Welcome to HRMS | Always |
| 1 | `nav-notifications` | Notifications | Always |
| 2 | `grants-menu` | Grants | `grants_list` |
| 3 | `recruitment-menu` | Recruitment | `interviews` OR `job_offers` |
| 4 | `management-menu` | Management | `employees` OR `employee_salary` |
| 5 | `leave-menu` | Leave | `leaves_admin` OR `leave_balances` OR `leave_types` |
| 6 | `attendance-menu` | Attendance | `attendance_admin` OR `holidays` |
| 7 | `training-menu` | Training | `training_list` OR `employee_training` |
| 8 | `hrm-menu` | HRM | `personnel_actions` OR `transfer` OR `resignation` |
| 9 | `reports-menu` | Reports | `report_list` |
| 10 | `data-management-menu` | Data Management | `employees` |
| 11 | `organization-menu` | Organization | `sites` OR `departments` OR `positions` |
| 12 | `settings-menu` | Settings | `benefit_settings` OR `tax_settings` OR `payroll_items` |
| 13 | `admin-menu` | Administration | `users` OR `roles` |
| 14 | `system-menu` | System | Always (Activity Log has no permission) |
| 15 | `sidebar-collapse` | Collapse Sidebar | Always |

### Phase 2 — Dashboard Content (row by row)

| Step | Target Key | Title | Permission Gate |
|------|-----------|-------|-----------------|
| 16 | `stats-cards` | Quick Stats | Always |
| 17 | `quick-actions` | Quick Actions | Always |
| 18 | `widget-people` | People | `employees` |
| 19 | `widget-leave` | Leave | `leaves_admin` |
| 20 | `widget-payroll` | Payroll | `employee_salary` |
| 21 | `widget-recruitment` | Recruitment | `interviews` OR `job_offers` |
| 22 | `widget-notifications` | Notifications | Always |

### Phase 3 — Top Bar Utilities

| Step | Target Key | Title | Permission Gate |
|------|-----------|-------|-----------------|
| 23 | `notification-bell` | Notification Bell | Always |
| 24 | `profile-dropdown` | Your Profile | Always |

Step numbers are approximate — actual count depends on user permissions. Steps for sections the user cannot access are excluded entirely.

## Key Design Decisions

### Dynamic Step Filtering (Permission-Aware)

`tourSteps` is a `computed()` that only includes steps for sidebar sections the user can see. Each sidebar section's permission requirements are mirrored from `AppSidebar.vue`'s `visibleSections` logic. This prevents `<a-tour>` from receiving null targets, which would cause floating popovers without an anchor.

```js
// Tour mirrors the sidebar's visibility check
const canAny = (...perms) => perms.some((p) => auth.canRead(p))

// Only include step if section is visible in sidebar
if (s.perms.length === 0 || canAny(...s.perms)) {
  steps.push({ ... })
}
```

### Sidebar Scroll Handling

Sidebar items below the visible area need to be scrolled into view before `<a-tour>` measures the target position. This is handled by `sidebarEl()` — a target function factory that scrolls the `.sidebar-nav` container before returning the element:

```js
const sidebarEl = (key) => () => {
  const target = document.querySelector(`[data-tour="${key}"]`)
  if (target && cachedSidebarNav?.contains(target)) {
    target.scrollIntoView({ behavior: 'instant', block: 'center' })
  }
  return target
}
```

Key points:
- Uses `behavior: 'instant'` (synchronous) — `smooth` causes timing issues where the popover measures the old position before the scroll animation finishes
- The `.sidebar-nav` reference is cached to avoid repeated DOM queries
- `sidebarEl` is used for sidebar targets; `el` is used for dashboard/header targets

The `<a-tour>` component's own `scrollIntoViewOptions` uses `behavior: 'instant'` for the same reason — prevents misalignment between the highlight mask and the popover.

### Backend Tracking

Tour completion is tracked server-side via `user_tours` table:
- `GET /user/tours` — returns array of completed tour key strings
- `POST /user/tours/{key}/complete` — marks a tour as completed

A module-level cache (`completedKeysCache`) avoids redundant API calls within the same page session. The cache is cleared on logout via `resetTourCache()` called from `auth.js`.

## Adding a New Tour Step

### For a new sidebar section:

1. Add `tourKey: 'section-key'` to the section in `AppSidebar.vue`'s `navSections`
2. Add a new entry to `sidebarSteps` in `DashboardView.vue` with matching `key` and `perms`

### For a new dashboard widget:

1. Add `data-tour="widget-name"` to the card in `DashboardView.vue`'s template
2. Add a step in the Phase 2 section of `tourSteps` with appropriate permission gate

### For a new header element:

1. Add `data-tour="element-key"` to the element in `AppHeader.vue`
2. Add a step in the Phase 3 section using `el('element-key')` (not `sidebarEl`)

## Restarting the Tour

Users can restart the tour anytime via the floating `?` button in the bottom-right corner of the Dashboard. This calls `restart()` which resets `currentStep` to 0 and opens the tour regardless of completion state.
