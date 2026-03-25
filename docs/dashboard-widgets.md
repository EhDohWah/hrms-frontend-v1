# Dashboard Widgets

## Overview

The Dashboard (`src/views/dashboard/DashboardView.vue`) displays a grid of widget cards that provide at-a-glance summaries of key HR data. Each widget is a standalone component that fetches its own data on mount.

## Layout

```
┌─────────────────────────────────────────────────┐
│ Greeting (Good morning, Name + date)            │
├────────┬────────┬────────┬──────────────────────┤
│ Total  │On Leave│Pending │ Payroll This Month   │  ← Stats Grid
│Employees│ Today │Requests│                      │
├─────────────────────────────────────────────────┤
│ Quick Actions (8 shortcut buttons, 4-col grid)  │
├───────────────────────┬─────────────────────────┤
│ People                │ Leave                   │  ← 2-column grid
│ (stats + recent hires)│ (summary + pending)     │
├───────────────────────┬─────────────────────────┤
│ Payroll               │ Recruitment             │
│ (summary + upcoming)  │ (interviews + positions)│
├─────────────────────────────────────────────────┤
│ Notifications (full width)                      │
└─────────────────────────────────────────────────┘
```

## Widget Files

All widgets are in `src/components/dashboard/widgets/`.

| Widget | API Call | Permission | Has List? |
|--------|---------|------------|-----------|
| `QuickActionsWidget.vue` | None (static) | Per-action gating | No |
| `EmployeeStatsWidget.vue` | `dashboardApi.employeeStats()` | `employees` | No (stats grid) |
| `RecentHiresWidget.vue` | `dashboardApi.recentHires()` | `employees` | Yes |
| `LeaveSummaryWidget.vue` | `dashboardApi.leaveSummary()` | `leaves_admin` | No (stats grid) |
| `PendingLeaveRequestsWidget.vue` | `dashboardApi.pendingLeaveRequests()` | `leaves_admin` | Yes |
| `PayrollSummaryWidget.vue` | `dashboardApi.payrollSummary()` | `employee_salary` | No (stats grid) |
| `UpcomingPayrollWidget.vue` | `dashboardApi.upcomingPayroll()` | `employee_salary` | No (single card) |
| `PendingInterviewsWidget.vue` | `dashboardApi.pendingInterviews()` | `interviews` | Yes |
| `OpenPositionsWidget.vue` | `dashboardApi.openPositions()` | `interviews` / `job_offers` | Yes |
| `SystemNotificationsWidget.vue` | `notificationApi.list({ per_page: 10 })` | None | Yes |

## Permission Gating

Widget cards are conditionally rendered in `DashboardView.vue` using the `can` computed:

```js
const can = computed(() => ({
  employees: auth.canRead('employees'),
  leave: auth.canRead('leaves_admin'),
  payroll: auth.canRead('employee_salary'),
  recruitment: auth.canRead('interviews') || auth.canRead('job_offers'),
}))
```

```vue
<a-card v-if="can.employees" data-tour="widget-people">...</a-card>
<a-card v-if="can.leave" data-tour="widget-leave">...</a-card>
<a-card v-if="can.payroll" data-tour="widget-payroll">...</a-card>
<a-card v-if="can.recruitment" data-tour="widget-recruitment">...</a-card>
<a-card data-tour="widget-notifications">...</a-card>  <!-- always visible -->
```

## List Widget Overflow Handling

Widgets that render lists (RecentHires, PendingLeaveRequests, PendingInterviews, OpenPositions) use two global CSS utility classes defined in `src/styles/global.less`:

### `.widget-scroll`

Constrains the list to a max height with scroll:

```less
.widget-scroll {
  max-height: 320px;
  overflow-y: auto;
}
```

Applied to the list container inside each widget:

```vue
<div class="hire-list widget-scroll">
  <router-link v-for="h in hires" :key="h.employee_id" ...>
    ...
  </router-link>
</div>
```

### `.widget-view-all`

"View all" footer link that routes to the full list page:

```less
.widget-view-all {
  display: block;
  text-align: center;
  padding: 10px 0 2px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-accent);
  text-decoration: none;
  border-top: 1px solid var(--color-border-light);
  margin-top: 4px;
}
```

```vue
<router-link to="/interviews" class="widget-view-all">View all interviews &rarr;</router-link>
```

### Applied To

| Widget | Route Link |
|--------|-----------|
| `RecentHiresWidget` | `/employees` |
| `PendingLeaveRequestsWidget` | `/leave-requests` |
| `PendingInterviewsWidget` | `/interviews` |
| `OpenPositionsWidget` | `/positions` |

## Widget Component Pattern

All list widgets follow the same structure:

```vue
<template>
  <div class="widget-name">
    <!-- Loading state -->
    <a-spin v-if="loading" size="small" class="widget-spinner" />

    <!-- Data state -->
    <template v-else-if="items.length">
      <div class="item-list widget-scroll">
        <div v-for="item in items" :key="item.id" class="item-row">
          <!-- item content -->
        </div>
      </div>
      <router-link to="/full-list" class="widget-view-all">View all &rarr;</router-link>
    </template>

    <!-- Empty state -->
    <a-empty v-else description="No items" :image="simpleImage" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Empty } from 'ant-design-vue'
import { dashboardApi } from '@/api'

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE
const items = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await dashboardApi.someEndpoint()
    items.value = res.data.data || []
  } catch { /* silent */ }
  finally { loading.value = false }
})
</script>
```

### Conventions

- Use `formatDate` from `@/utils/formatters` for date formatting — never call `dayjs().format()` directly
- Use `getOrgColor` from `@/constants/organizations` for organization tag colors
- Silent catch blocks — dashboard widgets should never block the page if an API call fails
- `Empty.PRESENTED_IMAGE_SIMPLE` for empty states (smaller illustration)

## Adding a New Widget

1. Create `src/components/dashboard/widgets/NewWidget.vue` following the pattern above
2. Import and add it to `DashboardView.vue` inside the `.dashboard-sections` grid
3. Add permission gate with `v-if="can.newModule"` if needed
4. Add `data-tour="widget-new"` for the guided tour
5. Add a corresponding tour step in `DashboardView.vue`'s `tourSteps` computed
6. If the widget renders a list, add `widget-scroll` class and a `widget-view-all` footer link
