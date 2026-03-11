# HRMS Frontend — UI/UX Standards & Design System

> **Purpose:** Reference this document whenever adding ANY UI element — buttons, modals, tables,
> forms, delete confirmations, status badges, etc. — to ensure visual and behavioral consistency.

---

## 1. Design Philosophy

This HRMS follows a **Frappe-inspired clean aesthetic**: minimal, professional, warm neutrals,
no visual noise. The design prioritizes:

- **Quiet confidence** — dark primary (#171717), not bright blue
- **Warm grays** — not cold blue-grays (Frappe palette: #f4f5f6, #eef0f2)
- **Generous whitespace** — padding 20-24px, gap 16px, never cramped
- **Minimal decoration** — no gradients, no heavy shadows, no colored backgrounds
- **Typography-driven** — DM Sans for UI, JetBrains Mono for data/codes
- **Soft corners** — 8px standard, 12px cards, 16px modals

---

## 2. Design Tokens (CSS Variables)

**Always use these variables. Never hardcode colors or sizes.**

### Colors
```css
/* Backgrounds */
--color-bg: #f4f5f6;              /* Page background */
--color-bg-surface: #ffffff;       /* Cards, modals, sidebar */
--color-bg-subtle: #f8f9fa;        /* Table headers, slight emphasis */
--color-bg-muted: #eef0f2;         /* Disabled, secondary bg */
--color-bg-hover: #f0f2f4;         /* Row hover, button hover */

/* Text */
--color-text: #1f272e;             /* Primary text */
--color-text-secondary: #6b7280;   /* Labels, descriptions, muted text */
--color-text-muted: #9ca3af;       /* Placeholders, hints, timestamps */
--color-text-inverse: #ffffff;     /* Text on dark backgrounds */

/* Brand */
--color-primary: #171717;          /* Primary buttons, active states */
--color-primary-hover: #2d2d2d;    /* Primary button hover */
--color-accent: #2563eb;           /* Links, focus rings, active nav */
--color-accent-light: #eff6ff;     /* Unread notification bg, accent highlight */

/* Status */
--color-success: #16a34a;          /* Approved, active, completed */
--color-success-bg: #f0fdf4;
--color-warning: #d97706;          /* Pending, in progress */
--color-warning-bg: #fffbeb;
--color-danger: #dc2626;           /* Rejected, error, destructive */
--color-danger-bg: #fef2f2;
--color-info: #2563eb;             /* Info banners, SMRU org tag */
--color-info-bg: #eff6ff;

/* Borders */
--color-border: #e5e7eb;           /* Input borders, dividers */
--color-border-light: #f0f0f0;     /* Table rows, card borders (softer) */
```

### Spacing & Sizing
```css
--header-height: 56px;
--sidebar-width: 240px;
--sidebar-collapsed-width: 64px;
--radius-sm: 6px;   /* Tags, small badges */
--radius-md: 8px;   /* Buttons, inputs, menu items */
--radius-lg: 12px;  /* Cards, tables, detail sections */
--radius-xl: 16px;  /* Modals, login card */
```

### Shadows
```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.04);        /* Subtle lift */
--shadow-md: 0 2px 8px rgba(0,0,0,0.06);         /* Hover states */
--shadow-lg: 0 8px 24px rgba(0,0,0,0.08);        /* Modals, login */
--shadow-card: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02); /* Cards */
```

### Transitions
```css
--transition-fast: 150ms ease;     /* Hover states, color changes */
--transition-base: 200ms ease;     /* Fade in/out, general */
--transition-slow: 300ms ease;     /* Sidebar collapse, slide animations */
```

---

## 3. Typography

| Role | Font | Size | Weight | Tracking |
|---|---|---|---|---|
| Body text | DM Sans | 14px (1rem) | 400 | normal |
| Labels, secondary | DM Sans | 13px | 500 | normal |
| Small / captions | DM Sans | 12px-12.5px | 400-500 | normal |
| Page title (header) | DM Sans | 16px | 600 | normal |
| Section headings | DM Sans | 20-24px | 700 | -0.02em |
| Table headers | DM Sans | 12px | 600 | 0.04em, uppercase |
| Monospace data | JetBrains Mono | 12-13px | 400-500 | normal |

### When to use monospace (`font-mono` class)
- Staff IDs, codes, reference numbers
- Currency values (฿12,345.00)
- Percentages from data (80%)
- Grant codes, budget line codes
- Tax numbers, ID numbers

### When to use bold (`font-semibold` class)
- Employee names in tables
- Net salary / total columns (the "answer" columns)
- Section totals, summary values
- Navigation active state

---

## 4. Buttons

### Button Hierarchy (pick ONE primary per view section)

| Type | Usage | AntD Component |
|---|---|---|
| **Primary** | One main action per section: "Save", "Submit", "Create" | `<a-button type="primary">` |
| **Default** | Secondary actions: "Cancel", "Export", "Customize" | `<a-button>` |
| **Text** | Inline/table actions: "View", "Edit" | `<a-button type="text">` |
| **Link** | Table row actions: "View", "Payslip" | `<a-button type="link" size="small">` |
| **Danger** | Destructive: "Delete", "Remove" | `<a-button danger>` or `type="link" danger` |

### Button Patterns

**Page-level action button (top-right of page header):**
```vue
<div class="page-header">
  <div><!-- stats/title --></div>
  <a-space>
    <!-- filters here -->
    <a-button type="primary" @click="handleCreate">
      <template #icon><PlusOutlined /></template>
      Add [Item]
    </a-button>
  </a-space>
</div>
```

**Table row actions (rightmost column):**
```vue
<!-- For 2-3 actions: inline link buttons -->
<a-space :size="0">
  <a-button size="small" type="link" @click="handleView(record)">View</a-button>
  <a-button size="small" type="link" @click="handleEdit(record)">Edit</a-button>
  <a-button size="small" type="link" danger @click="handleDelete(record)">Delete</a-button>
</a-space>

<!-- For 4+ actions: use dropdown -->
<a-dropdown :trigger="['click']">
  <a-button size="small" type="text">
    <EllipsisOutlined />
  </a-button>
  <template #overlay>
    <a-menu>
      <a-menu-item @click="handleView(record)"><EyeOutlined /> View</a-menu-item>
      <a-menu-item @click="handleEdit(record)"><EditOutlined /> Edit</a-menu-item>
      <a-menu-item @click="handleExport(record)"><DownloadOutlined /> Export</a-menu-item>
      <a-menu-divider />
      <a-menu-item danger @click="handleDelete(record)"><DeleteOutlined /> Delete</a-menu-item>
    </a-menu>
  </template>
</a-dropdown>
```

**Icon-only buttons (header, toolbar):**
```vue
<button class="icon-btn" @click="action">
  <ReloadOutlined />
</button>
```
```css
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: 18px;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.icon-btn:hover {
  background: var(--color-bg);
  color: var(--color-text);
}
```

**Form submit buttons:**
```vue
<!-- Always at the bottom of the form, left-aligned -->
<a-button type="primary" html-type="submit" :loading="loading">
  Save Changes
</a-button>

<!-- If cancel needed, put it before primary -->
<a-space>
  <a-button @click="handleCancel">Cancel</a-button>
  <a-button type="primary" html-type="submit" :loading="loading">
    Save Changes
  </a-button>
</a-space>
```

**Loading states — always use `:loading`:**
```vue
<a-button type="primary" :loading="saving">
  {{ saving ? 'Saving...' : 'Save' }}
</a-button>
```

### Disabled Primary Button — Critical CSS Gotcha

**Problem:** Our primary color is `#171717` (near-black). When Ant Design applies its default disabled opacity to a primary button, the button becomes a solid black block and the white text vanishes.

**Fix:** `global.less` overrides the disabled state globally:

```css
/* Already applied in src/styles/global.less — do NOT re-apply per-component */
.ant-btn-primary[disabled],
.ant-btn-primary[disabled]:hover,
.ant-btn-primary.ant-btn-disabled,
.ant-btn-primary.ant-btn-disabled:hover {
  background: var(--color-bg-muted) !important;  /* #eef0f2 */
  border-color: var(--color-border) !important;   /* #e5e7eb */
  color: var(--color-text-muted) !important;      /* #9ca3af */
  opacity: 1 !important;
}
```

**Result:** Disabled primary buttons show as light gray with muted text — consistent with disabled default buttons. This fix is global and applies to every `<a-button type="primary" :disabled="true">` in the app.

---

## 5. Delete Confirmation

**ALWAYS confirm before destructive actions. Use `Modal.confirm()` from Ant Design.**

```js
import { Modal, message } from 'ant-design-vue'
import { ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { createVNode } from 'vue'

function handleDelete(record) {
  Modal.confirm({
    title: 'Delete this record?',
    icon: createVNode(ExclamationCircleOutlined),
    content: `Are you sure you want to delete "${record.name}"? This action cannot be undone.`,
    okText: 'Delete',
    okType: 'danger',
    cancelText: 'Cancel',
    centered: true,
    async onOk() {
      try {
        await someApi.destroy(record.id)
        message.success('Record deleted successfully')
        fetchData() // refresh the list
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to delete record')
      }
    },
  })
}
```

**Rules for delete confirmation:**
- `okType: 'danger'` — red confirm button, always
- `centered: true` — modal appears centered, not top-offset
- Include the record name/title in `content` so user knows WHAT they're deleting
- Success: `message.success('...')` then refresh data
- Error: `message.error(...)` with backend message fallback
- Never ask "Are you sure?" without naming the item

---

## 6. Feedback & Notifications

### Toast Messages (`message` from Ant Design)

```js
import { message } from 'ant-design-vue'

// Success — after create, update, delete, bulk action
message.success('Employee created successfully')

// Error — after failed API call
message.error(err.response?.data?.message || 'Something went wrong')

// Warning — non-blocking alerts
message.warning('Some records were skipped')

// Info — neutral information
message.info('Export started, you will be notified when ready')

// Loading — for long operations (returns a close function)
const hide = message.loading('Processing...', 0)  // 0 = don't auto-close
// ... when done:
hide()
message.success('Done!')
```

**Rules:**
- Always provide the backend error message when available: `err.response?.data?.message`
- Keep messages under 60 characters
- Use past tense for completed actions: "created", "updated", "deleted"
- Never show raw error codes to the user

### Alert Banners (`a-alert`)

```vue
<!-- Error alert (forms, login) -->
<a-alert
  v-if="errorMessage"
  :message="errorMessage"
  type="error"
  show-icon
  closable
  @close="errorMessage = ''"
  style="margin-bottom: 20px"
/>

<!-- Info alert (review step, warnings) -->
<a-alert type="info" show-icon style="margin-bottom: 16px">
  <template #message>
    <strong>{{ count }}</strong> records will be processed
  </template>
</a-alert>

<!-- Warning alert -->
<a-alert type="warning" show-icon style="margin-bottom: 16px">
  <template #message>{{ warningCount }} warnings found</template>
</a-alert>
```

### Real-time Notification Toasts

```js
import { notification } from 'ant-design-vue'

notification.open({
  message: '📅 Leave',
  description: 'John Smith submitted a leave request',
  placement: 'topRight',
  duration: 5,  // seconds, 0 = sticky
})
```

---

## 7. Status Tags (Color Map)

**All status values use `<a-tag>` with this standard color mapping:**

```js
function statusColor(status) {
  const map = {
    // Green — positive/complete
    active: 'green',
    approved: 'green',
    completed: 'green',
    passed: 'green',

    // Orange — in progress/waiting
    pending: 'orange',
    processing: 'orange',
    in_progress: 'orange',
    upcoming: 'orange',

    // Red — negative/stopped
    rejected: 'red',
    failed: 'red',
    terminated: 'red',
    cancelled: 'red',

    // Default (gray) — neutral/inactive
    draft: 'default',
    inactive: 'default',

    // Purple — special
    expat: 'purple',
    'Expat Staff': 'purple',

    // Blue — scheduled/planned
    scheduled: 'blue',
    planned: 'blue',
  }
  return map[status?.toLowerCase()] || 'default'
}
```

**Usage:**
```vue
<a-tag :color="statusColor(record.status)" size="small">
  {{ record.status }}
</a-tag>
```

**Organization tags (always this exact mapping):**
```vue
<a-tag :color="record.organization === 'SMRU' ? 'blue' : 'green'" size="small">
  {{ record.organization }}
</a-tag>
```

**Boolean tags:**
```vue
<a-tag :color="record.is_active ? 'green' : 'default'" size="small">
  {{ record.is_active ? 'Yes' : 'No' }}
</a-tag>
```

---

## 8. Tables

### List Page Table (standard)
```vue
<a-card :body-style="{ padding: 0 }">
  <a-table
    :columns="columns"
    :data-source="items"
    :loading="loading"
    :pagination="tablePagination"
    :row-key="(r) => r.id"
    @change="handleTableChange"
    size="middle"
  >
    <template #bodyCell="{ column, record }">
      <!-- custom cell rendering -->
    </template>
  </a-table>
</a-card>
```

**Rules:**
- Wrap in `<a-card :body-style="{ padding: 0 }">` — no padding so table fills card edge-to-edge
- `size="middle"` for primary tables, `size="small"` for nested/detail sub-tables
- `:row-key="(r) => r.id"` — always function form, never string
- Always include `tablePagination` computed with `showSizeChanger` and `showTotal`

### Pagination (always this shape)
```js
const tablePagination = computed(() => ({
  current: pagination.current_page,
  pageSize: pagination.per_page,
  total: pagination.total,
  showSizeChanger: true,
  showTotal: (total) => `${total} records`,
  pageSizeOptions: ['10', '20', '50', '100'],
}))
```

### Column Width Guidelines

| Content Type | Width | Align |
|---|---|---|
| Name with avatar | 260 | left |
| Name without avatar | 200 | left |
| Staff ID / code | 100-120 | left |
| Status tag | 110 | left or center |
| Organization tag | 70-110 | center |
| Date (single) | 95-130 | left |
| Date range | 220-240 | left |
| Department / category | 150-180 | left |
| Currency | 80-120 | right |
| Percentage | 55-70 | center |
| Count / number | 70-100 | center |
| Actions (2-3 buttons) | 150 | right |
| Long text (ellipsis) | no fixed width | left, `ellipsis: true` |

### Table Cell Patterns

**Employee name cell (name + staff ID stacked):**
```vue
<template v-if="column.key === 'employee'">
  <router-link :to="{ name: 'employee-detail', params: { id: record.id } }" class="cell-employee-link">
    <a-avatar :size="32" :style="{ backgroundColor: getAvatarColor(record.staff_id), fontSize: '12px', fontWeight: 600 }">
      {{ getInitials(record) }}
    </a-avatar>
    <div>
      <div class="cell-name">{{ record.first_name_en }} {{ record.last_name_en }}</div>
      <div class="cell-sub font-mono">{{ record.staff_id }}</div>
    </div>
  </router-link>
</template>
```
```css
.cell-employee-link { display: flex; align-items: center; gap: 10px; text-decoration: none; color: inherit; }
.cell-name { font-weight: 600; font-size: 13.5px; color: var(--color-text); }
.cell-sub { font-size: 12px; color: var(--color-text-muted); }
```

**Grant / code cell (code + subtitle stacked):**
```vue
<div>
  <span class="font-mono">{{ record.grant?.code || '—' }}</span>
  <div class="cell-sub">{{ record.budgetline_code || '' }}</div>
</div>
```

**Currency cell:**
```vue
<span class="font-mono">{{ fmtCurrency(record.net_salary) }}</span>
```

**Conditional number color (e.g., remaining days):**
```vue
<span
  class="font-semibold"
  :style="{
    color: record.remaining <= 0 ? 'var(--color-danger)'
         : record.remaining <= 3 ? 'var(--color-warning)'
         : 'var(--color-success)'
  }"
>
  {{ record.remaining }}
</span>
```

### Row Selection (Checkboxes)

**Add row selection when the table supports bulk delete. Gate behind edit permission.**

```vue
<a-table
  :columns="columns"
  :data-source="items"
  :row-key="(r) => r.id"
  :row-selection="authStore.canEdit('module') ? { selectedRowKeys, onChange: (keys) => selectedRowKeys = keys } : undefined"
  size="middle"
>
```

**State:**
```js
const selectedRowKeys = ref([])
```

**Bulk delete button (in page header, before primary action):**
```vue
<a-space>
  <!-- filters here -->
  <a-button v-if="selectedRowKeys.length > 0 && authStore.canEdit('module')" danger @click="handleBulkDelete">
    Delete {{ selectedRowKeys.length }} Selected
  </a-button>
  <a-button type="primary" @click="openCreate">
    <PlusOutlined /> Add [Item]
  </a-button>
</a-space>
```

**Bulk delete handler:**
```js
function handleBulkDelete() {
  Modal.confirm({
    title: 'Delete Selected Records',
    icon: createVNode(ExclamationCircleOutlined),
    content: `Are you sure you want to delete ${selectedRowKeys.value.length} selected record(s)? This action cannot be undone.`,
    okText: 'Delete',
    okType: 'danger',
    cancelText: 'Cancel',
    centered: true,
    async onOk() {
      try {
        // Use destroyBatch if available, otherwise loop individual deletes
        await Promise.all(selectedRowKeys.value.map((id) => someApi.destroy(id)))
        message.success(`${selectedRowKeys.value.length} record(s) deleted`)
        selectedRowKeys.value = []
        fetchItems()
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to delete records')
      }
    },
  })
}
```

**Rules:**
- Only show checkboxes if user has edit permission for the module
- Clear `selectedRowKeys` after successful bulk delete and after individual deletes
- Bulk delete button uses `danger` style (red), placed before the primary "Add" button
- If a `destroyBatch(ids)` API endpoint exists, prefer it over looping individual deletes

### Avatar Colors (hash-based, deterministic)
```js
function getAvatarColor(identifier) {
  const colors = ['#1677ff', '#52c41a', '#722ed1', '#eb2f96', '#fa8c16', '#13c2c2']
  const hash = (identifier || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return colors[hash % colors.length]
}
```

---

## 9. Forms

### Form Layout
```vue
<a-form layout="vertical" :model="form" @finish="handleSubmit">
  <a-row :gutter="16">
    <a-col :span="12">
      <a-form-item label="First Name" name="first_name">
        <a-input v-model:value="form.first_name" placeholder="Enter first name" />
      </a-form-item>
    </a-col>
    <a-col :span="12">
      <a-form-item label="Last Name" name="last_name">
        <a-input v-model:value="form.last_name" placeholder="Enter last name" />
      </a-form-item>
    </a-col>
  </a-row>
  <!-- ... more rows ... -->
  <a-button type="primary" html-type="submit" :loading="loading">
    Save
  </a-button>
</a-form>
```

**Rules:**
- Always `layout="vertical"` — labels above inputs, never horizontal
- Use `<a-row :gutter="16">` + `<a-col :span="12">` for 2-column layouts
- Use `<a-col :span="8">` for 3-column layouts
- Inputs: `size="large"` only on login/standalone pages, default size everywhere else
- Selects: always `allow-clear` unless the field is required
- Placeholders: "Enter ...", "Select ...", never repeat the label

### Input Patterns

| Field Type | Component | Props |
|---|---|---|
| Text | `<a-input>` | `v-model:value`, `placeholder` |
| Password | `<a-input-password>` | `v-model:value`, `placeholder` |
| Email | `<a-input>` | `v-model:value`, prefix `<MailOutlined>` |
| Textarea | `<a-textarea>` | `v-model:value`, `:rows="4"` |
| Select | `<a-select>` | `v-model:value`, `allow-clear`, `placeholder` |
| Date | `<a-date-picker>` | `v-model:value`, `format="DD MMM YYYY"` |
| Date range | `<a-range-picker>` | `v-model:value` |
| Number | `<a-input-number>` | `v-model:value`, `:min="0"` |
| Switch/toggle | `<a-switch>` | `v-model:checked` |
| Upload | `<a-upload>` | `:before-upload`, `accept` |

### Search Input (in page headers)
```vue
<a-input
  v-model:value="search"
  placeholder="Search by name, ID..."
  allow-clear
  style="width: 240px"
  @pressEnter="fetchData"
  @clear="fetchData"
>
  <template #prefix><SearchOutlined /></template>
</a-input>
```

### Filter Selects (in page headers)
```vue
<a-select
  v-model:value="filters.status"
  placeholder="Status"
  allow-clear
  style="width: 140px"
  @change="fetchData"
>
  <a-select-option value="active">Active</a-select-option>
  <a-select-option value="inactive">Inactive</a-select-option>
</a-select>
```

---

## 10. Modals

### Standard Modal
```vue
<a-modal
  v-model:open="showModal"
  title="Create Employee"
  :width="640"
  :footer="null"
  destroy-on-close
>
  <a-form layout="vertical" @finish="handleSubmit">
    <!-- form fields -->
    <div class="modal-footer">
      <a-button @click="showModal = false">Cancel</a-button>
      <a-button type="primary" html-type="submit" :loading="saving">Save</a-button>
    </div>
  </a-form>
</a-modal>
```
```css
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-light);
}
```

**Rules:**
- `:footer="null"` — custom footer inside content, not AntD's default
- `destroy-on-close` — always, ensures clean state on reopen
- Width: `480px` small, `640px` medium, `720px` large, `900px` extra-large
- Title: clear action verb ("Create Employee", "Edit Grant", "Bulk Payroll")

### View/Read-Only Modal
```vue
<a-modal
  v-model:open="showDetail"
  :title="selectedRecord?.name || 'Details'"
  :width="640"
  :footer="null"
>
  <div class="info-grid" style="grid-template-columns: repeat(2, 1fr);">
    <InfoField label="Name" :value="selectedRecord?.name" />
    <InfoField label="Status" :value="selectedRecord?.status" />
    <!-- more fields -->
  </div>
</a-modal>
```

---

## 11. Empty & Loading States

### Loading
```vue
<!-- Full page loading -->
<div v-if="loading" class="loading-state"><a-spin size="large" /></div>

<!-- Table loading (handled by :loading prop) -->
<a-table :loading="loading" ... />

<!-- Button loading -->
<a-button :loading="saving">Save</a-button>
```
```css
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
}
```

### Empty States
```vue
<!-- Standard empty -->
<a-empty description="No records found" />

<!-- Empty with action -->
<a-empty description="No employees yet">
  <a-button type="primary" @click="showCreateModal = true">
    <template #icon><PlusOutlined /></template>
    Add First Employee
  </a-button>
</a-empty>

<!-- 404 page / record not found -->
<a-result status="404" title="Not found" sub-title="The record could not be loaded.">
  <template #extra>
    <a-button type="primary" @click="$router.push({ name: 'list-route' })">Go Back</a-button>
  </template>
</a-result>
```

---

## 12. Detail Page Structure

```vue
<div class="page-container">
  <!-- Back link -->
  <router-link :to="{ name: 'list-route' }" class="back-link">
    <ArrowLeftOutlined /> All [Items]
  </router-link>

  <div v-if="loading" class="loading-state"><a-spin size="large" /></div>

  <template v-else-if="item">
    <!-- Header card -->
    <div class="detail-header">
      <div class="detail-header-left">
        <a-avatar :size="64" ...>{{ initials }}</a-avatar>
        <div>
          <h2 class="detail-name">{{ item.name }}</h2>
          <div class="detail-meta">
            <span class="font-mono">{{ item.code }}</span>
            <span class="meta-sep">·</span>
            <a-tag ...>{{ item.status }}</a-tag>
          </div>
        </div>
      </div>
      <!-- Optional: action buttons top-right -->
      <a-space>
        <a-button @click="handleEdit"><EditOutlined /> Edit</a-button>
        <a-button danger @click="handleDelete"><DeleteOutlined /> Delete</a-button>
      </a-space>
    </div>

    <!-- Tabs -->
    <a-tabs v-model:activeKey="activeTab" class="detail-tabs">
      <a-tab-pane key="info" tab="Information">
        <div class="info-grid">
          <InfoField label="Field" :value="item.field" />
        </div>
      </a-tab-pane>
    </a-tabs>
  </template>

  <a-result v-else status="404" ... />
</div>
```

### InfoField Grid
```css
.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* 3 columns on desktop */
  gap: 16px;
}
@media (max-width: 768px) {
  .info-grid { grid-template-columns: repeat(2, 1fr); }
}
```

---

## 13. Page Layout Rules

### Every page view MUST have:
1. `<div class="page-container">` as root — provides `padding: 24px`, `max-width: 1400px`
2. `appStore.setPageMeta('Page Title')` in `onMounted`
3. Loading state while data is being fetched

### Page Header Pattern
```vue
<div class="page-header">
  <div><!-- Left: stats, title, or empty div --></div>
  <a-space><!-- Right: search, filters, action buttons --></a-space>
</div>
```
```css
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
```

### Stat Cards (Dashboard)
```vue
<div class="quick-stats">
  <div class="stat-card" v-for="stat in stats" :key="stat.label">
    <div class="stat-icon" :style="{ background: stat.bg, color: stat.color }">
      <component :is="stat.icon" />
    </div>
    <div class="stat-content">
      <span class="stat-value">{{ stat.value }}</span>
      <span class="stat-label">{{ stat.label }}</span>
    </div>
  </div>
</div>
```
```css
.quick-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
```

**Stat icon color palette:**

| Category | Icon BG | Icon Color |
|---|---|---|
| Employees | `#eff6ff` | `#2563eb` |
| Leave | `#fef3c7` | `#d97706` |
| Requests | `#fce7f3` | `#db2777` |
| Payroll/Money | `#f0fdf4` | `#16a34a` |

---

## 14. Data Formatting Helpers

**Use these exact functions. Never inline formatting logic.**

```js
// Currency — Thai Baht, 2 decimal places
function fmtCurrency(val) {
  if (val == null || val === '') return '—'
  const n = Number(val)
  return isNaN(n) ? '—' : `฿${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Date — inject dayjs, never import directly
const dayjs = inject('$dayjs')
function formatDate(d) {
  return d ? dayjs(d).format('DD MMM YYYY') : '—'
}

// DateTime
function formatDateTime(d) {
  return d ? dayjs(d).format('DD MMM YYYY HH:mm') : '—'
}

// Relative time (notifications)
dayjs(d).fromNow()  // "2 hours ago"

// FTE percentage
function fmtFte(val) {
  if (val == null) return '—'
  return `${(Number(val) * 100).toFixed(0)}%`
}

// Initials from name
function getInitials(record) {
  return `${(record.first_name_en || '')[0] || ''}${(record.last_name_en || '')[0] || ''}`.toUpperCase()
}
```

**Null / empty value: always display `—` (em dash), never empty string or "N/A".**

---

## 15. Navigation & Links

### Back Link (detail pages)
```vue
<router-link :to="{ name: 'list-route' }" class="back-link">
  <ArrowLeftOutlined /> All Employees
</router-link>
```

### Clickable Table Row Names
```vue
<router-link :to="{ name: 'detail-route', params: { id: record.id } }" class="cell-link">
  {{ record.name }}
</router-link>
```
```css
.cell-link { color: var(--color-text); text-decoration: none; font-weight: 600; }
.cell-link:hover { color: var(--color-accent); }
```

### Profile Dropdown Menu
```vue
<a-dropdown :trigger="['click']">
  <button class="profile-trigger"><!-- avatar + name --></button>
  <template #overlay>
    <a-menu>
      <a-menu-item key="profile"><UserOutlined /> My Profile</a-menu-item>
      <a-menu-divider />
      <a-menu-item key="logout"><LogoutOutlined /> Sign Out</a-menu-item>
    </a-menu>
  </template>
</a-dropdown>
```

---

## 16. Icons

**Use `@ant-design/icons-vue` only. Always import with `Outlined` suffix.**

| Category | Icons |
|---|---|
| Navigation | `DashboardOutlined`, `BellOutlined`, `SettingOutlined`, `UserOutlined`, `LogoutOutlined` |
| CRUD | `PlusOutlined`, `EditOutlined`, `DeleteOutlined`, `EyeOutlined`, `SaveOutlined` |
| Search/Filter | `SearchOutlined`, `FilterOutlined` |
| Status | `CheckOutlined`, `CloseOutlined`, `ExclamationCircleOutlined` |
| Data | `DownloadOutlined`, `UploadOutlined`, `ReloadOutlined` |
| Navigation arrows | `ArrowLeftOutlined`, `DownOutlined`, `EllipsisOutlined` |
| Module-specific | `TeamOutlined` (employees), `CalendarOutlined` (leave), `DollarOutlined` (payroll), `FileTextOutlined` (documents), `ReadOutlined` (training) |

---

## 17. Responsive Breakpoints

```css
@media (max-width: 1024px) {
  /* Tablet: 2-column grids become 1-column, 4-stat row becomes 2×2 */
  .quick-stats { grid-template-columns: repeat(2, 1fr); }
  .widgets-grid { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  /* Mobile: info grids go 2-column, sidebar collapses */
  .info-grid { grid-template-columns: repeat(2, 1fr); }
  .profile-layout { grid-template-columns: 1fr; }
}
```

---

## 18. Recycle Bin Page

The Recycle Bin is a special page that aggregates soft-deleted records from multiple models into a single table. It uses client-side filtering (no server pagination) and has unique patterns for composite row keys, dual record types (soft-delete vs legacy), and restore/permanent-delete actions.

### Key Patterns

**Composite row key (avoids ID collisions across models):**
```js
function rowKey(record) {
  if (record.type === 'legacy') return `legacy-${record.deleted_record_id}`
  return `${record.model_type}-${record.original_id}`
}
```

**Client-side search + model type filter:**
```js
const filteredItems = computed(() => {
  let result = items.value
  if (filterModel.value) {
    result = result.filter(item => item.model_type === filterModel.value)
  }
  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter(item =>
      item.display_name?.toLowerCase().includes(q)
      || item.model_type?.toLowerCase().includes(q)
      || String(item.original_id).includes(q)
    )
  }
  return result
})
```

**Dynamic model type filter options (derived from data):**
```js
const availableModelTypes = computed(() => {
  const types = new Set(items.value.map(item => item.model_type))
  return [...types].sort()
})
```

**Model type color map:**
```js
const modelColorMap = {
  Employee: 'blue',
  Grant: 'green',
  Department: 'orange',
  Payroll: 'cyan',
  Interview: 'purple',
  JobOffer: 'magenta',
}
```

### Header Stats (per-model counts from API)
```vue
<div class="page-header-stats">
  <a-tag color="default">{{ filteredItems.length }} Records</a-tag>
  <template v-if="stats">
    <a-tag v-for="(count, model) in stats.by_model" :key="model" :color="modelTagColor(model)">
      {{ count }} {{ model }}
    </a-tag>
  </template>
</div>
```

### Data Fetching (parallel list + stats)
```js
const [listRes, statsRes] = await Promise.all([
  recycleBinApi.list(),
  recycleBinApi.stats(),
])
items.value = listRes.data?.data?.items || []
stats.value = statsRes.data?.data || null
```

### Row Actions (Restore + Permanent Delete)
Each row has two actions:
- **Restore** — `Modal.confirm()` with neutral `okText: 'Restore'` (not danger)
- **Permanent Delete** — `Modal.confirm()` with `okType: 'danger'` and `okText: 'Delete Permanently'`

Both must check `record.type === 'legacy'` and call the appropriate API method:
```js
// Soft-deleted records
recycleBinApi.restore(record.model_type.toLowerCase(), record.original_id)
recycleBinApi.permanentDelete(record.model_type.toLowerCase(), record.original_id)

// Legacy records (Interview, JobOffer)
recycleBinApi.restoreLegacy(record.deleted_record_id)
recycleBinApi.permanentDeleteLegacy(record.deleted_record_id)
```

### Bulk Restore (with dual record types)
The bulk restore button uses `type="primary"` (not danger, since restore is constructive):
```vue
<a-button
  v-if="selectedRowKeys.length > 0 && authStore.canEdit('recycle_bin_list')"
  type="primary"
  @click="handleBulkRestore"
  :loading="restoring"
>
  <UndoOutlined /> Restore {{ selectedRowKeys.length }} Selected
</a-button>
```

The handler separates selected items by type and calls the appropriate bulk API:
```js
function handleBulkRestore() {
  const softDeleteItems = []
  const legacyItems = []

  for (const key of selectedRowKeys.value) {
    const record = items.value.find(item => rowKey(item) === key)
    if (!record) continue
    if (record.type === 'legacy') {
      legacyItems.push({ deleted_record_id: record.deleted_record_id })
    } else {
      softDeleteItems.push({ model_type: record.model_type.toLowerCase(), id: record.original_id })
    }
  }

  Modal.confirm({
    // ... confirmation dialog
    async onOk() {
      const promises = []
      if (softDeleteItems.length > 0) promises.push(recycleBinApi.bulkRestore(softDeleteItems))
      if (legacyItems.length > 0) promises.push(recycleBinApi.bulkRestoreLegacy(legacyItems))
      await Promise.all(promises)
    },
  })
}
```

### Table Columns
| Column | Key | Width | Align |
|---|---|---|---|
| Name (+ original ID sub) | `display_name` | 260 | left |
| Type (color tag) | `model_type` | 130 | center |
| Deleted At (+ relative time sub) | `deleted_at` | 180 | left |
| Actions | `actions` | 150 | right |

### API Shape (`recycleBinApi`)
```js
list()                              // GET /recycle-bin
stats()                             // GET /recycle-bin/stats
restore(modelType, id)              // POST /recycle-bin/restore/{model}/{id}
bulkRestore(items)                  // POST /recycle-bin/bulk-restore
permanentDelete(modelType, id)      // DELETE /recycle-bin/permanent/{model}/{id}
restoreLegacy(deletedRecordId)      // POST /recycle-bin/restore-legacy
bulkRestoreLegacy(restoreRequests)  // POST /recycle-bin/bulk-restore-legacy
permanentDeleteLegacy(deletedRecordId) // DELETE /recycle-bin/legacy/{id}
```

---

## 19. Data Import Page

The Data Import page uses a **card grid layout** (not a table) where each import module is a self-contained card with download template, file upload, and result feedback. It is permission-gated per module.

### Layout
```vue
<div class="import-grid">
  <template v-for="mod in visibleModules" :key="mod.key">
    <a-card class="import-card">
      <!-- card content -->
    </a-card>
  </template>
</div>
```
```css
.import-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
@media (max-width: 768px) {
  .import-grid { grid-template-columns: 1fr; }
}
```

### Module Configuration (reactive array)
Each module defines its permissions, template keys, and upload state:
```js
const modules = reactive([
  {
    key: 'grant',                          // API upload endpoint key
    label: 'Grants',                       // Card title
    icon: TrophyOutlined,                  // Card title icon
    description: 'Import grants data...',  // Short description
    readPermission: 'grants_list',         // Controls card visibility
    editPermission: 'grants_list',         // Controls upload area visibility
    template: 'grant-template',            // Download template key
    referenceTemplate: null,               // Optional reference file key
    referenceLabel: null,                   // Optional reference button label
    templateLabel: 'Download Template',    // Template button label
    async: false,                          // true = 202 background processing
    fileList: [],                           // Upload file list state
  },
  // ... more modules
])

const visibleModules = computed(() =>
  modules.filter((mod) => authStore.canRead(mod.readPermission)),
)
```

### Card Structure (per module)
Each card has 4 sections in order:
1. **Title** — icon + module label in card header
2. **Description** — short text explaining what this import does
3. **Download section** — template button + optional reference file button
4. **Upload section** — drag-and-drop area + upload button (edit permission only)
5. **Result alert** — success/warning/error feedback after upload

```vue
<a-card class="import-card">
  <template #title>
    <div class="card-title">
      <component :is="mod.icon" class="card-icon" />
      <span>{{ mod.label }}</span>
    </div>
  </template>

  <p class="card-description">{{ mod.description }}</p>

  <!-- Download buttons -->
  <div class="download-section">
    <a-button @click="handleDownload(mod.template, mod.templateLabel)" :loading="downloading[mod.template]">
      <DownloadOutlined /> {{ mod.templateLabel }}
    </a-button>
    <a-button v-if="mod.referenceTemplate" @click="handleDownload(mod.referenceTemplate, mod.referenceLabel)" :loading="downloading[mod.referenceTemplate]">
      <DownloadOutlined /> {{ mod.referenceLabel }}
    </a-button>
  </div>

  <!-- Upload area (edit permission only) -->
  <template v-if="authStore.canEdit(mod.editPermission)">
    <a-upload-dragger
      v-model:file-list="mod.fileList"
      :before-upload="() => false"
      :accept="ACCEPTED_TYPES"
      :max-count="1"
      class="upload-dragger"
    >
      <p class="ant-upload-drag-icon"><InboxOutlined /></p>
      <p class="ant-upload-text">Click or drag file to this area</p>
      <p class="ant-upload-hint">.xlsx, .xls, or .csv (max 10 MB)</p>
    </a-upload-dragger>
    <a-button type="primary" :loading="uploading[mod.key]" class="upload-btn" @click="handleUpload(mod)">
      <UploadOutlined /> Upload
    </a-button>
  </template>

  <!-- Result alert -->
  <a-alert v-if="results[mod.key]" :type="results[mod.key].type" :message="results[mod.key].message"
    :description="results[mod.key].description" show-icon closable class="result-alert"
    @close="results[mod.key] = null" />
</a-card>
```

### File Validation
```js
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ACCEPTED_TYPES = '.xlsx,.xls,.csv'
const ACCEPTED_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
]

function validateFile(file) {
  if (!ACCEPTED_MIMES.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
    notify.error('Only .xlsx, .xls, or .csv files are allowed')
    return false
  }
  if (file.size > MAX_FILE_SIZE) {
    notify.error('File size must not exceed 10 MB')
    return false
  }
  return true
}
```

### Template Download (blob response)
```js
async function handleDownload(template, label) {
  downloading[template] = true
  try {
    const response = await uploadApi.downloadTemplate(template)
    const disposition = response.headers['content-disposition']
    let filename = `${template}.xlsx`
    if (disposition) {
      const match = disposition.match(/filename[^;=\n]*=["']?([^"';\n]+)/)
      if (match) filename = match[1]
    }
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch { /* error handling */ }
  finally { downloading[template] = false }
}
```

### Upload Result Types
| HTTP Status | `mod.async` | Result Type | Message |
|---|---|---|---|
| 202 | any | `info` | "Import started" (background processing) |
| 200 | `true` | `info` | "Import started" |
| 200 | `false`, no errors | `success` | "Import Complete" |
| 200 | `false`, with errors | `warning` | "Import Complete" (partial) |
| 4xx/5xx | any | `error` | "Import Failed" |

### API Shape (`uploadApi`)
```js
upload(module, file)          // POST /uploads/{module} (multipart/form-data)
downloadTemplate(template)    // GET /downloads/{template} (responseType: 'blob')
```

### Available Modules
| Key | Label | Icon | Read Permission | Edit Permission | Async |
|---|---|---|---|---|---|
| `grant` | Grants | TrophyOutlined | `grants_list` | `grants_list` | No |
| `employee` | Employees | TeamOutlined | `employees` | `employees` | No |
| `employment` | Employment Records | FileTextOutlined | `employment_records` | `employment_records` | Yes |
| `employee-funding-allocation` | Funding Allocations | FundProjectionScreenOutlined | `employee_funding_allocations` | `employee_funding_allocations` | Yes |
| `payroll` | Payroll | DollarOutlined | `employee_salary` | `employee_salary` | Yes |

---

## 20. Quick Checklist — Adding Any New UI Element

Before committing, verify:

- [ ] Uses CSS variables, not hardcoded colors/sizes
- [ ] Follows the button hierarchy (one primary per section)
- [ ] Status tags use the standard color map function
- [ ] Destructive actions have `Modal.confirm()` with `okType: 'danger'`
- [ ] Success/error feedback uses `message.success()` / `message.error()`
- [ ] Empty states use `<a-empty>`, not plain text
- [ ] Loading states use `<a-spin>` or `:loading` prop
- [ ] Null values display `—`, not empty string
- [ ] Currency uses `fmtCurrency()`, dates use `formatDate()` via injected dayjs
- [ ] Monospace class on IDs, codes, and monetary values
- [ ] Table has `:row-key`, `size`, and `tablePagination` computed
- [ ] No new dependencies added
- [ ] No hardcoded `Authorization: Bearer` header (cookie auth only)
