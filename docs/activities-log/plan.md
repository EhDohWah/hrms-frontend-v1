# Activity Log — Implementation Plan

## What We're Building

A complete Activity Log feature with 3 parts:

1. **`ActivityTimeline` component** — Reusable timeline that shows at the bottom of record detail pages (Employee, Grant, etc.)
2. **`ActivityLogListView` page** — Global activity feed with filters for admins to see all system activity
3. **`activityLogApi` client** — API layer to consume the existing backend endpoints

### Current State (from screenshot)

The employee detail page shows a minimal "Activity" section at the bottom:
```
Activity
● System created this · 2 hours ago
```

This is too basic. No user names, no change details, no update tracking, no expandable diffs.

### Target State

```
Activity                                              [Show changes ▾]

● Admin User updated this · 10 minutes ago

● Admin User created this · 2 hours ago

● System imported this · 1 day ago
```

---

## File Plan

| # | File | Type | Description |
|---|------|------|-------------|
| 1 | `src/api/activityLogApi.js` | New | API client for activity log endpoints |
| 2 | `src/api/index.js` | Edit | Export activityLogApi |
| 3 | `src/components/ActivityTimeline.vue` | New | Reusable timeline component |
| 4 | `src/views/employees/EmployeeFormView.vue` | Edit | Add ActivityTimeline below form-body |
| 5 | `src/views/activity-log/ActivityLogListView.vue` | New | Global activity log page |
| 6 | `src/router/routes.js` | Edit | Add activity-log route |
| 7 | `src/components/layout/AppSidebar.vue` | Edit | Add sidebar entry |

---

## 1. API Client

**File:** `src/api/activityLogApi.js`

```js
import client from './axios'

export const activityLogApi = {
  list:       (params)          => client.get('/activity-logs', { params }),
  recent:     (params)          => client.get('/activity-logs/recent', { params }),
  forSubject: (type, id, params) => client.get(`/activity-logs/subject/${type}/${id}`, { params }),
}
```

**File:** `src/api/index.js` — add export:
```js
export { activityLogApi } from './activityLogApi'
```

Backend endpoints consumed:
- `GET /api/v1/activity-logs` — paginated list with filters
- `GET /api/v1/activity-logs/recent` — latest N entries
- `GET /api/v1/activity-logs/subject/{type}/{id}` — per-record feed

---

## 2. ActivityTimeline Component

**File:** `src/components/ActivityTimeline.vue`

This is the core reusable component. It accepts a `subjectType` and `subjectId`, fetches activity logs, and renders a Frappe-style timeline.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `subjectType` | String | required | Short type name: `'employee'`, `'grant'`, etc. |
| `subjectId` | Number | required | Record ID |
| `limit` | Number | `10` | Initial items to load |

### Template Structure

```vue
<template>
  <div class="activity-section">
    <div class="activity-header">
      <h3 class="activity-title">Activity</h3>
      <a-switch
        v-model:checked="showChanges"
        checked-children="Changes"
        un-checked-children="Changes"
        size="small"
      />
    </div>

    <a-spin :spinning="loading">
      <div v-if="logs.length" class="activity-list">
        <div v-for="log in logs" :key="log.id" class="activity-item">
          <!-- Dot + connector line -->
          <div class="activity-dot-col">
            <span class="activity-dot" :class="dotClass(log.action)" />
            <span class="activity-line" />
          </div>

          <!-- Content -->
          <div class="activity-content">
            <div class="activity-summary">
              <span class="activity-user">{{ log.user?.name || 'System' }}</span>
              <span class="activity-action" :class="`action-${log.action}`">
                {{ actionLabel(log) }}
              </span>
              <span class="activity-time">· {{ relativeTime(log.created_at) }}</span>
            </div>

            <!-- Field-level changes (expandable) -->
            <div
              v-if="showChanges && log.action === 'updated' && log.properties?.changes?.length"
              class="activity-changes"
            >
              <div
                v-for="field in log.properties.changes"
                :key="field"
                class="change-row"
              >
                <span class="change-field">{{ formatFieldName(field) }}</span>
                <span class="change-old">{{ formatValue(log.properties.old?.[field]) }}</span>
                <span class="change-arrow">→</span>
                <span class="change-new">{{ formatValue(log.properties.new?.[field]) }}</span>
              </div>
            </div>

            <!-- Custom action properties (transferred, imported, etc.) -->
            <div
              v-if="showChanges && log.description && log.action !== 'updated'"
              class="activity-description"
            >
              {{ log.description }}
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="!loading" class="activity-empty">
        No activity recorded yet.
      </div>
    </a-spin>

    <!-- Load more -->
    <div v-if="hasMore && logs.length" class="activity-load-more">
      <a-button size="small" type="link" :loading="loadingMore" @click="loadMore">
        Load older activity
      </a-button>
    </div>
  </div>
</template>
```

### Script

```vue
<script setup>
import { ref, onMounted, inject } from 'vue'
import { activityLogApi } from '@/api'

const dayjs = inject('$dayjs')

const props = defineProps({
  subjectType: { type: String, required: true },
  subjectId: { type: Number, required: true },
  limit: { type: Number, default: 10 },
})

const logs = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const showChanges = ref(true)
const pagination = ref({ current_page: 1, last_page: 1 })

const hasMore = computed(() => pagination.value.current_page < pagination.value.last_page)

async function fetchLogs(page = 1) {
  const isFirstLoad = page === 1
  if (isFirstLoad) loading.value = true
  else loadingMore.value = true

  try {
    const { data } = await activityLogApi.forSubject(props.subjectType, props.subjectId, {
      page,
      per_page: props.limit,
    })
    const items = data.data?.data || data.data || []
    const pag = data.data?.meta || data.pagination || data.data

    if (isFirstLoad) {
      logs.value = items
    } else {
      logs.value.push(...items)
    }

    if (pag) {
      pagination.value.current_page = pag.current_page ?? 1
      pagination.value.last_page = pag.last_page ?? 1
    }
  } catch {
    // silent
  }

  loading.value = false
  loadingMore.value = false
}

function loadMore() {
  fetchLogs(pagination.value.current_page + 1)
}

function dotClass(action) {
  const map = {
    created: 'dot-green',
    updated: 'dot-blue',
    deleted: 'dot-red',
    transferred: 'dot-orange',
    processed: 'dot-purple',
    imported: 'dot-cyan',
  }
  return map[action] || 'dot-default'
}

function actionLabel(log) {
  const map = {
    created: 'created this',
    updated: 'updated this',
    deleted: 'deleted this',
    transferred: 'transferred this',
    processed: 'processed this',
    imported: 'imported this',
  }
  return map[log.action] || log.action_label || log.action
}

function relativeTime(date) {
  return date ? dayjs(date).fromNow() : ''
}

function formatFieldName(field) {
  // Convert snake_case to Title Case: "first_name_en" → "First Name En"
  return field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatValue(val) {
  if (val === null || val === undefined) return '—'
  if (val === true) return 'Yes'
  if (val === false) return 'No'
  if (typeof val === 'number') return val.toLocaleString()
  return String(val)
}

onMounted(() => fetchLogs())
</script>
```

### Styles

```vue
<style scoped>
.activity-section {
  margin-top: 16px;
  padding: 20px;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.activity-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
}

/* Timeline layout */
.activity-item {
  display: flex;
  gap: 12px;
  min-height: 40px;
}

.activity-dot-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 12px;
  flex-shrink: 0;
  padding-top: 5px;
}
.activity-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.activity-line {
  width: 1px;
  flex: 1;
  background: var(--color-border-light);
  margin-top: 4px;
}
.activity-item:last-child .activity-line { display: none; }

/* Dot colors */
.dot-green  { background: #52c41a; }
.dot-blue   { background: #1677ff; }
.dot-red    { background: #ff4d4f; }
.dot-orange { background: #fa8c16; }
.dot-purple { background: #722ed1; }
.dot-cyan   { background: #13c2c2; }
.dot-default { background: #d9d9d9; }

/* Content */
.activity-content {
  flex: 1;
  padding-bottom: 16px;
}
.activity-summary {
  font-size: 13.5px;
  line-height: 1.4;
}
.activity-user {
  font-weight: 600;
  color: var(--color-text);
}
.action-created { color: #52c41a; }
.action-updated { color: #1677ff; }
.action-deleted { color: #ff4d4f; }
.action-transferred { color: #fa8c16; }
.activity-action { font-weight: 500; }
.activity-time {
  color: var(--color-text-muted);
  font-size: 12.5px;
}

/* Field-level changes */
.activity-changes {
  margin-top: 6px;
  padding: 8px 12px;
  background: var(--color-bg-subtle, #fafafa);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  font-size: 12.5px;
}
.change-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 2px 0;
}
.change-field {
  font-weight: 600;
  color: var(--color-text-secondary);
  min-width: 100px;
}
.change-field::after { content: ':'; }
.change-old {
  color: var(--color-text-muted);
  text-decoration: line-through;
}
.change-arrow { color: var(--color-text-muted); }
.change-new {
  font-weight: 600;
  color: var(--color-primary);
}

.activity-description {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--color-text-secondary);
}

.activity-empty {
  text-align: center;
  padding: 20px;
  color: var(--color-text-muted);
  font-size: 13px;
}

.activity-load-more {
  text-align: center;
  margin-top: 8px;
}
</style>
```

---

## 3. Integrate into Employee Detail Page

**File:** `src/views/employees/EmployeeFormView.vue`

### Template Change

Add `ActivityTimeline` below the `form-body` div, inside the `v-else` template block:

```html
      <!-- Content: tabs + sidebar -->
      <div class="form-body">
        <!-- ... existing tabs + sidebar ... -->
      </div>

      <!-- Activity Log (only for existing employees) -->
      <ActivityTimeline
        v-if="isEditMode && employee"
        subject-type="employee"
        :subject-id="employee.id"
      />

      <!-- Transfer Modal -->
      <TransferModal ... />
```

### Script Change

Add the import:

```js
import ActivityTimeline from '@/components/ActivityTimeline.vue'
```

No other script changes needed — the component is self-contained.

---

## 4. Global Activity Log List Page

**File:** `src/views/activity-log/ActivityLogListView.vue`

A full page showing all system activity with filters. Uses table format, not timeline.

### Template

```vue
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-stats">
        <a-tag color="default">{{ pagination.total || 0 }} Total</a-tag>
      </div>
      <div class="filter-bar">
        <a-input
          v-model:value="search"
          placeholder="Search by name..."
          allow-clear
          class="filter-input"
          style="width: 220px"
          @pressEnter="onFilterChange"
          @clear="onFilterChange"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-select
          v-model:value="filters.subject_type"
          placeholder="Record Type"
          allow-clear
          class="filter-input"
          style="width: 150px"
          @change="onFilterChange"
        >
          <a-select-option value="employee">Employee</a-select-option>
          <a-select-option value="employment">Employment</a-select-option>
          <a-select-option value="grant">Grant</a-select-option>
          <a-select-option value="payroll">Payroll</a-select-option>
        </a-select>
        <a-select
          v-model:value="filters.action"
          placeholder="Action"
          allow-clear
          class="filter-input"
          style="width: 130px"
          @change="onFilterChange"
        >
          <a-select-option value="created">Created</a-select-option>
          <a-select-option value="updated">Updated</a-select-option>
          <a-select-option value="deleted">Deleted</a-select-option>
        </a-select>
        <a-range-picker
          v-model:value="dateRange"
          format="DD MMM YYYY"
          value-format="YYYY-MM-DD"
          style="width: 260px"
          @change="onDateRangeChange"
        />
      </div>
    </div>

    <a-card :body-style="{ padding: 0 }">
      <a-table
        :columns="columns"
        :data-source="items"
        :loading="loading"
        :pagination="tablePagination"
        :row-key="(r) => r.id"
        :scroll="{ x: 'max-content' }"
        @change="handleTableChange"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'user'">
            <span class="cell-name">{{ record.user?.name || 'System' }}</span>
          </template>

          <template v-else-if="column.key === 'action'">
            <a-tag :color="actionColor(record.action)" size="small">
              {{ record.action_label || record.action }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'subject'">
            <div class="cell-subject">
              <a-tag size="small">{{ record.subject_type_short }}</a-tag>
              <span class="cell-subject-name">{{ record.subject_name || `#${record.subject_id}` }}</span>
            </div>
          </template>

          <template v-else-if="column.key === 'description'">
            {{ record.description || '—' }}
          </template>

          <template v-else-if="column.key === 'changes'">
            <template v-if="record.properties?.changes?.length">
              <a-tooltip>
                <template #title>
                  <div v-for="field in record.properties.changes" :key="field" style="font-size: 12px;">
                    <strong>{{ field }}</strong>:
                    {{ formatValue(record.properties.old?.[field]) }} → {{ formatValue(record.properties.new?.[field]) }}
                  </div>
                </template>
                <a-tag size="small">{{ record.properties.changes.length }} field(s)</a-tag>
              </a-tooltip>
            </template>
            <span v-else class="text-muted">—</span>
          </template>

          <template v-else-if="column.key === 'created_at'">
            <a-tooltip :title="formatDate(record.created_at)">
              {{ relativeTime(record.created_at) }}
            </a-tooltip>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>
```

### Script

```vue
<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { useAppStore } from '@/stores/uiStore'
import { activityLogApi } from '@/api'

const dayjs = inject('$dayjs')
const appStore = useAppStore()

const items = ref([])
const loading = ref(false)
const search = ref('')
const dateRange = ref(null)
const filters = reactive({ subject_type: undefined, action: undefined })
const pagination = reactive({ current_page: 1, per_page: 20, total: 0 })

const columns = [
  { title: 'User', key: 'user', width: 160 },
  { title: 'Action', key: 'action', width: 100, align: 'center' },
  { title: 'Record', key: 'subject', width: 220 },
  { title: 'Description', key: 'description', width: 250 },
  { title: 'Changes', key: 'changes', width: 120, align: 'center' },
  { title: 'When', key: 'created_at', width: 140 },
]

const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showSizeChanger: true,
  showTotal: (total) => `${total} entries`,
  pageSizeOptions: ['10', '20', '50', '100'],
}))

function actionColor(action) {
  const map = { created: 'green', updated: 'blue', deleted: 'red', transferred: 'orange', processed: 'purple', imported: 'cyan' }
  return map[action] || 'default'
}

function formatDate(d) {
  return d ? dayjs(d).format('DD MMM YYYY HH:mm') : '—'
}

function relativeTime(d) {
  return d ? dayjs(d).fromNow() : '—'
}

function formatValue(val) {
  if (val === null || val === undefined) return '—'
  if (val === true) return 'Yes'
  if (val === false) return 'No'
  return String(val)
}

async function fetchItems() {
  loading.value = true
  try {
    const params = {
      page: pagination.current_page,
      per_page: pagination.per_page,
      ...(search.value && { search: search.value }),
      ...(filters.subject_type && { subject_type: filters.subject_type }),
      ...(filters.action && { action: filters.action }),
      ...(dateRange.value?.[0] && { date_from: dateRange.value[0] }),
      ...(dateRange.value?.[1] && { date_to: dateRange.value[1] }),
    }
    const { data } = await activityLogApi.list(params)
    items.value = data.data?.data || data.data || []
    const pag = data.data?.meta || data.pagination || data.data
    if (pag) {
      pagination.current_page = pag.current_page ?? pagination.current_page
      pagination.per_page = pag.per_page ?? pagination.per_page
      pagination.total = pag.total ?? pagination.total
    }
  } catch {
    // silent
  }
  loading.value = false
}

function onFilterChange() {
  pagination.current_page = 1
  fetchItems()
}

function onDateRangeChange() {
  pagination.current_page = 1
  fetchItems()
}

function handleTableChange(pag) {
  pagination.current_page = pag.current
  pagination.per_page = pag.pageSize
  fetchItems()
}

onMounted(() => {
  appStore.setPageMeta('Activity Log')
  fetchItems()
})
</script>
```

### Styles

```vue
<style scoped>
.page-header {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  margin-bottom: 16px;
}
@media (min-width: 640px) {
  .page-header {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}
.page-header-stats { display: flex; gap: 6px; }

.cell-name { font-weight: 600; font-size: 13.5px; }
.cell-subject { display: flex; align-items: center; gap: 6px; }
.cell-subject-name { font-weight: 500; font-size: 13px; }
</style>
```

---

## 5. Route + Sidebar

### Route (`src/router/routes.js`)

Add after the Personnel Actions route:

```js
// ---- Activity Log ----
{
  path: 'activity-log',
  name: 'activity-log',
  component: () => import('@/views/activity-log/ActivityLogListView.vue'),
  meta: { title: 'Activity Log' },
},
```

No permission gating — matches backend behavior (any authenticated user can view).

### Sidebar (`src/components/layout/AppSidebar.vue`)

Add to the "System" section alongside Recycle Bin:

```js
{
  title: 'System',
  items: [
    { key: 'activity-log', label: 'Activity Log', icon: HistoryOutlined, route: 'activity-log' },
    { key: 'recycle-bin', label: 'Recycle Bin', icon: DeleteOutlined, route: 'recycle-bin', permission: 'recycle_bin_list' },
  ],
},
```

Import `HistoryOutlined` from `@ant-design/icons-vue`.

---

## 6. dayjs `fromNow()` — Relative Time Plugin

The `ActivityTimeline` uses `dayjs(date).fromNow()` which requires the `relativeTime` plugin. Check if it's already configured:

**File:** `src/plugins/dayjs.js` (or wherever dayjs is set up)

Ensure these lines exist:
```js
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)
```

If not configured, add it. This enables:
- `dayjs('2026-03-09T08:00:00Z').fromNow()` → "2 hours ago"
- `dayjs('2026-03-08T08:00:00Z').fromNow()` → "1 day ago"

---

## 7. Task Checklist

| # | Task | Files |
|---|------|-------|
| 1 | Create `activityLogApi.js` | `src/api/activityLogApi.js` |
| 2 | Export from `src/api/index.js` | `src/api/index.js` |
| 3 | Verify dayjs `relativeTime` plugin | `src/plugins/dayjs.js` |
| 4 | Create `ActivityTimeline.vue` component | `src/components/ActivityTimeline.vue` |
| 5 | Add ActivityTimeline to EmployeeFormView | `src/views/employees/EmployeeFormView.vue` |
| 6 | Create `ActivityLogListView.vue` | `src/views/activity-log/ActivityLogListView.vue` |
| 7 | Add route | `src/router/routes.js` |
| 8 | Add sidebar entry + import icon | `src/components/layout/AppSidebar.vue` |
| 9 | Build & verify | `npm run build` |
